import { complete } from "./llmService.js";
import { queryContent, hitField } from "./pineconeService.js";
import { extractRollNumber } from "../utils/extractRollNumber.js";
import { buildResultSummaryText } from "../utils/resultSummaryText.js";
import Result from "../models/Result.js";
import SearchLog from "../models/SearchLog.js";

// ---------------------------------------------------------------------------
// Unified RAG chat.
//
// Old design: one LLM call classified the message into a single bucket, then
// a second LLM call answered using that bucket's data. That meant (a) two
// LLM calls per message, (b) a compound question ("any assignment due, also
// what's the attendance policy") lost half its answer since only one bucket
// could "win", and (c) notifications/announcements/assignments used ad-hoc
// Mongo keyword search while only results had real semantic search - so the
// bot could only reliably answer result questions.
//
// New design: routing is done with cheap keyword heuristics (no LLM call at
// all) against a *unified* Pinecone index that now holds every content type
// (result/notification/announcement/assignment/pyq/study_material), each
// tagged with a "type" metadata field. If the heuristics don't confidently
// match a type, we fall back to ONE type-unrestricted semantic search across
// the whole index instead of guessing - this is also what makes a plain
// greeting fall through cleanly to the general/no-context handler (nothing
// scores above the similarity threshold). Only ONE LLM call happens per
// message in the common case: the final answer, once retrieval is done.
// ---------------------------------------------------------------------------

const FORMATTING_RULE = `
Formatting rules:
- Answer ONLY what was asked, as briefly as that genuinely allows - usually 1-3 sentences.
- Plain text only. No markdown symbols (no **, ##, backticks, or headers).
- No preamble, no restating the question, no "Sure, here's..." - start directly with the answer.
- Use a "- " list ONLY when the answer genuinely covers multiple records/items; otherwise plain sentences.
- If the question has multiple parts across different topics, answer each part, briefly.`;

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Keyword sets used purely to ROUTE the query to the right Pinecone type
// filter(s) - not to match content directly (that's what the semantic search
// itself does). English terms are used as-is even in Hinglish phrasing,
// since words like "assignment", "result", "notification" are the common
// loanwords students actually type.
const CATEGORY_KEYWORDS = {
  result: ["result", "results", "grade", "grades", "marks", "sgpa", "cgpa", "gpa", "backlog", "reappear", "transcript"],
  notification: ["notification", "notifications", "policy", "policies", "attendance", "internship", "scholarship", "circular"],
  announcement: ["announcement", "announcements", "notice", "notices", "event", "events", "holiday", "holidays"],
  assignment: ["assignment", "assignments", "homework", "submission", "submissions", "submit", "due date", "deadline"],
  pyq: ["pyq", "pyqs", "previous year", "question paper", "question papers", "old paper", "sample paper"],
  study_material: ["notes", "study material", "study materials", "lab manual", "reference material"],
};

const NON_RESULT_TYPES = Object.keys(CATEGORY_KEYWORDS).filter((t) => t !== "result");
const RESULTS_PER_TYPE = 4; // keep merged multi-topic context readable rather than dumping everything

const detectCategories = (message) => {
  const lower = message.toLowerCase();
  return Object.entries(CATEGORY_KEYWORDS)
    .filter(([, keywords]) => keywords.some((kw) => new RegExp(`\\b${escapeRegex(kw)}\\b`, "i").test(lower)))
    .map(([type]) => type);
};

/**
 * Builds the Pinecone metadata filter for one content type, applying the
 * visibility/ownership rules that used to live in per-controller Mongo
 * queries:
 * - notifications/announcements/assignments/pyqs/study material: isVisible
 * - announcements: audience-scoped (students never see teacher-only posts
 *   and vice versa; a guest is treated like a student for this purpose)
 * - assignments/pyqs/study material: narrowed to the student's own branch
 *   when known, so a CSE student doesn't get an ECE assignment mixed in
 * - results: intentionally NOT scoped to any one identity - looking up
 *   another student's result by name/roll number/surname is the whole
 *   point of the semantic search here (same for guest, student, and
 *   teacher). Only content that's actually private (notifications meant for
 *   one audience, etc.) gets scoped; results are treated as public lookup
 *   data, same as the roll-number filter endpoint always was.
 */
const buildTypeFilter = (type, user) => {
  const filter = { type: { $eq: type } };
  switch (type) {
    case "notification":
      filter.isVisible = { $eq: true };
      break;
    case "announcement":
      filter.isVisible = { $eq: true };
      filter.audience = { $in: user?.role === "teacher" ? ["all", "teachers"] : ["all", "students"] };
      break;
    case "assignment":
    case "pyq":
    case "study_material":
      filter.isVisible = { $eq: true };
      if (user?.role === "student" && user.branch) filter.branch = { $eq: user.branch };
      break;
    default:
      break;
  }
  return filter;
};

const retrieveForType = async (type, message, user, topK = RESULTS_PER_TYPE) => {
  const hits = await queryContent(message, { filter: buildTypeFilter(type, user), topK });
  return hits.map((h) => hitField(h, "text")).filter(Boolean);
};

const handleGeneralIntent = async (message) => {
  const system = `You are NeuralAssist, the AI assistant of the NIT KKR Smart Edu Portal.
Be friendly and helpful. If the question needs specific result/policy/announcement/assignment/
PYQ/study material data you don't have, say the student should ask about it directly instead of guessing.
${FORMATTING_RULE}`;
  return complete(system, message);
};

const logSearch = (message, intent) => {
  SearchLog.create({ queryText: message.trim(), source: "chat", intent }).catch(() => {});
};

/**
 * @param {string} message
 * @param {object|null} [user]  req.user for logged-in student/teacher chat; null/undefined for the guest route
 */
export const handleChatMessage = async (message, user = null) => {
  const contextBlocks = []; // [{ type, texts: string[] }]

  // --- Results: exact roll number in the message -> direct Mongo lookup.
  // Kept as a hard exact-match path (not semantic) because vector similarity
  // is unreliable for exact numeric IDs - "124117005" and "124117001" can
  // look nearly identical to an embedding model even though they're
  // different students.
  const rollNumber = extractRollNumber(message);
  let resolvedViaRollNumber = false;
  if (rollNumber) {
    const directMatches = await Result.find({ rollNumber }).limit(10);
    if (directMatches.length) {
      contextBlocks.push({ type: "result", texts: directMatches.map((r) => buildResultSummaryText(r)) });
      resolvedViaRollNumber = true;
    }
  }

  const categories = detectCategories(message);
  const wantsResults = categories.includes("result");
  const otherCategories = categories.filter((c) => c !== "result");
  // Guest (no req.user - the /api/results/chat/guest route) is intentionally
  // limited to result lookups only. Everything else (notifications,
  // announcements, assignments, PYQs, study material) requires login - both
  // because most of that content isn't meant to be public, and to keep the
  // guest surface small and predictable.
  const isGuest = !user;

  // Results without an explicit roll number: semantic search across ALL
  // results, same for guest/student/teacher - looking up someone else's
  // result by name, roll number, or surname is the intended feature, not a
  // bug. The only safety net is the similarity-score threshold
  // (PINECONE_MIN_SCORE) - a query with no identifying info (e.g. "my
  // result") won't score well against anything and correctly falls through
  // to "no matching result found" instead of returning a random one.
  if (wantsResults && !resolvedViaRollNumber) {
    const texts = await retrieveForType("result", message, user);
    if (texts.length) {
      contextBlocks.push({ type: "result", texts });
    } else {
      contextBlocks.push({ type: "result", texts: ["No matching result was found for that query."] });
    }
  }

  if (isGuest) {
    if (otherCategories.length) {
      contextBlocks.push({
        type: "access_notice",
        texts: [
          "Guests can only look up results here. Notifications, announcements, assignments, PYQs, and study material require logging in as a student or teacher - politely tell the user to log in to access this, and don't guess at an answer.",
        ],
      });
    }
  } else {
    for (const type of otherCategories) {
      const texts = await retrieveForType(type, message, user);
      if (texts.length) contextBlocks.push({ type, texts });
    }
  }

  // Nothing matched a known category (or matched but retrieval came up dry) -
  // fall back to ONE type-unrestricted semantic search across every
  // non-result type, instead of guessing a bucket. This is also what makes
  // greetings/small talk fall through cleanly to the general handler: an
  // unrelated message won't score above the similarity threshold.
  // Skipped entirely for guests - a guest's ambiguous message should never
  // fuzzily surface notification/announcement/assignment content either.
  if (!contextBlocks.length && !isGuest) {
    const broadFilter = { $or: NON_RESULT_TYPES.map((t) => buildTypeFilter(t, user)) };
    const hits = await queryContent(message, { filter: broadFilter, topK: 6 });
    const grouped = {};
    hits.forEach((h) => {
      const type = hitField(h, "type");
      const text = hitField(h, "text");
      if (!type || !text) return;
      (grouped[type] ||= []).push(text);
    });
    Object.entries(grouped).forEach(([type, texts]) => contextBlocks.push({ type, texts }));
  }

  if (!contextBlocks.length) {
    const answer = await handleGeneralIntent(message);
    logSearch(message, "general");
    return { intent: "general", answer };
  }

  const context = contextBlocks.map(({ type, texts }) => `[${type.toUpperCase()}]\n${texts.join("\n---\n")}`).join("\n\n");

  const system = `You are NeuralAssist, the AI assistant of the NIT KKR Smart Edu Portal. Answer the
student's question using ONLY the context below. The context may span multiple topics, each under
its own [TYPE] header - if the question has parts covering different topics, answer each part using
its matching section. Never invent data (grades, dates, policy details) that isn't in the context.
If part of the question isn't covered by the context, say that part isn't available instead of guessing.
${FORMATTING_RULE}

Context:
${context}`;

  const answer = await complete(system, message);
  const intent = contextBlocks.map((b) => b.type).join("+");
  logSearch(message, intent);
  return { intent, answer };
};