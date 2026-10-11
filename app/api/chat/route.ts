import { createChatStream } from "@/libs/chat-server";
import { sanitizeState, type ChatMessage } from "@/libs/chat-shared";
import { getIntakeConfig } from "@/libs/intake-configs";

const MAX_MESSAGES = 40;
const MAX_CHARS = 2000;

function toMessage(m: unknown): ChatMessage | null {
    if (typeof m !== "object" || m === null) return null;
    const { role, content } = m as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string" || !content) return null;
    return { role, content: content.slice(0, MAX_CHARS) };
}

export async function POST(req: Request) {
    const body: unknown = await req.json().catch(() => null);
    const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};

    const fields = getIntakeConfig(record.intake);
    if (!fields) return new Response("unknown intake", { status: 400 });

    const raw = record.messages;
    if (!Array.isArray(raw) || raw.length === 0) {
        return new Response("messages required", { status: 400 });
    }

    const messages = raw
        .map(toMessage)
        .filter((m): m is ChatMessage => m !== null)
        .slice(-MAX_MESSAGES);

    if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
        return new Response("last message must be from the user", { status: 400 });
    }

    const state = sanitizeState(record.state, fields);

    return new Response(createChatStream(messages, state, fields, req.signal), {
        headers: {
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
        },
    });
}