import { getContentIndex } from "../config/pinecone.js";

// Unified semantic index across every content type (results, notifications,
// announcements, assignments, PYQs, study material). Every record's "text"
// field is embedded server-side (Pinecone integrated inference); every
// record also carries metadata - most importantly "type" - so callers can
// either search broadly (no type filter -> true cross-content RAG) or
// narrow to one/more types + other metadata (branch, isVisible, audience...).

const DEFAULT_MIN_SCORE = Number(process.env.PINECONE_MIN_SCORE ?? 0.3);

/**
 * @param {Array<{ id: string, type: string, text: string, metadata?: object }>} records
 */
export const upsertContentRecords = async (records) => {
  if (!records.length) return;
  const index = getContentIndex();
  // upsertRecords is the integrated-inference API: pass raw text under the
  // field the index was configured with (we use "text"). The records array
  // must be wrapped in an object - passing the array directly throws.
  await index.upsertRecords({
    records: records.map((r) => ({
      _id: r.id,
      text: r.text,
      type: r.type,
      ...r.metadata,
    })),
  });
};

// Centralizes how we pull a field out of a Pinecone hit, since the shape
// varies slightly depending on SDK version / call type (fields nested under
// "fields", or flattened onto the hit directly). Every caller (chatService,
// resultQueryController) goes through this instead of repeating the same
// "h.fields?.text || h.text" guess in three different files.
export const hitField = (hit, field) => hit?.fields?.[field] ?? hit?.[field] ?? hit?.metadata?.[field];

/**
 * @param {string} queryText  natural-language query
 * @param {object} [options]
 * @param {object} [options.filter]     Pinecone metadata filter, e.g. { type: { $in: ["assignment", "pyq"] } }
 * @param {number} [options.topK]
 * @param {number} [options.minScore]   drop hits below this similarity score (default from PINECONE_MIN_SCORE env, else 0.3) -
 *                                      without this, a vector search always returns its "closest" K matches even when
 *                                      none of them are actually relevant, which can hand the LLM garbage context.
 */
export const queryContent = async (queryText, options = {}) => {
  const { filter, topK = 5, minScore = DEFAULT_MIN_SCORE } = options;
  const index = getContentIndex();
  const response = await index.searchRecords({
    query: {
      topK,
      inputs: { text: queryText },
      ...(filter ? { filter } : {}),
    },
  });
  const rawHits = response?.result?.hits ?? [];

  // TEMPORARY DIAGNOSTIC LOG - remove once search is confirmed working.
  // We can't tell, without seeing real output, whether an empty/wrong answer
  // means (a) Pinecone genuinely found nothing for this filter (e.g. old
  // vectors still missing the "type" field - run the backfill script), or
  // (b) it found hits but they're being dropped by the score threshold, or
  // (c) hits come back in a shape this code isn't reading correctly. This
  // log makes that visible in the backend's console/deployment logs instead
  // of guessing again.
  console.log(
    `[queryContent] query="${queryText}" filter=${JSON.stringify(filter)} rawHitCount=${rawHits.length}` +
      (rawHits[0] ? ` firstHitScore=${rawHits[0]._score ?? rawHits[0].score} firstHitRaw=${JSON.stringify(rawHits[0]).slice(0, 300)}` : "")
  );

  // Score field name has varied across Pinecone SDK versions (_score vs score)
  // - check both rather than silently treating an unscored hit as a 0 (which
  // would wrongly drop it) or Infinity (which would wrongly keep it).
  return rawHits.filter((h) => {
    const score = h._score ?? h.score;
    return score === undefined || score >= minScore;
  });
};

/**
 * Deletes one or more vectors by id. Used whenever the source Mongo document
 * is hard-deleted, so the semantic index doesn't end up with an orphaned
 * vector that a natural-language query could still surface.
 * @param {string | string[]} ids
 */
export const deleteContentRecords = async (ids) => {
  const idList = Array.isArray(ids) ? ids : [ids];
  const validIds = idList.filter(Boolean);
  if (!validIds.length) return;
  const index = getContentIndex();
  // v8 SDK expects { ids: [...] }, not a raw array - passing the array
  // directly is silently wrong (same class of gotcha as upsertRecords needing
  // { records: [...] } noted above).
  await index.deleteMany({ ids: validIds });
};

// ---- Backward-compatible results-only wrappers ----
// Keeps every existing call site (resultQueryController, extractionService
// callers, chatService, adminContentController) working unchanged.

export const upsertResultRecords = async (records) => {
  await upsertContentRecords(
    records.map((r) => ({ id: r.id, type: "result", text: r.text, metadata: r.metadata }))
  );
};

export const queryResults = async (queryText, filter = undefined, topK = 5) => {
  return queryContent(queryText, {
    filter: { type: { $eq: "result" }, ...(filter || {}) },
    topK,
  });
};

export const deleteResultRecords = deleteContentRecords;