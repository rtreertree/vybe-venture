import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { DAY_MS, FIVE_MIN_MS, HOUR_MS, profileFor, stepAt, stepFactor } from "../libs/bank/walk";
import { SEED_PRODUCTS, type SeedProduct } from "./seed-catalog";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const HISTORY_DAYS = 3 * 365 + 1;

// Daily points for older history, hourly for the last week, 5-minute points for the last day.
function historyTimes(inception: number, gridEnd: number) {
  const dayStart = Math.floor((gridEnd - HISTORY_DAYS * DAY_MS) / DAY_MS) * DAY_MS;
  const first = Math.max(dayStart, Math.ceil(inception / DAY_MS) * DAY_MS);
  const hourlyFrom = Math.floor((gridEnd - 7 * DAY_MS) / HOUR_MS) * HOUR_MS;
  const fiveMinFrom = gridEnd - DAY_MS;
  const times: number[] = [];
  for (let t = first; t < hourlyFrom; t += DAY_MS) times.push(t);
  for (let t = hourlyFrom; t < fiveMinFrom; t += HOUR_MS) times.push(t);
  for (let t = fiveMinFrom; t <= gridEnd; t += FIVE_MIN_MS) times.push(t);
  return times;
}

function buildHistory(product: SeedProduct, gridEnd: number) {
  const profile = profileFor(product);
  const times = historyTimes(Date.parse(product.inceptionDate), gridEnd);
  const raw = [100];
  for (let index = 1; index < times.length; index += 1) {
    const fraction = (times[index] - times[index - 1]) / DAY_MS;
    raw.push(raw[index - 1] * stepFactor(profile, fraction, stepAt(product.symbol, times[index])));
  }
  const scale = product.price / raw[raw.length - 1];
  const prices = raw.map((value) => Math.max(0.01, Math.round(value * scale * 100) / 100));
  return times.map((t, index) => ({ symbol: product.symbol, t: new Date(t), price: prices[index] }));
}

async function seedProduct(product: SeedProduct, gridEnd: number) {
  const { holdings, price, ...rest } = product;
  const fields = {
    name: rest.name,
    type: rest.type,
    area: rest.area,
    description: rest.description,
    risk: rest.risk,
    riskNote: rest.riskNote,
    issuer: rest.issuer,
    region: rest.region,
    dividendYieldPercent: rest.dividendYieldPercent,
    size: rest.size,
    inceptionDate: new Date(rest.inceptionDate),
  };
  const existingPoints = await prisma.bankPricePoint.count({ where: { symbol: product.symbol } });
  const points = existingPoints === 0 ? buildHistory(product, gridEnd) : [];
  const last = points[points.length - 1];
  const todayStart = Math.floor(gridEnd / DAY_MS) * DAY_MS;
  const previous = [...points].reverse().find((point) => point.t.getTime() < todayStart) ?? points[0];

  await prisma.bankProduct.upsert({
    where: { symbol: product.symbol },
    update: fields,
    create: {
      symbol: product.symbol,
      ...fields,
      currentPrice: last?.price ?? price,
      prevClose: previous?.price ?? price,
      updatedAt: last?.t ?? new Date(gridEnd),
    },
  });
  await prisma.bankProductHolding.deleteMany({ where: { symbol: product.symbol } });
  if (holdings?.length) {
    await prisma.bankProductHolding.createMany({
      data: holdings.map((holding) => ({ symbol: product.symbol, holdingName: holding.name, weightPercent: holding.weightPercent })),
    });
  }
  for (let offset = 0; offset < points.length; offset += 1000) {
    await prisma.bankPricePoint.createMany({ data: points.slice(offset, offset + 1000), skipDuplicates: true });
  }
  return { symbol: product.symbol, points: points.length, skippedHistory: existingPoints > 0 };
}

async function main() {
  const gridEnd = Math.floor(Date.now() / FIVE_MIN_MS) * FIVE_MIN_MS;
  for (const product of SEED_PRODUCTS) {
    const result = await seedProduct(product, gridEnd);
    console.log(`${result.symbol}: ${result.skippedHistory ? "history kept" : `${result.points} price points`}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
