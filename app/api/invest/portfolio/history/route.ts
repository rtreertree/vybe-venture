import { getPortfolioHistory } from "@/libs/bank-client";
import { authorizeInvest, bankResponse, checkedAccountRef } from "@/libs/invest-server";
import type { ChartRange } from "@/libs/bank/types";

export async function GET(request: Request) {
  const auth = await authorizeInvest(request);
  if (!auth.ok) return auth.response;
  const params = new URL(request.url).searchParams;
  const ref = await checkedAccountRef(auth.token, params.get("accountRef"));
  if (!ref.ok) return ref.response;
  return bankResponse(await getPortfolioHistory(auth.token, (params.get("range") ?? "1M") as ChartRange, ref.accountRef));
}
