import { Plus } from "lucide-react";
import { InvestmentConsulting } from "@/components/investment-consulting";
import Link from "next/link";

export default function ConsultingPage() {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-light-surface text-primary">
      <header className="sticky top-0 z-30 border-b border-primary/10 bg-light-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="font-display text-sm font-bold sm:text-base">
            MONEY, CLEARLY<span className="text-accent">.</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link href="/account/register?new=1" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-3 text-sm font-semibold text-primary transition-colors hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-4">
              <Plus className="h-4 w-4" aria-hidden /> Add account
            </Link>
            <Link href="/" className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-primary/70 transition-colors hover:bg-primary/5 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
              Home
            </Link>
          </div>
        </div>
      </header>
      <main className="pb-10">
        <InvestmentConsulting />
      </main>
      <footer className="border-t border-primary/10 bg-primary px-5 py-6 text-center text-xs leading-5 text-white/70 sm:px-8">
        Educational prototype only. Scenarios are illustrative, not forecasts or financial advice. Investing involves risk, including possible loss of principal.
      </footer>
    </div>
  );
}
