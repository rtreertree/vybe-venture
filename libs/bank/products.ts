import type { Prisma } from "@/generated/prisma/client";
import prisma from "@/libs/prisma";
import { round2 } from "@/libs/bank/charts";
import { metrics, tickPrices } from "@/libs/bank/prices";
import type { AreasResponse, ProductDetail, ProductListItem, ProductsResponse, ProductType, RiskLevel } from "@/libs/bank/types";

export const PRODUCT_TYPES: ProductType[] = ["stock", "fund", "bond", "crypto"];
export const RISK_LEVELS: RiskLevel[] = ["low", "medium", "high"];
export const PRODUCT_SORTS = ["name", "price", "dayChangePercent", "risk"] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

export type ProductFilters = {
  type?: ProductType;
  risk?: RiskLevel;
  area?: string;
  q?: string;
  sort: ProductSort;
};

type ProductRow = Prisma.BankProductGetPayload<object>;

function dayChange(product: ProductRow) {
  const price = product.currentPrice.toNumber();
  const change = price - product.prevClose.toNumber();
  return { dayChange: round2(change), dayChangePercent: product.prevClose.isZero() ? 0 : round2((change / product.prevClose.toNumber()) * 100) };
}

function toListItem(product: ProductRow): ProductListItem {
  return {
    symbol: product.symbol,
    name: product.name,
    type: product.type as ProductType,
    area: product.area,
    description: product.description,
    risk: product.risk as RiskLevel,
    currentPrice: round2(product.currentPrice.toNumber()),
    ...dayChange(product),
    asOf: product.updatedAt.toISOString(),
  };
}

export async function listProducts(filters: ProductFilters): Promise<ProductsResponse> {
  await tickPrices();
  const q = filters.q?.trim();
  const rows = await prisma.bankProduct.findMany({
    where: {
      type: filters.type,
      risk: filters.risk,
      area: filters.area ? { equals: filters.area, mode: "insensitive" } : undefined,
      OR: q ? [
        { name: { contains: q, mode: "insensitive" } },
        { symbol: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ] : undefined,
    },
  });
  const items = rows.map(toListItem);
  const riskOrder = { low: 0, medium: 1, high: 2 };
  items.sort((a, b) => {
    if (filters.sort === "price") return a.currentPrice - b.currentPrice;
    if (filters.sort === "dayChangePercent") return b.dayChangePercent - a.dayChangePercent;
    if (filters.sort === "risk") return riskOrder[a.risk] - riskOrder[b.risk] || a.name.localeCompare(b.name);
    return a.name.localeCompare(b.name);
  });
  return { asOf: new Date().toISOString(), products: items };
}

export async function getProduct(symbol: string): Promise<ProductDetail | null> {
  await tickPrices([symbol]);
  const product = await prisma.bankProduct.findUnique({ where: { symbol }, include: { holdings: { orderBy: { weightPercent: "desc" } } } });
  if (!product) return null;
  const derived = await metrics(symbol);
  return {
    ...toListItem(product),
    riskNote: product.riskNote,
    currency: "USD",
    issuer: product.issuer,
    region: product.region,
    returns: derived?.returns ?? { "1M": null, "3M": null, "1Y": null, "3Y": null },
    volatilityPercent: derived?.volatilityPercent ?? null,
    maxDrawdownPercent: derived?.maxDrawdownPercent ?? null,
    high52w: derived?.high52w ?? round2(product.currentPrice.toNumber()),
    low52w: derived?.low52w ?? round2(product.currentPrice.toNumber()),
    dividendYieldPercent: product.dividendYieldPercent.toNumber(),
    size: product.size.toNumber(),
    inceptionDate: product.inceptionDate.toISOString().slice(0, 10),
    topHoldings: product.holdings.map((holding) => ({ name: holding.holdingName, weightPercent: holding.weightPercent.toNumber() })),
  };
}

export async function listAreas(): Promise<AreasResponse> {
  const groups = await prisma.bankProduct.groupBy({ by: ["area"], _count: { _all: true }, orderBy: { area: "asc" } });
  return { areas: groups.map((group) => ({ area: group.area, count: group._count._all })) };
}
