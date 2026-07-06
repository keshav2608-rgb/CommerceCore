// Entry point: wires up Express, connects to Mongo + Redis, and starts the server.
// Kept intentionally thin — all logic lives in routes/controllers/config.
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env";
import { connectMongo } from "./config/mongo";
import { connectRedis } from "./config/redis";
import healthRoutes from "./routes/health.routes";
import productRoutes from "./routes/product.routes";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

app.use(healthRoutes);
app.use(productRoutes);

app.use(errorHandler);

async function start(): Promise<void> {
  await connectMongo();
  await connectRedis();

  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`catalog-cart-service listening on port ${env.port}`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start catalog-cart-service:", err);
  process.exit(1);
});

export default app;
