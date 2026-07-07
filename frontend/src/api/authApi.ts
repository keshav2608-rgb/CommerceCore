// Wraps /auth/** (Section 16 "Key APIs"). Response shape matches
// order-payment-service's AuthResponse record exactly:
// { accessToken, refreshToken, tokenType, expiresInMs }.
import { apiClient } from "./client";

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInMs: number;
}

export interface Credentials {
  email: string;
  password: string;
}

export async function signup(credentials: Credentials): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>("/auth/signup", credentials);
  return res.data;
}

export async function login(credentials: Credentials): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>("/auth/login", credentials);
  return res.data;
}

export async function refresh(refreshToken: string): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>("/auth/refresh", { refreshToken });
  return res.data;
}
