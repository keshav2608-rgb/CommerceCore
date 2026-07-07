// Wraps GET /products (Section 16, D6 — catalog-cart-service). No auth
// required to browse, matching product.routes.ts (no requireAuth on this route).
import { apiClient } from "./client";

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  variants: string[];
  attributes: Record<string, string | number | boolean>;
}

export interface ProductListResponse {
  items: Product[];
  page: number;
  limit: number;
  total: number;
}

export interface ProductQuery {
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

export async function fetchProducts(query: ProductQuery): Promise<ProductListResponse> {
  const res = await apiClient.get<ProductListResponse>("/products", {
    params: {
      search: query.search || undefined,
      minPrice: query.minPrice ?? undefined,
      maxPrice: query.maxPrice ?? undefined,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    },
  });
  return res.data;
}
