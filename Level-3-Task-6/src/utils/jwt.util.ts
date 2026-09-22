import jwt, { SignOptions } from "jsonwebtoken";
import { JwtPayload } from "../types/jwt.types";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set. Check your .env file.");
}

const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ||
  "15m") as SignOptions["expiresIn"];

export function signToken(payload: JwtPayload): string {
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN };
  return jwt.sign(payload, JWT_SECRET as string, options);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET as string) as JwtPayload;
}
