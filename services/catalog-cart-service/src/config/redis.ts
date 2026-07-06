// Owns the single Redis client for this service (used for cart state in Week 2,
// and exercised here in Week 1 purely for the health check).
import Redis from "ioredis";
import { env } from "./env";

export const redisClient = new Redis(env.redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 2,
  connectTimeout: 3000,
  // Fail fast instead of retrying forever when Redis is unreachable —
  // the health check should report DOWN quickly, not hang.
  retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
});

export async function connectRedis(): Promise<void> {
  if (redisClient.status === "ready" || redisClient.status === "connecting") {
    return;
  }
  await redisClient.connect();
}

export async function pingRedis(): Promise<boolean> {
  try {
    const result = await redisClient.ping();
    return result === "PONG";
  } catch {
    return false;
  }
}
