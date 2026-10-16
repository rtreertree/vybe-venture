import { connection } from "next/server";
import { listAreas } from "@/libs/bank/products";

export async function GET() {
  await connection();
  return Response.json(await listAreas());
}
