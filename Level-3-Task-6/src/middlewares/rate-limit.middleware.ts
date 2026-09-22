import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redisClient } from "../config/redis.config";

/**
 * Throttles login attempts using a CENTRALIZED Redis-backed store, instead
 * of express-rate-limit's default in-memory store.
 *
 * WHY THIS MATTERS (the actual point of "distributed" rate limiting):
 * an in-memory store keeps its counters inside a single Node.js process's
 * RAM. The moment you run more than one instance of this API behind a load
 * balancer (horizontal scaling — exactly what "scale API instances
 * horizontally" in the task spec refers to), each instance has its OWN
 * separate counter. An attacker could then get 5 attempts on instance A,
 * 5 MORE on instance B, 5 more on instance C — the limit is only enforced
 * per-instance, not per-client, which defeats the purpose entirely.
 *
 * Backing the store with Redis means every instance reads/writes the SAME
 * shared counter, so the 5-requests-per-15-minutes limit is enforced
 * correctly no matter how many instances of this API are running.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again in 15 minutes." },

  // rate-limit-redis's RedisStore needs a `sendCommand` adapter matching
  // whatever Redis client library is in use. ioredis exposes `.call()`
  // for sending arbitrary raw Redis commands, which is what RedisStore
  // uses internally (INCR, PEXPIRE, etc.) to track request counts.
  store: new RedisStore({
    sendCommand: (...args: string[]) =>
      redisClient.call(args[0], ...args.slice(1)) as Promise<any>,
    prefix: "rate-limit:login:", // namespaced so it never collides with cache keys
  }),
});
