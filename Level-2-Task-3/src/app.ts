import express, { Application, Request, Response } from "express";
import userRoutes from "./routes/user.routes";
import { observabilityMiddleware } from "./middlewares/observability.middleware";
import { requireAPIKey } from "./middlewares/require-api-key.middleware";

const app: Application = express();

// Global middlewares order matters.
app.use(observabilityMiddleware); // log every request
app.use(express.json());

// Health check (not behind API key, so it's easy to verify server is up)
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok", message: "API is running" });
});

// Protected resource routes require a valid API key.
app.use("/api/users", requireAPIKey, userRoutes);

// 404 fallback for unmatched routes.
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

export default app;
