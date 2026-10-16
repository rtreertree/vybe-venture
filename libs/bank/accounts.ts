import { Prisma } from "@/generated/prisma/client";
import prisma from "@/libs/prisma";
import type { BankAccount } from "@/libs/bank/types";

export const STARTING_CASH = new Prisma.Decimal(10_000);

export async function ensureBankUser(userId: string) {
  return prisma.bankUser.upsert({
    where: { userId },
    update: {},
    create: { userId, cashBalance: STARTING_CASH },
  });
}

export async function getAccount(userId: string): Promise<BankAccount> {
  const user = await ensureBankUser(userId);
  return { userId: user.userId, currency: "USD", cashBalance: user.cashBalance.toNumber(), asOf: new Date().toISOString() };
}

export async function deleteBankData(userId: string) {
  await prisma.$transaction([
    prisma.bankOrder.deleteMany({ where: { userId } }),
    prisma.bankHolding.deleteMany({ where: { userId } }),
    prisma.bankUser.deleteMany({ where: { userId } }),
  ]);
}
