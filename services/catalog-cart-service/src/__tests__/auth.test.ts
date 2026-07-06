import request from "supertest";
import express from "express";
import jwt from "jsonwebtoken";
import { requireAuth } from "../middleware/auth";
import { env } from "../config/env";

function buildApp() {
  const app = express();
  app.get("/protected", requireAuth, (_req, res) => {
    res.status(200).json({ ok: true });
  });
  return app;
}

describe("requireAuth middleware", () => {
  it("rejects requests with no Authorization header", async () => {
    const res = await request(buildApp()).get("/protected");
    expect(res.status).toBe(401);
  });

  it("rejects an invalid token", async () => {
    const res = await request(buildApp())
      .get("/protected")
      .set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(401);
  });

  it("rejects a valid refresh-type token used as an access token", async () => {
    const refreshToken = jwt.sign(
      { sub: "user@example.com", userId: 1, type: "refresh" },
      env.jwtSecret
    );
    const res = await request(buildApp())
      .get("/protected")
      .set("Authorization", `Bearer ${refreshToken}`);
    expect(res.status).toBe(401);
  });

  it("accepts a valid access token", async () => {
    const accessToken = jwt.sign(
      { sub: "user@example.com", userId: 1, role: "CUSTOMER", type: "access" },
      env.jwtSecret
    );
    const res = await request(buildApp())
      .get("/protected")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
  });
});
