"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, MessageCircle, Target } from "lucide-react";
import { createAccountId } from "@/libs/account-client";

const steps = [
  {
    id: "accountName",
    eyebrow: "Your new account",
    title: "What would you like to call this account?",
    description: "Choose a name that will make it easy to recognize later.",
    label: "Account name",
    placeholder: "e.g. First home fund",
    autoComplete: "off",
  },
  {
    id: "goal",
    eyebrow: "Your intention",
    title: "What is this account working toward?",
    description: "A short description is enough. You can refine the plan in the conversation.",
    label: "Account goal",
    placeholder: "e.g. Save for a home deposit in five years",
    autoComplete: "off",
  },
  {
    id: "targetValue",
    eyebrow: "Your target",
    title: "What value would you like this account to reach?",
    description: "Move the slider to choose a target from $500 to $100 million. Leave it unset if you have not decided yet.",
    label: "Target value (USD)",
    placeholder: "e.g. 50000 (optional)",
    autoComplete: "off",
  },
] as const;

const emptyAnswers = { accountName: "", goal: "", targetValue: "" };
const draftKey = "account_draft";
const targetMarks = [500, 10_000, 100_000, 1_000_000, 10_000_000, 100_000_000];
const targetSliderMax = (targetMarks.length - 1) * 20;
const formatTarget = (amount: number) => new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
}).format(amount);

function targetFromSlider(position: number) {
  const segment = Math.min(Math.floor(position / 20), targetMarks.length - 2);
  const fraction = (position - segment * 20) / 20;
  return Math.round(targetMarks[segment] + (targetMarks[segment + 1] - targetMarks[segment]) * fraction);
}

function sliderFromTarget(amount: number) {
  const boundedAmount = Math.max(targetMarks[0], Math.min(amount, targetMarks[targetMarks.length - 1]));
  const segment = targetMarks.findIndex((mark, index) => index < targetMarks.length - 1 && boundedAmount <= targetMarks[index + 1]);
  if (segment < 0) return targetSliderMax;
  return Math.round(segment * 20 + ((boundedAmount - targetMarks[segment]) / (targetMarks[segment + 1] - targetMarks[segment])) * 20);
}

function isValidTargetAnswer(value: string) {
  if (value.trim() === "") return true;
  const amount = Number(value);
  return /^\d+(?:\.\d{1,2})?$/u.test(value) && Number.isFinite(amount) && amount >= 500 && amount <= 100_000_000;
}

export function AccountDetailsForm() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(emptyAnswers);
  const [isRestored, setIsRestored] = useState(false);
  const [error, setError] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const restore = () => {
      try {
        const isNewAccount = new URLSearchParams(window.location.search).get("new") === "1";
        if (isNewAccount) {
          window.localStorage.removeItem(draftKey);
          window.localStorage.removeItem("account_register");
          window.localStorage.removeItem("chat_register_draft");
          return;
        }
        const savedDraft = window.localStorage.getItem(draftKey);
        if (savedDraft) {
          try {
            const draft = JSON.parse(savedDraft) as {
              step?: unknown;
              answers?: unknown;
              complete?: unknown;
            };
            const draftAnswers = draft.answers as Record<string, unknown> | undefined;
            if (
              Number.isInteger(draft.step)
              && (draft.step as number) >= 0
              && (draft.step as number) < steps.length
              && draftAnswers
              && typeof draftAnswers.accountName === "string"
              && typeof draftAnswers.goal === "string"
            ) {
              const savedTarget = typeof draftAnswers.targetValue === "string" ? draftAnswers.targetValue : "";
              const hasTargetQuestion = typeof draftAnswers.targetValue === "string" && isValidTargetAnswer(savedTarget);
              const restoredAnswers = {
                accountName: draftAnswers.accountName,
                goal: draftAnswers.goal,
                targetValue: isValidTargetAnswer(savedTarget) ? savedTarget : "",
              };
              setStep(hasTargetQuestion || draft.complete !== true ? draft.step as number : steps.length - 1);
              setAnswers(restoredAnswers);
              setIsComplete(hasTargetQuestion && draft.complete === true && Boolean(restoredAnswers.accountName.trim() && restoredAnswers.goal.trim()));
              setIsRestored(true);
              return;
            }
          } catch {
          }
        }

        const savedRegister = window.localStorage.getItem("account_register");
        if (savedRegister) {
          try {
            const record = JSON.parse(savedRegister) as Record<string, unknown>;
            if (
              record
              && typeof record.accountName === "string"
              && typeof record.goal === "string"
            ) {
              const savedTarget = record.targetValue;
              const hasValidTarget = savedTarget === null || (typeof savedTarget === "number" && isValidTargetAnswer(String(savedTarget)));
              const restoredAnswers = {
                accountName: record.accountName,
                goal: record.goal,
                targetValue: typeof savedTarget === "number" && hasValidTarget ? String(savedTarget) : "",
              };
              setAnswers(restoredAnswers);
              setStep(steps.length - 1);
              setIsComplete(Object.prototype.hasOwnProperty.call(record, "targetValue") && hasValidTarget && Boolean(restoredAnswers.accountName.trim() && restoredAnswers.goal.trim()));
            }
          } catch {
          }
        }
      } catch {
      } finally {
        setIsRestored(true);
      }
    };
    const restoreTimeout = window.setTimeout(restore, 0);
    return () => window.clearTimeout(restoreTimeout);
  }, []);

  const persistDraft = (nextStep: number, nextAnswers: typeof emptyAnswers, complete = false) => {
    try {
      window.localStorage.setItem(draftKey, JSON.stringify({
        step: nextStep,
        answers: nextAnswers,
        complete,
      }));
      setError("");
      return true;
    } catch {
      setError("We couldn't save these details on this device. Please try again.");
      return false;
    }
  };

  const question = steps[step];
  const value = answers[question.id];

  const continueFlow = () => {
    const trimmedValue = value.trim();
    if (question.id !== "targetValue" && !trimmedValue) {
      setError(`Please enter an ${question.label.toLowerCase()} to continue.`);
      return;
    }

    const targetValue = trimmedValue === "" ? null : Number(trimmedValue);
    if (question.id === "targetValue" && !isValidTargetAnswer(trimmedValue)) {
      setError("Choose a target between $500 and $100,000,000, or leave it unset.");
      return;
    }

    if (step < steps.length - 1) {
      const nextStep = step + 1;
      persistDraft(nextStep, answers);
      setStep(nextStep);
      return;
    }

    try {
      const completedAnswers = {
        id: createAccountId(),
        accountName: answers.accountName.trim(),
        goal: answers.goal.trim(),
        targetValue,
      };
      window.localStorage.setItem("account_register", JSON.stringify(completedAnswers));
      if (persistDraft(step, answers, true)) {
        setIsComplete(true);
      }
    } catch {
      setError("We couldn't save these details on this device. Please try again.");
    }
  };

  if (!isRestored) {
    return (
      <section className="flex flex-1 items-center justify-center bg-white px-6 py-12 sm:border-x sm:border-primary/10" aria-busy="true">
        <p role="status" className="text-sm text-secondary">Restoring your saved details…</p>
      </section>
    );
  }

  if (isComplete) {
    return (
      <section className="flex flex-1 flex-col bg-white sm:border-x sm:border-primary/10" aria-live="polite">
        <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-10">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-growth/15 text-growth"><Check className="h-6 w-6" aria-hidden /></span>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.12em] text-secondary">Account details complete</p>
          <h1 className="mt-3 max-w-xl font-display text-3xl font-bold leading-tight text-primary sm:text-4xl">Your account has a purpose.</h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-ink/70">{process.env.NEXT_PUBLIC_APP_NAME || "CAN'T LOAD ENV"} has your personal details and the goal for <span className="font-semibold text-primary">{answers.accountName}</span>. Let&apos;s turn that into a plan together.</p>

          <div className="chat-handoff-card mt-8 max-w-lg border border-primary/10 bg-light-surface p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-accent"><MessageCircle className="h-4 w-4" aria-hidden /></span>
              <div>
                <p className="text-sm font-semibold text-primary">{process.env.NEXT_PUBLIC_APP_NAME || "CAN'T LOAD ENV"}</p>
                <p className="text-xs text-secondary">Your personal planning guide</p>
              </div>
              <span className="ml-auto flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] text-growth"><span className="handoff-pulse h-1.5 w-1.5 rounded-full bg-growth" aria-hidden /> Ready</span>
            </div>
            <div className="mt-4 max-w-sm rounded-2xl rounded-tl-md border border-primary/10 bg-white px-4 py-3 text-sm leading-6 text-primary shadow-sm shadow-primary/5">
              I&apos;ve got your account and its goal. Let&apos;s make the next step feel clear.
            </div>
          </div>

          <Link href="/chat/register" className="mt-6 inline-flex min-h-12 w-full max-w-lg items-center justify-center gap-3 bg-accent px-6 font-semibold text-primary transition-colors hover:bg-accent/90 sm:w-auto">
            Start your conversation <ArrowRight className="h-5 w-5" aria-hidden />
          </Link>
          <button type="button" onClick={() => { persistDraft(0, answers); setStep(0); setIsComplete(false); }} className="mt-3 inline-flex min-h-11 self-start items-center gap-2 px-1 text-sm font-semibold text-secondary transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Edit account details
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-1 flex-col bg-white sm:border-x sm:border-primary/10">
      <div className="flex-1 px-6 py-6 sm:px-10 sm:py-8">
        <div className="border-b border-primary/10 pb-5 sm:pb-6">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.12em] text-secondary"><span>Set up your account</span><span>Step {step + 1} of {steps.length}</span></div>
          <div className="mt-3 flex gap-2" aria-label={`Question ${step + 1} of ${steps.length}`}>
            {steps.map((item, index) => <span key={item.id} className={`h-1.5 flex-1 ${index <= step ? "bg-accent" : "bg-primary/10"}`} />)}
          </div>
        </div>
        <div className="pt-8 sm:pt-10">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-growth/15 text-growth"><Target className="h-5 w-5" aria-hidden /></span>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.12em] text-secondary">{question.eyebrow}</p>
          <h1 className="mt-3 max-w-2xl font-display text-3xl font-bold leading-tight text-primary sm:text-4xl">{question.title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/70 sm:text-base sm:leading-7">{question.description}</p>
          <label htmlFor={question.id} className="mt-8 block text-sm font-semibold text-primary">{question.label}</label>
          {question.id === "targetValue" ? (
            <div className="mt-3">
              <output htmlFor={question.id} className="block font-display text-3xl font-bold text-primary">
                {value === "" ? "No target set" : formatTarget(Number(value))}
              </output>
              <input
                id={question.id}
                type="range"
                min={0}
                max={targetSliderMax}
                step={1}
                value={value === "" ? 0 : sliderFromTarget(Number(value))}
                aria-valuetext={value === "" ? "No target set" : formatTarget(Number(value))}
                onChange={(event) => {
                  const nextAnswers = { ...answers, targetValue: String(targetFromSlider(Number(event.target.value))) };
                  setAnswers(nextAnswers);
                  persistDraft(step, nextAnswers);
                }}
                onClick={(event) => {
                  if (value !== "" || Number(event.currentTarget.value) !== 0) return;
                  const nextAnswers = { ...answers, targetValue: "500" };
                  setAnswers(nextAnswers);
                  persistDraft(step, nextAnswers);
                }}
                className="mt-5 h-11 w-full cursor-pointer accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              />
              <div className="flex justify-between gap-1 text-[10px] font-semibold text-secondary sm:text-xs" aria-hidden="true">
                <span>$500</span><span>$10k</span><span>$100k</span><span>$1m</span><span>$10m</span><span>$100m</span>
              </div>
              {value !== "" && (
                <button type="button" onClick={() => { const nextAnswers = { ...answers, targetValue: "" }; setAnswers(nextAnswers); persistDraft(step, nextAnswers); }} className="mt-5 min-h-11 text-sm font-semibold text-secondary underline underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                  I don&apos;t have a target yet
                </button>
              )}
            </div>
          ) : (
            <input id={question.id} value={value} autoComplete={question.autoComplete} onChange={(event) => { const nextAnswers = { ...answers, [question.id]: event.target.value }; setAnswers(nextAnswers); persistDraft(step, nextAnswers); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); continueFlow(); } }} placeholder={question.placeholder} aria-invalid={Boolean(error) || undefined} className="mt-2 min-h-14 w-full border border-primary/20 bg-light-surface px-4 text-base text-primary outline-none placeholder:text-secondary/55 focus:border-primary focus:ring-2 focus:ring-accent/40" />
          )}
          {error && <p role="alert" className="mt-3 text-sm font-medium text-risk">{error}</p>}
        </div>
      </div>
      <div className="flex flex-col-reverse gap-3 border-t border-primary/10 bg-light-surface px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <button type="button" onClick={() => { const previousStep = step - 1; persistDraft(previousStep, answers); setStep(previousStep); }} disabled={step === 0} className="inline-flex min-h-11 items-center justify-center gap-2 px-2 text-sm font-semibold text-primary transition-colors hover:text-secondary disabled:cursor-not-allowed disabled:opacity-35"><ArrowLeft className="h-4 w-4" aria-hidden /> Back</button>
        <button type="button" onClick={continueFlow} className="inline-flex min-h-12 items-center justify-center gap-3 bg-accent px-6 font-semibold text-primary transition-colors hover:bg-accent/90">{step === steps.length - 1 ? "Finish account setup" : "Continue"}<ArrowRight className="h-5 w-5" aria-hidden /></button>
      </div>
    </section>
  );
}
