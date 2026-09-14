import jwt, { SignOptions } from "jsonwebtoken";
import { JwtPayload } from "../types/jwt.types";

// Fail fast at startup if JWT_SECRET isn't configured — better to crash
// immediately with a clear error than to silently sign tokens with
// "undefined" as the secret, which would be a serious security hole.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set. Check your .env file.");
}

// jsonwebtoken's SignOptions["expiresIn"] type is stricter than a plain
// string (it expects a specific literal shape like "15m", "1h", or a
// number of seconds). We cast here since our env var is a validated,
// developer-controlled string, not arbitrary user input.
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ||
  "15m") as SignOptions["expiresIn"];

/**
 * Signs a new JWT containing the given payload.
 * The token is signed (tamper-evident) but NOT encrypted — anyone
 * with the token can decode and read the payload. Never put secrets
 * (passwords, raw PII) inside it.
 */
export function signToken(payload: JwtPayload): string {
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN };
  return jwt.sign(payload, JWT_SECRET as string, options);
}

/**
 * Verifies a token's signature and expiry.
 * Throws if the token is invalid, tampered with, or expired —
 * callers (the auth middleware) are expected to catch this.
 */
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET as string) as JwtPayload;
}
