import { deleteBankData, getAccount } from "@/libs/bank/accounts";
import { requireUserId } from "@/libs/bank/http";

export async function GET(request: Request) {
  const auth = requireUserId(request);
  if (!auth.ok) return auth.response;
  return Response.json(await getAccount(auth.userId));
}

// Prototype reset only: removes the caller's cash account, holdings and orders.
export async function DELETE(request: Request) {
  const auth = requireUserId(request);
  if (!auth.ok) return auth.response;
  await deleteBankData(auth.userId);
  return new Response(null, { status: 204 });
}
