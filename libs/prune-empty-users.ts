import { Prisma } from "@/generated/prisma/client";
import prisma from "@/libs/prisma";

const EMPTY_USER_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// Deletes AppUsers that were generated but never used: no profile, no accounts, no conversations.
// Cash is created lazily in the bank, so there is nothing to clean up there.
export async function pruneEmptyUsers(now = Date.now()) {
  const { count } = await prisma.appUser.deleteMany({
    where: {
      profile: { equals: Prisma.DbNull },
      createdAt: { lt: new Date(now - EMPTY_USER_MAX_AGE_MS) },
      accounts: { none: {} },
      conversations: { none: {} },
    },
  });
  return count;
}
