import mongoose from "mongoose";

// Tracks one LLM extraction call covering 5-10 students from an uploaded result PDF.
// Enables resumable processing: on failure, only failed batches are retried,
// completed batches are never reprocessed.
const extractionBatchSchema = new mongoose.Schema(
  {
    sourcePdfUrl: { type: String, required: true }, // Cloudinary URL of the original upload
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    branch: String,
    semester: Number,
    year: Number,
    rollNumbersInBatch: [String],
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
      index: true,
    },
    attempts: { type: Number, default: 0 },
    errorMessage: { type: String },
    // Per-student raw text chunks for this batch (as produced by the
    // segmentation step). Stored so a failed batch can be retried by
    // re-running just the structuring step on this batch, instead of
    // re-parsing and re-segmenting the entire source PDF again.
    studentChunks: [{ rollNumber: String, rawText: String }],
  },
  { timestamps: true }
);

export default mongoose.model("ExtractionBatch", extractionBatchSchema);
