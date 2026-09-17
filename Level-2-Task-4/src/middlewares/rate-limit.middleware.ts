import rateLimit from "express-rate-limit";

/**
 * Throttles login attempts to mitigate brute-force / credential-stuffing
 * attacks. Limits each client (by IP, by default) to 5 requests per
 * 15-minute window on the /login route specifically.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true, // returns rate limit info in RateLimit-* headers
  legacyHeaders: false,
  message: {
    error: "Too many login attempts. Please try again in 15 minutes.",
  },
});