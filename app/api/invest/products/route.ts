import { getProducts } from "@/libs/bank-client";
import { bankResponse } from "@/libs/invest-server";
import type { ProductType, RiskLevel } from "@/libs/bank/types";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  return bankResponse(await getProducts({
    type: params.get("type") as ProductType | null ?? undefined,
    risk: params.get("risk") as RiskLevel | null ?? undefined,
    area: params.get("area") ?? undefined,
    q: params.get("q") ?? undefined,
    sort: params.get("sort") ?? undefined,
  }), { publicCache: true });
}
