import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    attachmentUrl: { type: String },
    branch: { type: String, index: true },
    semester: { type: Number, index: true },
    subject: { type: String, index: true },
    dueDate: { type: Date },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // teacher
    isVisible: { type: Boolean, default: true }, // teacher/admin can hide without deleting

  },
  { timestamps: true }
);

export default mongoose.model("Assignment", assignmentSchema);
