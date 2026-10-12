"use client";

import { type FormEvent, useEffect, useState } from "react";
import { ArrowUp, Trash2 } from "lucide-react";
import type { AccountRecord } from "@/libs/account-client";

export type ConsultingTopic = "general" | "details" | "news" | "what-if";
type Message = { role: "user" | "assistant"; content: string };

type Props = {
  account: AccountRecord;
  topic: ConsultingTopic;
  context?: string;
  sessionScope?: string;
};

const MAX_MESSAGE_LENGTH = 1_500;

const promptSuggestions: Record<ConsultingTopic, string[]> = {
  general: [
    "How should I think about this goal?",
    "What trade-offs matter most here?",
    "What would you watch before choosing an investment approach?",
  ],
  details: [
    "How does my timeframe change the plan?",
    "What should I consider about risk tolerance here?",
    "How would liquidity needs affect this goal?",
  ],
  news: [
    "What does this brief mean for a longer-term goal?",
    "How might this theme affect a plan with a short timeframe?",
    "What should I watch for when reading this example?",
  ],
  "what-if": [
    "How should I think about this withdrawal choice?",
    "What would make this scenario more or less risky?",
    "What is the main trade-off in this comparison?",
  ],
};

function parseMessageList(value: unknown): Message[] | null {
  if (!Array.isArray(value) || value.length > 30) return null;
  if (!value.every((item) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) return false;
    const message = item as Record<string, unknown>;
    return (message.role === "user" || message.role === "assistant")
      && typeof message.content === "string";
  })) return null;
  return value.map((item) => {
    const message = item as Message;
    return { role: message.role, content: message.content.slice(0, MAX_MESSAGE_LENGTH) };
  });
}

function openingMessage(topic: ConsultingTopic, accountName: string): Message {
  const openings: Record<ConsultingTopic, string> = {
    general: `I can help you think through ${accountName}'s goal and explain planning trade-offs. What would you like to understand?`,
    details: "I can explain how the details in this account shape its planning context. You can edit and save them in the form above.",
    news: "I can discuss the sample brief shown above, but it is fictional demo content—not verified or current news.",
    "what-if": "I can help explain the What If comparison above. Its return assumptions are examples, not forecasts.",
  };
  return { role: "assistant", content: openings[topic] };
}

export function ConsultingChat({ account, topic, context = "", sessionScope = "account" }: Props) {
  const storageKey = `consult_chat_${account.id}_${topic}_${sessionScope}`;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState("");

  const suggestedPrompts = promptSuggestions[topic];

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(storageKey);
        const parsed: unknown = saved ? JSON.parse(saved) : null;
        setMessages(parseMessageList(parsed) ?? [openingMessage(topic, account.accountName)]);
        setStorageError("");
      } catch {
        setMessages([openingMessage(topic, account.accountName)]);
        setStorageError("Conversation history could not be read or saved in this browser.");
      } finally {
        setIsReady(true);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [account.accountName, storageKey, topic]);

  const commitMessages = (nextMessages: Message[]) => {
    const boundedMessages = nextMessages.slice(-30);
    setMessages(boundedMessages);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(boundedMessages));
      setStorageError("");
    } catch {
      setStorageError("Conversation history could not be saved in this browser.");
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!text || isSending || !isReady) return;

    const nextMessages = [...messages, { role: "user" as const, content: text }].slice(-30);
    commitMessages(nextMessages);
    setInput("");
    setError("");
    setIsSending(true);

    try {
      const response = await fetch("/api/consult-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          messages: nextMessages.slice(-30),
          account: {
            name: account.accountName,
            goal: account.goal,
            timeframe: account.timeframeYears === null ? "" : `${account.timeframeYears} years`,
            planning: {
              targetAmount: account.planning.targetAmount,
              liquidityNeeds: account.planning.liquidityNeeds,
              lossReaction: account.planning.lossReaction,
              riskAttitude: account.planning.riskAttitude,
              preferredProducts: account.planning.preferredProducts,
              excludedIndustries: account.planning.excludedIndustries,
            },
          },
          context,
        }),
      });
      if (!response.ok) throw new Error(`The assistant request failed (${response.status}).`);
      const result: unknown = await response.json();
      if (typeof result !== "object" || result === null || typeof (result as { reply?: unknown }).reply !== "string") {
        throw new Error("The assistant returned an invalid response.");
      }
      commitMessages([...nextMessages, { role: "assistant", content: (result as { reply: string }).reply }]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send your message.");
    } finally {
      setIsSending(false);
    }
  };

  const clearConversation = () => {
    try {
      window.localStorage.removeItem(storageKey);
      setMessages([openingMessage(topic, account.accountName)]);
      setError("");
      setStorageError("");
    } catch {
      setStorageError("Conversation history could not be cleared in this browser.");
    }
  };

  return (
    <section className="overflow-hidden rounded-[20px] border border-primary/15 bg-white shadow-[0_12px_32px_rgba(16,28,44,0.05)]" aria-labelledby="consult-chat-title">
      <div className="flex flex-col gap-3 border-b border-primary/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-secondary">Account conversation</p>
          <h2 id="consult-chat-title" className="mt-1 wrap-anywhere font-display text-lg font-semibold text-primary">
            Ask about {account.accountName}
          </h2>
        </div>
        <button
          type="button"
          onClick={clearConversation}
          disabled={!isReady || isSending}
          className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 px-2 text-sm font-semibold text-secondary underline decoration-secondary/30 underline-offset-4 hover:text-primary disabled:opacity-50 sm:w-auto"
        >
          <Trash2 className="h-4 w-4" aria-hidden /> Clear conversation
        </button>
      </div>

      <div className="border-b border-primary/10 bg-light-surface/70 px-3 py-3 sm:px-4">
        <div className="flex flex-wrap gap-2">
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setInput(prompt)}
              className="rounded-full border border-primary/15 bg-white px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:border-primary/30 hover:bg-primary/5"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[28rem] min-w-0 space-y-4 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite" aria-relevant="additions text">
        {!isReady && <p role="status" className="text-sm text-secondary">Restoring this conversation…</p>}
        {messages.map((message, index) => (
          <div key={`${index}-${message.role}`} className={`flex min-w-0 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <p className={`max-w-[88%] wrap-anywhere whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "bg-primary text-white" : "border border-primary/10 bg-light-surface text-primary"}`}>
              <span className="sr-only">{message.role === "user" ? "You: " : "Assistant: "}</span>
              {message.content}
            </p>
          </div>
        ))}
        {isSending && <p role="status" className="text-sm text-secondary">Preparing an educational response…</p>}
        {error && <p role="alert" className="text-sm font-medium text-risk">{error}</p>}
        {storageError && <p role="status" className="text-sm text-secondary">{storageError}</p>}
      </div>

      <form onSubmit={submit} className="flex min-w-0 gap-2 border-t border-primary/10 bg-light-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-5">
        <label className="sr-only" htmlFor={`consult-message-${account.id}-${topic}`}>Your message</label>
        <input
          id={`consult-message-${account.id}-${topic}`}
          value={input}
          maxLength={MAX_MESSAGE_LENGTH}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask a question…"
          disabled={!isReady || isSending}
          className="min-h-12 min-w-0 flex-1 rounded-xl border border-primary/20 bg-white px-3 text-sm text-primary outline-none placeholder:text-secondary/60 focus:border-primary focus:ring-2 focus:ring-accent/40 disabled:opacity-60 sm:px-4"
        />
        <button
          type="submit"
          disabled={!isReady || isSending || !input.trim()}
          aria-label="Send message"
          className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl bg-accent text-primary transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowUp className="h-5 w-5" aria-hidden />
        </button>
      </form>
    </section>
  );
}
