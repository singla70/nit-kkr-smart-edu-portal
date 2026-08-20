import rateLimit from "express-rate-limit";

// General ceiling across the whole API - generous, just stops runaway abuse.
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again in a few minutes." },
});

// Stricter limiter for endpoints that call Groq/Pinecone (metered, free-tier
// quotas) and are reachable without login (guest result lookup + chat) -
// these are the ones an abuser would actually hit to run up usage or exhaust
// the free tier for everyone else.
export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many AI requests from this device, please slow down." },
});

// Auth endpoints - modest limit to slow down credential-stuffing/brute force
// without getting in the way of a real user who mistypes a password a few times.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts, please try again in a few minutes." },
});
