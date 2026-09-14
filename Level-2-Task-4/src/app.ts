import express, { Application, Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";

// Side-effect import: this file contains only a `declare global` block
// that augments Express's Request type with `req.user`. It has no
// runtime exports, but importing it here guarantees TypeScript (and
// ts-node specifically) includes it in the compiled program — without
// this import, the augmentation can silently fail to apply in some
// toolchains even though "include" in tsconfig.json lists the file.
import type {} from "./types/express";

import { observabilityMiddleware } from "./middlewares/observability.middleware";
import { corsOptions } from "./config/cors.config";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";

const app: Application = express();

// --- Global middleware (order matters) ---

// 1. Security headers first — sets things like X-Content-Type-Options,
//    Strict-Transport-Security, etc. before any route logic runs.
app.use(helmet());

// 2. Strict CORS — only allow-listed origins may call this API from a browser.
app.use(cors(corsOptions));

// 3. Observability — log every request, including rejected/failed ones.
app.use(observabilityMiddleware);

// 4. Body parsing — must come before routes that read req.body.
app.use(express.json());

// --- Routes ---

app.get("/", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok", message: "Auth API is running" });
});

app.use("/", authRoutes); // exposes /register and /login
app.use("/api/users", userRoutes); // protected, RBAC-gated

// --- 404 fallback ---
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

export default app;
