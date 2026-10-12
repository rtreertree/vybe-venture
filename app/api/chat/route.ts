import { createChatStream } from "@/libs/chat-server";
import { sanitizeState, type ChatMessage } from "@/libs/chat-shared";
import { getIntakeConfig } from "@/libs/intake-configs";
import { isRecord } from "@/libs/account-model";
import { readJsonBody } from "@/libs/request-json";

const MAX_MESSAGES = 40;
const MAX_CHARS = 2000;
const MAX_BODY_BYTES = 128_000;

function parseMessages(value: unknown): ChatMessage[] | null {
    if (!Array.isArray(value) || value.length === 0) return null;

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

    return messages.at(-1)?.role === "user" ? messages : null;
}

export async function POST(req: Request) {
    const parsed = await readJsonBody(req, MAX_BODY_BYTES);
    if (!parsed.ok) {
        return new Response(parsed.status === 413 ? "Request is too large" : "Invalid JSON request", { status: parsed.status });
    }
    if (!isRecord(parsed.value)) return new Response("Invalid request", { status: 400 });
    const record = parsed.value;

    const fields = getIntakeConfig(record.intake);
    if (!fields) return new Response("unknown intake", { status: 400 });

    const messages = parseMessages(record.messages);
    if (!messages) return new Response("A valid user message is required", { status: 400 });

    const state = sanitizeState(record.state, fields);

    return new Response(createChatStream(messages, state, fields, req.signal), {
        headers: {
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
        },
    });
}