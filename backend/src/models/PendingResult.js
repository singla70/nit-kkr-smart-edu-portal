import mongoose from "mongoose";

// Staging area for freshly-extracted results. We never write LLM output
// straight into the live `Result` collection (which feeds the guest/student
// lookup + Pinecone semantic search) - a result is something students make
// real decisions off of, so a wrong SGPA/CGPA or garbled subject list is not
// an acceptable failure mode for "the AI got it wrong sometimes".
//
// Flow: extraction -> PendingResult (this model) -> admin reviews each row
// in the "Pending Verification" panel, edits anything wrong, ticks the ones
// that are correct -> only ticked rows get committed into Result + Pinecone.
// Rejected/garbage rows can be discarded here without ever touching the
// live collection.
const pendingResultSchema = new mongoose.Schema(
  {
    rollNumber: { type: String, trim: true },
    studentName: { type: String, trim: true },
    branch: { type: String, trim: true },
    year: { type: Number },
    semester: { type: Number },
    examType: { type: String, enum: ["regular", "reappear"], default: "regular" },
    subjects: [
      {
        code: String,
        name: String,
        credits: Number,
        grade: String,
      },
    ],
    sgpa: { type: Number },
    cgpa: { type: Number },
    status: { type: String, enum: ["pass", "fail", "withheld"], default: "pass" },
    reappearSubjects: { type: String, trim: true, default: "N/A" },

    sourceBatch: { type: mongoose.Schema.Types.ObjectId, ref: "ExtractionBatch" },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Auto-computed by the flag rules right after extraction (see
    // utils/resultFlags.js). Admin can still tick a flagged row after fixing
    // it - flags are a review aid, not a hard block.
    flags: [{ type: String }],
    flagged: { type: Boolean, default: false, index: true },

    // Tick/untick state in the review UI. Defaults to true for clean rows so
    // the admin's job is mostly "scan and confirm", and false for flagged
    // rows so a problem can never be silently bulk-approved.
    verified: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

pendingResultSchema.index({ sourceBatch: 1 });

export default mongoose.model("PendingResult", pendingResultSchema);
