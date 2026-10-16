import prisma from "@/libs/prisma";
import type { BankResult } from "@/libs/bank-client";
import { existingUser, sameOrigin } from "@/libs/user-data-server";

const PUBLIC_CACHE = "public, s-maxage=30, stale-while-revalidate=60";

export function bankResponse<T>(result: BankResult<T>, options: { publicCache?: boolean } = {}) {
  if (!result.ok) return Response.json(result.error, { status: result.status });
  return Response.json(result.data, {
    status: result.status,
    headers: { "Cache-Control": options.publicCache ? PUBLIC_CACHE : "no-store" },
  });
}

export function problem(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

// Validates the user code (and the origin for writes). The bank user is always the validated token.
export async function authorizeInvest(request: Request, options: { write?: boolean } = {}) {
  if (options.write && !sameOrigin(request)) return { ok: false as const, response: problem(403, "FORBIDDEN", "Invalid origin.") };
  const user = await existingUser(request);
  if (!user) return { ok: false as const, response: problem(401, "MISSING_USER_ID", "Account code not found.") };
  return { ok: true as const, token: user.token };
}

export async function ownsAccount(token: string, accountRef: string) {
  const account = await prisma.appAccount.findFirst({ where: { id: accountRef, userToken: token }, select: { id: true } });
  return Boolean(account);
}

// Reads ?accountRef= and checks that it belongs to the caller. Absent means all accounts.
export async function checkedAccountRef(token: string, value: string | null) {
  if (!value) return { ok: true as const, accountRef: undefined };
  if (value.length > 128 || !await ownsAccount(token, value)) {
    return { ok: false as const, response: problem(404, "ACCOUNT_NOT_FOUND", "That account was not found for your code.") };
  }
  return { ok: true as const, accountRef: value };
}
