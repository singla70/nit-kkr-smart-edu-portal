import mongoose from "mongoose";

// Lightweight log of NL queries (result lookups + unified chat messages),
// used only to power the admin "trending searches" analytics.
const searchLogSchema = new mongoose.Schema(
  {
    queryText: { type: String, required: true, trim: true },
    source: { type: String, enum: ["result_query", "chat"], required: true },
    intent: { type: String }, // set for chat logs (results/notifications/announcements/general)
  },
  { timestamps: true }
);

export default mongoose.model("SearchLog", searchLogSchema);
