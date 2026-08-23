import { Pinecone } from "@pinecone-database/pinecone";

let pineconeClient;

export const getPinecone = () => {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  }
  return pineconeClient;
};

// Unified content index - used for results AND notifications/announcements/
// assignments/PYQs/study material. Every record carries a "type" metadata
// field, so a single index (namespace) can be queried either broadly (no
// type filter - true RAG across the whole portal) or narrowed to one/more
// types via a metadata filter. Started as results-only; kept the same index
// so no new Pinecone project/index setup is required, just new record types.
//
// Uses Pinecone integrated inference for embeddings (model set on the index
// itself, e.g. llama-text-embed-v2) so the backend never has to load a local
// embedding model -> stays lightweight & deployable.
//
// IMPORTANT:
// - pc.index() must be called with an object ({ name }) - the old string
//   form pc.index("name") is deprecated and removed as of SDK v8.
// - upsertRecords/searchRecords (the integrated-inference "records" API)
//   only exist on the namespace-scoped object, reached via .namespace().
export const getContentIndex = () => {
  const pc = getPinecone();
  const index = pc.index({ name: process.env.PINECONE_INDEX_NAME });
  return index.namespace(process.env.PINECONE_NAMESPACE || "");
};

// Old name kept as an alias - many call sites/PRs may still reference it,
// and semantically "the results index" is just "the content index filtered
// to type=result" now.
export const getResultsIndex = getContentIndex;