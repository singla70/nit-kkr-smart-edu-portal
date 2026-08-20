import mongoose from "mongoose";

// Previous Year Questions - filter based, no vector search (per decided plan)
const pyqSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, index: true },
    branch: { type: String, index: true },
    semester: { type: Number, index: true },
    year: { type: Number, index: true }, // exam year
    examType: { type: String, enum: ["mid", "end", "other"], default: "end" },
    fileUrl: { type: String, required: true },
    questions: [{ type: String }], // extracted from the PDF at upload time, powers per-question "Ask AI"
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    isVisible: { type: Boolean, default: true }, // teacher/admin can hide without deleting

  },
  { timestamps: true }
);

export default mongoose.model("PYQ", pyqSchema);
