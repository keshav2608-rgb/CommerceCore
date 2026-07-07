// Decodes the payload of a JWT purely for UI display (e.g. showing the
// logged-in user's email in the navbar). This does NOT verify the
// signature — that's meaningless client-side anyway, since the token was
// already issued and signed by order-payment-service (JwtUtil.java). Every
// actual request is still authorized server-side by each service's own JWT
// middleware. If decoding fails for any reason, callers get `null` back.
export interface DecodedAccessToken {
  sub: string; // email — see JwtUtil.generateAccessToken
  userId: number;
  role: string;
  type: "access" | "refresh";
  exp: number;
}

export function decodeToken(token: string): DecodedAccessToken | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as DecodedAccessToken;
  } catch {
    return null;
  }
}
