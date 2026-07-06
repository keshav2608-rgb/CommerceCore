// Verifies JWTs issued by order-payment-service. Both services share the
// same HMAC secret (JWT_SECRET) — this is the "keeping two backend languages
// consistent in auth" challenge called out in the roadmap's Section 1.
// This is intentionally a shared-secret HS256 setup for Month 1; a Month-2
// upgrade would move to asymmetric keys (RS256) so only the issuer holds the
// private key.
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
}

interface AccessTokenClaims {
  sub: string;
  userId: number;
  role: string;
  type: string;
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized", message: "Missing bearer token" });
    return;
  }

  const token = header.slice("Bearer ".length);

  try {
    const claims = jwt.verify(token, env.jwtSecret) as AccessTokenClaims;

    if (claims.type !== "access") {
      res.status(401).json({ error: "Unauthorized", message: "Refresh tokens cannot be used here" });
      return;
    }

    req.userId = String(claims.userId);
    req.userRole = claims.role;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized", message: "Invalid or expired token" });
  }
}
