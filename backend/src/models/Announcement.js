import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    body: { type: String },
    fileUrl: { type: String },
    audience: { type: String, enum: ["all", "students", "teachers"], default: "all" },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    isVisible: { type: Boolean, default: true }, // teacher/admin can hide without deleting

  },
  { timestamps: true }
);

export default mongoose.model("Announcement", announcementSchema);
