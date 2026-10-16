import { createOrder, listOrders } from "@/libs/bank-client";
import type { CreateOrderBody, OrderStatus } from "@/libs/bank/types";
import { authorizeInvest, bankResponse, checkedAccountRef, ownsAccount, problem } from "@/libs/invest-server";
import { isRecord } from "@/libs/account-model";
import { readJsonBody } from "@/libs/request-json";

export async function GET(request: Request) {
  const auth = await authorizeInvest(request);
  if (!auth.ok) return auth.response;
  const params = new URL(request.url).searchParams;
  const ref = await checkedAccountRef(auth.token, params.get("accountRef"));
  if (!ref.ok) return ref.response;
  const limit = params.get("limit");
  return bankResponse(await listOrders(auth.token, {
    status: params.get("status") as OrderStatus | null ?? undefined,
    accountRef: ref.accountRef,
    limit: limit ? Number(limit) : undefined,
  }));
}

export async function POST(request: Request) {
  const auth = await authorizeInvest(request, { write: true });
  if (!auth.ok) return auth.response;
  const parsed = await readJsonBody(request, 4_000);
  if (!parsed.ok || !isRecord(parsed.value)) return problem(400, "INVALID_REQUEST", "The request body is invalid.");
  const { symbol, side, quantity, amount, accountRef, idempotencyKey } = parsed.value;
  if (typeof symbol !== "string" || (side !== "buy" && side !== "sell") || typeof idempotencyKey !== "string") {
    return problem(400, "INVALID_REQUEST", "symbol, side and idempotencyKey are required.");
  }
  if (accountRef !== undefined && (typeof accountRef !== "string" || accountRef.length > 128 || !await ownsAccount(auth.token, accountRef))) {
    return problem(404, "ACCOUNT_NOT_FOUND", "That account was not found for your code.");
  }
  // Rebuilt field by field so the browser cannot add anything else; the bank validates the values.
  const body = {
    symbol,
    side,
    type: "market",
    quantity,
    amount,
    accountRef,
    idempotencyKey,
  } as CreateOrderBody;
  return bankResponse(await createOrder(auth.token, body));
}
