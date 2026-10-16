import prisma from "@/libs/prisma";
import { USER_TOKEN_PATTERN } from "@/libs/user-token";

export function requestedToken(request: Request) {
  const token = request.headers.get("x-user-token");
  return token && USER_TOKEN_PATTERN.test(token) ? token : null;
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function existingUser(request: Request) {
  const token = requestedToken(request);
  return token ? prisma.appUser.findUnique({ where: { token } }) : null;
}
