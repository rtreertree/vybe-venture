import { bankError, parseSymbol } from "@/libs/bank/http";
import { getProduct } from "@/libs/bank/products";

export async function GET(_request: Request, { params }: { params: Promise<{ symbol: string }> }) {
  const symbol = parseSymbol((await params).symbol);
  const product = symbol ? await getProduct(symbol) : null;
  return product ? Response.json(product) : bankError(404, "PRODUCT_NOT_FOUND", "That product does not exist.");
}
