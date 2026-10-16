import { bankError, parseAccountRef, requireUserId } from "@/libs/bank/http";
import { portfolio } from "@/libs/bank/portfolio";

export async function GET(request: Request) {
  const auth = requireUserId(request);
  if (!auth.ok) return auth.response;
  const accountRef = parseAccountRef(new URL(request.url).searchParams.get("accountRef"));
  if (!accountRef.ok) return bankError(400, "INVALID_REQUEST", "accountRef is invalid.");
  return Response.json(await portfolio(auth.userId, accountRef.value));
}
