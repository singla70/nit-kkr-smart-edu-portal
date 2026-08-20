import { complete } from "./llmService.js";
import { queryResults } from "./pineconeService.js";
import { extractRollNumber } from "../utils/extractRollNumber.js";
import { buildResultSummaryText } from "../utils/resultSummaryText.js";
import Notification from "../models/Notification.js";
import Announcement from "../models/Announcement.js";
import Result from "../models/Result.js";
import SearchLog from "../models/SearchLog.js";

/**
 * Detects which domain a user's chat message belongs to, so the unified
 * chat can route to the right data source instead of always doing a full
 * RAG search across everything.
 */
const detectIntent = async (message) => {
  const system = `Classify the user's message into exactly one category. Respond ONLY with
JSON: {"intent": "results" | "notifications" | "announcements" | "general"}.
- "results": anything about grades, SGPA, CGPA, marks, pass/fail, semester result
- "notifications": anything about attendance policy, internship policy, scholarship, exam policy
- "announcements": anything about college announcements, notices, events
- "general": anything else (greetings, general questions, small talk)`;

  const response = await complete(system, message, { json: true, temperature: 0 });
  try {
    return JSON.parse(response).intent || "general";
  } catch {
    return "general";
  }
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

Formatting: if the answer covers more than one student/record, format it as a markdown
list - one line per record, starting with "- ". If it's about a single student, answer
in plain sentences instead.

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
  const system = `Answer using ONLY this policy/notification context.\n\nContext:\n${context}`;
  return complete(system, message);
};

const handleAnnouncementsIntent = async (message) => {
  const matches = await Announcement.find({
    $or: [{ title: new RegExp(message, "i") }, { body: new RegExp(message, "i") }],
  }).limit(5);
  if (!matches.length) return "I couldn't find a relevant announcement for that.";
  const context = matches.map((a) => `${a.title}: ${a.body || ""}`).join("\n---\n");
  const system = `Answer using ONLY this announcement context.\n\nContext:\n${context}`;
  return complete(system, message);
};

const handleGeneralIntent = async (message) => {
  const system = `You are NeuralAssist, the AI assistant of the NIT KKR Smart Edu Portal.
Be concise, friendly, and helpful. If the question needs specific result/policy/announcement
data you don't have, say the student should ask about it directly.`;
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
