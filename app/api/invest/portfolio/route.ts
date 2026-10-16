import { getPortfolio } from "@/libs/bank-client";
import { authorizeInvest, bankResponse, checkedAccountRef } from "@/libs/invest-server";

export async function GET(request: Request) {
  const auth = await authorizeInvest(request);
  if (!auth.ok) return auth.response;
  const ref = await checkedAccountRef(auth.token, new URL(request.url).searchParams.get("accountRef"));
  if (!ref.ok) return ref.response;
  return bankResponse(await getPortfolio(auth.token, ref.accountRef));
}
