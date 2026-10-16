"use client";

import type {
  AreasResponse,
  BankErrorBody,
  BankOrderResponse,
  ChartRange,
  ChartSeries,
  OrdersResponse,
  OrderSide,
  Portfolio,
  ProductDetail,
  ProductListItem,
  ProductsResponse,
} from "@/libs/bank/types";
import { tokenHeaders } from "@/libs/user-token";

export type InvestResult<T> = { ok: true; status: number; data: T } | { ok: false; status: number; code: string; message: string };

async function request<T>(path: string, init: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<InvestResult<T>> {
  try {
    const headers: Record<string, string> = init.auth ? { ...(tokenHeaders() as Record<string, string>) } : {};
    if (init.body !== undefined) headers["Content-Type"] = "application/json";
    const response = await fetch(`/api/invest${path}`, {
      method: init.method ?? "GET",
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
    });
    const payload: unknown = await response.json().catch(() => null);
    if (response.ok) return { ok: true, status: response.status, data: payload as T };
    const error = (payload as BankErrorBody | null)?.error;
    return { ok: false, status: response.status, code: error?.code ?? "ERROR", message: error?.message ?? "Something went wrong. Try again." };
  } catch (error) {
    return { ok: false, status: 0, code: "NETWORK", message: error instanceof Error ? error.message : "Network error. Try again." };
  }
}

function query(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  const text = search.toString();
  return text ? `?${text}` : "";
}

export type ProductQuery = { type?: string; risk?: string; area?: string; q?: string; sort?: string };

export const fetchProducts = (filters: ProductQuery = {}) => request<ProductsResponse>(`/products${query(filters)}`);
export const fetchProduct = (symbol: string) => request<ProductDetail>(`/products/${encodeURIComponent(symbol)}`);
export const fetchProductHistory = (symbol: string, range: ChartRange) =>
  request<ChartSeries>(`/products/${encodeURIComponent(symbol)}/history${query({ range })}`);
export type Recommendation = { product: ProductListItem; reason: string };
export const fetchRecommendations = (accountRef: string) =>
  request<{ recommendations: Recommendation[] }>("/recommend", { method: "POST", body: { accountRef }, auth: true });
export const fetchAreas = () => request<AreasResponse>("/areas");
export const fetchPortfolio = (accountRef?: string) => request<Portfolio>(`/portfolio${query({ accountRef })}`, { auth: true });
export const fetchPortfolioHistory = (range: ChartRange, accountRef?: string) =>
  request<ChartSeries>(`/portfolio/history${query({ range, accountRef })}`, { auth: true });
export const fetchOrders = (accountRef?: string) => request<OrdersResponse>(`/orders${query({ accountRef })}`, { auth: true });
export const cancelOrder = (orderId: string) =>
  request<BankOrderResponse>(`/orders/${encodeURIComponent(orderId)}`, { method: "DELETE", auth: true });

export type PlaceOrderInput = { symbol: string; side: OrderSide; quantity?: number; amount?: number; accountRef: string; idempotencyKey: string };
export const placeOrder = (input: PlaceOrderInput) => request<BankOrderResponse>("/orders", { method: "POST", body: input, auth: true });

export function newIdempotencyKey() {
  return crypto.randomUUID();
}

export const PORTFOLIO_CHANGED_EVENT = "portfolio-changed";
