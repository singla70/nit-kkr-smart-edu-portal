import asyncHandler from "express-async-handler";
import PendingResult from "../models/PendingResult.js";
import Result from "../models/Result.js";
import { upsertResultRecords } from "../services/pineconeService.js";
import { buildResultSummaryText } from "../utils/resultSummaryText.js";
import { computeResultFlags } from "../utils/resultFlags.js";

// @desc  List pending (unverified) extracted results, optionally filtered
//        to flagged-only so the admin can triage problems first.
// @route GET /api/admin/results/pending
// @access Private/Admin
export const getPendingResults = asyncHandler(async (req, res) => {
  const { flaggedOnly, sourceBatch, branch, semester } = req.query;
  const filter = {};
  if (flaggedOnly === "true") filter.flagged = true;
  if (sourceBatch) filter.sourceBatch = sourceBatch;
  if (branch) filter.branch = branch;
  if (semester) filter.semester = Number(semester);

  const pending = await PendingResult.find(filter).sort({ flagged: -1, createdAt: -1 }).limit(500);
  res.json({
    count: pending.length,
    flaggedCount: pending.filter((p) => p.flagged).length,
    results: pending,
  });
});

// @desc  Edit a pending result's fields (admin correcting a wrong extraction)
// @route PUT /api/admin/results/pending/:id
// @access Private/Admin
export const updatePendingResult = asyncHandler(async (req, res) => {
  const pending = await PendingResult.findById(req.params.id);
  if (!pending) {
    res.status(404);
    throw new Error("Pending result not found");
  }

  const editable = ["rollNumber", "studentName", "branch", "year", "semester", "subjects", "sgpa", "cgpa", "status", "examType", "reappearSubjects"];
  editable.forEach((key) => {
    if (req.body[key] !== undefined) pending[key] = req.body[key];
  });

  // Recompute flags after the edit so a fixed row can clear its flag(s)
  // automatically, and a newly-introduced problem (e.g. admin fat-fingers a
  // number out of range) gets caught too.
  const recomputedFlags = computeResultFlags(pending.toObject());
  pending.flags = recomputedFlags;
  pending.flagged = recomputedFlags.length > 0;

  await pending.save();
  res.json(pending);
});

// @desc  Tick / untick a pending result for inclusion in the next commit
// @route PATCH /api/admin/results/pending/:id/verify
// @access Private/Admin
export const toggleVerified = asyncHandler(async (req, res) => {
  const pending = await PendingResult.findById(req.params.id);
  if (!pending) {
    res.status(404);
    throw new Error("Pending result not found");
  }
  pending.verified = req.body.verified !== undefined ? Boolean(req.body.verified) : !pending.verified;
  await pending.save();
  res.json(pending);
});

// @desc  Discard a pending result entirely (garbage extraction, never goes live)
// @route DELETE /api/admin/results/pending/:id
// @access Private/Admin
export const rejectPendingResult = asyncHandler(async (req, res) => {
  const deleted = await PendingResult.findByIdAndDelete(req.params.id);
  if (!deleted) {
    res.status(404);
    throw new Error("Pending result not found");
  }
  res.json({ message: "Pending result discarded" });
});

// @desc  Commit all currently-ticked (verified=true) pending results into
//        the live Result collection + Pinecone, then remove them from the
//        staging collection. Flagged-and-unticked rows are left in place
//        for the admin to keep fixing.
// @route POST /api/admin/results/pending/commit
// @access Private/Admin
export const commitPendingResults = asyncHandler(async (req, res) => {
  // Accept an explicit id list (commit selection from the UI) or default to
  // "all currently ticked" if none is given. `force: true` lets the admin
  // knowingly push ticked-but-still-flagged rows live anyway (e.g. a flag
  // like "no subjects extracted" that the review UI has no field to fix) -
  // the admin has final say, flags are a warning, not a hard lock.
  const { ids, force } = req.body;
  const filter = { verified: true };
  if (Array.isArray(ids) && ids.length) filter._id = { $in: ids };

  const toCommit = await PendingResult.find(filter);
  if (!toCommit.length) {
    res.json({ committed: 0, message: "Nothing ticked to commit" });
    return;
  }

  const pineconeRecords = [];
  const committedIds = [];
  let skippedForFlags = 0;

  for (const p of toCommit) {
    // A row can be ticked but still fail a hard re-validation (e.g. an
    // admin ticked it before editing a bad field) - re-check right before
    // writing to the live collection rather than trusting the tick alone.
    // With force=true the admin has explicitly chosen to proceed anyway.
    const finalFlags = computeResultFlags(p.toObject());
    if (finalFlags.length > 0 && !force) {
      skippedForFlags += 1;
      continue; // leave in staging for another pass
    }

    const result = await Result.findOneAndUpdate(
      { rollNumber: p.rollNumber, semester: p.semester },
      {
        rollNumber: p.rollNumber,
        studentName: p.studentName,
        branch: p.branch,
        year: p.year,
        semester: p.semester,
        examType: p.examType,
        subjects: p.subjects,
        sgpa: p.sgpa,
        cgpa: p.cgpa,
        status: p.status,
        reappearSubjects: p.reappearSubjects,
        sourceBatch: p.sourceBatch,
      },
      { upsert: true, new: true }
    );

    const vectorId = `result_${result._id}`;
    result.pineconeVectorId = vectorId;
    await result.save();

    pineconeRecords.push({
      id: vectorId,
      text: buildResultSummaryText(result),
      metadata: { rollNumber: result.rollNumber, branch: result.branch, semester: result.semester },
    });

    committedIds.push(p._id);
  }

  if (pineconeRecords.length) await upsertResultRecords(pineconeRecords);
  if (committedIds.length) await PendingResult.deleteMany({ _id: { $in: committedIds } });

  res.json({
    committed: committedIds.length,
    skipped: skippedForFlags,
    message:
      skippedForFlags > 0
        ? "Some ticked rows still have flags and were left in pending for review"
        : "All ticked rows committed",
  });
});
