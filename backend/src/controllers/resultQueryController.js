import asyncHandler from "express-async-handler";
import { queryResults, hitField } from "../services/pineconeService.js";
import { complete } from "../services/llmService.js";
import { extractRollNumber } from "../utils/extractRollNumber.js";
import { buildResultSummaryText } from "../utils/resultSummaryText.js";
import Result from "../models/Result.js";
import SearchLog from "../models/SearchLog.js";

// @desc  Mode 1: direct natural-language query, e.g. "mera CGPA kya hai 12345 ka"
//        Public/guest - no login required (as decided).
// @route POST /api/results/query
// @access Public
export const queryResultsNL = asyncHandler(async (req, res) => {
  const { query } = req.body;
  if (!query || !query.trim()) {
    res.status(400);
    throw new Error("query is required");
  }

  // fire-and-forget - analytics logging should never block or fail the actual query
  SearchLog.create({ queryText: query.trim(), source: "result_query" }).catch(() => {});

  // Hybrid retrieval: if the query names an exact roll number, go straight to
  // MongoDB (100% accurate, no embedding ambiguity) instead of semantic
  // search - vector similarity is unreliable for exact numeric IDs, since
  // "124117005" and "124117001" can look nearly identical to an embedding
  // model even though they're different students.
  const rollNumber = extractRollNumber(query);
  let context;

  if (rollNumber) {
    const directMatches = await Result.find({ rollNumber }).limit(10);
    if (directMatches.length) {
      context = directMatches.map((r) => buildResultSummaryText(r)).join("\n---\n");
    }
  }

  // No exact roll number in the query - fall back to semantic search
  // (handles a name typed instead of a roll number, or generally phrased
  // questions). This is the original hybrid design this endpoint was built
  // for. The safety net against returning an irrelevant/unrelated student's
  // result is the similarity-score threshold applied inside queryResults()
  // (PINECONE_MIN_SCORE) - a weak/unrelated match gets dropped instead of
  // always returning the "closest anyway" result like before.
  if (!context) {
    const hits = await queryResults(query, undefined, 5);
    if (!hits.length) {
      return res.json({
        answer: "Sorry, I couldn't find any matching result for that query. Try including a roll number or the student's full name.",
        sources: [],
      });
    }
    context = hits.map((h) => hitField(h, "text")).join("\n---\n");
  }

  const system = `You are a helpful assistant answering a student's question about their
academic result, using ONLY the context provided below. If the context doesn't contain
the answer, say so honestly - never invent grades, SGPA, or CGPA.

Formatting rules:
- Answer ONLY what was asked, as briefly as that genuinely allows - usually 1-3 sentences.
- Plain text only. No markdown symbols (no **, ##, backticks, or headers).
- No preamble, no restating the question - start directly with the answer.
- Exception: if the answer covers more than one student/record, use a "- " list, one line per record.

Context:
${context}`;

  const answer = await complete(system, query, { temperature: 0.1 });

  res.json({ answer });
});

// @desc  Mode 2: structured filter query - direct MongoDB lookup, no LLM
//        (faster, free). Public/guest - no login required.
// @route GET /api/results/filter
// @access Public
export const filterResults = asyncHandler(async (req, res) => {
  const { rollNumber, branch, semester, year, examType } = req.query;

  const filter = {};
  if (rollNumber) filter.rollNumber = rollNumber;
  if (branch) filter.branch = branch;
  if (semester) filter.semester = Number(semester);
  if (year) filter.year = Number(year);
  if (examType) filter.examType = examType;

  if (!Object.keys(filter).length) {
    res.status(400);
    throw new Error("Provide at least one filter: rollNumber, branch, semester, year, examType");
  }

  const results = await Result.find(filter).limit(100).sort({ semester: 1 });
  res.json({ count: results.length, results });
});