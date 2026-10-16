import { bankError } from "@/libs/bank/http";
import { listProducts, PRODUCT_SORTS, PRODUCT_TYPES, RISK_LEVELS, type ProductSort } from "@/libs/bank/products";
import type { ProductType, RiskLevel } from "@/libs/bank/types";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const type = params.get("type");
  const risk = params.get("risk");
  const sort = params.get("sort") ?? "name";
  const area = params.get("area")?.trim();
  const q = params.get("q")?.trim();
  if (type && !(PRODUCT_TYPES as string[]).includes(type)) return bankError(400, "INVALID_REQUEST", "type must be stock, fund, bond or crypto.");
  if (risk && !(RISK_LEVELS as string[]).includes(risk)) return bankError(400, "INVALID_REQUEST", "risk must be low, medium or high.");
  if (!(PRODUCT_SORTS as readonly string[]).includes(sort)) return bankError(400, "INVALID_REQUEST", "sort must be name, price, dayChangePercent or risk.");
  if ((area && area.length > 64) || (q && q.length > 100)) return bankError(400, "INVALID_REQUEST", "Filter text is too long.");
  return Response.json(await listProducts({
    type: (type || undefined) as ProductType | undefined,
    risk: (risk || undefined) as RiskLevel | undefined,
    area: area || undefined,
    q: q || undefined,
    sort: sort as ProductSort,
  }));
}
