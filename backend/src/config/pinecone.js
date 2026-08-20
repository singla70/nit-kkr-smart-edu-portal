import { Pinecone } from "@pinecone-database/pinecone";

let pineconeClient;

export const getPinecone = () => {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  }
  return pineconeClient;
};

// Results-only index. Uses Pinecone integrated inference for embeddings
// (model set on the index itself, e.g. llama-text-embed-v2) so the backend
// never has to load a local embedding model -> stays lightweight & deployable.
//
// IMPORTANT:
// - pc.index() must be called with an object ({ name }) - the old string
//   form pc.index("name") is deprecated and removed as of SDK v8.
// - upsertRecords/searchRecords (the integrated-inference "records" API)
//   only exist on the namespace-scoped object, reached via .namespace().
export const getResultsIndex = () => {
  const pc = getPinecone();
  const index = pc.index({ name: process.env.PINECONE_INDEX_NAME });
  return index.namespace(process.env.PINECONE_NAMESPACE || "");
};
