"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Checklist } from "@/components/Checklist";
import { useChat } from "@/hooks/useChat";
import { saveProfile } from "@/actions/profile";

function LoadingDots() {
    return (
        <span role="status" aria-label="Agent is responding" className="inline-flex h-6 w-10 items-center justify-between">
            {[220, 0, 110].map((delay, dotIndex) => (
                <span
                    key={dotIndex}
                    aria-hidden="true"
                    className={`chat-typing-dot h-2 w-2 rounded-full ${["bg-accent", "bg-growth", "bg-secondary"][dotIndex]}`}
                    style={{ animationDelay: `${delay}ms` }}
                />
            ))}
        </span>
    );
}

function StreamedText({ text, animate }: { text: string; animate: boolean }) {
    const characters = Array.from(text);
    const characterCount = characters.length;
    const latestCountRef = useRef(characterCount);
    const [visibleCount, setVisibleCount] = useState(() => animate ? 0 : characterCount);
    const [wasAnimated] = useState(animate);

    useEffect(() => {
        latestCountRef.current = characterCount;
    }, [characterCount]);

    useEffect(() => {
        if (!animate && visibleCount >= latestCountRef.current) return;
        const timer = window.setInterval(() => {
            setVisibleCount((current) => Math.min(current + 1, latestCountRef.current));
        }, 5);
        return () => window.clearInterval(timer);
    }, [animate, visibleCount]);

    if (!wasAnimated) return text;
 
    const visibleText = characters.slice(0, visibleCount).join("");
    const segments = Array.from(visibleText.matchAll(/\s+|\S+/gu));

    return segments.map((match) => {
        const segment = match[0];
        const segmentStart = match.index ?? 0;
        const segmentCharacters = Array.from(segment);

        if (/^\s+$/u.test(segment)) {
            return <span key={`space-${segmentStart}`}>{segment}</span>;
        }

        return (
            <span key={`word-${segmentStart}`} className="chat-word">
                {segmentCharacters.map((character, index) => (
                    <span key={segmentStart + index} className="chat-character">
                        {character}
                    </span>
                ))}
            </span>
        );
    });
}

export default function ChatPage() {
    const router = useRouter();
    const [input, setInput] = useState("");
    const [pending, startTransition] = useTransition();
    const bottomRef = useRef<HTMLDivElement>(null);

    const { fields, messages, state, isStreaming, isComplete, error, send, stop } = useChat({
        intake: "profile",
        initialMessages: [
            { role: "assistant", content: "Hi there! 👋 Let's get you set up. What's your name?" },
        ],
    });

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const submit = () => {
        send(input);
        setInput("");
    };

    const next = () =>
        startTransition(async () => {
            await saveProfile("profile", state.profile);
            router.push("/welcome");
        });

    return (
        <div className="flex h-dvh flex-col bg-light-surface text-primary">
            <header className="border-b border-primary/10 bg-light-surface">
                <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-5 sm:px-8">
                    <Link href="/" className="font-display text-sm font-bold sm:text-base">
                        AI Agent<span className="text-accent">.</span>
                    </Link>
                    <p className="inline-flex items-center gap-2 rounded-full border border-growth/30 bg-growth/10 px-3 py-2 text-xs font-semibold uppercase text-secondary">
                        <span className="h-2 w-2 rounded-full bg-growth" aria-hidden />
                        Create your account
                    </p>
                </div>
            </header>

            <main className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-5 sm:px-8">
                <div className="border-b border-primary/10">
                    <Checklist fields={fields} profile={state.profile} />
                </div>
                <div className="flex-1 space-y-5 overflow-y-auto py-6 sm:py-8">
                    {messages.map((m, i) => (
                        <div key={i} className={`flex flex-col gap-1.5 ${m.role === "user" ? "items-end" : "items-start"}`}>
                            <span className={`flex items-center gap-2 px-1 text-[10px] font-bold uppercase text-secondary ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                                {m.role === "user" ? "You" : <><span className="h-1.5 w-1.5 rounded-full bg-growth" aria-hidden /> Money, Clearly</>}
                            </span>
                            <span className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[75%] ${m.role === "user" ? "rounded-br-md bg-primary text-white" : "rounded-bl-md border border-primary/10 bg-white text-primary shadow-sm shadow-primary/5"}`}>
                                {m.role === "assistant" && i === messages.length - 1 ? (
                                    m.content ? (
                                        <StreamedText text={m.content} animate={isStreaming} />
                                    ) : isStreaming ? (
                                        <LoadingDots />
                                    ) : "…"
                                ) : (
                                    m.content || "…"
                                )}
                            </span>
                        </div>
                    ))}
                    {error && <p role="alert" className="text-sm text-risk">{error}</p>}
                    <div ref={bottomRef} />
                </div>

                <div className="border-t border-primary/15 py-4 sm:py-5">
                    {isComplete && !isStreaming ? (
                        <button
                            onClick={next}
                            disabled={pending}
                            className="min-h-12 w-full rounded-full bg-growth px-4 font-semibold text-primary transition-colors hover:bg-growth/90 disabled:opacity-50"
                        >
                            {pending ? "Saving…" : "Next"}
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 rounded-full border border-primary/15 bg-white p-1.5 shadow-sm shadow-primary/5 focus-within:border-accent">
                            <input
                                className="min-w-0 min-h-10 flex-1 rounded-full bg-transparent px-4 text-sm text-primary outline-none placeholder:text-secondary/60 disabled:opacity-50"
                                value={input}
                                disabled={isComplete}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && submit()}
                                placeholder="Type a message…"
                            />
                            {isStreaming ? (
                                <button onClick={stop} className="min-h-12 rounded-full bg-risk px-5 font-semibold text-white transition-opacity hover:opacity-90">
                                    Stop
                                </button>
                            ) : (
                                <button
                                    onClick={submit}
                                    disabled={isComplete}
                                    className="min-h-12 rounded-full bg-accent px-5 font-semibold text-primary transition-colors hover:bg-accent/90 disabled:opacity-50"
                                >
                                    Send
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}