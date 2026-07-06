// Reports UP/DOWN for this service's own process plus each hard dependency,
// so `docker compose ps` + this endpoint together tell you exactly what's broken.
import { Request, Response } from "express";
import { mongoReadyState } from "../config/mongo";
import { pingRedis } from "../config/redis";

export async function getHealth(_req: Request, res: Response): Promise<void> {
  const mongoUp = mongoReadyState() === 1;
  const redisUp = await pingRedis();
  const overallUp = mongoUp && redisUp;

  res.status(overallUp ? 200 : 503).json({
    status: overallUp ? "UP" : "DOWN",
    service: "catalog-cart-service",
    dependencies: {
      mongo: mongoUp ? "UP" : "DOWN",
      redis: redisUp ? "UP" : "DOWN",
    },
  });
}
