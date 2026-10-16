import "server-only";
import { getOpenAiClient } from "@/libs/openai";
import {
    MAX_RELATED,
    MAX_UNRELATED,
    sanitizeState,
    type ChatMessage,
    type ChatState,
    type FieldsConfig,
    type Profile,
    type StreamEvent,
} from "@/libs/chat-shared";

type TurnType = "answer" | "related" | "unrelated";
type Analysis = { values: Record<string, unknown>; turnType: TurnType };

function buildExtractPrompt(fields: FieldsConfig) {
    const list = Object.entries(fields)
        .map(([key, desc]) => `- ${key}: ${desc}`)
        .join("\n");

    return `You analyze the LAST user message of an onboarding chat that collects these fields:
${list}

Extract only values the user explicitly states in their last message (corrections count). Use null for anything not stated. Never guess.
Keep each value short, in the user's own words. If the user explicitly declines to share a field, store "prefer not to say" for it.

turn_type:
- "answer": the message provides, or tries to provide, any requested info (even if it also contains a tangent)
- "related": no info given, but the message is about the intake itself, privacy, why we ask, or small talk closely tied to the requested topics
- "unrelated": anything else (weather, jokes, coding help, trivia, etc.)`;
}

async function analyze(
    messages: ChatMessage[],
    known: Profile,
    fields: FieldsConfig,
    signal: AbortSignal
): Promise<Analysis> {
    const keys = Object.keys(fields);

    const properties: Record<string, unknown> = Object.fromEntries(
        keys.map((k) => [k, {
            type: ["string", "null"],
            description: fields[k],
        }])
    );
    properties.turn_type = { type: "string", enum: ["answer", "related", "unrelated"] };

    const res = await getOpenAiClient().responses.create(
        {
            model: "gpt-5-mini",
            reasoning: { effort: "minimal" },
            instructions: buildExtractPrompt(fields),
            input: JSON.stringify({ known, recent: messages.slice(-6) }),
            text: {
                format: {
                    type: "json_schema",
                    name: "turn_analysis",
                    strict: true,
                    schema: {
                        type: "object",
                        additionalProperties: false,
                        required: [...keys, "turn_type"],
                        properties,
                    },
                },
            },
        },
        { signal }
    );

    const parsed = JSON.parse(res.output_text) as Record<string, unknown>;
    const t = parsed.turn_type;
    const turnType: TurnType = t === "related" || t === "unrelated" ? t : "answer";
    return { values: parsed, turnType };
}

function buildInstructions(opts: {
    fields: FieldsConfig;
    profile: Profile;
    captured: string[];
    turnType: TurnType;
    tangentAllowed: boolean;
    tangentsLeft: number;
}) {
    const { fields, profile, captured, turnType, tangentAllowed, tangentsLeft } = opts;
    const keys = Object.keys(fields);
    const missing = keys.filter((k) => profile[k] === null);
    const describe = (k: string) => fields[k];

    const base = `You are a warm, natural financial-planning onboarding assistant collecting: ${keys
        .map(describe)
        .join("; ")}. Keep replies short (1-3 sentences), conversational, no lists, no emoji spam. Never invent user info. Move at the user's pace: do not rush, make them feel they need to answer everything right away, or frame this as an interrogation. Ask only one item at a time and connect it naturally to what they have already shared. If they are unsure, need time, or give a rough answer, reassure them that an estimate is fine and they can revisit it later. If a field is sensitive, ask gently and let the user know they may say "prefer not to say".

Internal field keys are never user-facing. Never write snake_case identifiers, database labels, or phrases such as "I recorded [field name]." Acknowledge what the person said in natural language when useful, then smoothly ask the next question. For example, say "Thanks for sharing that" rather than naming a field, and say "What do your regular expenses look like?" rather than using an internal label.`;

    if (missing.length === 0) {
        return `${base}
All information is collected: ${JSON.stringify(profile)}.
Warmly thank the user (use their name only if one of the values is clearly their name), say in one or two sentences that everything's set, and tell them to press the "Next" button to continue. Do NOT ask any more questions.`;
    }

    const next = missing[0];
    const parts = [base, `Still missing: ${missing.map(describe).join("; ")}. Next, ask about: ${describe(next)}. Do not mention the full list of remaining questions.`];

    if (captured.length) {
        parts.push(
            `The user just shared: ${captured.map(describe).join("; ")}. Acknowledge the substance briefly in plain language—without naming an internal field—then ask for the next missing item (one item only).`
        );
    }

    if (turnType === "answer" && captured.length === 0) {
        parts.push(`The user tried to answer but the answer was unclear or invalid. Politely ask again for the item.`);
    }

    if (turnType === "related" || turnType === "unrelated") {
        if (tangentAllowed) {
            parts.push(
                `The user went on a ${turnType} tangent. Respond to it briefly and kindly (max 2 sentences), then smoothly steer back by asking for ${next}.` +
                (tangentsLeft === 0
                    ? ` This was the last tangent you can entertain, so gently mention you'd like to wrap up the remaining questions first.`
                    : "")
            );
        } else {
            parts.push(
                `The user went on another ${turnType} tangent, but the limit is reached. Do NOT engage with its content. Politely say you'd love to chat after, but first need a few details, and ask for ${next}.`
            );
        }
    }

    return parts.join("\n");
}

export function createChatStream(
    messages: ChatMessage[],
    clientState: ChatState,
    fields: FieldsConfig,
    signal?: AbortSignal
) {
    const encoder = new TextEncoder();
    const upstream = new AbortController();
    signal?.addEventListener("abort", () => upstream.abort(), { once: true });

    return new ReadableStream<Uint8Array>({
        async start(controller) {
            const send = (e: StreamEvent) =>
                controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));

            try {
                const state = structuredClone(clientState);

                const analysis = await analyze(messages, state.profile, fields, upstream.signal);

                const captured: string[] = [];
                for (const key of Object.keys(fields)) {
                    const value = sanitizeState({ profile: { [key]: analysis.values[key] } }, fields).profile[key];
                    if (value === null) continue;
                    if (state.profile[key] !== value) captured.push(key);
                    state.profile[key] = value;
                }

                let tangentAllowed = true;
                let tangentsLeft = 0;
                if (analysis.turnType === "related") {
                    tangentAllowed = state.counters.related < MAX_RELATED;
                    if (tangentAllowed) state.counters.related++;
                    tangentsLeft = MAX_RELATED - state.counters.related;
                } else if (analysis.turnType === "unrelated") {
                    tangentAllowed = state.counters.unrelated < MAX_UNRELATED;
                    if (tangentAllowed) state.counters.unrelated++;
                    tangentsLeft = MAX_UNRELATED - state.counters.unrelated;
                }

                send({ type: "state", state });

                const stream = await getOpenAiClient().responses.create(
                    {
                        model: "gpt-5-mini",
                        reasoning: { effort: "minimal" },
                        instructions: buildInstructions({
                            fields,
                            profile: state.profile,
                            captured,
                            turnType: analysis.turnType,
                            tangentAllowed,
                            tangentsLeft,
                        }),
                        input: messages,
                        stream: true,
                    },
                    { signal: upstream.signal }
                );

                for await (const event of stream) {
                    if (event.type === "response.output_text.delta") {
                        send({ type: "delta", text: event.delta });
                    }
                }
                controller.close();
            } catch (err) {
                if (upstream.signal.aborted) {
                    try { controller.close(); } catch { }
                    return;
                }
                controller.error(err);
            }
        },
        cancel() {
            upstream.abort();
        },
    });
}
