import { bankError, requireUserId } from "@/libs/bank/http";
import { BankOrderError, cancelOrder, getOrder } from "@/libs/bank/orders";

export async function GET(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const auth = requireUserId(request);
  if (!auth.ok) return auth.response;
  const order = await getOrder(auth.userId, (await params).orderId);
  return order ? Response.json(order) : bankError(404, "ORDER_NOT_FOUND", "Order not found.");
}

export async function DELETE(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const auth = requireUserId(request);
  if (!auth.ok) return auth.response;
  try {
    return Response.json(await cancelOrder(auth.userId, (await params).orderId));
  } catch (error) {
    if (error instanceof BankOrderError) return bankError(error.status, error.code, error.message);
    throw error;
  }
}
