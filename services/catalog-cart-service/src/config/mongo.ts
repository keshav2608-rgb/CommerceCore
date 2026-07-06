// Owns the single Mongoose connection for this service.
import mongoose from "mongoose";
import { env } from "./env";

export async function connectMongo(): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongoUri);
}

export function mongoReadyState(): number {
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  return mongoose.connection.readyState;
}
