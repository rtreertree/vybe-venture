"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Briefcase, Check, Eye, MessageCircle, Plus, Scale, Sparkles } from "lucide-react";
import { AccountPlanAdjustment } from "@/components/account-plan-adjustment";
import { ProductCard, riskLabel, typeLabel } from "@/components/invest/product-card";
import { formatPercent, formatUsd } from "@/components/invest/money";
import { accountSlug, readAccounts, updateAccountRecord, type AccountRecord } from "@/libs/account-client";
import { fetchProduct, fetchRecommendations, type Recommendation } from "@/libs/invest-client";
import type { ProductDetail } from "@/libs/bank/types";

const MAX_SELECTIONS = 3;
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

type Shortlist = AccountRecord["selectedProducts"];
type Loadable<T> = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: T };

function CreateAccountContent() {
  const pathname = usePathname();
  const [account, setAccount] = useState<AccountRecord | null>(null);
  const [accountLoadError, setAccountLoadError] = useState("");
  const [accountMissing, setAccountMissing] = useState(false);
  const [reloadAccount, setReloadAccount] = useState(0);
  const [isAdjustingPlan, setIsAdjustingPlan] = useState(false);

  const [picksResult, setPicksResult] = useState<({ key: string } & Exclude<Loadable<Recommendation[]>, { status: "loading" }>) | null>(null);
  const [reloadProducts, setReloadProducts] = useState(0);

  const [selected, setSelected] = useState<Shortlist>([]);
  const [savedSelection, setSavedSelection] = useState<Shortlist>([]);
  const [details, setDetails] = useState<Record<string, ProductDetail>>({});
  const [storageError, setStorageError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  const accountName = account?.accountName ?? "your account";
  const goal = account?.goal ?? "your next financial goal";
  const overviewHref = pathname.replace(/\/create\/?$/, "");

  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      const slug = window.location.pathname.split("/")[2] ?? "";
      const result = await readAccounts();
      if (!result.ok) return setAccountLoadError(result.message);
      setAccountLoadError("");
      const match = result.accounts.find((item) => accountSlug(item.accountName, item.id) === slug) ?? null;
      setAccount(match);
      setAccountMissing(!match);
      if (match) {
        setSelected(match.selectedProducts);
        setSavedSelection(match.selectedProducts);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [pathname, reloadAccount]);

  const accountId = account?.id ?? null;
  const picksKey = `${accountId}|${reloadProducts}`;
  useEffect(() => {
    if (!accountId) return;
    let active = true;
    void fetchRecommendations(accountId).then((result) => {
      if (!active) return;
      setPicksResult(result.ok
        ? { key: picksKey, status: "ready", data: result.data.recommendations }
        : { key: picksKey, status: "error", message: result.message });
    });
    return () => { active = false; };
  }, [accountId, picksKey]);
  const products = useMemo<Loadable<Recommendation[]>>(
    () => picksResult && picksResult.key === picksKey ? picksResult : { status: "loading" },
    [picksResult, picksKey],
  );

  const selectedKey = selected.map((item) => item.symbol).join(",");
  useEffect(() => {
    let active = true;
    for (const symbol of selectedKey ? selectedKey.split(",") : []) {
      void fetchProduct(symbol).then((result) => {
        if (active && result.ok) setDetails((current) => ({ ...current, [symbol]: result.data }));
      });
    }
    return () => { active = false; };
  }, [selectedKey]);

  const isSelected = (symbol: string) => selected.some((item) => item.symbol === symbol);
  const toggle = (product: Pick<Recommendation["product"], "symbol" | "name">) => {
    setSavedMessage("");
    setSelected((current) => {
      if (current.some((item) => item.symbol === product.symbol)) return current.filter((item) => item.symbol !== product.symbol);
      const next = [...current, { symbol: product.symbol, name: product.name }];
      return next.length > MAX_SELECTIONS ? next.slice(next.length - MAX_SELECTIONS) : next;
    });
  };
  const selectionHasChanged = selected.length !== savedSelection.length || selected.some((item) => !savedSelection.some((saved) => saved.symbol === item.symbol));

  const saveSelections = async () => {
    if (!accountId) return;
    try {
      await updateAccountRecord(accountId, (current) => ({ ...current, selectedProducts: selected }));
      setStorageError("");
      setSavedSelection(selected);
      setSavedMessage(selected.length ? "Your shortlist is saved." : "Your shortlist was cleared.");
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : "Your shortlist could not be saved to your account.");
      setSavedMessage("");
    }
  };

  const compared = selected.map((item) => ({ item, detail: details[item.symbol] }));
  const productLink = (symbol: string) => `/products/${encodeURIComponent(symbol)}${accountId ? `?account=${encodeURIComponent(accountId)}` : ""}`;
  const compareRows: [string, (detail: ProductDetail) => string][] = [
    ["Price", (d) => formatUsd(d.currentPrice)],
    ["Day change", (d) => formatPercent(d.dayChangePercent)],
    ["Risk", (d) => riskLabel(d.risk)],
    ["Area", (d) => d.area],
    ["Type", (d) => typeLabel(d.type)],
    ["1-year return", (d) => formatPercent(d.returns["1Y"])],
    ["Volatility (yearly)", (d) => formatPercent(d.volatilityPercent, { signed: false })],
    ["Worst fall (1 year)", (d) => formatPercent(d.maxDrawdownPercent)],
    ["Dividend yield", (d) => formatPercent(d.dividendYieldPercent, { signed: false })],
  ];

  return (
    <div className="min-h-dvh bg-light-surface text-primary">
      <header className="border-b border-primary/10 bg-light-surface/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-2 px-5 py-3 sm:px-8">
          <Link href="/" className="font-display text-sm font-bold sm:text-base">{process.env.NEXT_PUBLIC_APP_NAME || "CAN'T LOAD ENV"}<span className="text-accent">.</span></Link>
          <Link href={overviewHref} className={`inline-flex min-h-11 items-center gap-2 border border-primary/20 px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 ${focusRing}`}>
            <ArrowLeft className="h-4 w-4" aria-hidden /> Account overview
          </Link>
        </div>
      </header>
      {isAdjustingPlan && account ? (
        <AccountPlanAdjustment
          account={account}
          onClose={() => setIsAdjustingPlan(false)}
          onSaved={() => {
            setIsAdjustingPlan(false);
            setReloadAccount((value) => value + 1);
          }}
        />
      ) : <main>
        <section className="border-b border-primary/10 bg-primary px-5 py-12 text-white sm:px-8 sm:py-16">
          <div className="mx-auto max-w-7xl">
            <button type="button" disabled={!account} onClick={() => setIsAdjustingPlan(true)} className={`inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-white/70 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}>
              <ArrowLeft className="h-4 w-4" aria-hidden /> Back to your plan
            </button>
            <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-accent"><Sparkles className="h-4 w-4" aria-hidden /> Your account, taking shape</p>
                <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-tight sm:text-6xl">Explore options for {accountName}.</h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">Built around your goal: {goal}. Compare the trade-offs before choosing what you&apos;d like to learn more about.</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href={accountId ? `/consult?account=${encodeURIComponent(accountId)}` : "/consult"} className={`inline-flex min-h-11 items-center gap-2 border border-white/30 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10 ${focusRing}`}>
                    <MessageCircle className="h-4 w-4" aria-hidden /> Investment consulting
                  </Link>
                  <Link href={`${overviewHref}/portfolio`} className={`inline-flex min-h-11 items-center gap-2 border border-white/30 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10 ${focusRing}`}>
                    <Briefcase className="h-4 w-4" aria-hidden /> Portfolio
                  </Link>
                </div>
              </div>
              <div className="border border-white/20 bg-white/10 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/65">A useful reminder</p>
                <p className="mt-3 text-sm leading-6 text-white/85">Simulated prices from a prototype bank. For learning and comparison, not recommendations.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-10 sm:px-8 sm:py-14">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-5 border-b border-primary/15 pb-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-secondary">Product explorer</p>
                <h2 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">Options picked for you</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/70">Chosen from the bank&apos;s catalog to fit your profile and this account&apos;s plan. Shortlist up to {MAX_SELECTIONS}. Open any product for its price chart, facts and risks.</p>
              </div>
              <button type="button" disabled={!account || !selectionHasChanged} onClick={saveSelections} className={`inline-flex min-h-11 items-center justify-center gap-2 bg-growth px-4 text-sm font-semibold text-primary transition-colors hover:bg-growth/90 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}><Check className="h-4 w-4" aria-hidden /> Save shortlist</button>
            </div>
            {accountMissing && <p role="alert" className="mt-4 border border-risk/30 bg-risk/10 p-4 text-sm leading-6">This account could not be found for your code.</p>}
            {accountLoadError && (
              <div className="mt-4 border border-risk/30 bg-risk/10 p-4">
                <p role="alert" className="text-sm leading-6">{accountLoadError}</p>
                <button type="button" onClick={() => setReloadAccount((value) => value + 1)} className={`mt-3 min-h-11 border border-primary/25 px-4 text-sm font-semibold hover:bg-primary/5 ${focusRing}`}>Try loading again</button>
              </div>
            )}
            {storageError && <p role="alert" className="mt-4 border border-risk/30 bg-risk/10 p-4 text-sm leading-6">{storageError}</p>}
            {savedMessage && <p role="status" className="mt-4 text-sm font-medium text-growth">{savedMessage}</p>}

            {products.status === "loading" ? (
              <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4" role="status" aria-label="Choosing options for you">{[0, 1, 2, 3].map((item) => <div key={item} className="skeleton-block h-80" />)}</div>
            ) : products.status === "error" ? (
              <div className="mt-8 border border-risk/30 bg-risk/10 p-5">
                <p role="alert" className="text-sm leading-6">{products.message}</p>
                <button type="button" onClick={() => setReloadProducts((value) => value + 1)} className={`mt-4 min-h-11 border border-primary/25 px-4 text-sm font-semibold hover:bg-primary/5 ${focusRing}`}>Try again</button>
              </div>
            ) : products.data.length === 0 ? (
              <p className="mt-8 border border-dashed border-primary/20 bg-white p-6 text-sm leading-6 text-primary/70">No options fit your plan right now.</p>
            ) : (
              <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {products.data.map(({ product, reason }) => {
                  const chosen = isSelected(product.symbol);
                  return (
                    <ProductCard key={product.symbol} product={product} chosen={chosen} note={reason}>
                      <Link href={productLink(product.symbol)} className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 border border-primary/25 px-3 text-sm font-semibold hover:bg-primary/5 ${focusRing}`}><Eye className="h-4 w-4" aria-hidden /> Details</Link>
                      <button type="button" aria-pressed={chosen} onClick={() => toggle(product)} className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 px-3 text-sm font-semibold ${focusRing} ${chosen ? "bg-growth text-primary" : "bg-accent text-primary hover:bg-accent/90"}`}>
                        {chosen ? <Check className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}{chosen ? "Shortlisted" : "Shortlist"}
                      </button>
                    </ProductCard>
                  );
                })}
              </div>
            )}

            {(selected.length > 0 || selectionHasChanged) && (
              <section className="mt-12 border border-primary/15 bg-white p-5 sm:p-7" aria-labelledby="compare-title">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-secondary">Side-by-side</p>
                    <h2 id="compare-title" className="mt-2 flex items-center gap-2 font-display text-2xl font-bold"><Scale className="h-5 w-5 text-accent" aria-hidden /> Compare your shortlist</h2>
                  </div>
                  <p className="text-sm text-ink/65">{selected.length} of {MAX_SELECTIONS} shortlisted</p>
                </div>
                {selected.length > 0 ? (
                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full min-w-150 text-left text-sm">
                      <thead>
                        <tr className="border-b border-primary/15">
                          <th className="pb-3 pr-6 font-semibold text-secondary">Detail</th>
                          {compared.map(({ item }) => <th key={item.symbol} className="pb-3 pr-6 font-display text-base font-bold">{item.name} <span className="block font-mono text-xs font-normal text-secondary">{item.symbol}</span></th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {compareRows.map(([label, read]) => (
                          <tr key={label} className="border-b border-primary/10 last:border-0">
                            <th className="py-3 pr-6 align-top font-semibold text-secondary">{label}</th>
                            {compared.map(({ item, detail }) => <td key={item.symbol} className="py-3 pr-6 align-top text-ink/80">{detail ? read(detail) : "Loading…"}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="mt-5 text-sm leading-6 text-ink/70">Nothing is shortlisted. Save to clear the shortlist stored for this account.</p>}
                <button type="button" disabled={!account || !selectionHasChanged} onClick={saveSelections} className={`mt-6 inline-flex min-h-11 items-center justify-center gap-2 bg-growth px-5 text-sm font-semibold text-primary hover:bg-growth/90 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}><Check className="h-4 w-4" aria-hidden /> {selected.length ? "Save shortlist" : "Clear saved shortlist"}</button>
              </section>
            )}
          </div>
        </section>
      </main>}
      <footer className="border-t border-primary/10 bg-primary px-5 py-7 text-white sm:px-8"><div className="mx-auto max-w-7xl text-xs leading-5 text-white/65">Simulated prices from a prototype bank, for education and comparison only. Investing involves risk, including possible loss of principal. This page does not provide financial advice.</div></footer>
    </div>
  );
}

export default function CreateAccountPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-light-surface p-8"><div className="skeleton-block h-64 w-full" role="status" aria-label="Loading" /></div>}>
      <CreateAccountContent />
    </Suspense>
  );
}
