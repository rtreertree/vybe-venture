"use client";

import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, RotateCcw, Trash2 } from "lucide-react";
import type { AccountRecord } from "@/libs/account-client";
import { tokenHeaders } from "@/libs/user-token";
import { ChatComposerTextarea } from "@/components/chat-composer-textarea";

export type ConsultingTopic = "general" | "details" | "news" | "what-if";
type Message = { role: "user" | "assistant"; content: string };

type Props = {
  account: AccountRecord;
  topic: ConsultingTopic;
  context?: string;
  sessionScope?: string;
};

const MAX_MESSAGE_LENGTH = 1_500;

type StorageIssue = "read" | "invalid" | "save" | "clear" | null;

function promptSuggestions(topic: ConsultingTopic, account: AccountRecord, context: string) {
  const goal = account.goal.trim() || "this account's goal";
  const timeframe = account.timeframeYears === null ? "" : `${account.timeframeYears}-year`;
  const riskPreference = account.planning.riskAttitude || account.planning.lossReaction;
  const liquidity = account.planning.liquidityNeeds;
  const briefHeadline = context.match(/Headline:\s*(.+?)(?:\.\s*Summary:|$)/)?.[1]?.trim();

  if (topic === "details") {
    return [
      `How do my account details support ${goal}?`,
      timeframe ? `How should my ${timeframe} timeframe shape this plan?` : "What timeframe should I consider for this goal?",
      riskPreference ? "How does my stated comfort with risk affect the trade-offs?" : "What should I consider about risk for this goal?",
    ];
  }
  if (topic === "news") {
    return [
      briefHeadline ? `How could “${briefHeadline.slice(0, 75)}” relate to ${goal}?` : `What could this brief mean for ${goal}?`,
      timeframe ? `How might this theme matter over my ${timeframe} timeframe?` : "What should I watch for when considering this theme?",
      "What can this fictional example tell me—and what can’t it?",
    ];
  }
  if (topic === "what-if") {
    return [
      `How could this withdrawal affect my goal of ${goal}?`,
      timeframe ? `How does my ${timeframe} timeframe change this comparison?` : "What assumptions matter most in this comparison?",
      liquidity ? "How should my cash-access needs affect this choice?" : "What trade-offs should I weigh before withdrawing?",
    ];
  }
  return [
    `What should I consider first for ${goal}?`,
    timeframe ? `How does my ${timeframe} timeframe shape this goal?` : "What timeframe should I plan around?",
    riskPreference ? "How does my comfort with risk affect the trade-offs?" : "What trade-offs matter most for this account?",
  ];
}

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
  const storageKey = `/api/conversations?accountId=${encodeURIComponent(account.id)}&topic=${encodeURIComponent(topic)}&scope=${encodeURIComponent(sessionScope)}`;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [pendingMessage, setPendingMessage] = useState("");
  const [error, setError] = useState("");
  const [storageIssue, setStorageIssue] = useState<StorageIssue>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);

  const suggestedPrompts = promptSuggestions(topic, account, context);

  const restoreConversation = useCallback(async () => {
    try {
      const response = await fetch(storageKey, { headers: tokenHeaders(), cache: "no-store" });
      if (!response.ok) throw new Error("Conversation could not be loaded.");
      const saved = await response.json() as { messages?: unknown };
      const restoredMessages = parseMessageList(saved.messages);
      if (!restoredMessages) {
        setMessages([openingMessage(topic, account.accountName)]);
        setStorageIssue("invalid");
        return;
      }
      setMessages(restoredMessages.length ? restoredMessages : [openingMessage(topic, account.accountName)]);
      setStorageIssue(null);
    } catch {
      setMessages([openingMessage(topic, account.accountName)]);
      setStorageIssue("read");
    } finally {
      setIsReady(true);
    }
  }, [account.accountName, storageKey, topic]);

  useEffect(() => {
    const timeout = window.setTimeout(() => { void restoreConversation(); }, 0);
    return () => window.clearTimeout(timeout);
  }, [restoreConversation]);

  useEffect(() => {
    if (isReady && messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [error, isReady, isSending, messages, storageIssue]);

  const commitMessages = async (nextMessages: Message[]) => {
    const boundedMessages = nextMessages.slice(-30);
    try {
      const response = await fetch(storageKey, { method: "PUT", headers: { ...tokenHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ messages: boundedMessages }) });
      if (!response.ok) throw new Error("Conversation could not be saved.");
      setMessages(boundedMessages);
      setStorageIssue(null);
    } catch {
      setStorageIssue("save");
      throw new Error("The conversation could not be saved to your account. Please retry your message.");
    }
  };

  const sendMessage = async () => {
    const text = input.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!text || isSending || !isReady) return;

    const nextMessages = [...messages, { role: "user" as const, content: text }].slice(-30);
    setError("");
    setIsSending(true);
    setPendingMessage(text);

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
      if (!response.ok) {
        if (response.status === 429) throw new Error("There have been several requests recently. Wait a moment, then retry your message.");
        if (response.status >= 500) throw new Error("The assistant is temporarily unavailable. Your message is still here; please retry.");
        throw new Error("Your message could not be processed. Review it and try again.");
      }
      const result: unknown = await response.json();
      if (typeof result !== "object" || result === null || typeof (result as { reply?: unknown }).reply !== "string" || !(result as { reply: string }).reply.trim()) {
        throw new Error("The assistant returned an invalid response.");
      }
      await commitMessages([...nextMessages, { role: "assistant", content: (result as { reply: string }).reply }]);
      setInput((current) => current === text ? "" : current);
    } catch (requestError) {
      const message = requestError instanceof Error && requestError.name === "Error" && requestError.message
        ? requestError.message
        : "We couldn't connect to the assistant. Your message is still here; please retry.";
      setError(`${message} Your message remains in the input below.`);
    } finally {
      setIsSending(false);
      setPendingMessage("");
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage();
  };

  const clearConversation = async () => {
    try {
      const response = await fetch(storageKey, { method: "DELETE", headers: tokenHeaders() });
      if (!response.ok) throw new Error("Conversation could not be cleared.");
      setMessages([openingMessage(topic, account.accountName)]);
      setError("");
      setStorageIssue(null);
      setConfirmingClear(false);
    } catch {
      setStorageIssue("clear");
    }
  };

  const retryStorage = () => {
    if (storageIssue === "read") {
      void restoreConversation();
      return;
    }
    if (storageIssue === "save") {
      setStorageIssue(null);
      void sendMessage();
      return;
    }
    void clearConversation();
  };

  const storageMessage: Record<Exclude<StorageIssue, null>, string> = {
    read: "Conversation history could not be read. You can keep chatting, but saved history may not be available.",
    invalid: "The saved conversation is unreadable. Start fresh to remove the unreadable history.",
    save: "This conversation is available here, but changes could not be saved to your account.",
    clear: "Saved conversation history could not be cleared. Your messages are still available here.",
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
        {confirmingClear ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="text-xs text-secondary">Remove this conversation and its saved history?</span>
            <button type="button" onClick={() => setConfirmingClear(false)} className="min-h-11 px-3 text-sm font-semibold text-secondary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
              Cancel
            </button>
            <button type="button" onClick={clearConversation} disabled={!isReady || isSending} className="min-h-11 rounded-lg bg-risk px-3 text-sm font-semibold text-white hover:bg-risk/90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
              Clear it
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingClear(true)}
            disabled={!isReady || isSending}
            className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 px-2 text-sm font-semibold text-secondary underline decoration-secondary/30 underline-offset-4 hover:text-primary disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-auto"
          >
            <Trash2 className="h-4 w-4" aria-hidden /> Clear conversation
          </button>
        )}
      </div>

      <div className="border-b border-primary/10 bg-light-surface/70 px-3 py-3 sm:px-4">
        <div className="flex flex-wrap gap-2">
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setInput(prompt)}
              disabled={!isReady || isSending}
              className="min-h-9 rounded-full border border-primary/15 bg-white px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:border-primary/30 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <div ref={messageListRef} className="max-h-[28rem] min-w-0 space-y-4 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite" aria-relevant="additions text">
        {!isReady && <p role="status" className="text-sm text-secondary">Restoring this conversation…</p>}
        {isReady && messages.map((message, index) => (
          <div key={`${index}-${message.role}`} className={`flex min-w-0 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <p className={`max-w-[88%] wrap-anywhere whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "bg-primary text-white" : "border border-primary/10 bg-light-surface text-primary"}`}>
              <span className="sr-only">{message.role === "user" ? "You: " : "Assistant: "}</span>
              {message.content}
            </p>
          </div>
        ))}
        {isSending && pendingMessage && (
          <div className="flex min-w-0 justify-end">
            <p className="max-w-[88%] wrap-anywhere whitespace-pre-wrap rounded-2xl bg-primary px-4 py-3 text-sm leading-6 text-white">
              <span className="sr-only">You, sending: </span>{pendingMessage}
              <span className="mt-1 block text-right text-xs text-white/70">Sending…</span>
            </p>
          </div>
        )}
        {isSending && <p role="status" className="text-sm text-secondary">Preparing an educational response…</p>}
        {error && <p id={`consult-error-${account.id}-${topic}`} role="alert" className="text-sm font-medium text-risk">{error}</p>}
        {storageIssue && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-secondary" role="status">
            <span>{storageMessage[storageIssue]}</span>
            <button
              type="button"
              onClick={retryStorage}
              className="min-h-10 px-2 font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {storageIssue === "read" ? "Retry loading" : storageIssue === "invalid" ? "Start fresh" : storageIssue === "save" ? "Retry saving" : "Retry clearing"}
            </button>
          </div>
        )}
      </div>

      <form onSubmit={submit} className="flex min-w-0 items-end gap-2 border-t border-primary/10 bg-light-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-5">
        <label className="sr-only" htmlFor={`consult-message-${account.id}-${topic}`}>Your message</label>
        <ChatComposerTextarea
          id={`consult-message-${account.id}-${topic}`}
          value={input}
          maxLength={MAX_MESSAGE_LENGTH}
          onChange={(event) => {
            setInput(event.target.value);
            if (error) setError("");
          }}
          placeholder="Ask a question…"
          disabled={!isReady}
          describedBy={error ? `consult-error-${account.id}-${topic}` : undefined}
          className="min-h-12 min-w-0 flex-1 rounded-xl border border-primary/20 bg-white px-3 py-3 text-primary outline-none placeholder:text-secondary/60 focus:border-primary focus:ring-2 focus:ring-accent/40 disabled:opacity-60 sm:px-4"
        />
        <button
          type="submit"
          disabled={!isReady || isSending || !input.trim()}
          aria-label={error ? "Retry sending message" : "Send message"}
          className="inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-xl bg-accent px-3 text-primary transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {error ? <RotateCcw className="h-4 w-4" aria-hidden /> : <ArrowUp className="h-5 w-5" aria-hidden />}
          {error && <span className="text-sm font-semibold">Retry</span>}
        </button>
      </form>
    </section>
  );
}
