import { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Wraps an async Express handler so thrown errors (rejected promises) are
 * automatically forwarded to next(), instead of crashing the process or
 * silently hanging the request. Express 4 does NOT do this automatically
 * for async functions — this is a well-known gap that every real Express +
 * TypeScript project needs to handle explicitly (fixed natively in Express 5).
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
