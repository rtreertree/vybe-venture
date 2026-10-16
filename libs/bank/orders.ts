import { randomBytes } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import prisma from "@/libs/prisma";
import { ensureBankUser } from "@/libs/bank/accounts";
import { tickPrices } from "@/libs/bank/prices";
import type { BankErrorCode, BankOrderResponse, CreateOrderBody, OrderSide, OrderStatus } from "@/libs/bank/types";

const { Decimal } = Prisma;
const MAX_QUANTITY = 1_000_000_000;
const MAX_AMOUNT = 100_000_000;

export class BankOrderError extends Error {
  constructor(readonly status: number, readonly code: BankErrorCode, message: string) {
    super(message);
  }
}

export type OrderInput = {
  symbol: string;
  side: OrderSide;
  quantity?: number;
  amount?: number;
  accountRef: string;
  idempotencyKey: string;
};

function isPositive(value: unknown, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= max;
}

export function parseOrderInput(value: unknown): OrderInput {
  const invalid = (message: string) => new BankOrderError(400, "INVALID_REQUEST", message);
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw invalid("Send a JSON object.");
  const body = value as Partial<Record<keyof CreateOrderBody, unknown>>;
  if (typeof body.symbol !== "string" || !/^[A-Za-z0-9.]{1,12}$/.test(body.symbol.trim())) throw invalid("symbol is required.");
  if (body.side !== "buy" && body.side !== "sell") throw invalid("side must be buy or sell.");
  if (body.type !== undefined && body.type !== "market") throw invalid("Only market orders are supported.");
  const hasQuantity = body.quantity !== undefined;
  const hasAmount = body.amount !== undefined;
  if (hasQuantity === hasAmount) throw invalid("Send either quantity or amount.");
  if (hasQuantity && !isPositive(body.quantity, MAX_QUANTITY)) throw invalid("quantity must be greater than 0.");
  if (hasAmount && !isPositive(body.amount, MAX_AMOUNT)) throw invalid("amount must be greater than 0.");
  if (body.accountRef !== undefined && (typeof body.accountRef !== "string" || body.accountRef.length > 128)) throw invalid("accountRef is invalid.");
  if (typeof body.idempotencyKey !== "string" || body.idempotencyKey.length < 8 || body.idempotencyKey.length > 128) {
    throw invalid("idempotencyKey is required (8-128 characters).");
  }
  return {
    symbol: body.symbol.trim().toUpperCase(),
    side: body.side,
    quantity: hasQuantity ? body.quantity as number : undefined,
    amount: hasAmount ? body.amount as number : undefined,
    accountRef: (body.accountRef as string | undefined) ?? "",
    idempotencyKey: body.idempotencyKey,
  };
}

type OrderRow = Prisma.BankOrderGetPayload<object>;

function toResponse(order: OrderRow): BankOrderResponse {
  const filled = order.status === "filled";
  return {
    orderId: order.orderId,
    symbol: order.symbol,
    side: order.side as OrderSide,
    status: order.status as OrderStatus,
    accountRef: order.accountRef || null,
    quantity: order.quantity.toNumber(),
    filledPrice: order.filledPrice.toNumber(),
    filledQuantity: filled ? order.quantity.toNumber() : 0,
    total: order.total.toNumber(),
    createdAt: order.createdAt.toISOString(),
  };
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function createOrder(userId: string, input: OrderInput): Promise<{ order: BankOrderResponse; created: boolean }> {
  const existing = await prisma.bankOrder.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey: input.idempotencyKey } } });
  if (existing) return { order: toResponse(existing), created: false };

  await ensureBankUser(userId);
  await tickPrices([input.symbol]);
  const product = await prisma.bankProduct.findUnique({ where: { symbol: input.symbol } });
  if (!product) throw new BankOrderError(404, "PRODUCT_NOT_FOUND", "That product does not exist.");

  const price = product.currentPrice;
  const quantity = input.quantity !== undefined
    ? new Decimal(input.quantity).toDecimalPlaces(6, Decimal.ROUND_DOWN)
    : new Decimal(input.amount!).div(price).toDecimalPlaces(6, Decimal.ROUND_DOWN);
  if (quantity.lte(0)) throw new BankOrderError(400, "INVALID_REQUEST", "The order is too small to buy or sell any quantity.");
  const total = quantity.mul(price).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  try {
    const order = await prisma.$transaction(async (tx) => {
      if (input.side === "buy") {
        const debited = await tx.bankUser.updateMany({
          where: { userId, cashBalance: { gte: total } },
          data: { cashBalance: { decrement: total } },
        });
        if (debited.count === 0) throw new BankOrderError(400, "INSUFFICIENT_FUNDS", "Cash balance is lower than the order cost.");
        const holding = await tx.bankHolding.findUnique({
          where: { userId_accountRef_symbol: { userId, accountRef: input.accountRef, symbol: input.symbol } },
        });
        if (holding) {
          const newQuantity = holding.quantity.add(quantity);
          const avgCost = holding.quantity.mul(holding.avgCost).add(quantity.mul(price)).div(newQuantity).toDecimalPlaces(6);
          await tx.bankHolding.update({ where: { id: holding.id }, data: { quantity: newQuantity, avgCost } });
        } else {
          await tx.bankHolding.create({ data: { userId, accountRef: input.accountRef, symbol: input.symbol, quantity, avgCost: price } });
        }
      } else {
        const reduced = await tx.bankHolding.updateMany({
          where: { userId, accountRef: input.accountRef, symbol: input.symbol, quantity: { gte: quantity } },
          data: { quantity: { decrement: quantity } },
        });
        if (reduced.count === 0) throw new BankOrderError(400, "INSUFFICIENT_HOLDINGS", "You hold less than the quantity you want to sell in this account.");
        await tx.bankHolding.deleteMany({ where: { userId, accountRef: input.accountRef, symbol: input.symbol, quantity: { lte: 0 } } });
        await tx.bankUser.update({ where: { userId }, data: { cashBalance: { increment: total } } });
      }
      return tx.bankOrder.create({
        data: {
          orderId: `ord_${randomBytes(8).toString("hex")}`,
          userId,
          accountRef: input.accountRef,
          symbol: input.symbol,
          side: input.side,
          status: "filled",
          quantity,
          filledPrice: price,
          total,
          idempotencyKey: input.idempotencyKey,
        },
      });
    });
    return { order: toResponse(order), created: true };
  } catch (error) {
    if (isUniqueViolation(error)) {
      const winner = await prisma.bankOrder.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey: input.idempotencyKey } } });
      if (winner) return { order: toResponse(winner), created: false };
    }
    throw error;
  }
}

export async function listOrders(userId: string, filters: { status?: OrderStatus; accountRef?: string; limit: number }) {
  const rows = await prisma.bankOrder.findMany({
    where: { userId, status: filters.status, accountRef: filters.accountRef },
    orderBy: { createdAt: "desc" },
    take: filters.limit,
  });
  return { orders: rows.map(toResponse) };
}

export async function getOrder(userId: string, orderId: string) {
  const order = await prisma.bankOrder.findFirst({ where: { orderId, userId } });
  return order ? toResponse(order) : null;
}

export async function cancelOrder(userId: string, orderId: string): Promise<BankOrderResponse> {
  const order = await prisma.bankOrder.findFirst({ where: { orderId, userId } });
  if (!order) throw new BankOrderError(404, "ORDER_NOT_FOUND", "Order not found.");
  if (order.status !== "pending") throw new BankOrderError(409, "ORDER_NOT_CANCELLABLE", "Only pending orders can be cancelled.");
  const cancelled = await prisma.bankOrder.update({ where: { orderId }, data: { status: "cancelled" } });
  return toResponse(cancelled);
}
