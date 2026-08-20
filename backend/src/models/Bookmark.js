import mongoose from "mongoose";

const bookmarkSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    itemType: { type: String, enum: ["pyq", "study_material", "announcement", "notification"], required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  { timestamps: true }
);

bookmarkSchema.index({ user: 1, itemType: 1, itemId: 1 }, { unique: true });

export default mongoose.model("Bookmark", bookmarkSchema);
