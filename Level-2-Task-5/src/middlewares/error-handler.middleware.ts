import { Request, Response, NextFunction } from "express";

/**
 * Custom error class for expected, "safe to show the client" errors
 * (e.g. "insufficient stock", "product not found"). Services throw these
 * instead of raw Error objects so the error handler knows what's safe
 * to expose vs. what should be hidden behind a generic 500.
 */
export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * Central error-handling middleware MUST be registered last, after all
 * routes, per Express convention (4-argument signature is what tells
 * Express this is an error handler, not regular middleware).
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Anything unexpected: log the real error server-side, but never leak
  // internals (stack traces, DB details) to the client.
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
}
