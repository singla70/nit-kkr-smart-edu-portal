import express from "express";
import { queryResultsNL, filterResults } from "../controllers/resultQueryController.js";
import { chat } from "../controllers/chatController.js";
import { aiLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Public/guest routes - free result lookup, no login required (as decided).
router.post("/query", aiLimiter, queryResultsNL); // mode 1: direct natural-language query
router.get("/filter", filterResults); // mode 2: structured filters (no LLM call, no limit needed)
router.post("/chat/guest", aiLimiter, chat); // guest variant of the unified chat, no login

export default router;
