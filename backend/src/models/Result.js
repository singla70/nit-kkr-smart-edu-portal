import mongoose from "mongoose";

// One document per student per semester result (extracted from the uploaded PDF)
const resultSchema = new mongoose.Schema(
  {
    rollNumber: { type: String, required: true, trim: true, index: true },
    studentName: { type: String, trim: true },
    branch: { type: String, trim: true, index: true },
    year: { type: Number, index: true },
    semester: { type: Number, index: true },
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
    // Free-text reappear/backlog field, the one subject-level detail that's
    // actually operationally used: "N/A" for a clean pass, otherwise the
    // subject name(s) the student needs to reappear in (comma-separated if
    // more than one).
    reappearSubjects: { type: String, trim: true, default: "N/A" },
    sourceBatch: { type: mongoose.Schema.Types.ObjectId, ref: "ExtractionBatch" },
    pineconeVectorId: { type: String }, // id of the embedded chunk in Pinecone (results index)
  },
  { timestamps: true }
);

resultSchema.index({ rollNumber: 1, semester: 1 }, { unique: true });

export default mongoose.model("Result", resultSchema);
