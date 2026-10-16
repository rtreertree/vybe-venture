// Server-only typed client for the bank API (docs/bank-api-spec.md). Never import it from a client
// component: the browser must not call the bank or send X-User-Id. Only BANK_API_URL changes when
// the real bank replaces the mock.
import type {
  AreasResponse,
  BankAccount,
  BankErrorBody,
  BankOrderResponse,
  ChartRange,
  ChartSeries,
  CreateOrderBody,
  OrdersResponse,
  OrderStatus,
  Portfolio,
  ProductDetail,
  ProductsResponse,
  ProductType,
  RiskLevel,
} from "@/libs/bank/types";

export type BankResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: BankErrorBody };

type CallOptions = {
  userId?: string;
  method?: "GET" | "POST" | "DELETE";
  query?: Record<string, string | number | undefined>;
  body?: unknown;
};

function bankBaseUrl() {
  // Accept the base with or without a trailing /v1; call() adds the version itself.
  return (process.env.BANK_API_URL || "http://localhost:3001").trim().replace(/\/+$/, "").replace(/\/v1$/, "");
}

function parsePayload(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function isErrorBody(value: unknown): value is BankErrorBody {
  if (typeof value !== "object" || value === null || !("error" in value)) return false;
  const error = (value as { error: unknown }).error;
  return typeof error === "object" && error !== null && typeof (error as { code?: unknown }).code === "string";
}

async function call<T>(path: string, options: CallOptions = {}): Promise<BankResult<T>> {
  const url = new URL(`${bankBaseUrl()}/v1${path}`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }
  const headers: Record<string, string> = {};
  if (options.userId) headers["X-User-Id"] = options.userId;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  try {
    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const text = await response.text();
    const payload = parsePayload(text);
    if (payload === undefined) {
      console.error(`Bank returned non-JSON ${response.status} for ${url.pathname}; check BANK_API_URL`);
      return { ok: false, status: 502, error: { error: { code: "BANK_ERROR", message: "The bank returned an unexpected response." } } };
    }
    if (response.ok) return { ok: true, status: response.status, data: payload as T };
    if (isErrorBody(payload)) return { ok: false, status: response.status, error: payload };
    return { ok: false, status: response.status, error: { error: { code: "BANK_ERROR", message: "The bank returned an unexpected response." } } };
  } catch {
    return { ok: false, status: 502, error: { error: { code: "BANK_UNAVAILABLE", message: "The bank could not be reached. Try again shortly." } } };
  }
}

export type ProductFilters = { type?: ProductType; risk?: RiskLevel; area?: string; q?: string; sort?: string };

export const getProducts = (filters: ProductFilters = {}) => call<ProductsResponse>("/products", { query: filters });
export const getProduct = (symbol: string) => call<ProductDetail>(`/products/${encodeURIComponent(symbol)}`);
export const getProductHistory = (symbol: string, range: ChartRange) =>
  call<ChartSeries>(`/products/${encodeURIComponent(symbol)}/history`, { query: { range } });
export const getAreas = () => call<AreasResponse>("/areas");

export const getAccount = (userId: string) => call<BankAccount>("/account", { userId });
export const deleteAccount = (userId: string) => call<null>("/account", { userId, method: "DELETE" });
export const getPortfolio = (userId: string, accountRef?: string) => call<Portfolio>("/portfolio", { userId, query: { accountRef } });
export const getPortfolioHistory = (userId: string, range: ChartRange, accountRef?: string) =>
  call<ChartSeries>("/portfolio/history", { userId, query: { range, accountRef } });

export const createOrder = (userId: string, body: CreateOrderBody) => call<BankOrderResponse>("/orders", { userId, method: "POST", body });
export const listOrders = (userId: string, filters: { status?: OrderStatus; accountRef?: string; limit?: number } = {}) =>
  call<OrdersResponse>("/orders", { userId, query: filters });
export const getOrder = (userId: string, orderId: string) => call<BankOrderResponse>(`/orders/${encodeURIComponent(orderId)}`, { userId });
export const cancelOrder = (userId: string, orderId: string) =>
  call<BankOrderResponse>(`/orders/${encodeURIComponent(orderId)}`, { userId, method: "DELETE" });
