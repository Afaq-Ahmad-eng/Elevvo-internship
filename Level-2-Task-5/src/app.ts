import express, { Application, Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import { prisma, assertDatabaseConnection } from "./config/db"

// Side-effect import (compile-time only, no runtime code) applies the
// req.user type augmentation. Must use `import type` so TypeScript strips
// it entirely; a normal `import` would try to `require()` a .d.ts file
// that doesn't exist as JS at runtime.
import type {} from "./types/express";

import { observabilityMiddleware } from "./middlewares/observability.middleware";
import { errorHandler } from "./middlewares/error-handler.middleware";
import { corsOptions } from "./config/cors.config";

import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import productRoutes from "./routes/product.routes";
import orderRoutes from "./routes/order.routes";

const app: Application = express();

// --- Global middleware (order matters) ---
app.use(helmet());
app.use(cors(corsOptions));
app.use(observabilityMiddleware);
app.use(express.json());

// --- Routes ---
app.get("/",async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ok and healthy", message: "E-Commerce API is running and connected to the Database" });
  } catch (error) {
    res.status(503).json({ status: "unhealthy", database: "disconnected" });
  }
});

app.use("/", authRoutes); // /register, /login
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);

// --- 404 fallback ---
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

// Central error handler MUST be registered last
app.use(errorHandler);

export default app;
