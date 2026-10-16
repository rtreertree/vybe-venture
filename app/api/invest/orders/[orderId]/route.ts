import { cancelOrder, getOrder } from "@/libs/bank-client";
import { authorizeInvest, bankResponse } from "@/libs/invest-server";

export async function GET(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const auth = await authorizeInvest(request);
  if (!auth.ok) return auth.response;
  return bankResponse(await getOrder(auth.token, (await params).orderId));
}

export async function DELETE(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const auth = await authorizeInvest(request, { write: true });
  if (!auth.ok) return auth.response;
  return bankResponse(await cancelOrder(auth.token, (await params).orderId));
}
