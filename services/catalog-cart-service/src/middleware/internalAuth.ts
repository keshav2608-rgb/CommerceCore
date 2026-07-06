// Guards endpoints that should only ever be called by order-payment-service
// (never by an end user through the gateway) — e.g. stock decrement after a
// paid order. A shared secret in a header is the Month-1-simple version of
// service-to-service auth; a Month-2 upgrade would use mTLS or a service mesh
// identity instead of a static shared secret.
import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

export function requireInternalSecret(req: Request, res: Response, next: NextFunction): void {
  const provided = req.headers["x-internal-service-secret"];

  if (provided !== env.internalServiceSecret) {
    res.status(403).json({ error: "Forbidden", message: "Not callable from outside internal services" });
    return;
  }

  next();
}
