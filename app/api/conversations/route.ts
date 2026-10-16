import type { Prisma } from "@/generated/prisma/client";
import prisma from "@/libs/prisma";
import { existingUser, requestedToken, sameOrigin } from "@/libs/user-data-server";
import { readJsonBody } from "@/libs/request-json";
import { isRecord } from "@/libs/account-model";

function fields(request: Request) {
  const search = new URL(request.url).searchParams;
  const accountId = search.get("accountId") ?? "";
  const topic = search.get("topic") ?? "";
  const scope = search.get("scope") ?? "";
  return accountId.length <= 128 && accountId.length > 0 && /^(general|details|news|what-if)$/.test(topic)
    && scope.length > 0 && scope.length <= 128 ? { accountId, topic, scope } : null;
}

async function accountOwned(userToken: string, accountId: string) {
  return prisma.appAccount.findFirst({ where: { id: accountId, userToken }, select: { id: true } });
}

export async function GET(request: Request) {
  const user = await existingUser(request);
  const key = fields(request);
  if (!user) return new Response("Account code not found", { status: 401 });
  if (!key || !await accountOwned(user.token, key.accountId)) return new Response("Account not found", { status: 404 });
  const conversation = await prisma.appConversation.findUnique({
    where: { userToken_accountId_topic_scope: { userToken: user.token, ...key } },
  });
  return Response.json({ messages: conversation?.messages ?? [] });
}

export async function PUT(request: Request) {
  if (!sameOrigin(request)) return new Response("Invalid origin", { status: 403 });
  const token = requestedToken(request);
  const key = fields(request);
  if (!token || !await existingUser(request)) return new Response("Account code not found", { status: 401 });
  if (!key || !await accountOwned(token, key.accountId)) return new Response("Account not found", { status: 404 });
  const parsed = await readJsonBody(request, 64_000);
  if (!parsed.ok || !isRecord(parsed.value) || !Array.isArray(parsed.value.messages)) return new Response("Invalid messages", { status: 400 });
  const messages = parsed.value.messages;
  if (messages.length > 30 || !messages.every((item) => isRecord(item)
    && (item.role === "user" || item.role === "assistant")
    && typeof item.content === "string" && item.content.length <= 1_500)) {
    return new Response("Invalid messages", { status: 400 });
  }
  await prisma.appConversation.upsert({
    where: { userToken_accountId_topic_scope: { userToken: token, ...key } },
    create: { userToken: token, ...key, messages: messages as Prisma.InputJsonValue },
    update: { messages: messages as Prisma.InputJsonValue },
  });
  return new Response(null, { status: 204 });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return new Response("Invalid origin", { status: 403 });
  const token = requestedToken(request);
  const key = fields(request);
  if (!token || !await existingUser(request)) return new Response("Account code not found", { status: 401 });
  if (!key || !await accountOwned(token, key.accountId)) return new Response("Account not found", { status: 404 });
  await prisma.appConversation.deleteMany({ where: { userToken: token, ...key } });
  return new Response(null, { status: 204 });
}
