import prisma from "@/libs/prisma";
import { bucketWidth, downsample, intervalLabel, RANGE_SPECS, round2, summarize } from "@/libs/bank/charts";
import type { ChartRange, ChartSeries, ProductReturns } from "@/libs/bank/types";
import { DAY_MS, FIVE_MIN_MS, nextPrice, profileFor, stepAt } from "@/libs/bank/walk";

const STALE_AFTER_MS = 60_000;
const MAX_COARSE_STEPS = 1_100;

// Lazy price update: appends 5-minute points since the last update. Gaps longer than a day are
// filled with daily points first, so a long-idle server does not write thousands of rows.
export async function tickPrices(symbols?: string[]) {
  const now = Date.now();
  const gridEnd = Math.floor(now / FIVE_MIN_MS) * FIVE_MIN_MS;
  const products = await prisma.bankProduct.findMany({
    where: symbols ? { symbol: { in: symbols } } : undefined,
    select: { symbol: true, type: true, risk: true, currentPrice: true, prevClose: true, updatedAt: true },
  });

  for (const product of products) {
    const from = product.updatedAt.getTime();
    if (now - from <= STALE_AFTER_MS || gridEnd <= from) continue;

    const profile = profileFor(product);
    const times: { t: number; fraction: number }[] = [];
    let cursor = from;
    for (let steps = 0; gridEnd - cursor > DAY_MS && steps < MAX_COARSE_STEPS; steps += 1) {
      cursor += DAY_MS;
      times.push({ t: cursor, fraction: 1 });
    }
    while (cursor + FIVE_MIN_MS <= gridEnd) {
      cursor += FIVE_MIN_MS;
      times.push({ t: cursor, fraction: FIVE_MIN_MS / DAY_MS });
    }
    if (times.length === 0) continue;

    let price = product.currentPrice.toNumber();
    let prevClose = product.prevClose.toNumber();
    let previousT = from;
    const rows = times.map(({ t, fraction }) => {
      if (Math.floor(t / DAY_MS) !== Math.floor(previousT / DAY_MS)) prevClose = price;
      price = nextPrice(price, profile, fraction, stepAt(product.symbol, t));
      previousT = t;
      return { symbol: product.symbol, t: new Date(t), price };
    });

    await prisma.$transaction([
      prisma.bankPricePoint.createMany({ data: rows, skipDuplicates: true }),
      prisma.bankProduct.updateMany({
        where: { symbol: product.symbol, updatedAt: { lt: new Date(previousT) } },
        data: { currentPrice: price, prevClose, updatedAt: new Date(previousT) },
      }),
    ]);
  }
}

export async function history(symbol: string, range: ChartRange): Promise<ChartSeries | null> {
  const product = await prisma.bankProduct.findUnique({ where: { symbol }, select: { symbol: true } });
  if (!product) return null;
  await tickPrices([symbol]);

  const { durationMs, baseMs } = RANGE_SPECS[range];
  const rows = await prisma.bankPricePoint.findMany({
    where: { symbol, ...(durationMs ? { t: { gte: new Date(Date.now() - durationMs) } } : {}) },
    orderBy: { t: "asc" },
    select: { t: true, price: true },
  });
  const raw = rows.map((row) => ({ t: row.t.getTime(), v: row.price.toNumber() }));
  const span = raw.length ? raw[raw.length - 1].t - raw[0].t : 0;
  const bucketMs = bucketWidth(baseMs, durationMs ?? span);
  const points = downsample(raw, bucketMs).map((point) => ({ t: new Date(point.t).toISOString(), v: round2(point.v) }));
  return {
    symbol,
    range,
    interval: intervalLabel(bucketMs),
    currency: "USD",
    points,
    summary: summarize(points.map((point) => point.v)),
  };
}

export type ProductMetrics = {
  returns: ProductReturns;
  volatilityPercent: number | null;
  maxDrawdownPercent: number | null;
  high52w: number;
  low52w: number;
};

const RETURN_PERIODS: [keyof ProductReturns, number][] = [["1M", 30], ["3M", 90], ["1Y", 365], ["3Y", 1095]];

export async function metrics(symbol: string): Promise<ProductMetrics | null> {
  const rows = await prisma.bankPricePoint.findMany({ where: { symbol }, orderBy: { t: "asc" }, select: { t: true, price: true } });
  if (rows.length === 0) return null;
  const points = rows.map((row) => ({ t: row.t.getTime(), v: row.price.toNumber() }));
  const last = points[points.length - 1];

  const priceAtOrBefore = (target: number) => {
    if (points[0].t > target) return null;
    let low = 0;
    let high = points.length - 1;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (points[mid].t <= target) low = mid; else high = mid - 1;
    }
    return points[low].v;
  };

  const returns = { "1M": null, "3M": null, "1Y": null, "3Y": null } as ProductReturns;
  for (const [period, days] of RETURN_PERIODS) {
    const then = priceAtOrBefore(last.t - days * DAY_MS);
    returns[period] = then === null ? null : round2((last.v / then - 1) * 100);
  }

  const yearAgo = last.t - 365 * DAY_MS;
  const lastYear = points.filter((point) => point.t >= yearAgo);
  const dailyCloses = downsample(lastYear, DAY_MS).map((point) => point.v);

  let volatilityPercent: number | null = null;
  if (dailyCloses.length > 20) {
    const dailyReturns = dailyCloses.slice(1).map((close, index) => close / dailyCloses[index] - 1);
    const mean = dailyReturns.reduce((sum, value) => sum + value, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (dailyReturns.length - 1);
    volatilityPercent = round2(Math.sqrt(variance) * Math.sqrt(252) * 100);
  }

  let maxDrawdownPercent: number | null = null;
  if (dailyCloses.length > 1) {
    let peak = dailyCloses[0];
    let worst = 0;
    for (const close of dailyCloses) {
      peak = Math.max(peak, close);
      worst = Math.min(worst, close / peak - 1);
    }
    maxDrawdownPercent = round2(worst * 100);
  }

  const window52w = points.filter((point) => point.t >= last.t - 364 * DAY_MS).map((point) => point.v);
  return {
    returns,
    volatilityPercent,
    maxDrawdownPercent,
    high52w: round2(Math.max(...window52w)),
    low52w: round2(Math.min(...window52w)),
  };
}
