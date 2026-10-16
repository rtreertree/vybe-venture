import { getAccount } from "@/libs/bank-client";
import { authorizeInvest, bankResponse } from "@/libs/invest-server";

export async function GET(request: Request) {
  const auth = await authorizeInvest(request);
  if (!auth.ok) return auth.response;
  return bankResponse(await getAccount(auth.token));
}
