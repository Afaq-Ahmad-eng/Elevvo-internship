import { redisClient } from "../config/redis.config";

const DEFAULT_TTL_SECONDS = 60 * 60; // 1 hour, per the task spec

/**
 * Generic Cache-Aside helper.
 *
 * Flow: check Redis for `key` -> if present (cache HIT), return it parsed.
 * If absent (cache MISS), call `fetchFn` (the real DB query), store its
 * result in Redis with a TTL, then return it.
 *
 * GRACEFUL DEGRADATION: every Redis call is wrapped in try/catch. If Redis
 * is unreachable or errors out, we log it and fall through to `fetchFn`
 * directly — the API stays correct (just slower, hitting Postgres every
 * time) instead of going down entirely because a cache layer failed. This
 * is a deliberate design choice: caching should be a performance
 * optimization, never a single point of failure for correctness.
 */
export async function getOrSetCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<T> {
  try {
    const cached = await redisClient.get(key);
    if (cached !== null) {
      return JSON.parse(cached) as T;
    }
  } catch (err) {
    console.error(`Redis GET failed for key "${key}":`, (err as Error).message);
    // fall through to the database below
  }

  const freshData = await fetchFn();

  try {
    await redisClient.set(key, JSON.stringify(freshData), "EX", ttlSeconds);
  } catch (err) {
    console.error(`Redis SET failed for key "${key}":`, (err as Error).message);
    // Not fatal — we still return correct data, it just won't be cached
    // this time. The next request will simply miss and try again.
  }

  return freshData;
}

/**
 * Deletes a single, exact cache key. Used for cache invalidation when a
 * specific record (e.g. one product) is updated or deleted.
 */
export async function invalidateCacheKey(key: string): Promise<void> {
  try {
    await redisClient.del(key);
  } catch (err) {
    console.error(`Redis DEL failed for key "${key}":`, (err as Error).message);
  }
}

/**
 * Deletes every key matching a pattern, e.g. "products:list:*". Used to
 * invalidate cached LIST/paginated results, since a single product change
 * can affect many different cached list pages (different take/skip/search
 * combinations) whose exact keys we don't know in advance.
 *
 * Uses SCAN (not KEYS) deliberately: KEYS blocks the entire Redis server
 * until it finishes scanning the whole keyspace, which is dangerous on a
 * production dataset. SCAN iterates incrementally in small batches instead,
 * so it never blocks other clients — the standard production-safe pattern.
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  try {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redisClient.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } while (cursor !== "0");
  } catch (err) {
    console.error(`Redis pattern invalidation failed for "${pattern}":`, (err as Error).message);
  }
}
