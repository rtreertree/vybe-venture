import { getProduct } from "@/libs/bank-client";
import { bankResponse } from "@/libs/invest-server";

export async function GET(_request: Request, { params }: { params: Promise<{ symbol: string }> }) {
  return bankResponse(await getProduct((await params).symbol), { publicCache: true });
}
