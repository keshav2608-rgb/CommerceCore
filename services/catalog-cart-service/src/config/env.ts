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
};
