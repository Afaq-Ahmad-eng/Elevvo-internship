import { PrismaClient } from "@prisma/client";

// Augment the Node.js global object for TypeScript
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Configure logging based on runtime environment.
 * Development: full visibility for query debugging.
 * Production: only capture warnings and errors to avoid stdout bloat.
 */
const prismaClientSingleton = (): PrismaClient => {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? [
            { emit: "event", level: "query" },
            { emit: "stdout", level: "error" },
            { emit: "stdout", level: "info" },
            { emit: "stdout", level: "warn" },
          ]
        : [{ emit: "stdout", level: "error" }],
    errorFormat: process.env.NODE_ENV === "production" ? "minimal" : "pretty",
  });
};

/**
 * Instantiate or retrieve the cached singleton instance.
 */
export const prisma = globalThis.prisma ?? prismaClientSingleton();

// Prevent multiple instances in development (e.g., nodemon, tsx, Next.js hot reload)
if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

/**
 * Health check helper: ping the database with a raw query.
 * Useful in server startup scripts or health-check endpoints (/health).
 */
export async function assertDatabaseConnection(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("Database connection established successfully.");
  } catch (error) {
    console.error("Critical: Failed to connect to the database:", error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler.
 * Closes the Prisma connection pool when the process terminates.
 */
async function handleGracefulShutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}. Closing database connection pool...`);
  try {
    await prisma.$disconnect();
    console.log("Prisma client disconnected successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Error during Prisma disconnect:", error);
    process.exit(1);
  }
}

// Register process termination hooks
process.on("SIGINT", () => handleGracefulShutdown("SIGINT"));
process.on("SIGTERM", () => handleGracefulShutdown("SIGTERM"));
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});