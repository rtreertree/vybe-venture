// Response shapes of docs/bank-api-spec.md, shared by the bank, libs/bank-client.ts and the UI.
export type ChartRange = "1D" | "1W" | "1M" | "3M" | "1Y" | "ALL";
export type ProductType = "stock" | "fund" | "bond" | "crypto";
export type RiskLevel = "low" | "medium" | "high";
export type OrderSide = "buy" | "sell";
export type OrderStatus = "pending" | "filled" | "rejected" | "cancelled";

export type BankErrorCode =
  | "INVALID_REQUEST"
  | "INSUFFICIENT_FUNDS"
  | "INSUFFICIENT_HOLDINGS"
  | "MISSING_USER_ID"
  | "PRODUCT_NOT_FOUND"
  | "ORDER_NOT_FOUND"
  | "ORDER_NOT_CANCELLABLE";

export type BankErrorBody = { error: { code: BankErrorCode | string; message: string } };

export type ChartSummary = {
  start: number;
  end: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
};

export type ChartSeries = {
  symbol?: string;
  range: ChartRange;
  interval: string;
  currency: "USD";
  points: { t: string; v: number }[];
  summary: ChartSummary | null;
};

export type BankAccount = {
  userId: string;
  currency: "USD";
  cashBalance: number;
  asOf: string;
};

export type ProductListItem = {
  symbol: string;
  name: string;
  type: ProductType;
  area: string;
  description: string;
  risk: RiskLevel;
  currentPrice: number;
  dayChange: number;
  dayChangePercent: number;
  asOf: string;
};

export type ProductReturns = { "1M": number | null; "3M": number | null; "1Y": number | null; "3Y": number | null };

export type ProductDetail = ProductListItem & {
  riskNote: string;
  currency: "USD";
  issuer: string;
  region: string;
  returns: ProductReturns;
  volatilityPercent: number | null;
  maxDrawdownPercent: number | null;
  high52w: number;
  low52w: number;
  dividendYieldPercent: number;
  size: number;
  inceptionDate: string;
  topHoldings: { name: string; weightPercent: number }[];
};

export type ProductsResponse = { asOf: string; products: ProductListItem[] };
export type AreasResponse = { areas: { area: string; count: number }[] };

export type PortfolioHolding = {
  symbol: string;
  name: string;
  area: string;
  accountRef: string | null;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  weightPercent: number;
};

export type Portfolio = {
  currency: "USD";
  asOf: string;
  accountRef?: string;
  cashBalance: number;
  holdings: PortfolioHolding[];
  totals: {
    holdingsValue: number;
    totalValue: number;
    totalCost: number;
    unrealizedPL: number;
    unrealizedPLPercent: number;
  };
};

export type BankOrderResponse = {
  orderId: string;
  symbol: string;
  side: OrderSide;
  status: OrderStatus;
  accountRef: string | null;
  quantity: number;
  filledPrice: number;
  filledQuantity: number;
  total: number;
  createdAt: string;
};

export type OrdersResponse = { orders: BankOrderResponse[] };

export type CreateOrderBody = {
  symbol: string;
  side: OrderSide;
  type: "market";
  quantity?: number;
  amount?: number;
  accountRef?: string;
  idempotencyKey: string;
};
