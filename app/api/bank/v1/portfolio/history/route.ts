import { bankError, parseAccountRef, parseRange, requireUserId } from "@/libs/bank/http";
import { portfolioHistory } from "@/libs/bank/portfolio";

export async function GET(request: Request) {
  const auth = requireUserId(request);
  if (!auth.ok) return auth.response;
  const params = new URL(request.url).searchParams;
  const range = parseRange(params.get("range"));
  if (!range) return bankError(400, "INVALID_REQUEST", "range must be one of 1D, 1W, 1M, 3M, 1Y, ALL.");
  const accountRef = parseAccountRef(params.get("accountRef"));
  if (!accountRef.ok) return bankError(400, "INVALID_REQUEST", "accountRef is invalid.");
  return Response.json(await portfolioHistory(auth.userId, range, accountRef.value));
}
