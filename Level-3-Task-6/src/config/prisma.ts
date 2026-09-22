import { PrismaClient } from "@prisma/client";

/**
 * Singleton PrismaClient instance.
 *
 * WHY THIS MATTERS: every `new PrismaClient()` opens its own connection pool.
 * With hot-reload tools like ts-node-dev, importing PrismaClient naively in
 * multiple files (or re-instantiating on every file change) can quickly
 * exhaust Supabase's connection limit, especially since we're already going
 * through a pooler (pgbouncer). Exporting ONE shared instance from this file,
 * and importing it everywhere else, guarantees only one pool exists for the
 * whole running process.
 */
export const prisma = new PrismaClient({
  // Uncomment to see every generated SQL query while debugging locally:
  // log: ["query", "warn", "error"],
});

/**
 * Gracefully closes the database connection pool on process shutdown,
 * so connections aren't left dangling against Supabase.
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
