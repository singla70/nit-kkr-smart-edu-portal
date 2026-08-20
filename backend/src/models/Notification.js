import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    category: { type: String, enum: ["attendance", "internship", "scholarship", "exam", "general"], default: "general" },
    fileUrl: { type: String }, // Cloudinary URL of policy PDF, if any
    content: { type: String }, // extracted/summarized text for filter-based search
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    isVisible: { type: Boolean, default: true }, // teacher/admin can hide without deleting

  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
