/**
 * Decodes a JWT's payload (no signature verification - the backend already
 * verifies that on every request; this is purely so the frontend can read
 * the "exp" claim and react before making an API call at all).
 */
const decodeJwtPayload = (token) => {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
};

/**
 * True if the token is missing, malformed, or past its "exp" claim.
 * Without this, a stale token just sits in localStorage looking "logged in"
 * in the UI until the next API call happens to fail with 401 - someone who
 * reopens a tab after hours could see a dashboard that then breaks on the
 * first click instead of being sent to /login right away.
 */
export const isTokenExpired = (token) => {
  if (!token) return true;
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000;
};