import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { disconnectPrisma } from "./config/prisma";

const PORT = process.env.PORT;

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown: close the Prisma connection pool cleanly on exit,
// rather than leaving dangling connections against Supabase.
async function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down gracefully...`);
  server.close(async () => {
    await disconnectPrisma();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
