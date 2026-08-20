import { getResultsIndex } from "../config/pinecone.js";

// Results-only vector index, integrated inference (no local embedding model).
// We upsert plain text records; Pinecone embeds them server-side using the
// model configured on the index (e.g. llama-text-embed-v2).

/**
 * @param {Array<{ id: string, text: string, metadata: object }>} records
 */
export const upsertResultRecords = async (records) => {
  if (!records.length) return;
  const index = getResultsIndex();
  // upsertRecords is the integrated-inference API: pass raw text under the
  // field the index was configured with (we use "text"). The records array
  // must be wrapped in an object - passing the array directly throws.
  await index.upsertRecords({
    records: records.map((r) => ({
      _id: r.id,
      text: r.text,
      ...r.metadata,
    })),
  });
};

/**
 * @param {string} queryText  natural-language query from the student
 * @param {object} [filter]   optional Pinecone metadata filter (e.g. { rollNumber: "..." })
 * @param {number} [topK]
 */
export const queryResults = async (queryText, filter = undefined, topK = 5) => {
  const index = getResultsIndex();
  const response = await index.searchRecords({
    query: {
      topK,
      inputs: { text: queryText },
      ...(filter ? { filter } : {}),
    },
  });
  return response?.result?.hits ?? [];
};

/**
 * Deletes one or more vectors by id from the results index. Used when a
 * Result document is deleted from Mongo, so the semantic index doesn't end
 * up with orphaned vectors that a natural-language query could still surface.
 * @param {string | string[]} ids
 */
export const deleteResultRecords = async (ids) => {
  const idList = Array.isArray(ids) ? ids : [ids];
  const validIds = idList.filter(Boolean);
  if (!validIds.length) return;
  const index = getResultsIndex();
  // v8 SDK expects { ids: [...] }, not a raw array - passing the array
  // directly is silently wrong (same class of gotcha as upsertRecords needing
  // { records: [...] } noted above).
  await index.deleteMany({ ids: validIds });
};