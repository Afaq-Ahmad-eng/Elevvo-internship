import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.util";

/**
 * Protects a route by requiring a valid JWT in the Authorization header.
 * Expected format: "Authorization: Bearer <token>"
 *
 * On success: decodes the token and attaches the payload to req.user,
 * so downstream middleware/controllers know WHO is making the request
 * without re-parsing the token themselves.
 *
 * On failure: short-circuits with 401, never calls next().
 */
export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.header("Authorization");

  // Expect exactly "Bearer <token>" anything else is rejected.
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or malformed Authorization header" });
    return;
  }

  const token = authHeader.slice("Bearer ".length).trim();

  try {
    const payload = verifyToken(token);
    req.user = payload; // now typed thanks to src/types/express/index.d.ts
    next();
  } catch (err) {
    // Covers expired tokens, invalid signatures, and tampered payloads
    // we don't need to distinguish these to the client, just reject.
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
