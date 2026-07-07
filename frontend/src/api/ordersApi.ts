// Wraps /orders (Section 16, D10-13 — order-payment-service). Every create
// call needs a client-generated Idempotency-Key (OrderController.java
// rejects requests without one — see MissingIdempotencyKeyException).
import { apiClient } from "./client";

export interface CreateOrderRequest {
  addressLine1: string;
  city: string;
  postalCode: string;
}

export interface OrderResponse {
  id: number;
  status: "PENDING" | "PAID" | "FAILED";
  total: number;
}

export interface OrderStatusResponse {
  id: number;
  status: string;
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID (older browsers).
  return `order-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function createOrder(
  request: CreateOrderRequest,
  simulateFailure = false
): Promise<OrderResponse> {
  const res = await apiClient.post<OrderResponse>("/orders", request, {
    headers: { "Idempotency-Key": generateIdempotencyKey() },
    params: { simulateFailure },
  });
  return res.data;
}

export async function fetchOrderStatus(id: string | number): Promise<OrderStatusResponse> {
  const res = await apiClient.get<OrderStatusResponse>(`/orders/${id}/status`);
  return res.data;
}
