import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { QuestionnaireForm } from "@/components/questionnaire-form";

export default function RegisterQuestionnairePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-light-surface text-primary">
      <header className="border-b border-primary/10 bg-light-surface/95">
        <div className="mx-auto flex h-16 w-full max-w-xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="font-display text-sm font-bold sm:text-base">{process.env.NEXT_PUBLIC_APP_NAME || "CAN'T LOAD ENV"}<span className="text-accent">.</span></Link>
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-primary/70 transition-colors hover:text-primary"><ArrowLeft className="h-4 w-4" aria-hidden /> Exit setup</Link>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
          <div className="border-b border-primary/10 bg-primary px-6 py-5 text-white sm:px-10">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-accent">Your first setup</p>
            <p className="mt-1 text-sm leading-6 text-white/75">A few quick answers help us make this feel more personal.</p>
          </div>
          <aside aria-label="Prototype privacy notice" className="border-b border-risk/30 bg-risk/10 px-6 py-4 text-sm leading-6 text-primary sm:px-10">
            <p className="font-semibold">Prototype privacy note</p>
            <p className="mt-1">Your questionnaire, account details, and completed setup record are stored in this browser on this device—not in a signed-in server account. Browser storage is not secure; use sample values instead of real financial details, and don&apos;t use a shared device. Chat and profile content is sent to the configured AI service for responses and profile normalization. This prototype does not provide account-based saving or sync.</p>
          </aside>
          <QuestionnaireForm />
        </div>
      </main>
      <footer className="border-t border-primary/10 bg-light-surface px-5 py-3 text-center text-[11px] leading-4 text-ink/50">Prototype only: details stay in this browser, but are not secure storage. Use sample data on shared devices.</footer>
    </div>
  );
}
