// Smoke test: confirms the health route responds and is wired correctly.
// Mongo/Redis connectivity itself is verified manually via docker compose in Week 1;
// deeper integration tests with test containers are a Week 4 (D24) upgrade.
import request from "supertest";
import express from "express";

// Mock dependencies so this stays a fast, isolated unit test with no real
// network calls to Mongo/Redis — integration coverage against real
// containers happens via scripts/smoke-test-week1.sh.
jest.mock("../config/mongo", () => ({
  mongoReadyState: jest.fn(() => 1),
}));
jest.mock("../config/redis", () => ({
  pingRedis: jest.fn(() => Promise.resolve(true)),
}));

import healthRoutes from "../routes/health.routes";

describe("GET /health", () => {
  it("responds with a status field", async () => {
    const app = express();
    app.use(healthRoutes);

    const res = await request(app).get("/health");

    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty("status");
    expect(res.body).toHaveProperty("service", "catalog-cart-service");
  });
});
