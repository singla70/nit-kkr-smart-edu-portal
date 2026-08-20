import pdf from "pdf-parse";
import { complete } from "./llmService.js";
import PendingResult from "../models/PendingResult.js";
import ExtractionBatch from "../models/ExtractionBatch.js";
import { computeResultFlags } from "../utils/resultFlags.js";

const BATCH_SIZE = 8; // within the decided 5-10 range
const CONCURRENCY = 3; // parallel batch extractions in-flight at once

/** Extracts raw text from a result PDF buffer. */
export const parsePdfText = async (buffer) => {
  const data = await pdf(buffer);
  return data.text;
};

// Matches a roll-number-shaped token at the start of a line - most result
// PDFs print each student's block starting with their roll number. This is
// the same shape of pattern used in utils/extractRollNumber.js for queries.
const ROLL_NUMBER_LINE = /^\s*(\d{2}[A-Za-z]{2,5}\d{2,5}|\d{6,})\b/;

/**
 * Cheap, deterministic first pass: split raw PDF text into per-student
 * chunks by finding lines that look like they start a new student's block
 * (roll-number-shaped token at line start). This avoids sending the *entire*
 * PDF text through the LLM as one call, which for large class results
 * (60-100+ students) risks (a) hitting context/token limits, (b) the LLM
 * silently merging or dropping students in the middle of a huge input, and
 * (c) unnecessary cost.
 *
 * Returns null if the text doesn't cleanly split this way (e.g. unusual
 * layout, fewer than 2 recognizable boundaries) - callers should fall back
 * to the LLM-based segmentation in that case.
 */
const regexSegmentByStudent = (rawText) => {
  const lines = rawText.split("\n");
  const boundaries = [];
  lines.forEach((line, i) => {
    if (ROLL_NUMBER_LINE.test(line)) boundaries.push(i);
  });

  // Need at least a couple of clean boundaries for this to be trustworthy;
  // a single match could just be a page header/footer repeating a number.
  if (boundaries.length < 2) return null;

  const chunks = [];
  for (let i = 0; i < boundaries.length; i++) {
    const start = boundaries[i];
    const end = i + 1 < boundaries.length ? boundaries[i + 1] : lines.length;
    const chunkLines = lines.slice(start, end);
    const rollMatch = chunkLines[0].match(ROLL_NUMBER_LINE);
    chunks.push({ rollNumber: rollMatch[1], rawText: chunkLines.join("\n").trim() });
  }
  return chunks;
};

/**
 * Step 1: split the raw PDF text into per-student chunks.
 * Tries the cheap regex-based split first (deterministic, free, and
 * reliable when the PDF has a predictable roll-number-per-block layout).
 * Falls back to an LLM segmentation pass only when the regex split doesn't
 * find enough boundaries to trust - keeping cost and hallucination risk
 * down for the common case while still handling unusual PDF layouts.
 * Returns: [{ rollNumber, rawText }]
 */
const segmentByStudent = async (rawText) => {
  const regexResult = regexSegmentByStudent(rawText);
  if (regexResult) return regexResult;

  const system = `You segment raw text extracted from a college semester result PDF into
per-student chunks. Respond ONLY with JSON: {"students": [{"rollNumber": "...", "rawText": "..."}]}.
Each rawText should contain everything about that one student only (name, subjects, grades, SGPA/CGPA).
Do not summarize or drop information - copy the relevant raw lines as-is.`;

  const response = await complete(system, rawText, { json: true });
  try {
    const parsed = JSON.parse(response);
    return parsed.students ?? [];
  } catch {
    throw new Error("Failed to segment PDF text into per-student chunks (LLM returned invalid JSON)");
  }
};

const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
};

/**
 * Runs `worker` over `items` with at most `limit` in flight at once.
 * Used to parallelize per-batch LLM extraction calls (previously fully
 * sequential, which made large PDFs with many batches needlessly slow)
 * while still respecting LLM API rate limits.
 */
const mapWithConcurrency = async (items, limit, worker) => {
  const results = new Array(items.length);
  let nextIndex = 0;

  const runNext = async () => {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      results[current] = await worker(items[current], current);
    }
  };

  const workers = Array.from({ length: Math.min(limit, items.length) }, runNext);
  await Promise.all(workers);
  return results;
};

/**
 * Step 2: for one batch (5-10 students), ask the LLM to produce structured
 * result data matching the Result schema.
 */
const extractBatchStructured = async (studentChunks) => {
  const system = `You extract structured academic result data from raw text chunks, one per student.
Respond ONLY with JSON: {"results": [{
  "rollNumber": "string",
  "studentName": "string",
  "subjects": [{"code": "string", "name": "string", "credits": number, "grade": "string"}],
  "sgpa": number,
  "cgpa": number,
  "status": "pass" | "fail" | "withheld",
  "reappearSubjects": "string"
}]}.
"reappearSubjects" is "N/A" if the student passed cleanly, otherwise the name(s) of the
subject(s) they need to reappear in (comma-separated if more than one) - look for
backlog/reappear/RA/fail markers against individual subjects in the text.
If a field is not present in the text, omit it or use null - do not invent data.`;

  const userPrompt = JSON.stringify(studentChunks);
  const response = await complete(system, userPrompt, { json: true });
  try {
    const parsed = JSON.parse(response);
    return parsed.results ?? [];
  } catch {
    throw new Error("Failed to extract structured results from batch (LLM returned invalid JSON)");
  }
};

/**
 * Full pipeline: PDF buffer -> segmented -> batched (5-10/batch) -> each
 * batch extracted + flagged + saved to the PendingResult staging collection
 * (NOT the live Result collection or Pinecone - those only get written to
 * once an admin reviews and commits, see pendingResultController.js).
 * Batches run with bounded concurrency, and per-batch status tracking means
 * a failure only requires retrying that one batch.
 *
 * @param {Buffer} pdfBuffer
 * @param {string} sourcePdfUrl   Cloudinary URL of the uploaded PDF
 * @param {string} uploadedBy     admin user id
 * @param {{ branch?: string, semester?: number, year?: number }} context
 */
export const runExtractionPipeline = async (pdfBuffer, sourcePdfUrl, uploadedBy, context = {}) => {
  const rawText = await parsePdfText(pdfBuffer);
  const students = await segmentByStudent(rawText);

  if (!students.length) {
    throw new Error("No students could be identified in this PDF");
  }

  // Sanity check: how many roll-number-shaped tokens actually appear in the
  // raw text vs. how many students we ended up with after segmentation. A
  // big gap suggests segmentation dropped or merged some students - surfaced
  // to the admin in the upload response rather than failing silently.
  const rollTokensInText = new Set(
    (rawText.match(new RegExp(ROLL_NUMBER_LINE.source, "gm")) || []).map((m) => m.trim())
  );
  const segmentationGap = Math.max(0, rollTokensInText.size - students.length);

  const batches = chunkArray(students, BATCH_SIZE);

  const batchDocs = await mapWithConcurrency(batches, CONCURRENCY, async (batch) => {
    const batchDoc = await ExtractionBatch.create({
      sourcePdfUrl,
      uploadedBy,
      branch: context.branch,
      semester: context.semester,
      year: context.year,
      rollNumbersInBatch: batch.map((s) => s.rollNumber),
      studentChunks: batch,
      status: "processing",
      attempts: 1,
    });

    try {
      const structuredResults = await extractBatchStructured(batch);
      await savePendingBatch(structuredResults, batchDoc, context, uploadedBy);
      batchDoc.status = "completed";
      await batchDoc.save();
    } catch (err) {
      batchDoc.status = "failed";
      batchDoc.errorMessage = err.message;
      await batchDoc.save();
      // continue to next batch - one failed batch shouldn't block the rest
    }
    return batchDoc;
  });

  batchDocs.segmentationGap = segmentationGap;
  return batchDocs;
};

/**
 * Saves structured results into the PendingResult staging collection with
 * computed review flags. Nothing here touches the live Result collection or
 * Pinecone - that only happens when an admin commits reviewed rows via
 * pendingResultController.commitPendingResults.
 */
const savePendingBatch = async (structuredResults, batchDoc, context, uploadedBy) => {
  const seenRollNumbers = [];
  const docs = structuredResults.map((r) => {
    const flags = computeResultFlags(r, seenRollNumbers);
    if (r.rollNumber) seenRollNumbers.push(String(r.rollNumber).trim());

    return {
      rollNumber: r.rollNumber,
      studentName: r.studentName,
      branch: context.branch,
      year: context.year,
      semester: context.semester,
      subjects: r.subjects || [],
      sgpa: r.sgpa,
      cgpa: r.cgpa,
      status: r.status || "pass",
      reappearSubjects: r.reappearSubjects || (r.status === "pass" || !r.status ? "N/A" : ""),
      sourceBatch: batchDoc._id,
      uploadedBy,
      flags,
      flagged: flags.length > 0,
      verified: flags.length === 0, // clean rows pre-ticked; flagged rows require explicit admin action
    };
  });

  if (docs.length) await PendingResult.insertMany(docs);
};

/**
 * Retries every failed batch for a given source PDF upload by re-running
 * just the structuring step on that batch's already-segmented student
 * chunks (stored on the ExtractionBatch doc) - no need to re-parse or
 * re-segment the whole PDF, and no need for the admin to re-upload.
 */
export const retryFailedBatches = async (sourcePdfUrl, context = {}) => {
  const failedBatches = await ExtractionBatch.find({ sourcePdfUrl, status: "failed" });

  const retried = await mapWithConcurrency(failedBatches, CONCURRENCY, async (batchDoc) => {
    batchDoc.attempts += 1;
    batchDoc.status = "processing";
    await batchDoc.save();
    try {
      const structuredResults = await extractBatchStructured(batchDoc.studentChunks);
      await savePendingBatch(
        structuredResults,
        batchDoc,
        { branch: batchDoc.branch, semester: batchDoc.semester, year: batchDoc.year, ...context },
        batchDoc.uploadedBy
      );
      batchDoc.status = "completed";
      batchDoc.errorMessage = undefined;
    } catch (err) {
      batchDoc.status = "failed";
      batchDoc.errorMessage = err.message;
    }
    await batchDoc.save();
    return batchDoc;
  });

  return retried;
};

/**
 * Extracts individual question statements from a PYQ (previous-year
 * question paper) PDF - powers the student-facing "Ask AI" button per
 * question. Best-effort: returns [] on failure rather than throwing, so a
 * PYQ upload never fails just because extraction had trouble with a PDF's
 * layout (e.g. multi-column papers, scanned images).
 */
export const extractPYQQuestions = async (pdfBuffer) => {
  try {
    const rawText = await parsePdfText(pdfBuffer);
    if (!rawText || rawText.trim().length < 20) return [];

    const system = `You extract individual exam question statements from raw text taken from a
previous-year question paper PDF. Respond ONLY with JSON: {"questions": ["...", "..."]}.
Each entry should be one complete question statement (merge multi-line questions into one
string, drop marks/instructions/headers/page numbers). If sub-parts (a), (b) exist under one
question number, keep them as separate entries. Do not invent questions that aren't in the text.`;

    const response = await complete(system, rawText, { json: true, temperature: 0 });
    const parsed = JSON.parse(response);
    return Array.isArray(parsed.questions) ? parsed.questions.filter(Boolean) : [];
  } catch {
    return [];
  }
};
