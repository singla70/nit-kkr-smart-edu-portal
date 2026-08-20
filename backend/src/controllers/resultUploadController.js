import asyncHandler from "express-async-handler";
import { uploadBufferToCloudinary } from "../utils/cloudinaryUpload.js";
import { runExtractionPipeline, retryFailedBatches } from "../services/extractionService.js";
import ExtractionBatch from "../models/ExtractionBatch.js";

// @desc  Admin uploads a class/semester result PDF - triggers immediate
//        batch-wise extraction (5-10 students/LLM call) into the pending
//        (unverified) staging collection. Nothing goes live until an admin
//        reviews it in the Pending Verification panel and commits it.
// @route POST /api/admin/results/upload
// @access Private/Admin
export const uploadResultPdf = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("PDF file is required (field name: file)");
  }

  const { branch, semester, year } = req.body;
  if (!branch || !semester) {
    res.status(400);
    throw new Error("branch and semester are required");
  }

  const sourcePdfUrl = await uploadBufferToCloudinary(req.file.buffer, "results", req.file.originalname);

  const batches = await runExtractionPipeline(req.file.buffer, sourcePdfUrl, req.user._id, {
    branch,
    semester: Number(semester),
    year: year ? Number(year) : undefined,
  });

  const summary = {
    totalBatches: batches.length,
    completed: batches.filter((b) => b.status === "completed").length,
    failed: batches.filter((b) => b.status === "failed").length,
    // How many roll-number-shaped tokens in the raw PDF text didn't end up
    // in any segmented student - a non-zero value is worth a manual look,
    // since it means the extraction likely missed someone.
    possiblyMissedStudents: batches.segmentationGap || 0,
  };

  res.status(201).json({
    message: "Extraction finished - review results in the Pending Verification panel before they go live",
    sourcePdfUrl,
    summary,
    batches: batches.map((b) => ({ id: b._id, status: b.status, rollNumbers: b.rollNumbersInBatch, error: b.errorMessage })),
  });
});

// @desc  Retry every failed extraction batch for a given source PDF, using
//        the already-segmented text stored on each batch (no re-upload needed).
// @route POST /api/admin/results/batches/retry
// @access Private/Admin
export const retryBatches = asyncHandler(async (req, res) => {
  const { sourcePdfUrl } = req.body;
  if (!sourcePdfUrl) {
    res.status(400);
    throw new Error("sourcePdfUrl is required");
  }
  const retried = await retryFailedBatches(sourcePdfUrl);
  res.json({
    retried: retried.length,
    completed: retried.filter((b) => b.status === "completed").length,
    stillFailed: retried.filter((b) => b.status === "failed").length,
    batches: retried.map((b) => ({ id: b._id, status: b.status, error: b.errorMessage })),
  });
});

// @desc  List extraction batches (for admin to monitor / retry failures)
// @route GET /api/admin/results/batches
// @access Private/Admin
export const getExtractionBatches = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const batches = await ExtractionBatch.find(filter).sort({ createdAt: -1 }).limit(100);
  res.json(batches);
});
