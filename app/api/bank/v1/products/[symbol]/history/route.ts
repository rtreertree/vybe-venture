import { bankError, parseRange, parseSymbol } from "@/libs/bank/http";
import { history } from "@/libs/bank/prices";

export async function GET(request: Request, { params }: { params: Promise<{ symbol: string }> }) {
  const range = parseRange(new URL(request.url).searchParams.get("range"));
  if (!range) return bankError(400, "INVALID_REQUEST", "range must be one of 1D, 1W, 1M, 3M, 1Y, ALL.");
  const symbol = parseSymbol((await params).symbol);
  const series = symbol ? await history(symbol, range) : null;
  return series ? Response.json(series) : bankError(404, "PRODUCT_NOT_FOUND", "That product does not exist.");
}
