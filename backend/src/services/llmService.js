import Groq from "groq-sdk";

// Single point of contact for all LLM calls (extraction + chat).
// Groq is primary (as decided). LLM_PROVIDER env var can switch to
// OpenRouter later without touching any calling code - just swap the
// implementation of `complete()` below when that's needed.
let groqClient;
const getGroq = () => {
  if (!groqClient) groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return groqClient;
};

/**
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {{ json?: boolean, temperature?: number }} opts
 * @returns {Promise<string>} raw text response
 */
export const complete = async (systemPrompt, userPrompt, opts = {}) => {
  const groq = getGroq();
  const completion = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    temperature: opts.temperature ?? 0.1,
    response_format: opts.json ? { type: "json_object" } : undefined,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  return completion.choices[0]?.message?.content ?? "";
};