import prisma from "@/libs/prisma";
import { getProducts } from "@/libs/bank-client";
import { authorizeInvest, bankResponse, problem } from "@/libs/invest-server";
import { recommendProducts } from "@/libs/product-recommender";
import { isAccountPlanning, isRecord, type AccountRecord } from "@/libs/account-model";
import { readJsonBody } from "@/libs/request-json";

export async function POST(request: Request) {
  const auth = await authorizeInvest(request, { write: true });
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(request, 2_000);
  if (!body.ok || !isRecord(body.value) || typeof body.value.accountRef !== "string" || body.value.accountRef.length > 128) {
    return problem(400, "INVALID_REQUEST", "accountRef is required.");
  }

  const row = await prisma.appAccount.findFirst({ where: { id: body.value.accountRef, userToken: auth.token } });
  const record = row?.record;
  if (!row || !isRecord(record) || !isAccountPlanning(record.planning)) {
    return problem(404, "ACCOUNT_NOT_FOUND", "That account was not found for your code.");
  }
  const user = await prisma.appUser.findUnique({ where: { token: auth.token }, select: { profile: true } });

  const catalog = await getProducts();
  if (!catalog.ok) return bankResponse(catalog);

  try {
    const account = record as unknown as AccountRecord;
    const picks = await recommendProducts(
      isRecord(user?.profile) ? user.profile : null,
      { accountName: account.accountName, goal: account.goal, timeframeYears: account.timeframeYears, planning: account.planning },
      catalog.data.products,
    );
    const bySymbol = new Map(catalog.data.products.map((product) => [product.symbol, product]));
    const recommendations = picks.flatMap((pick) => {
      const product = bySymbol.get(pick.symbol);
      return product ? [{ product, reason: pick.reason }] : [];
    });
    return Response.json({ recommendations }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Product recommendation failed", error);
    return problem(502, "RECOMMENDATION_FAILED", "We couldn't pick options for you right now. Try again.");
  }
}
