"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, TrendingDown, TrendingUp } from "lucide-react";
import { OrderDialog } from "@/components/invest/order-dialog";
import { PriceChart } from "@/components/invest/price-chart";
import { riskLabel, typeLabel } from "@/components/invest/product-card";
import { changeColor, formatAsOf, formatCompactUsd, formatDate, formatPercent, formatQuantity, formatUsd } from "@/components/invest/money";
import { accountSlug, readAccounts, type AccountRecord } from "@/libs/account-client";
import { fetchPortfolio, fetchProduct, fetchProductHistory, PORTFOLIO_CHANGED_EVENT } from "@/libs/invest-client";
import type { ChartRange, OrderSide, PortfolioHolding, ProductDetail } from "@/libs/bank/types";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

type ProductState = { status: "loading" } | { status: "error"; message: string; notFound: boolean } | { status: "ready"; product: ProductDetail };
type Position = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; holding: PortfolioHolding | null };

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-primary/10 py-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-secondary">{label}</dt>
      <dd className="mt-1 font-display text-lg font-semibold">{value}</dd>
    </div>
  );
}

function ProductContent() {
  const { symbol: routeSymbol } = useParams<{ symbol: string }>();
  const symbol = decodeURIComponent(routeSymbol).toUpperCase();
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountParam = searchParams.get("account");

  const [state, setState] = useState<ProductState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [accountsError, setAccountsError] = useState("");
  const [position, setPosition] = useState<Position>({ status: "loading" });
  const [dialog, setDialog] = useState<OrderSide | null>(null);
  const [changes, setChanges] = useState(0);

  const account = accounts.find((item) => item.id === accountParam) ?? null;
  const accountRef = account?.id ?? null;

  useEffect(() => {
    let active = true;
    void fetchProduct(symbol).then((result) => {
      if (!active) return;
      setState(result.ok
        ? { status: "ready", product: result.data }
        : { status: "error", message: result.message, notFound: result.status === 404 });
    });
    return () => { active = false; };
  }, [symbol, attempt, changes]);

  useEffect(() => {
    let active = true;
    void readAccounts().then((result) => {
      if (!active) return;
      if (result.ok) setAccounts(result.accounts); else setAccountsError(result.message);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const onChange = () => setChanges((value) => value + 1);
    window.addEventListener(PORTFOLIO_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(PORTFOLIO_CHANGED_EVENT, onChange);
  }, []);

  useEffect(() => {
    if (!accountRef) return;
    let active = true;
    void fetchPortfolio(accountRef).then((result) => {
      if (!active) return;
      setPosition(result.ok
        ? { status: "ready", holding: result.data.holdings.find((item) => item.symbol === symbol) ?? null }
        : { status: "error", message: result.message });
    });
    return () => { active = false; };
  }, [accountRef, symbol, changes]);

  const loadHistory = useCallback((range: ChartRange) => fetchProductHistory(symbol, range), [symbol]);
  const backHref = account ? `/account/${encodeURIComponent(accountSlug(account.accountName, account.id))}/create` : "/dashboard";
  const holding = position.status === "ready" && accountRef ? position.holding : null;

  const header = (
    <header className="border-b border-primary/10 bg-light-surface/95">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-3 px-5 py-2 sm:px-8">
        <Link href="/dashboard" className="font-display text-sm font-bold sm:text-base">{process.env.NEXT_PUBLIC_APP_NAME || "CAN'T LOAD ENV"}<span className="text-accent">.</span></Link>
        <Link href={backHref} className={`inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary/65 transition-colors hover:text-primary ${focusRing}`}>
          <ArrowLeft className="h-4 w-4" aria-hidden /> {account ? "Explore options" : "Dashboard"}
        </Link>
      </div>
    </header>
  );

  if (state.status === "loading") {
    return (
      <div className="min-h-dvh bg-light-surface text-primary">
        {header}
        <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8" role="status" aria-label="Loading product">
          <div className="skeleton-block h-40 w-full" />
          <div className="skeleton-block mt-6 h-72 w-full" />
        </main>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="min-h-dvh bg-light-surface text-primary">
        {header}
        <main className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-8">
          <div className="border border-risk/30 bg-risk/10 p-6 sm:p-8">
            <h1 className="font-display text-2xl font-bold">{state.notFound ? "Product not found" : "Product unavailable"}</h1>
            <p role="alert" className="mt-3 text-sm leading-6 text-primary/75">{state.notFound ? "That product is not in the catalog." : state.message}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {!state.notFound && <button type="button" onClick={() => { setState({ status: "loading" }); setAttempt((value) => value + 1); }} className={`min-h-11 border border-primary/25 px-4 text-sm font-semibold hover:bg-primary/5 ${focusRing}`}>Try again</button>}
              <Link href={backHref} className={`inline-flex min-h-11 items-center gap-2 bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 ${focusRing}`}><ArrowLeft className="h-4 w-4" aria-hidden /> Back</Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const product = state.product;
  const Trend = product.dayChangePercent < 0 ? TrendingDown : TrendingUp;

  return (
    <div className="min-h-dvh bg-light-surface text-primary">
      {header}
      <section className="bg-primary px-5 py-10 text-white sm:px-8 sm:py-14">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide">
              <span className="bg-white/10 px-2.5 py-1">{typeLabel(product.type)}</span>
              <span className="bg-white/10 px-2.5 py-1">{product.area}</span>
              <span className="font-mono text-accent">{product.symbol}</span>
            </div>
            <h1 className="mt-4 wrap-anywhere font-display text-4xl font-bold leading-tight sm:text-5xl">{product.name}</h1>
            <p className="mt-5 font-display text-4xl font-bold">{formatUsd(product.currentPrice)}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm">
              <span className={`inline-flex items-center gap-1 font-semibold ${product.dayChange < 0 ? "text-risk" : "text-growth"}`}><Trend className="h-4 w-4" aria-hidden /> {product.dayChange > 0 ? "+" : ""}{formatUsd(product.dayChange)} ({formatPercent(product.dayChangePercent)}) today</span>
              <span className="text-white/60">As of {formatAsOf(product.asOf)}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={!account} onClick={() => setDialog("buy")} className={`min-h-11 min-w-28 bg-accent px-5 text-sm font-semibold text-primary hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}>Buy</button>
            <button type="button" disabled={!account || !holding} onClick={() => setDialog("sell")} className={`min-h-11 min-w-28 border border-white/40 px-5 text-sm font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}>Sell</button>
          </div>
        </div>
      </section>

      <main className="mx-auto grid w-full max-w-6xl gap-5 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1.4fr_1fr]">
        <section className="border border-primary/10 bg-white p-5 sm:p-7 lg:col-span-2" aria-labelledby="chart-title">
          <h2 id="chart-title" className="font-display text-2xl font-bold">Price history</h2>
          <div className="mt-4"><PriceChart label={`${product.name} price`} load={loadHistory} initialRange="1Y" reloadKey={changes} /></div>
        </section>

        <section className="border border-primary/10 bg-white p-5 sm:p-7 lg:col-span-2" aria-labelledby="account-title">
          <h2 id="account-title" className="font-display text-2xl font-bold">Your position</h2>
          {accountsError ? (
            <p role="alert" className="mt-4 text-sm text-risk">{accountsError}</p>
          ) : !account ? (
            <div className="mt-4">
              <label htmlFor="account-picker" className="text-sm font-semibold">Choose a planning account to trade for</label>
              <select
                id="account-picker"
                value=""
                onChange={(event) => router.replace(`/products/${encodeURIComponent(product.symbol)}?account=${encodeURIComponent(event.target.value)}`)}
                className={`mt-2 block min-h-11 w-full max-w-sm border border-primary/20 bg-white px-3 text-sm ${focusRing}`}
              >
                <option value="" disabled>{accounts.length ? "Select an account…" : "No accounts found"}</option>
                {accounts.map((item) => <option key={item.id} value={item.id}>{item.accountName}</option>)}
              </select>
              <p className="mt-2 text-xs text-primary/60">Orders are recorded under the account you pick. Cash is shared across your accounts.</p>
            </div>
          ) : position.status === "loading" ? (
            <div className="skeleton-block mt-4 h-20 w-full" role="status" aria-label="Loading position" />
          ) : position.status === "error" ? (
            <p role="alert" className="mt-4 text-sm text-risk">{position.message}</p>
          ) : holding ? (
            <>
              <p className="mt-1 text-sm text-primary/65">In {account.accountName}</p>
              <dl className="mt-3 grid grid-cols-2 gap-x-6 sm:grid-cols-4">
                <Fact label="Quantity" value={formatQuantity(holding.quantity)} />
                <Fact label="Average cost" value={formatUsd(holding.avgCost)} />
                <Fact label="Market value" value={formatUsd(holding.marketValue)} />
                <div className="border-t border-primary/10 py-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-secondary">Profit / loss</dt>
                  <dd className={`mt-1 font-display text-lg font-semibold ${changeColor(holding.unrealizedPL)}`}>{holding.unrealizedPL > 0 ? "+" : ""}{formatUsd(holding.unrealizedPL)} ({formatPercent(holding.unrealizedPLPercent)})</dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="mt-3 text-sm text-primary/70">You don&apos;t own this yet in {account.accountName}.</p>
          )}
        </section>

        <section className="border border-primary/10 bg-white p-5 sm:p-7" aria-labelledby="about-title">
          <h2 id="about-title" className="font-display text-2xl font-bold">About</h2>
          <p className="mt-4 text-sm leading-7 text-primary/80">{product.description}</p>
          <dl className="mt-5 grid grid-cols-2 gap-x-6">
            <Fact label="Issuer" value={product.issuer} />
            <Fact label="Region" value={product.region} />
            <Fact label="Launched" value={formatDate(product.inceptionDate)} />
            <Fact label="Currency" value={product.currency} />
          </dl>
        </section>

        <section className="border border-primary/10 bg-white p-5 sm:p-7" aria-labelledby="facts-title">
          <h2 id="facts-title" className="font-display text-2xl font-bold">Key facts</h2>
          <dl className="mt-4 grid grid-cols-2 gap-x-6">
            <Fact label="1-month return" value={formatPercent(product.returns["1M"])} />
            <Fact label="3-month return" value={formatPercent(product.returns["3M"])} />
            <Fact label="1-year return" value={formatPercent(product.returns["1Y"])} />
            <Fact label="3-year return" value={formatPercent(product.returns["3Y"])} />
            <Fact label="Volatility (yearly)" value={formatPercent(product.volatilityPercent, { signed: false })} />
            <Fact label="Worst fall (1 year)" value={formatPercent(product.maxDrawdownPercent)} />
            <Fact label="52-week range" value={`${formatUsd(product.low52w)} – ${formatUsd(product.high52w)}`} />
            <Fact label="Dividend yield" value={formatPercent(product.dividendYieldPercent, { signed: false })} />
            <Fact label={product.type === "fund" ? "Assets under management" : "Size"} value={formatCompactUsd(product.size)} />
          </dl>
        </section>

        <section className="border border-primary/10 bg-white p-5 sm:p-7" aria-labelledby="risk-title">
          <h2 id="risk-title" className="font-display text-2xl font-bold">Risks</h2>
          <p className="mt-3 inline-block bg-light-surface px-3 py-1 text-xs font-bold uppercase tracking-wide text-secondary">{riskLabel(product.risk)}</p>
          <p className="mt-3 text-sm leading-7 text-primary/80">{product.riskNote}</p>
        </section>

        {product.topHoldings.length > 0 && (
          <section className="border border-primary/10 bg-white p-5 sm:p-7" aria-labelledby="holdings-title">
            <h2 id="holdings-title" className="font-display text-2xl font-bold">Top holdings</h2>
            <table className="mt-4 w-full text-left text-sm">
              <thead><tr className="border-b border-primary/15 text-secondary"><th className="pb-2 font-semibold">Company</th><th className="pb-2 text-right font-semibold">Weight</th></tr></thead>
              <tbody>
                {product.topHoldings.map((item) => (
                  <tr key={item.name} className="border-b border-primary/10 last:border-0"><td className="py-2.5 pr-3">{item.name}</td><td className="py-2.5 text-right font-semibold">{formatPercent(item.weightPercent, { signed: false })}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <p className="text-xs leading-5 text-primary/50 lg:col-span-2">
          Simulated prices from a prototype bank, for education and comparison only. Descriptions and risk notes are informational and not personalised. Investing involves risk, including possible loss of principal. This is not financial advice.
        </p>
      </main>

      {dialog && account && (
        <OrderDialog
          product={{ symbol: product.symbol, name: product.name, currentPrice: product.currentPrice, asOf: product.asOf }}
          side={dialog}
          accountRef={account.id}
          accountName={account.accountName}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

export default function ProductPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-light-surface p-8"><div className="skeleton-block h-64 w-full" role="status" aria-label="Loading" /></div>}>
      <ProductContent />
    </Suspense>
  );
}
