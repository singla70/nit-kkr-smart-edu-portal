import { complete } from "./llmService.js";
import { queryResults } from "./pineconeService.js";
import { extractRollNumber } from "../utils/extractRollNumber.js";
import { buildResultSummaryText } from "../utils/resultSummaryText.js";
import Notification from "../models/Notification.js";
import Announcement from "../models/Announcement.js";
import Result from "../models/Result.js";
import SearchLog from "../models/SearchLog.js";

// Appended to every answer-generating prompt (not the intent-classification
// one) - keeps replies short, plain-text, and on-topic regardless of which
// LLM is behind GROQ_MODEL. A short question like "HTML full form" should
// get a short answer, not a wall of text.
const FORMATTING_RULE = `
Formatting rules:
- Answer ONLY what was asked, as briefly as that genuinely allows - usually 1-3 sentences.
- Plain text only. No markdown symbols (no **, ##, backticks, or headers).
- No preamble, no restating the question, no "Sure, here's..." - start directly with the answer.
- Use a "- " list ONLY when the answer genuinely covers multiple records/items; otherwise plain sentences.`;

/**
 * Best-effort JSON extraction: the model is asked to return only JSON, but
 * some models occasionally wrap it in stray text - try a direct parse first,
 * then fall back to pulling out the first {...} block before giving up.
 */
const parseJsonLoose = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
};

/**
 * Detects which domain a user's chat message belongs to, so the unified
 * chat can route to the right data source instead of always doing a full
 * RAG search across everything.
 */
const detectIntent = async (message) => {
  const system = `Classify the user's message into exactly one category. Respond with ONLY a
JSON object, nothing else - no explanation, no reasoning, just: {"intent": "results" | "notifications" | "announcements" | "general"}.
- "results": anything about grades, SGPA, CGPA, marks, pass/fail, semester result
- "notifications": anything about attendance policy, internship policy, scholarship, exam policy
- "announcements": anything about college announcements, notices, events
- "general": anything else (greetings, general questions, small talk)`;

  const response = await complete(system, message, { json: true, temperature: 0 });
  const parsed = parseJsonLoose(response);
  return parsed?.intent || "general";
};

const handleResultsIntent = async (message) => {
  // Same hybrid retrieval as the guest result query: exact roll number ->
  // direct MongoDB lookup (accurate); otherwise -> semantic search.
  const rollNumber = extractRollNumber(message);
  let context;

  if (rollNumber) {
    const directMatches = await Result.find({ rollNumber }).limit(10);
    if (directMatches.length) {
      context = directMatches.map((r) => buildResultSummaryText(r)).join("\n---\n");
    }
  }

  if (!context) {
    const hits = await queryResults(message, undefined, 5);
    if (!hits.length) return "I couldn't find a matching result for that question.";
    context = hits.map((h) => h.fields?.text || h.text).join("\n---\n");
  }

  const system = `Answer the student's question using ONLY this result context. Never invent grades.
${FORMATTING_RULE}
- Exception: if the answer covers more than one student/record, use a "- " list, one line per record.

Context:
${context}`;
  return complete(system, message);
};

const handleNotificationsIntent = async (message) => {
  // filter-based search over notification titles/content (no vector search, as decided)
  const matches = await Notification.find({
    $or: [{ title: new RegExp(message, "i") }, { content: new RegExp(message, "i") }],
  }).limit(5);
  if (!matches.length) return "I couldn't find a relevant policy notification for that.";
  const context = matches.map((n) => `${n.title}: ${n.content || ""}`).join("\n---\n");
  const system = `Answer using ONLY this policy/notification context.${FORMATTING_RULE}\n\nContext:\n${context}`;
  return complete(system, message);
};

const handleAnnouncementsIntent = async (message) => {
  const matches = await Announcement.find({
    $or: [{ title: new RegExp(message, "i") }, { body: new RegExp(message, "i") }],
  }).limit(5);
  if (!matches.length) return "I couldn't find a relevant announcement for that.";
  const context = matches.map((a) => `${a.title}: ${a.body || ""}`).join("\n---\n");
  const system = `Answer using ONLY this announcement context.${FORMATTING_RULE}\n\nContext:\n${context}`;
  return complete(system, message);
};

const handleGeneralIntent = async (message) => {
  const system = `You are NeuralAssist, the AI assistant of the NIT KKR Smart Edu Portal.
Be friendly and helpful. If the question needs specific result/policy/announcement data you
don't have, say the student should ask about it directly instead of guessing.
${FORMATTING_RULE}`;
  return complete(system, message);
};

/** Unified chat entry point - detects intent then routes to the right handler. */
export const handleChatMessage = async (message) => {
  const intent = await detectIntent(message);
  SearchLog.create({ queryText: message.trim(), source: "chat", intent }).catch(() => {});

  let answer;
  switch (intent) {
    case "results":
      answer = await handleResultsIntent(message);
      break;
    case "notifications":
      answer = await handleNotificationsIntent(message);
      break;
    case "announcements":
      answer = await handleAnnouncementsIntent(message);
      break;
    default:
      answer = await handleGeneralIntent(message);
  }

  return { intent, answer };
};