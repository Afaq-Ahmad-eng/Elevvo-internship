import { Request, Response, NextFunction } from "express";

// Bonus requirement: reject requests missing a valid x-api-key header.
export function requireAPIKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const providedKey = req.header("x-api-key");
  const expectedKey = process.env.API_KEY;

  if (!providedKey || providedKey !== expectedKey) {    
    res.status(401).json({ error: "Unauthorized: invalid or missing API key" });
    return;
  }

  next();
}
