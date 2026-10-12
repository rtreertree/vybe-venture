"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Home, RotateCcw, ShieldAlert } from "lucide-react";

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

export default function WelcomePage() {
  const router = useRouter();
  const [restartError, setRestartError] = useState("");
  const [isRestarting, setIsRestarting] = useState(false);

  const restartSetup = () => {
    setIsRestarting(true);
    setRestartError("");

    try {
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
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="font-display text-sm font-bold sm:text-base">
            MONEY, CLEARLY<span className="text-accent">.</span>
          </Link>
          <Link href="/" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary/70 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
            <Home className="h-4 w-4" aria-hidden /> Home
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-5 py-10 sm:px-8 sm:py-16">
        <section className="border-y border-primary/15 py-8 sm:py-10">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-secondary">Setup complete</p>
          <h1 className="mt-3 max-w-2xl font-display text-3xl font-bold leading-tight text-primary sm:text-5xl">
            You&apos;re ready for your next step.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-ink/70">
            Your conversation is complete. Return to the home page or clear this setup and start again.
          </p>

          <aside aria-labelledby="privacy-heading" className="mt-8 border border-risk/35 bg-risk/10 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-risk" aria-hidden />
              <div>
                <h2 id="privacy-heading" className="font-display text-lg font-semibold text-primary">Important: this is a prototype</h2>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-primary/85">
                  <li>Your drafts and completed setup details are stored in this browser on this device. They are not saved to a signed-in server account, and they do not sync between devices.</li>
                  <li>Browser storage is not secure. Use sample values instead of real financial details, and don&apos;t use this prototype on a shared device.</li>
                  <li>Chat and profile content is sent to the configured AI service to generate responses and normalize profile information.</li>
                </ul>
              </div>
            </div>
          </aside>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/" className="inline-flex min-h-12 items-center justify-center gap-3 bg-accent px-6 font-semibold text-primary transition-colors hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              Return to home <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
            <button type="button" onClick={restartSetup} disabled={isRestarting} className="inline-flex min-h-12 items-center justify-center gap-2 px-4 font-semibold text-secondary underline decoration-secondary/40 underline-offset-4 transition-colors hover:text-primary disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
              <RotateCcw className="h-4 w-4" aria-hidden /> {isRestarting ? "Clearing saved setup…" : "Clear saved setup and start over"}
            </button>
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
