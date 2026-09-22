import Redis from "ioredis";

/**
 * Singleton Redis client, same reasoning as config/prisma.ts: one shared
 * connection for the whole process, rather than opening a new connection
 * every time a file imports Redis.
 *
 * REDIS_URL format: redis://[:password@]host:port[/db]
 * Locally (via the docker-compose.yml in this repo): redis://localhost:6379
 */
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const redisClient = new Redis(REDIS_URL, {
  // Don't crash the whole app if Redis is briefly unreachable at startup —
  // ioredis will keep retrying in the background per maxRetriesPerRequest/
  // retryStrategy below, and our cache-aside layer is designed to degrade
  // gracefully (fall through to the database) if Redis calls fail.
  maxRetriesPerRequest: 3,
  retryStrategy(attempts) {
    // Exponential-ish backoff, capped at 5s between retries.
    return Math.min(attempts * 200, 5000);
  },
});

redisClient.on("error", (err) => {
  // Log but never let a Redis error crash the process — caching is a
  // performance optimization, not a hard dependency. The app must still
  // function (just slower) if Redis is down.
  console.error("Redis client error:", err.message);
});

redisClient.on("connect", () => {
  console.log("Connected to Redis");
});

export async function disconnectRedis(): Promise<void> {
  redisClient.disconnect();
}
