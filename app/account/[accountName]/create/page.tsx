"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Check, ChevronRight, CircleDollarSign, Eye, MessageCircle, Scale, Sparkles } from "lucide-react";
import { AccountPlanAdjustment } from "@/components/account-plan-adjustment";
import { accountSlug, createAccountId, readAccounts, updateAccountRecord } from "@/libs/account-client";
import { isAssetExamples, type AccountPlanning, type AccountRecord, type AssetExample, type AssetExamples } from "@/libs/account-model";

type Asset = AssetExample;
type AssetResult = AssetExamples;
type StoredOnboarding = {
  account: AccountRecord;
  planning: AccountPlanning;
  assetExamples: AssetExamples | null;
  selectedProducts: AccountRecord["selectedProducts"];
};

function createFallbackExamples(): AssetResult {
  return {
    id: `fallback-${createAccountId()}`,
    createdAt: new Date().toISOString(),
    headline: "A few ways to start exploring",
    summary: "These illustrative options are here to help you compare trade-offs. They are not recommendations or financial advice.",
    assets: [
      { id: "reserve", name: "Everyday Reserve", symbol: "EDR", category: "Cash alternative", risk: "Lower", time_horizon: "Short term", liquidity: "High", cost: "Low", why_it_may_fit: "Keeps access to money simple when flexibility matters.", what_to_watch: "Returns may not keep pace with inflation.", summary: "A fictional cash-style option for near-term flexibility." },
      { id: "bond", name: "Steady Path Bond Mix", symbol: "SPB", category: "Bond mix", risk: "Lower–moderate", time_horizon: "1–3 years", liquidity: "Moderate", cost: "Low", why_it_may_fit: "Adds some stability while accepting modest price movement.", what_to_watch: "Values can still move when interest rates change.", summary: "A fictional diversified bond-style mix." },
      { id: "balanced", name: "Balanced Steps", symbol: "BST", category: "Balanced mix", risk: "Moderate", time_horizon: "3–5 years", liquidity: "Moderate", cost: "Medium", why_it_may_fit: "Blends growth and defensive assets for a longer view.", what_to_watch: "May fall in value during market downturns.", summary: "A fictional mix of shares and bonds." },
      { id: "global", name: "Global Growth Basket", symbol: "GGB", category: "Share basket", risk: "Higher", time_horizon: "5+ years", liquidity: "Moderate", cost: "Low", why_it_may_fit: "Offers broad exposure for goals with more time.", what_to_watch: "Short-term losses can be significant.", summary: "A fictional globally diversified share-style basket." },
    ],
  };
}

function readAccountForCurrentRoute(): { ok: true; onboarding: StoredOnboarding | null } | { ok: false; message: string } {
  const slug = window.location.pathname.split("/")[2] ?? "";
  const accountResult = readAccounts();
  if (!accountResult.ok) return accountResult;
  const matchingAccount = accountResult.accounts.find((account) => accountSlug(account.accountName, account.id) === slug);
  if (!matchingAccount) return { ok: true, onboarding: null };
  return {
    ok: true,
    onboarding: {
      account: matchingAccount,
      planning: matchingAccount.planning,
      assetExamples: matchingAccount.assetExamples,
      selectedProducts: matchingAccount.selectedProducts,
    },
  };
}

export default function CreateAccountPage() {
  const pathname = usePathname();
  const [onboarding, setOnboarding] = useState<StoredOnboarding | null>(null);
  const [result, setResult] = useState<AssetResult | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [savedSelection, setSavedSelection] = useState<string[]>([]);
  const [active, setActive] = useState<Asset | null>(null);
  const [category, setCategory] = useState("All");
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState("");
  const [accountLoadError, setAccountLoadError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [reloadAccount, setReloadAccount] = useState(0);
  const [isAdjustingPlan, setIsAdjustingPlan] = useState(false);

  const routeName = "your account";
  const accountName = typeof onboarding?.account?.accountName === "string" ? onboarding.account.accountName : routeName;
  const goal = typeof onboarding?.account?.goal === "string" ? onboarding.account.goal : "your next financial goal";
  const accountId = typeof onboarding?.account?.id === "string" ? onboarding.account.id : null;

  const generate = useCallback(async (stored: StoredOnboarding | null) => {
    setError("");
    setResult(null);
    setSelected([]);
    setSavedSelection([]);
    setActive(null);
    const storedAccountName = typeof stored?.account?.accountName === "string" ? stored.account.accountName : "New account";
    try {
      const response = await fetch("/api/account-assets", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountName: storedAccountName, planning: stored?.planning }),
      });
      if (!response.ok) throw new Error("generation failed");
      const generated: unknown = await response.json();
      if (!isAssetExamples(generated)) throw new Error("The generated examples had an invalid shape.");
      setResult(generated);
      const id = typeof stored?.account?.id === "string" ? stored.account.id : null;
      if (id) {
        try {
          updateAccountRecord(id, (account) => ({ ...account, assetExamples: generated, selectedProducts: [] }));
          setStorageError("");
        } catch (storageFailure) {
          setStorageError(storageFailure instanceof Error ? storageFailure.message : "Examples could not be saved in this browser.");
        }
      }
    } catch {
      setError("We couldn't create a fresh set of examples, so we've shown a balanced illustrative set instead.");
      const fallback = createFallbackExamples();
      setResult(fallback);
      const id = typeof stored?.account?.id === "string" ? stored.account.id : null;
      if (id) {
        try {
          updateAccountRecord(id, (account) => ({ ...account, assetExamples: fallback, selectedProducts: [] }));
        } catch (storageFailure) {
          setStorageError(storageFailure instanceof Error ? storageFailure.message : "Examples could not be saved in this browser.");
        }
      }
    }
  }, []);

  useEffect(() => {
    const accountResult = readAccountForCurrentRoute();
    const timeout = window.setTimeout(() => {
      if (!accountResult.ok) {
        setAccountLoadError(accountResult.message);
        return;
      }
      setAccountLoadError("");
      setStorageError("");
      const stored = accountResult.onboarding;
      setOnboarding(stored);
      if (!stored) {
        setError("This account could not be found on this device.");
        return;
      }
      const existingExamples = stored.assetExamples;
      if (existingExamples) {
        setResult(existingExamples);
        const savedProductIds = (stored.selectedProducts ?? [])
          .filter((product) => product.examplesId === existingExamples.id)
          .map((product) => product.id);
        setSelected(savedProductIds);
        setSavedSelection(savedProductIds);
      }
      else void generate(stored);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [generate, pathname, reloadAccount]);

  const categories = useMemo(() => ["All", ...new Set((result?.assets ?? []).map((asset) => asset.category))], [result]);
  const visibleAssets = result?.assets.filter((asset) => category === "All" || asset.category === category) ?? [];
  const compared = (result?.assets ?? []).filter((asset) => selected.includes(asset.id));
  const selectionHasChanged = selected.length !== savedSelection.length
    || selected.some((id) => !savedSelection.includes(id));
  const toggle = (id: string) => {
    setSavedMessage("");
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 2 ? [...current, id] : [current[1], id]);
  };
  const saveSelections = () => {
    if (!accountId || !result) return;
    const selectedProducts = result.assets
      .filter((asset) => selected.includes(asset.id))
      .map(({ id, name, symbol }) => ({ id, name, symbol, examplesId: result.id }));
    try {
      updateAccountRecord(accountId, (account) => ({ ...account, assetExamples: result, selectedProducts }));
      setStorageError("");
      setSavedSelection([...selected]);
      setSavedMessage(selectedProducts.length ? "Your selected assets are saved in this browser." : "Your saved asset choices were cleared.");
    } catch (storageFailure) {
      setStorageError(storageFailure instanceof Error ? storageFailure.message : "Your product choices could not be saved in this browser.");
      setSavedMessage("");
    }
  };

  return (
    <div className="min-h-dvh bg-light-surface text-primary">
      <header className="border-b border-primary/10 bg-light-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="font-display text-sm font-bold sm:text-base">MONEY, CLEARLY<span className="text-accent">.</span></Link>
          <Link href={accountId ? `/consult?account=${encodeURIComponent(accountId)}` : "/consult"} aria-label="Investment consulting" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-secondary underline decoration-secondary/40 underline-offset-4 transition-colors hover:text-primary">
            <MessageCircle className="h-4 w-4 sm:hidden" aria-hidden /><span className="hidden sm:inline">Investment consulting</span>
          </Link>
          <Link href="/account/register?new=1" className="text-sm font-semibold text-secondary transition-colors hover:text-primary">New Portfolio</Link>
        </div>
      </header>
      {isAdjustingPlan && onboarding?.account ? (
        <AccountPlanAdjustment
          account={onboarding.account}
          onClose={() => setIsAdjustingPlan(false)}
          onSaved={() => {
            setIsAdjustingPlan(false);
            setReloadAccount((value) => value + 1);
          }}
        />
      ) : <main>
        <section className="border-b border-primary/10 bg-primary px-5 py-12 text-white sm:px-8 sm:py-16">
          <div className="mx-auto max-w-7xl">
            <button
              type="button"
              disabled={!onboarding?.account}
              onClick={() => setIsAdjustingPlan(true)}
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-white/70 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden /> Back to your plan
            </button>
            <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-accent"><Sparkles className="h-4 w-4" aria-hidden /> Your account, taking shape</p>
                <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-tight sm:text-6xl">Explore options for {accountName}.</h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">Built around your goal: {goal}. Compare the trade-offs before choosing what you&apos;d like to learn more about.</p>
              </div>
              <div className="border border-white/20 bg-white/10 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/65">A useful reminder</p>
                <p className="mt-3 text-sm leading-6 text-white/85">These are AI-generated, fictional examples for learning and comparison—not recommendations, offers, or guarantees.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-10 sm:px-8 sm:py-14">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-5 border-b border-primary/15 pb-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-secondary">Illustrative product explorer</p>
                <h2 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">{result?.headline ?? "Finding options that suit your starting point…"}</h2>
                {result && <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/70">{result.summary}</p>}
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" disabled={!result || !selectionHasChanged} onClick={saveSelections} className="inline-flex min-h-11 items-center justify-center gap-2 bg-growth px-4 text-sm font-semibold text-primary transition-colors hover:bg-growth/90 disabled:cursor-not-allowed disabled:opacity-40"><Check className="h-4 w-4" aria-hidden /> Save selected assets</button>
                <button type="button" disabled={!onboarding} onClick={() => void generate(onboarding)} className="inline-flex min-h-11 items-center justify-center gap-2 border border-primary/25 px-4 text-sm font-semibold transition-colors hover:bg-primary/5 disabled:opacity-40"><Sparkles className="h-4 w-4" aria-hidden /> Refresh examples</button>
              </div>
            </div>
            {error && <p role="status" className="mt-4 text-sm text-secondary">{error}</p>}
            {storageError && <p role="alert" className="mt-4 border border-risk/30 bg-risk/10 p-4 text-sm leading-6 text-primary">{storageError}</p>}
            {savedMessage && <p role="status" className="mt-4 text-sm font-medium text-growth">{savedMessage}</p>}

            {result ? <>
              <div className="mt-6 flex gap-2 overflow-x-auto pb-1" aria-label="Filter product categories">
                {categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`min-h-10 shrink-0 border px-4 text-sm font-semibold transition-colors ${category === item ? "border-primary bg-primary text-white" : "border-primary/20 bg-white hover:border-primary/50"}`}>{item}</button>)}
              </div>
              <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {visibleAssets.map((asset) => {
                  const chosen = selected.includes(asset.id);
                  return <article key={asset.id} className={`flex min-h-80 flex-col border bg-white p-5 transition-shadow hover:shadow-lg hover:shadow-primary/5 ${chosen ? "border-growth ring-1 ring-growth" : "border-primary/15"}`}>
                    <div className="flex items-start justify-between gap-3"><span className="rounded-full bg-light-surface px-3 py-1 text-xs font-bold uppercase tracking-wide text-secondary">{asset.category}</span><span className="font-mono text-xs text-secondary">{asset.symbol}</span></div>
                    <h3 className="mt-5 font-display text-xl font-bold">{asset.name}</h3><p className="mt-2 text-sm leading-6 text-ink/65">{asset.summary}</p>
                    <dl className="mt-5 grid grid-cols-2 gap-3 border-y border-primary/10 py-4 text-xs"><div><dt className="text-secondary">Risk</dt><dd className="mt-1 font-semibold">{asset.risk}</dd></div><div><dt className="text-secondary">Access</dt><dd className="mt-1 font-semibold">{asset.liquidity}</dd></div></dl>
                    <div className="mt-auto flex gap-2 pt-5"><button onClick={() => setActive(asset)} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 border border-primary/25 px-3 text-sm font-semibold hover:bg-primary/5"><Eye className="h-4 w-4" aria-hidden /> Details</button><button onClick={() => toggle(asset.id)} className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 px-3 text-sm font-semibold ${chosen ? "bg-growth text-primary" : "bg-accent text-primary hover:bg-accent/90"}`}>{chosen ? <Check className="h-4 w-4" aria-hidden /> : <CircleDollarSign className="h-4 w-4" aria-hidden />}{chosen ? "Chosen" : "Choose"}</button></div>
                  </article>;
                })}
              </div>
            </> : accountLoadError ? (
              <div className="mt-8 border border-risk/30 bg-risk/10 p-5">
                <p role="alert" className="text-sm leading-6 text-primary">{accountLoadError}</p>
                <button type="button" onClick={() => setReloadAccount((value) => value + 1)} className="mt-4 min-h-10 border border-primary/25 px-4 text-sm font-semibold hover:bg-primary/5">Try loading again</button>
              </div>
            ) : <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">{[0,1,2,3].map((item) => <div key={item} className="h-80 animate-pulse bg-primary/10" />)}</div>}

            {(compared.length > 0 || selectionHasChanged) && <section className="mt-12 border border-primary/15 bg-white p-5 sm:p-7" aria-labelledby="compare-title"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-secondary">Side-by-side</p><h2 id="compare-title" className="mt-2 flex items-center gap-2 font-display text-2xl font-bold"><Scale className="h-5 w-5 text-accent" aria-hidden /> Compare your choices</h2></div><p className="text-sm text-ink/65">Choose up to two products to compare.</p></div>{compared.length > 0 ? <div className="mt-6 overflow-x-auto"><table className="w-full min-w-150 text-left text-sm"><thead><tr className="border-b border-primary/15"><th className="pb-3 pr-6 font-semibold text-secondary">Detail</th>{compared.map((asset) => <th key={asset.id} className="pb-3 pr-6 font-display text-base font-bold">{asset.name}</th>)}</tr></thead><tbody>{[["Risk", "risk"], ["Time horizon", "time_horizon"], ["Liquidity", "liquidity"], ["Cost", "cost"], ["Why it may fit", "why_it_may_fit"], ["What to watch", "what_to_watch"]].map(([label, key]) => <tr key={label} className="border-b border-primary/10 last:border-0"><th className="py-4 pr-6 align-top font-semibold text-secondary">{label}</th>{compared.map((asset) => <td key={asset.id} className="py-4 pr-6 align-top leading-6 text-ink/75">{asset[key as keyof Asset]}</td>)}</tr>)}</tbody></table></div> : <p className="mt-5 text-sm leading-6 text-ink/70">No products are selected. Save to clear the product choices previously stored for this account.</p>}<button type="button" onClick={saveSelections} className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 bg-growth px-5 text-sm font-semibold text-primary hover:bg-growth/90"><Check className="h-4 w-4" aria-hidden /> {compared.length ? "Save product choices" : "Clear saved product choices"}</button></section>}
          </div>
        </section>
      </main>}
      {active && <div className="fixed inset-0 z-50 flex items-end bg-primary/45 p-4 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="asset-title"><div className="w-full max-w-lg bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-6"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-secondary">{active.category}</p><h2 id="asset-title" className="mt-2 font-display text-2xl font-bold">{active.name}</h2></div><button onClick={() => setActive(null)} className="text-sm font-semibold text-secondary hover:text-primary">Close</button></div><p className="mt-5 leading-7 text-ink/75">{active.summary}</p><dl className="mt-6 space-y-4 border-y border-primary/10 py-5 text-sm"><div><dt className="font-semibold">Why it may fit</dt><dd className="mt-1 leading-6 text-ink/70">{active.why_it_may_fit}</dd></div><div><dt className="font-semibold">What to watch</dt><dd className="mt-1 leading-6 text-ink/70">{active.what_to_watch}</dd></div></dl><button onClick={() => { toggle(active.id); setActive(null); }} className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 bg-accent px-4 font-semibold hover:bg-accent/90">{selected.includes(active.id) ? "Remove from choices" : "Choose to compare"}<ChevronRight className="h-4 w-4" aria-hidden /></button></div></div>}
      <footer className="border-t border-primary/10 bg-primary px-5 py-7 text-white sm:px-8"><div className="mx-auto max-w-7xl text-xs leading-5 text-white/65">Illustrative educational examples only. Investing involves risk, including possible loss of principal. This page does not provide financial advice.</div></footer>
    </div>
  );
}
