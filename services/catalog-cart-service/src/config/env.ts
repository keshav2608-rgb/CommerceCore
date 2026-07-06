// Centralizes all environment variable access so the rest of the codebase
// never calls process.env directly — one place to validate/default config.
import dotenv from "dotenv";

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: parseInt(process.env.PORT ?? "4000", 10),
  mongoUri: required("MONGO_URI", "mongodb://localhost:27017/commercecore_catalog"),
  redisUrl: required("REDIS_URL", "redis://localhost:6379"),
  nodeEnv: process.env.NODE_ENV ?? "development",
  // Shared with order-payment-service — both must verify the same JWTs.
  jwtSecret: required("JWT_SECRET", "replace_this_with_a_long_random_base64_secret_before_running"),
  // Simple shared-secret gate for service-to-service calls (e.g. stock decrement)
  // that must never be reachable from the public gateway path directly.
  // Month-2 upgrade: replace with mTLS/service mesh identity.
  internalServiceSecret: required("INTERNAL_SERVICE_SECRET", "replace_this_internal_secret_too"),
  cartTtlSeconds: parseInt(process.env.CART_TTL_SECONDS ?? "604800", 10), // 7 days
};
