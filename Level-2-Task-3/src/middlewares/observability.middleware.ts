import { Request, Response, NextFunction } from "express";

// Logs every request: ISO timestamp, method, path, and execution time in ms.
// Registered globally in server.ts so it runs for every incoming request.
export function observabilityMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = process.hrtime.bigint();
  const timestamp = new Date().toISOString();

  // "finish" fires once the response has been fully sent to the client.
  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;

    console.log(
      `[${timestamp}] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${durationMs.toFixed(2)}ms`
    );
  });

  next();
}
