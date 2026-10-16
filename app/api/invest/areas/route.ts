import { getAreas } from "@/libs/bank-client";
import { bankResponse } from "@/libs/invest-server";

export async function GET() {
  return bankResponse(await getAreas(), { publicCache: true });
}
