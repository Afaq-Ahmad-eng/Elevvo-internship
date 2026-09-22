import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { disconnectPrisma } from "./config/prisma";
import { disconnectRedis } from "./config/redis.config";

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown: close both the Prisma and Redis connections cleanly
// on exit, rather than leaving dangling connections behind.
async function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down gracefully...`);
  server.close(async () => {
    await Promise.all([disconnectPrisma(), disconnectRedis()]);
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
