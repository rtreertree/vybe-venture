import { sanitizePlanningProfile } from "@/libs/profile-sanitizer";
import { sanitizeState, type ChatMessage } from "@/libs/chat-shared";
import { getIntakeConfig } from "@/libs/intake-configs";
import { isRecord } from "@/libs/account-model";
import { readJsonBody } from "@/libs/request-json";

const MAX_MESSAGES = 40;
const MAX_CHARS = 2_000;
const MAX_BODY_BYTES = 96_000;

function toTranscript(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value)) return null;

  const messages: ChatMessage[] = [];
  for (const message of value.slice(-MAX_MESSAGES)) {
    if (!isRecord(message) || (message.role !== "user" && message.role !== "assistant")) return null;
    if (typeof message.content !== "string") return null;
    if (!message.content.trim()) {
      if (message.role === "assistant") continue;
      return null;
    }
    messages.push({ role: message.role, content: message.content.trim().slice(0, MAX_CHARS) });
  }
  return messages.length ? messages : null;
}

export async function POST(req: Request) {
  const parsed = await readJsonBody(req, MAX_BODY_BYTES);
  if (!parsed.ok) {
    return new Response(parsed.status === 413 ? "Request is too large" : "Invalid JSON request", { status: parsed.status });
  }
  if (!isRecord(parsed.value)) return new Response("Invalid request", { status: 400 });
  const record = parsed.value;
  const fields = getIntakeConfig("profile");

  if (!fields) return new Response("unknown intake", { status: 400 });

  const { profile } = sanitizeState({ profile: record.profile }, fields);
  const conversation = toTranscript(record.messages);
  if (!conversation) return new Response("Invalid conversation history", { status: 400 });
  if (Object.values(profile).some((value) => value === null)) {
    return new Response("profile incomplete", { status: 400 });
  }

  try {
    const planning = await sanitizePlanningProfile(profile, conversation, fields);
    return Response.json({ planning });
  } catch (error) {
    console.error("Profile sanitization failed", error);
    return new Response("Unable to sanitize profile", { status: 500 });
  }
}
