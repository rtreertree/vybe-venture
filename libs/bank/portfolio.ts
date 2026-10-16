import { ensureBankUser, STARTING_CASH } from "@/libs/bank/accounts";
import prisma from "@/libs/prisma";
import { bucketWidth, intervalLabel, RANGE_SPECS, round2, summarize } from "@/libs/bank/charts";
import { tickPrices } from "@/libs/bank/prices";
import type { ChartRange, ChartSeries, Portfolio, PortfolioHolding } from "@/libs/bank/types";

export async function portfolio(userId: string, accountRef?: string): Promise<Portfolio> {
  const user = await ensureBankUser(userId);
  const rows = await prisma.bankHolding.findMany({
    where: { userId, accountRef },
    orderBy: [{ symbol: "asc" }, { accountRef: "asc" }],
  });
  const symbols = [...new Set(rows.map((row) => row.symbol))];
  await tickPrices(symbols);
  const products = await prisma.bankProduct.findMany({ where: { symbol: { in: symbols } } });
  const bySymbol = new Map(products.map((product) => [product.symbol, product]));

  const valued = rows.flatMap((row) => {
    const product = bySymbol.get(row.symbol);
    if (!product) return [];
    const marketValue = round2(row.quantity.mul(product.currentPrice).toNumber());
    const cost = round2(row.quantity.mul(row.avgCost).toNumber());
    return [{ row, product, marketValue, cost }];
  });
  const holdingsValue = round2(valued.reduce((sum, item) => sum + item.marketValue, 0));
  const totalCost = round2(valued.reduce((sum, item) => sum + item.cost, 0));
  const percent = (part: number, whole: number) => whole === 0 ? 0 : round2((part / whole) * 100);

  const holdings: PortfolioHolding[] = valued.map(({ row, product, marketValue, cost }) => ({
    symbol: row.symbol,
    name: product.name,
    area: product.area,
    accountRef: row.accountRef || null,
    quantity: row.quantity.toNumber(),
    avgCost: round2(row.avgCost.toNumber()),
    currentPrice: round2(product.currentPrice.toNumber()),
    marketValue,
    unrealizedPL: round2(marketValue - cost),
    unrealizedPLPercent: percent(marketValue - cost, cost),
    weightPercent: percent(marketValue, holdingsValue),
  }));

  const cashBalance = user.cashBalance.toNumber();
  return {
    currency: "USD",
    asOf: new Date().toISOString(),
    ...(accountRef !== undefined ? { accountRef } : {}),
    cashBalance,
    holdings,
    totals: {
      holdingsValue,
      totalValue: round2(cashBalance + holdingsValue),
      totalCost,
      unrealizedPL: round2(holdingsValue - totalCost),
      unrealizedPLPercent: percent(holdingsValue - totalCost, totalCost),
    },
  };
}

// Replays filled orders over the stored price history. Cash is included only without an accountRef.
export async function portfolioHistory(userId: string, range: ChartRange, accountRef?: string): Promise<ChartSeries> {
  const user = await ensureBankUser(userId);
  const orders = await prisma.bankOrder.findMany({
    where: { userId, status: "filled" },
    orderBy: { createdAt: "asc" },
    select: { symbol: true, side: true, accountRef: true, quantity: true, total: true, createdAt: true },
  });
  const symbols = [...new Set(orders.filter((order) => accountRef === undefined || order.accountRef === accountRef).map((order) => order.symbol))];
  await tickPrices(symbols);

  const end = Date.now();
  const { durationMs, baseMs } = RANGE_SPECS[range];
  const firstActivity = Math.min(user.createdAt.getTime(), orders[0]?.createdAt.getTime() ?? end);
  const start = durationMs ? end - durationMs : firstActivity;
  const bucketMs = bucketWidth(baseMs, end - start);
  const times = [start];
  for (let t = (Math.floor(start / bucketMs) + 1) * bucketMs; t < end; t += bucketMs) times.push(t);
  times.push(end);

  const pointRows = symbols.length
    ? await prisma.bankPricePoint.findMany({
      where: { symbol: { in: symbols }, ...(durationMs ? { t: { gte: new Date(start - 7 * baseMs - 2 * 86_400_000) } } : {}) },
      orderBy: { t: "asc" },
      select: { symbol: true, t: true, price: true },
    })
    : [];
  const series = new Map<string, { t: number; v: number }[]>();
  for (const row of pointRows) {
    const list = series.get(row.symbol) ?? [];
    list.push({ t: row.t.getTime(), v: row.price.toNumber() });
    series.set(row.symbol, list);
  }
  const cursors = new Map<string, number>();
  const priceAt = (symbol: string, t: number) => {
    const list = series.get(symbol);
    if (!list?.length) return 0;
    let index = cursors.get(symbol) ?? 0;
    while (index + 1 < list.length && list[index + 1].t <= t) index += 1;
    cursors.set(symbol, index);
    return list[index].v;
  };

  const quantities = new Map<string, number>();
  let cash = STARTING_CASH.toNumber();
  let applied = 0;
  const points = times.map((t) => {
    for (; applied < orders.length && orders[applied].createdAt.getTime() <= t; applied += 1) {
      const order = orders[applied];
      const sign = order.side === "buy" ? 1 : -1;
      cash -= sign * order.total.toNumber();
      if (accountRef === undefined || order.accountRef === accountRef) {
        quantities.set(order.symbol, (quantities.get(order.symbol) ?? 0) + sign * order.quantity.toNumber());
      }
    }
    let value = accountRef === undefined ? cash : 0;
    for (const [symbol, quantity] of quantities) value += quantity * priceAt(symbol, t);
    return { t: new Date(t).toISOString(), v: round2(value) };
  });

  return { range, interval: intervalLabel(bucketMs), currency: "USD", points, summary: summarize(points.map((point) => point.v)) };
}
