import { USER_TOKEN_PATTERN } from "@/libs/user-token";
import type { BankErrorCode, ChartRange } from "@/libs/bank/types";

export function bankError(status: number, code: BankErrorCode, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

export function requireUserId(request: Request): { ok: true; userId: string } | { ok: false; response: Response } {
  const userId = request.headers.get("x-user-id");
  if (!userId || !USER_TOKEN_PATTERN.test(userId)) {
    return { ok: false, response: bankError(401, "MISSING_USER_ID", "Send a valid X-User-Id header.") };
  }
  return { ok: true, userId };
}

export const CHART_RANGES: ChartRange[] = ["1D", "1W", "1M", "3M", "1Y", "ALL"];

export function parseRange(value: string | null): ChartRange | null {
  if (value === null) return "1M";
  return (CHART_RANGES as string[]).includes(value) ? value as ChartRange : null;
}

export const SYMBOL_PATTERN = /^[A-Z0-9.]{1,12}$/;

export function parseSymbol(value: string) {
  const symbol = value.trim().toUpperCase();
  return SYMBOL_PATTERN.test(symbol) ? symbol : null;
}

export function parseAccountRef(value: string | null) {
  if (value === null || value === "") return { ok: true as const, value: undefined };
  return value.length <= 128 ? { ok: true as const, value } : { ok: false as const };
}
