// Wraps /cart and /cart/items (Section 16, D8-9 — catalog-cart-service).
// All routes here require a bearer token (cart.routes.ts: requireAuth).
import { apiClient } from "./client";

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
}

export interface CartResponse {
  userId: string;
  items: CartItem[];
  subtotal: number;
}

export async function fetchCart(): Promise<CartResponse> {
  const res = await apiClient.get<CartResponse>("/cart");
  return res.data;
}

export async function addCartItem(productId: string, quantity: number): Promise<CartResponse> {
  const res = await apiClient.post<CartResponse>("/cart/items", { productId, quantity });
  return res.data;
}

export async function removeCartItem(productId: string): Promise<CartResponse> {
  const res = await apiClient.delete<CartResponse>(`/cart/items/${productId}`);
  return res.data;
}

export async function clearCart(): Promise<CartResponse> {
  const res = await apiClient.delete<CartResponse>("/cart");
  return res.data;
}
