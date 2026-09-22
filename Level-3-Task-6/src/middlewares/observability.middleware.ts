import { Request, Response, NextFunction } from "express";

export function observabilityMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = process.hrtime.bigint();
  const timestamp = new Date().toISOString();

  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;
    console.log(
      `[${timestamp}] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${durationMs.toFixed(2)}ms`
    );
  });

  next();
}
