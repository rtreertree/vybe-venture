import { randomInt } from "node:crypto";
import prisma from "@/libs/prisma";
import { USER_TOKEN_PATTERN } from "@/libs/user-token";
import { requestedToken, sameOrigin } from "@/libs/user-data-server";
import { readJsonBody } from "@/libs/request-json";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export async function GET(request: Request) {
  const token = requestedToken(request);
  if (!token) return new Response("Invalid account code", { status: 400 });
  const user = await prisma.appUser.findUnique({ where: { token }, select: { token: true } });
  return user ? Response.json({ token: user.token }) : new Response("Account code not found", { status: 404 });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response("Invalid origin", { status: 403 });
  const parsed = await readJsonBody(request, 1_000);
  if (!parsed.ok || typeof parsed.value !== "object" || parsed.value === null) {
    return new Response("Invalid request", { status: 400 });
  }
  const body = parsed.value as Record<string, unknown>;
  if (body.action === "enter") {
    const token = typeof body.token === "string" ? body.token.trim().toUpperCase() : "";
    if (!USER_TOKEN_PATTERN.test(token)) return new Response("Use a five-character code with letters and numbers", { status: 400 });
    const user = await prisma.appUser.findUnique({ where: { token }, select: { token: true } });
    return user ? Response.json({ token }) : new Response("That account code was not found", { status: 404 });
  }
  if (body.action !== "generate") return new Response("Invalid action", { status: 400 });
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const token = Array.from({ length: 5 }, () => alphabet[randomInt(alphabet.length)]).join("");
    try {
      await prisma.appUser.create({ data: { token } });
      return Response.json({ token }, { status: 201 });
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") continue;
      throw error;
    }
  }
  return new Response("Could not generate a unique code; please try again", { status: 503 });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return new Response("Invalid origin", { status: 403 });
  const token = requestedToken(request);
  if (!token) return new Response("Invalid account code", { status: 400 });
  const deleted = await prisma.appUser.deleteMany({ where: { token } });
  return deleted.count ? new Response(null, { status: 204 }) : new Response("Account code not found", { status: 404 });
}
