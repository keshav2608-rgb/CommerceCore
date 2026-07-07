// Central HTTP client for every call to the gateway (Section 12 "API layer:
// axios + interceptor for JWT" from the roadmap's 4-week strategy).
//
// Two interceptors live here:
//   1. Request: attaches the current access token as a Bearer header.
//   2. Response: on a 401 (access token expired), tries exactly one silent
//      refresh via POST /auth/refresh, then retries the original request.
//      If the refresh itself fails, the stored session is cleared and the
//      error is passed through — ProtectedRoute then redirects to /login.
//
// This module can't import the Redux store directly (store.ts imports the
// api modules that import this file — a circular import). Instead, the
// store is "injected" once at startup (see store/store.ts), matching a
// common, well-established pattern for keeping axios and Redux decoupled.
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8081";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// A second, bare client for the refresh call itself — it must never carry
// an (expired) access token or go through the interceptors below, or a
// failing refresh could recurse into itself.
const refreshClient = axios.create({ baseURL: API_BASE_URL });

interface StoredSession {
  accessToken: string | null;
  refreshToken: string | null;
}

type GetSession = () => StoredSession;
type OnRefreshed = (accessToken: string, refreshToken: string) => void;
type OnRefreshFailed = () => void;

let getSession: GetSession = () => ({ accessToken: null, refreshToken: null });
let onRefreshed: OnRefreshed = () => undefined;
let onRefreshFailed: OnRefreshFailed = () => undefined;

/** Called once from store.ts after the Redux store is created. */
export function injectSessionHandlers(handlers: {
  getSession: GetSession;
  onRefreshed: OnRefreshed;
  onRefreshFailed: OnRefreshFailed;
}): void {
  getSession = handlers.getSession;
  onRefreshed = handlers.onRefreshed;
  onRefreshFailed = handlers.onRefreshFailed;
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken } = getSession();
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Ensures concurrent 401s only trigger one refresh call, not one per request.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken } = getSession();
  if (!refreshToken) {
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post("/auth/refresh", { refreshToken })
      .then((res) => {
        const { accessToken, refreshToken: newRefreshToken } = res.data;
        onRefreshed(accessToken, newRefreshToken);
        return accessToken as string;
      })
      .catch(() => {
        onRefreshFailed();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    const isAuthEndpoint = originalRequest?.url?.startsWith("/auth/");

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      const newAccessToken = await refreshAccessToken();

      if (newAccessToken) {
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

/** Pulls a human-readable message out of the {error,message} shape both
 * services return (Node's errorHandler.ts / Spring's GlobalExceptionHandler). */
export function extractErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined;
    return data?.message ?? err.message ?? fallback;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
}
