import asyncHandler from "express-async-handler";
import { handleChatMessage } from "../services/chatService.js";

// @desc  Unified AI chat - auto intent detection (results/notifications/announcements/general)
// @route POST /api/chat  (mounted for student + teacher, protected)
//        POST /api/results/chat/guest (public, no login)
// @access Private (student/teacher) or Public (guest variant)
export const chat = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    res.status(400);
    throw new Error("message is required");
  }

  // req.user is set for the logged-in student/teacher routes; undefined on
  // the guest route (mounted without `protect`) - handleChatMessage treats
  // that as an anonymous caller and scopes retrieval accordingly (e.g. never
  // guesses whose result to show without an explicit roll number).
  const { intent, answer } = await handleChatMessage(message, req.user);
  res.json({ intent, answer });
});