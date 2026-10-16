import type { Prisma } from "@/generated/prisma/client";
import prisma from "@/libs/prisma";
import { isAccountRecord, isLegacyV2AccountRecord, isPersonalProfile, isRecord, upgradeAccountRecord, type AccountRecord } from "@/libs/account-model";
import { existingUser, requestedToken, sameOrigin } from "@/libs/user-data-server";
import { readJsonBody } from "@/libs/request-json";
import { deleteAccount } from "@/libs/bank-client";

const asJson = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

export async function GET(request: Request) {
  const user = await existingUser(request);
  if (!user) return new Response("Account code not found", { status: 401 });
  const records = await prisma.appAccount.findMany({ where: { userToken: user.token }, orderBy: { createdAt: "asc" } });
  if (user.profile !== null && !isPersonalProfile(user.profile)) return new Response("Saved profile is invalid", { status: 500 });
  const accounts: AccountRecord[] = [];
  for (const item of records) {
    if (isAccountRecord(item.record)) {
      accounts.push(item.record);
    } else if (isLegacyV2AccountRecord(item.record)) {
      const upgraded = upgradeAccountRecord(item.record);
      await prisma.appAccount.updateMany({ where: { id: item.id, userToken: user.token }, data: { record: asJson(upgraded) } });
      accounts.push(upgraded);
    } else {
      return new Response("Saved account is invalid", { status: 500 });
    }
  }
  return Response.json({ profile: user.profile, accounts });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response("Invalid origin", { status: 403 });
  const token = requestedToken(request);
  const user = await existingUser(request);
  if (!token || !user) return new Response("Account code not found", { status: 401 });
  const parsed = await readJsonBody(request, 64_000);
  if (!parsed.ok || !isRecord(parsed.value)) return new Response("Invalid request", { status: 400 });
  const { profile, account } = parsed.value;
  if (!isPersonalProfile(profile) || !isAccountRecord(account)) return new Response("Invalid profile or account", { status: 400 });
  try {
    await prisma.$transaction(async (tx) => {
      await tx.appAccount.create({ data: { id: account.id, userToken: token, record: asJson(account), createdAt: new Date(account.createdAt) } });
      await tx.appUser.update({ where: { token }, data: { profile: asJson(profile) } });
    });
    return Response.json({ account }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return new Response("Account already exists", { status: 409 });
    }
    throw error;
  }
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return new Response("Invalid origin", { status: 403 });
  const token = requestedToken(request);
  if (!token || !await existingUser(request)) return new Response("Account code not found", { status: 401 });
  const parsed = await readJsonBody(request, 64_000);
  if (!parsed.ok || !isRecord(parsed.value) || !isAccountRecord(parsed.value.account)) {
    return new Response("Invalid account", { status: 400 });
  }
  const account = parsed.value.account;
  const result = await prisma.appAccount.updateMany({ where: { id: account.id, userToken: token }, data: { record: asJson(account) } });
  return result.count ? Response.json({ account }) : new Response("Account not found", { status: 404 });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return new Response("Invalid origin", { status: 403 });
  const token = requestedToken(request);
  if (!token || !await existingUser(request)) return new Response("Account code not found", { status: 401 });
  const bank = await deleteAccount(token);
  if (!bank.ok) return new Response("Bank data could not be removed; nothing was cleared", { status: 502 });
  await prisma.$transaction([
    prisma.appConversation.deleteMany({ where: { userToken: token } }),
    prisma.appAccount.deleteMany({ where: { userToken: token } }),
    prisma.appUser.update({ where: { token }, data: { profile: { set: null } } }),
  ]);
  return new Response(null, { status: 204 });
}
