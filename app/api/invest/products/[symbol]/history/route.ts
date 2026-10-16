import { getProductHistory } from "@/libs/bank-client";
import { bankResponse } from "@/libs/invest-server";
import type { ChartRange } from "@/libs/bank/types";

export async function GET(request: Request, { params }: { params: Promise<{ symbol: string }> }) {
  const range = new URL(request.url).searchParams.get("range") ?? "1M";
  return bankResponse(await getProductHistory((await params).symbol, range as ChartRange), { publicCache: true });
}
