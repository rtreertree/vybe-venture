"use client";

import Link from "next/link";
import { ArrowRight, Check, MessageSquareText, Sparkles, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { readAccounts, readPersonalProfile } from "@/libs/account-client";

const flowSteps = [
  { label: "About you", icon: Sparkles },
  { label: "Account goal", icon: Target },
  { label: "Planning chat", icon: MessageSquareText },
  { label: "Review plan", icon: Check },
] as const;

type JourneyState = {
  currentStep: number;
  headline: string;
  nextLabel: string;
  href: string;
  helper: string;
};

async function getJourneyState(): Promise<JourneyState> {
  if (typeof window === "undefined") {
    return {
      currentStep: 1,
      headline: "Start your plan",
      nextLabel: "Start with your details",
      href: "/question/register",
      helper: "A guided setup helps us personalize the plan from the beginning.",
    };
  }

  try {
    const [accountsResult, personalProfileResult] = await Promise.all([readAccounts(), readPersonalProfile()]);
    const hasQuestionnaire = Boolean(window.localStorage.getItem("questionnaire_register"));
    const hasAccount = Boolean(window.localStorage.getItem("account_register"));
    const hasPersonal = personalProfileResult.ok && personalProfileResult.profile !== null;
    const savedAccounts = accountsResult.ok ? accountsResult.accounts : [];

    if (savedAccounts.length > 0) {
      const firstAccount = savedAccounts[0];
      return {
        currentStep: 4,
        headline: "Continue your plan",
        nextLabel: "Review your plan",
        href: `/consult?account=${encodeURIComponent(firstAccount.id)}`,
        helper: `You have ${savedAccounts.length} account${savedAccounts.length === 1 ? "" : "s"} ready to review and refine.`,
      };
    }

    if (hasAccount) {
      return {
        currentStep: 3,
        headline: "Finish your setup",
        nextLabel: "Continue your conversation",
        href: "/chat/register",
        helper: "Your personal details and account goal are ready. We just need to shape the plan together.",
      };
    }

    if (hasQuestionnaire || hasPersonal) {
      return {
        currentStep: 2,
        headline: "Keep going",
        nextLabel: "Add your account details",
        href: "/account/register",
        helper: "You already have the basics. One more step will make the plan feel specific to your goals.",
      };
    }

    return {
      currentStep: 1,
      headline: "Start your plan",
      nextLabel: "Start with your details",
      href: "/question/register",
      helper: "A guided setup helps us personalize the plan from the beginning.",
    };
  } catch {
    return {
      currentStep: 1,
      headline: "Continue your plan",
      nextLabel: "Start your setup",
      href: "/question/register",
      helper: "We couldn’t detect your saved progress, so we’re starting from the beginning.",
    };
  }
}

export function OnboardingJourney({ currentStep, compact = false }: { currentStep?: number; compact?: boolean }) {
  const [journey, setJourney] = useState<JourneyState>({ currentStep: 1, headline: "Start your plan", nextLabel: "Start with your details", href: "/question/register", helper: "A guided setup helps us personalize the plan from the beginning." });
  useEffect(() => { void getJourneyState().then(setJourney); }, []);

  const progressStep = currentStep ?? journey.currentStep;

  const steps = useMemo(() => flowSteps.map((step, index) => {
    const isDone = index < progressStep - 1;
    const isCurrent = index === progressStep - 1;
    return { ...step, isDone, isCurrent };
  }), [progressStep]);

  const cardClass = compact
    ? "rounded-2xl border border-primary/10 bg-white p-4 shadow-sm shadow-primary/5"
    : "rounded-3xl border border-primary/10 bg-light-surface p-5 shadow-sm shadow-primary/5 sm:p-6";

  return (
    <div className={cardClass}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">Guided journey</p>
          <h3 className="mt-2 font-display text-2xl font-bold text-primary">{journey.headline}</h3>
        </div>
        <Link href={journey.href} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-primary transition-colors hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          {journey.nextLabel}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <div className="mt-5 flex gap-2" aria-label={`Progress step ${progressStep} of ${flowSteps.length}`}>
        {steps.map(({ label, icon: Icon, isDone, isCurrent }) => (
          <div key={label} className="flex min-w-0 flex-1 items-center gap-2">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
                isDone
                  ? "border-growth bg-growth/15 text-growth"
                  : isCurrent
                    ? "border-accent bg-accent/12 text-primary"
                    : "border-primary/15 bg-white text-secondary"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </div>
            <span className={`hidden truncate text-xs font-semibold sm:block ${isCurrent ? "text-primary" : isDone ? "text-secondary" : "text-secondary/75"}`}>
              {label}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm leading-6 text-ink/70">{journey.helper}</p>
    </div>
  );
}
