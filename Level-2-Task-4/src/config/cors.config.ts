import { CorsOptions } from "cors";

// Only these origins are allowed to make cross-origin requests to this API.
// Read from .env so it's different per environment (dev/staging/prod)
// without touching code.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // `origin` is undefined for non-browser requests (e.g. curl, Postman,
    // server-to-server calls) — we allow those through, since CORS is a
    // browser-enforced concept, not a general access-control mechanism.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} is not allowed by CORS policy`));
    }
  },
  credentials: true,
};
