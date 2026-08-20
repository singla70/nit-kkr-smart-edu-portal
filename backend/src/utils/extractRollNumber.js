// Pulls a roll-number-shaped token out of free text, so NL queries can be
// routed to an exact DB lookup instead of relying on semantic/vector search -
// which is unreliable for exact IDs (embeddings capture meaning, not exact
// digit sequences, so "124117005" and "124117001" can look "similar" to a
// vector search even though they're different students).
export const extractRollNumber = (text) => {
  const patterns = [
    /\b\d{2}[A-Za-z]{2,5}\d{2,5}\b/, // e.g. 22CS001
    /\b\d{6,}\b/, // e.g. 124117005
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return null;
};
