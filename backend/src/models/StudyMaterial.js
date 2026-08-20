import mongoose from "mongoose";

const studyMaterialSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    type: { type: String, enum: ["notes", "lab_manual", "other"], default: "notes" },
    subject: { type: String, index: true },
    branch: { type: String, index: true },
    semester: { type: Number, index: true },
    fileUrl: { type: String, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    isVisible: { type: Boolean, default: true }, // teacher/admin can hide without deleting

  },
  { timestamps: true }
);

export default mongoose.model("StudyMaterial", studyMaterialSchema);
