import prisma from "@/libs/prisma";
import { USER_TOKEN_PATTERN } from "@/libs/user-token";

export function requestedToken(request: Request) {
  const token = request.headers.get("x-user-token");
  return token && USER_TOKEN_PATTERN.test(token) ? token : null;
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  try {
    const o = new URL(origin);
    return o.host === host.split(",")[0].trim() && o.protocol === `${proto.split(",")[0].trim()}:`;
  } catch {
    return false;
  }
}

export async function existingUser(request: Request) {
  const token = requestedToken(request);
  return token ? prisma.appUser.findUnique({ where: { token } }) : null;
}
