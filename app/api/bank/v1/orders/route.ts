import { bankError, parseAccountRef, requireUserId } from "@/libs/bank/http";
import { BankOrderError, createOrder, listOrders, parseOrderInput } from "@/libs/bank/orders";
import type { OrderStatus } from "@/libs/bank/types";
import { readJsonBody } from "@/libs/request-json";

const STATUSES = ["pending", "filled", "rejected", "cancelled"];

function orderFailure(error: unknown) {
  if (error instanceof BankOrderError) return bankError(error.status, error.code, error.message);
  throw error;
}

export async function GET(request: Request) {
  const auth = requireUserId(request);
  if (!auth.ok) return auth.response;
  const params = new URL(request.url).searchParams;
  const status = params.get("status");
  if (status && !STATUSES.includes(status)) return bankError(400, "INVALID_REQUEST", "status is invalid.");
  const accountRef = parseAccountRef(params.get("accountRef"));
  if (!accountRef.ok) return bankError(400, "INVALID_REQUEST", "accountRef is invalid.");
  const rawLimit = params.get("limit");
  const limit = rawLimit === null ? 50 : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) return bankError(400, "INVALID_REQUEST", "limit must be between 1 and 200.");
  return Response.json(await listOrders(auth.userId, { status: (status || undefined) as OrderStatus | undefined, accountRef: accountRef.value, limit }));
}

export async function POST(request: Request) {
  const auth = requireUserId(request);
  if (!auth.ok) return auth.response;
  const parsed = await readJsonBody(request, 4_000);
  if (!parsed.ok) return bankError(parsed.status === 413 ? 400 : parsed.status, "INVALID_REQUEST", "The request body is invalid.");
  try {
    const result = await createOrder(auth.userId, parseOrderInput(parsed.value));
    return Response.json(result.order, { status: result.created ? 201 : 200 });
  } catch (error) {
    return orderFailure(error);
  }
}
