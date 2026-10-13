"use client";

import { type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, MessageCircle, Send, Sparkles } from "lucide-react";
import {
  accountSlug,
  readPersonalProfile,
  updateAccountRecord,
} from "@/libs/account-client";
import {
  isAccountPlanDraft,
  type AccountPlanDraft,
  type AccountPlanning,
  type AccountRecord,
  type PersonalProfile,
} from "@/libs/account-model";

type Message = { role: "user" | "assistant"; content: string };
type Stage = "conversation" | "review";

const planningTextFields = [
  { key: "liquidityNeeds", label: "When you may need access", placeholder: "e.g. I may need this money in five years" },
  { key: "lossReaction", label: "Reaction to a temporary loss", placeholder: "How a drop in value might feel" },
  { key: "riskAttitude", label: "Comfort with investment risk", placeholder: "Your own words about risk" },
  { key: "preferredProducts", label: "Preferred products or approaches", placeholder: "Optional" },
  { key: "excludedIndustries", label: "Industries or activities to avoid", placeholder: "Optional" },
] as const;

function planFromAccount(account: AccountRecord): AccountPlanDraft {
  return {
    accountName: account.accountName,
    goal: account.goal,
    timeframeYears: account.timeframeYears,
    planning: { ...account.planning },
  };
}

function samePlan(left: AccountPlanDraft, right: AccountPlanDraft) {
  return JSON.stringify({
    accountName: left.accountName,
    goal: left.goal,
    timeframeYears: left.timeframeYears,
    planning: {
      targetAmount: left.planning.targetAmount,
      liquidityNeeds: left.planning.liquidityNeeds,
      lossReaction: left.planning.lossReaction,
      riskAttitude: left.planning.riskAttitude,
      preferredProducts: left.planning.preferredProducts,
      excludedIndustries: left.planning.excludedIndustries,
    },
  }) === JSON.stringify({
    accountName: right.accountName,
    goal: right.goal,
    timeframeYears: right.timeframeYears,
    planning: {
      targetAmount: right.planning.targetAmount,
      liquidityNeeds: right.planning.liquidityNeeds,
      lossReaction: right.planning.lossReaction,
      riskAttitude: right.planning.riskAttitude,
      preferredProducts: right.planning.preferredProducts,
      excludedIndustries: right.planning.excludedIndustries,
    },
  });
}

function displayText(value: string | null) {
  return value?.trim() || "Not set";
}

function displayAmount(planning: AccountPlanning) {
  if (!planning.targetAmount) return "Not set";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(planning.targetAmount.amount);
}

function cleanPlan(plan: AccountPlanDraft): AccountPlanDraft {
  const cleanText = (value: string | null) => value?.trim() || null;
  return {
    accountName: plan.accountName.trim(),
    goal: plan.goal.trim(),
    timeframeYears: plan.timeframeYears,
    planning: {
      targetAmount: plan.planning.targetAmount,
      liquidityNeeds: cleanText(plan.planning.liquidityNeeds),
      lossReaction: cleanText(plan.planning.lossReaction),
      riskAttitude: cleanText(plan.planning.riskAttitude),
      preferredProducts: cleanText(plan.planning.preferredProducts),
      excludedIndustries: cleanText(plan.planning.excludedIndustries),
    },
  };
}

function ReviewRow({
  label,
  original,
  proposed,
  children,
}: {
  label: string;
  original: string;
  proposed: string;
  children: ReactNode;
}) {
  const changed = original !== proposed;
  return (
    <div className="grid gap-3 border-t border-primary/10 py-4 md:grid-cols-2">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-secondary">{label} · Original</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink/75">{original || "Not set"}</p>
      </div>
      <div className={`min-w-0 border p-3 ${changed ? "border-growth/50 bg-growth/5" : "border-primary/10 bg-light-surface/60"}`}>
        <label className="text-xs font-semibold uppercase tracking-wide text-secondary">
          {label} · Proposed (editable)
          <span className="sr-only"> value</span>
          <span className="mt-2 block normal-case tracking-normal">{children}</span>
        </label>
      </div>
    </div>
  );
}

export function AccountPlanAdjustment({
  account,
  onClose,
  onSaved,
}: {
  account: AccountRecord;
  onClose: () => void;
  onSaved: () => void;
}) {
  const original = planFromAccount(account);
  const [stage, setStage] = useState<Stage>("conversation");
  const [proposal, setProposal] = useState<AccountPlanDraft>(original);
  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    content: `I have the details for ${account.accountName} and its goal of ${account.goal}. Tell me what you’re considering, and I can help think through the trade-offs and prepare an account-plan change. Nothing is saved during this conversation.`,
  }]);
  const [input, setInput] = useState("");
  const [profile, setProfile] = useState<PersonalProfile | null>(null);
  const [profileNotice, setProfileNotice] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const messageListRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const router = useRouter();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const result = readPersonalProfile();
      if (result.ok) setProfile(result.profile);
      else setProfileNotice("Your saved personal profile could not be loaded. The assistant can still use this account’s details.");
      setIsReady(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (messageListRef.current) messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
  }, [error, isSending, messages]);

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim().slice(0, 1_500);
    if (!text || isSending || !isReady) return;

    const nextMessages: Message[] = [...messages, { role: "user" as const, content: text }].slice(-30);
    const controller = new AbortController();
    abortRef.current = controller;
    setIsSending(true);
    setError("");
    try {
      const response = await fetch("/api/account-plan-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          original,
          proposal,
          profile,
          messages: nextMessages,
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        if (response.status === 429) throw new Error("There have been several requests recently. Wait a moment, then try again.");
        if (response.status >= 500) throw new Error("The assistant is temporarily unavailable. Your message is still here; please retry.");
        throw new Error("Your message could not be processed. Review it and try again.");
      }
      const result: unknown = await response.json();
      if (
        typeof result !== "object"
        || result === null
        || typeof (result as { reply?: unknown }).reply !== "string"
        || !(result as { reply: string }).reply.trim()
        || !isAccountPlanDraft((result as { proposal?: unknown }).proposal)
      ) {
        throw new Error("The assistant returned an invalid proposal. Your plan has not been changed.");
      }
      if (controller.signal.aborted) return;
      const assistantMessage: Message = { role: "assistant", content: (result as { reply: string }).reply.trim() };
      setMessages([...nextMessages, assistantMessage].slice(-30));
      setProposal((result as { proposal: AccountPlanDraft }).proposal);
      setInput("");
    } catch (requestError) {
      if (!(requestError instanceof Error && requestError.name === "AbortError")) {
        setError(requestError instanceof Error ? requestError.message : "We couldn't connect to the assistant. Please retry.");
      }
    } finally {
      abortRef.current = null;
      setIsSending(false);
    }
  };

  const closeConversation = () => {
    abortRef.current?.abort();
    onClose();
  };

  const finishConversation = () => {
    abortRef.current?.abort();
    setIsSending(false);
    setError("");
    setStage("review");
  };

  const updatePlanningText = (key: (typeof planningTextFields)[number]["key"], value: string) => {
    setProposal((current) => ({
      ...current,
      planning: { ...current.planning, [key]: value || null },
    }));
  };

  const confirmSave = () => {
    const cleaned = cleanPlan(proposal);
    if (!isAccountPlanDraft(cleaned)) {
      setError("Check the account name, goal, timeframe, and target amount before saving.");
      return;
    }
    if (samePlan(cleaned, original)) {
      setError("There are no changes to save. Continue the conversation or close this review.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      updateAccountRecord(account.id, (current) => {
        if (!samePlan(planFromAccount(current), original)) {
          throw new Error("This account changed elsewhere after the review began. Nothing was saved; reopen the review to compare the latest version.");
        }
        return {
          ...current,
          ...cleaned,
          assetExamples: null,
          selectedProducts: [],
        };
      });
      onSaved();
      router.replace(`/account/${accountSlug(cleaned.accountName, account.id)}/create`);
    } catch (saveError) {
      setIsSaving(false);
      setError(saveError instanceof Error ? saveError.message : "We couldn't save the proposed changes. Your original plan is unchanged.");
    }
  };

  const changed = !samePlan(cleanPlan(proposal), original);
  const textInputClass = "mt-1 min-h-11 w-full rounded-md border border-primary/20 bg-white px-3 py-2 text-sm text-primary outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30";
  const textAreaClass = "mt-1 min-h-24 w-full rounded-md border border-primary/20 bg-white px-3 py-2 text-sm leading-6 text-primary outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30";

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-light-surface px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={closeConversation}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-secondary underline decoration-secondary/40 underline-offset-4 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to account options
        </button>

        <section className="mt-6 overflow-hidden border border-primary/15 bg-white shadow-sm shadow-primary/5" aria-labelledby="plan-adjustment-title">
          <div className="border-b border-primary/10 bg-primary px-5 py-6 text-white sm:px-8">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-accent">
              <Sparkles className="h-4 w-4" aria-hidden /> Your plan, reconsidered
            </p>
            <h1 id="plan-adjustment-title" className="mt-3 font-display text-2xl font-bold sm:text-3xl">
              {stage === "conversation" ? "Talk through a change." : "Review proposed changes."}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
              {stage === "conversation"
                ? "Your current account and saved profile help provide context. The assistant can suggest changes, but nothing is saved until you confirm after review."
                : "Compare your original account details with the proposal. Edit any proposed value before you confirm."}
            </p>
          </div>

          {stage === "conversation" ? (
            <>
              <div
                ref={messageListRef}
                className="max-h-[45vh] min-h-56 space-y-4 overflow-y-auto px-4 py-5 sm:px-7"
                aria-live="polite"
                aria-relevant="additions text"
              >
                {messages.map((message, index) => (
                  <div key={`${index}-${message.role}`} className={`flex flex-col gap-1.5 ${message.role === "user" ? "items-end" : "items-start"}`}>
                    <span className="px-1 text-[10px] font-bold uppercase text-secondary">{message.role === "user" ? "You" : "Money, Clearly"}</span>
                    <p className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "rounded-br-md bg-primary text-white" : "rounded-bl-md border border-primary/10 bg-light-surface text-primary"}`}>
                      {message.content}
                    </p>
                  </div>
                ))}
                {isSending && <p role="status" className="text-sm text-secondary">Thinking through your account details…</p>}
                {error && <p role="alert" className="text-sm font-medium text-risk">{error}</p>}
              </div>

              <div className="border-t border-primary/10 bg-light-surface/60 px-4 py-3 text-xs leading-5 text-secondary sm:px-7">
                <p className="flex items-start gap-2">
                  <MessageCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  This educational prototype sends your account details and, if available, your saved profile to its configured AI service. It does not provide financial advice.
                </p>
                {profileNotice && <p className="mt-2 text-risk">{profileNotice}</p>}
              </div>

              <div className="flex flex-col gap-3 border-t border-primary/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-5">
                <button
                  type="button"
                  onClick={finishConversation}
                  className="inline-flex min-h-11 items-center justify-center gap-2 border border-primary/25 px-4 text-sm font-semibold transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Review proposal <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
                <form onSubmit={sendMessage} className="flex min-w-0 flex-1 gap-2 sm:max-w-xl">
                  <label className="sr-only" htmlFor={`plan-message-${account.id}`}>Your message</label>
                  <input
                    id={`plan-message-${account.id}`}
                    value={input}
                    maxLength={1_500}
                    onChange={(event) => { setInput(event.target.value); if (error) setError(""); }}
                    placeholder="What would you like to change?"
                    disabled={!isReady || isSending}
                    className="min-h-11 min-w-0 flex-1 rounded-full border border-primary/20 bg-white px-4 text-sm outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!isReady || isSending || !input.trim()}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-primary transition-colors hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" aria-hidden /><span className="sr-only sm:not-sr-only">Send</span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="px-4 py-5 sm:px-8 sm:py-7">
              <p className="mb-5 text-sm leading-6 text-ink/70">Only the account plan is editable here. Your saved personal profile is used as context and will not be changed.</p>

              <ReviewRow label="Account name" original={original.accountName} proposed={proposal.accountName}>
                <input
                  value={proposal.accountName}
                  maxLength={100}
                  onChange={(event) => setProposal((current) => ({ ...current, accountName: event.target.value }))}
                  className={textInputClass}
                />
              </ReviewRow>
              <ReviewRow label="Goal" original={original.goal} proposed={proposal.goal}>
                <textarea
                  value={proposal.goal}
                  maxLength={300}
                  onChange={(event) => setProposal((current) => ({ ...current, goal: event.target.value }))}
                  className={textAreaClass}
                />
              </ReviewRow>
              <ReviewRow
                label="Timeframe"
                original={original.timeframeYears === null ? "Not set" : `${original.timeframeYears} years`}
                proposed={proposal.timeframeYears === null ? "Not set" : `${proposal.timeframeYears} years`}
              >
                <input
                  type="number"
                  min={1}
                  max={50}
                  step={1}
                  value={proposal.timeframeYears ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    setProposal((current) => ({ ...current, timeframeYears: value ? Number(value) : null }));
                  }}
                  aria-label="Proposed timeframe in years"
                  placeholder="Not set"
                  className={textInputClass}
                />
                <span className="mt-1 block text-xs font-normal normal-case text-secondary">Years (1–50), or leave blank.</span>
              </ReviewRow>
              <ReviewRow label="Target amount (USD)" original={displayAmount(original.planning)} proposed={displayAmount(proposal.planning)}>
                <input
                  type="number"
                  min={0}
                  max={100_000_000}
                  step="any"
                  value={proposal.planning.targetAmount?.amount ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    setProposal((current) => ({
                      ...current,
                      planning: {
                        ...current.planning,
                        targetAmount: value && Number.isFinite(Number(value))
                          ? { amount: Number(value), currency: "USD" }
                          : null,
                      },
                    }));
                  }}
                  aria-label="Proposed target amount in USD"
                  placeholder="Not set"
                  className={textInputClass}
                />
              </ReviewRow>

              {planningTextFields.map(({ key, label, placeholder }) => (
                <ReviewRow
                  key={key}
                  label={label}
                  original={displayText(original.planning[key])}
                  proposed={displayText(proposal.planning[key])}
                >
                  <textarea
                    value={proposal.planning[key] ?? ""}
                    maxLength={1_000}
                    onChange={(event) => updatePlanningText(key, event.target.value)}
                    placeholder={placeholder}
                    aria-label={`Proposed ${label.toLowerCase()}`}
                    className={textAreaClass}
                  />
                </ReviewRow>
              ))}

              {error && <p role="alert" className="mt-4 border border-risk/30 bg-risk/10 p-3 text-sm leading-6 text-primary">{error}</p>}

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-primary/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => { setError(""); setStage("conversation"); }}
                  disabled={isSaving}
                  className="inline-flex min-h-11 items-center justify-center border border-primary/25 px-4 text-sm font-semibold hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
                >
                  Continue conversation
                </button>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  {!changed && <p className="text-xs text-secondary">No changes yet. Keep talking or edit a proposed value.</p>}
                  <button
                    type="button"
                    onClick={confirmSave}
                    disabled={!changed || isSaving}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-growth px-5 text-sm font-semibold text-primary transition-colors hover:bg-growth/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
                  >
                    <Check className="h-4 w-4" aria-hidden /> {isSaving ? "Saving…" : "Confirm and save plan"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
