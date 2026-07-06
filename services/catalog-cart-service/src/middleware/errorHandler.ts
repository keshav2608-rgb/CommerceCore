// Single place that turns any thrown/next(err) error into a consistent
// JSON error shape, and logs it server-side without leaking stack traces to clients.
import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const message = err instanceof Error ? err.message : "Unknown error";
  // eslint-disable-next-line no-console
  console.error("[catalog-cart-service] Unhandled error:", err);

  res.status(500).json({
    error: "InternalServerError",
    message: process.env.NODE_ENV === "production" ? "Something went wrong" : message,
  });
}
