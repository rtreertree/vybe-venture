"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, LayoutDashboard, RotateCcw, ShieldAlert, Sparkles } from "lucide-react";
import { readAccounts } from "@/libs/account-client";
import { tokenHeaders } from "@/libs/user-token";

const onboardingStorageKeys = [
  "questionnaire_draft",
  "questionnaire_register",
  "account_draft",
  "account_register",
  "chat_register_draft",
  "planning_profile",
  "onboarding_register",
  "accounts_register",
  "personal_profile",
];

async function getNextDestination() {
  const accounts = await readAccounts();
  if (accounts.ok && accounts.accounts.length) return "/consult";

  const hasAccount = Boolean(window.localStorage.getItem("account_register"));
  if (hasAccount) return "/chat/register";

  const hasQuestionnaire = Boolean(window.localStorage.getItem("questionnaire_register"));
  if (hasQuestionnaire) return "/account/register";

  return "/question/register";
}

export default function WelcomePage() {
  const router = useRouter();
  const [restartError, setRestartError] = useState("");
  const [isRestarting, setIsRestarting] = useState(false);

  const [nextDestination, setNextDestination] = useState("/dashboard");
  useEffect(() => { void getNextDestination().then(setNextDestination); }, []);

  const restartSetup = async () => {
    setIsRestarting(true);
    setRestartError("");

    try {
      const response = await fetch("/api/user-data", { method: "DELETE", headers: tokenHeaders() });
      if (!response.ok) throw new Error("Database reset failed.");
      onboardingStorageKeys.forEach((key) => window.localStorage.removeItem(key));
      for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
        const key = window.localStorage.key(index);
        if (key?.startsWith("consult_chat_")) window.localStorage.removeItem(key);
      }
      router.replace("/question/register");
    } catch {
      setRestartError("We couldn't clear all saved setup data from this browser. Please check browser storage settings and try again.");
      setIsRestarting(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-light-surface text-primary">
      <header className="border-b border-primary/10">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="font-display text-sm font-bold sm:text-base">
            {process.env.NEXT_PUBLIC_APP_NAME || "CAN'T LOAD ENV"}<span className="text-accent">.</span>
          </Link>
          <Link href="/dashboard" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary/70 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
            <LayoutDashboard className="h-4 w-4" aria-hidden /> Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-5 py-10 sm:px-8 sm:py-16">
        <section className="rounded-[28px] border border-primary/10 bg-white p-6 shadow-sm shadow-primary/5 sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">Setup complete</p>
              <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-primary sm:text-5xl">
                You&apos;re ready for your next step.
              </h1>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-growth/30 bg-growth/10 px-3 py-2 text-sm font-semibold text-growth">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Plan ready
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="max-w-xl text-base leading-7 text-ink/70">
                Your conversation is complete. Review the plan, pick up where you left off, or start again with a fresh setup.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link href={nextDestination} className="inline-flex min-h-12 items-center justify-center gap-3 bg-accent px-6 font-semibold text-primary transition-colors hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                  Continue planning <ArrowRight className="h-5 w-5" aria-hidden />
                </Link>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-primary/10 bg-light-surface p-4">
                  <Sparkles className="h-5 w-5 text-accent" aria-hidden />
                  <h2 className="mt-3 font-display text-lg font-semibold text-primary">What comes next</h2>
                  <p className="mt-2 text-sm leading-6 text-ink/70">Review your direction, adjust risk and timing, and refine your next move before committing.</p>
                </div>
                <div className="rounded-2xl border border-primary/10 bg-light-surface p-4">
                  <RotateCcw className="h-5 w-5 text-secondary" aria-hidden />
                  <h2 className="mt-3 font-display text-lg font-semibold text-primary">Start fresh</h2>
                  <p className="mt-2 text-sm leading-6 text-ink/70">Clear saved browser data and walk through the setup again whenever you want a clean slate.</p>
                </div>
              </div>
            </div>

            <aside aria-labelledby="privacy-heading" className="rounded-3xl border border-risk/35 bg-risk/10 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-risk" aria-hidden />
                <div>
                  <h2 id="privacy-heading" className="font-display text-lg font-semibold text-primary">Important: this is a prototype</h2>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-primary/85">
                    <li>Your completed profile and accounts are saved to the database under your five-character code. Drafts may remain in this browser until setup is complete.</li>
                    <li>Anyone with your code can access your data. Keep it private and use sample financial details in this prototype.</li>
                    <li>Chat and profile content is sent to the configured AI service to generate responses and normalize profile information.</li>
                  </ul>
                </div>
              </div>
            </aside>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-primary/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={restartSetup} disabled={isRestarting} className="inline-flex min-h-12 items-center justify-center gap-2 px-0 font-semibold text-secondary underline decoration-secondary/40 underline-offset-4 transition-colors hover:text-primary disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
              <RotateCcw className="h-4 w-4" aria-hidden /> {isRestarting ? "Clearing saved setup…" : "Clear saved setup and start over"}
            </button>
            <p className="text-sm leading-6 text-ink/60">General educational prototype only. Investing involves risk.</p>
          </div>
          {restartError && <p role="alert" className="mt-4 text-sm font-medium text-risk">{restartError}</p>}
        </section>
      </main>

      <footer className="border-t border-primary/10 px-5 py-4 text-center text-xs leading-5 text-ink/55 sm:px-8">
        General educational prototype only. Investing involves risk, including possible loss of principal.
      </footer>
    </div>
  );
}
