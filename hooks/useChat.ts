"use client";

import { useCallback, useRef, useState } from "react";
import {
    emptyState,
    isComplete as checkComplete,
    sanitizeState,
    type ChatMessage,
    type ChatState,
    type Profile,
    type StreamEvent,
} from "@/libs/chat-shared";
import { INTAKE_CONFIGS, type IntakeId } from "@/libs/intake-configs";

type Options = {
    intake: IntakeId;
    initialMessages?: ChatMessage[];
};

export function useChat({ intake, initialMessages = [] }: Options) {
    const fields = INTAKE_CONFIGS[intake];

    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
    const [state, setState] = useState<ChatState>(() => emptyState(fields));
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const isComplete = checkComplete(state.profile);

    const stop = useCallback(() => abortRef.current?.abort(), []);

    const hydrate = useCallback((profile: Profile, initialMessages: ChatMessage[], counters?: ChatState["counters"]) => {
        setState(sanitizeState({ profile, counters }, fields));
        setMessages(initialMessages);
        setError(null);
    }, [fields]);

    const appendToLast = (text: string) =>
        setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            next[next.length - 1] = { ...last, content: last.content + text };
            return next;
        });

    const send = useCallback(
        async (text: string) => {
            if (!text.trim() || isStreaming || isComplete) return;

            setError(null);
            const history: ChatMessage[] = [...messages, { role: "user", content: text }];
            setMessages([...history, { role: "assistant", content: "" }]);
            setIsStreaming(true);

            const controller = new AbortController();
            abortRef.current = controller;

            try {
                const res = await fetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ intake, messages: history, state }),
                    signal: controller.signal,
                });
                if (!res.ok || !res.body) throw new Error(`Request failed (${res.status})`);

                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let buffer = "";

                const handle = (line: string) => {
                    if (!line.trim()) return;
                    const event = JSON.parse(line) as StreamEvent;
                    if (event.type === "state") setState(event.state);
                    else appendToLast(event.text);
                };

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n");
                    buffer = lines.pop() ?? "";
                    lines.forEach(handle);
                }
                if (buffer) handle(buffer);
            } catch (err) {
                if ((err as Error).name !== "AbortError") setError((err as Error).message);
            } finally {
                setIsStreaming(false);
                abortRef.current = null;
            }
        },
        [intake, messages, state, isStreaming, isComplete]
    );

    return { fields, messages, state, isStreaming, isComplete, error, send, stop, hydrate };
}
