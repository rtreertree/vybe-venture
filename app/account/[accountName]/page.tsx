'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Briefcase, CalendarDays, CircleDollarSign, Clock3, Goal, MessageCircle, Sparkles, Wallet } from 'lucide-react';
import { changeColor, formatAsOf, formatPercent, formatUsd as formatMoney } from '@/components/invest/money';
import { accountSlug, readAccounts, type AccountRecord } from '@/libs/account-client';
import { fetchPortfolio, fetchProducts, PORTFOLIO_CHANGED_EVENT } from '@/libs/invest-client';
import type { Portfolio, ProductListItem } from '@/libs/bank/types';

type AccountPageState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'not-found' }
  | { status: 'ready'; account: AccountRecord };

function formatUsd(value: number | null) {
  return value === null ? 'Not set' : formatMoney(value, 0);
}

function formatPlanningValue(value: string | null) {
  return value?.trim() || 'Not provided';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(new Date(value));
}

export default function AccountOverviewPage() {
  const { accountName: routeSlug } = useParams<{ accountName: string }>();
  const [page, setPage] = useState<AccountPageState>({ status: 'loading' });
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [portfolioError, setPortfolioError] = useState('');
  const [catalog, setCatalog] = useState<ProductListItem[] | null>(null);
  const [catalogError, setCatalogError] = useState('');
  const accountId = page.status === 'ready' ? page.account.id : null;
  useEffect(() => {
    let active = true;
    const load = async () => {
      const result = await readAccounts();
      if (!active) return;
      if (!result.ok) return setPage({ status: 'error', message: result.message });
      const account = result.accounts.find((item) => accountSlug(item.accountName, item.id) === routeSlug);
      setPage(account ? { status: 'ready', account } : { status: 'not-found' });
    };
    void load();
    window.addEventListener('account-data-changed', load);
    return () => { active = false; window.removeEventListener('account-data-changed', load); };
  }, [routeSlug]);

  useEffect(() => {
    if (!accountId) return;
    let active = true;
    const load = () => {
      void fetchPortfolio(accountId).then((result) => {
        if (!active) return;
        setPortfolio(result.ok ? result.data : null);
        setPortfolioError(result.ok ? '' : result.message);
      });
    };
    load();
    window.addEventListener(PORTFOLIO_CHANGED_EVENT, load);
    return () => { active = false; window.removeEventListener(PORTFOLIO_CHANGED_EVENT, load); };
  }, [accountId]);

  const hasShortlist = page.status === 'ready' && page.account.selectedProducts.length > 0;
  useEffect(() => {
    if (!hasShortlist) return;
    let active = true;
    void fetchProducts().then((result) => {
      if (!active) return;
      setCatalog(result.ok ? result.data.products : null);
      setCatalogError(result.ok ? '' : result.message);
    });
    return () => { active = false; };
  }, [hasShortlist]);

  const targetAmount = page.status === 'ready' ? page.account.planning.targetAmount?.amount ?? null : null;
  const targetProgress = portfolio && targetAmount ? Math.min(100, (portfolio.totals.holdingsValue / targetAmount) * 100) : null;

  return (
    <div className="min-h-dvh bg-light-surface text-primary">
      <header className="border-b border-primary/10 bg-light-surface/95">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/dashboard" className="font-display text-sm font-bold sm:text-base">{process.env.NEXT_PUBLIC_APP_NAME || "CAN'T LOAD ENV"}<span className="text-accent">.</span></Link>
          <Link href="/dashboard" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary/65 transition-colors hover:text-primary">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Dashboard
          </Link>
        </div>
      </header>

      {page.status === 'loading' ? (
        <main className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8" aria-live="polite">
          <p className="text-sm text-secondary">Loading account details…</p>
        </main>
      ) : page.status === 'error' || page.status === 'not-found' ? (
        <main className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-8">
          <div className="border border-risk/30 bg-risk/10 p-6 sm:p-8">
            <h1 className="font-display text-2xl font-bold">{page.status === 'not-found' ? 'Account not found' : 'Account details unavailable'}</h1>
            <p role="alert" className="mt-3 text-sm leading-6 text-primary/75">
              {page.status === 'not-found'
                ? 'This account was not found for your code. Return to your dashboard to choose another account.'
                : page.message}
            </p>
            <Link href="/dashboard" className="mt-6 inline-flex min-h-11 items-center gap-2 bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90">
              <ArrowLeft className="h-4 w-4" aria-hidden /> Back to dashboard
            </Link>
          </div>
        </main>
      ) : (
        <>
          <section className="bg-primary px-5 py-10 text-white sm:px-8 sm:py-14">
            <div className="mx-auto max-w-6xl">
              <Link href="/dashboard" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-white/70 transition-colors hover:text-white">
                <ArrowLeft className="h-4 w-4" aria-hidden /> All accounts
              </Link>
              <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_340px] lg:items-end">
                <div>
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-accent">
                    <Goal className="h-4 w-4" aria-hidden /> Account overview
                  </p>
                  <h1 className="mt-4 wrap-anywhere font-display text-4xl font-bold leading-tight sm:text-5xl">{page.account.accountName}</h1>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">{page.account.goal}</p>
                  <nav aria-label="Account pages" className="mt-6 flex flex-wrap gap-3">
                    <Link
                      href={`/account/${encodeURIComponent(accountSlug(page.account.accountName, page.account.id))}/create`}
                      className="inline-flex min-h-11 items-center gap-2 bg-accent px-4 text-sm font-semibold text-primary transition-colors hover:bg-accent/90"
                    >
                      <Sparkles className="h-4 w-4" aria-hidden /> Explore options
                    </Link>
                    <Link
                      href={`/account/${encodeURIComponent(accountSlug(page.account.accountName, page.account.id))}/portfolio`}
                      className="inline-flex min-h-11 items-center gap-2 border border-white/30 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                    >
                      <Briefcase className="h-4 w-4" aria-hidden /> Portfolio
                    </Link>
                    <Link
                      href={`/consult?account=${encodeURIComponent(page.account.id)}`}
                      className="inline-flex min-h-11 items-center gap-2 border border-white/30 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                    >
                      <MessageCircle className="h-4 w-4" aria-hidden /> Investment consulting
                    </Link>
                  </nav>
                  <p className="mt-5 inline-flex items-center gap-2 text-xs text-white/55">
                    <CalendarDays className="h-4 w-4" aria-hidden /> Created {formatDate(page.account.createdAt)}
                  </p>
                </div>
                <aside className="border border-white/15 bg-white/5 p-5" aria-label="Account plan summary">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/55">Your plan at a glance</p>
                  <div className="mt-4 flex items-center justify-between gap-4 border-b border-white/15 pb-4">
                    <span className="inline-flex items-center gap-2 text-sm text-white/70"><CircleDollarSign className="h-4 w-4" aria-hidden /> Target</span>
                    <span className="font-display text-xl font-semibold">{formatUsd(page.account.planning.targetAmount?.amount ?? null)}</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-4">
                    <span className="inline-flex items-center gap-2 text-sm text-white/70"><Clock3 className="h-4 w-4" aria-hidden /> Time horizon</span>
                    <span className="text-sm font-semibold">{page.account.timeframeYears ? `${page.account.timeframeYears} ${page.account.timeframeYears === 1 ? 'year' : 'years'}` : 'Not set'}</span>
                  </div>
                  <div className="mt-4 border-t border-white/15 pt-4">
                    <div className="flex items-center justify-between gap-4">
                      <span className="inline-flex items-center gap-2 text-sm text-white/70"><Wallet className="h-4 w-4" aria-hidden /> Holdings value</span>
                      <span className="font-display text-xl font-semibold">{portfolio ? formatMoney(portfolio.totals.holdingsValue) : portfolioError ? 'Unavailable' : '…'}</span>
                    </div>
                    {portfolioError && <p role="alert" className="mt-2 text-xs text-white/70">{portfolioError}</p>}
                    {targetProgress !== null && (
                      <div className="mt-3">
                        <div className="h-2 bg-white/15" role="progressbar" aria-label="Progress toward target" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(targetProgress)}>
                          <div className="h-full bg-growth" style={{ width: `${targetProgress}%` }} />
                        </div>
                        <p className="mt-1.5 text-xs text-white/60">{targetProgress.toFixed(1)}% of your target</p>
                      </div>
                    )}
                  </div>
                </aside>
              </div>
            </div>
          </section>

          <main className="mx-auto grid w-full max-w-6xl gap-5 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="border border-primary/10 bg-white p-5 sm:p-7" aria-labelledby="plan-details">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-secondary">Built around your priorities</p>
              <h2 id="plan-details" className="mt-2 font-display text-2xl font-bold">Plan details</h2>
              <dl className="mt-6 grid gap-0 sm:grid-cols-2">
                {[
                  { label: 'Goal', value: page.account.goal },
                  { label: 'Target amount', value: formatUsd(page.account.planning.targetAmount?.amount ?? null) },
                  { label: 'Time horizon', value: page.account.timeframeYears ? `${page.account.timeframeYears} ${page.account.timeframeYears === 1 ? 'year' : 'years'}` : 'Not set' },
                  { label: 'Access to money', value: formatPlanningValue(page.account.planning.liquidityNeeds) },
                  { label: 'Comfort with risk', value: formatPlanningValue(page.account.planning.riskAttitude) },
                  { label: 'Reaction to losses', value: formatPlanningValue(page.account.planning.lossReaction) },
                ].map((item) => (
                  <div key={item.label} className="border-t border-primary/10 py-4 first:border-0 sm:even:pl-5">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-secondary">{item.label}</dt>
                    <dd className="mt-1.5 text-sm leading-6 text-primary/85">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="border border-primary/10 bg-white p-5 sm:p-7" aria-labelledby="preferences">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-secondary">Investment preferences</p>
              <h2 id="preferences" className="mt-2 font-display text-2xl font-bold">What matters to you</h2>
              <dl className="mt-6 space-y-4">
                <div className="border-t border-primary/10 pt-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-secondary">Products you want to explore</dt>
                  <dd className="mt-1.5 text-sm leading-6 text-primary/85">{formatPlanningValue(page.account.planning.preferredProducts)}</dd>
                </div>
                <div className="border-t border-primary/10 pt-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-secondary">Industries to exclude</dt>
                  <dd className="mt-1.5 text-sm leading-6 text-primary/85">{formatPlanningValue(page.account.planning.excludedIndustries)}</dd>
                </div>
              </dl>
            </section>

            <section className="border border-primary/10 bg-white p-5 sm:p-7 lg:col-span-2" aria-labelledby="saved-options">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-secondary">Your shortlist</p>
                  <h2 id="saved-options" className="mt-2 font-display text-2xl font-bold">Saved options</h2>
                </div>
                <p className="text-sm text-primary/60">{page.account.selectedProducts.length} of 3 options saved</p>
              </div>
              {page.account.selectedProducts.length > 0 ? (
                <>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {page.account.selectedProducts.map((product) => {
                    const live = catalog?.find((item) => item.symbol === product.symbol);
                    return (
                      <li key={product.symbol}>
                        <Link
                          href={`/products/${encodeURIComponent(product.symbol)}?account=${encodeURIComponent(page.account.id)}`}
                          className="flex items-center gap-4 border border-primary/10 bg-light-surface/60 p-4 transition-colors hover:border-primary/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        >
                          <span className="grid h-11 min-w-11 shrink-0 place-items-center bg-primary px-1 font-mono text-xs font-semibold text-accent">{product.symbol}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-display text-sm font-semibold">{product.name}</span>
                            <span className="mt-1 block text-xs text-secondary">{live ? `As of ${formatAsOf(live.asOf)}` : catalogError ? 'Price unavailable' : 'Loading price…'}</span>
                          </span>
                          {live && (
                            <span className="text-right">
                              <span className="block font-display text-sm font-semibold">{formatMoney(live.currentPrice)}</span>
                              <span className={`block text-xs font-semibold ${changeColor(live.dayChangePercent)}`}>{formatPercent(live.dayChangePercent)}</span>
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                {catalogError && <p role="alert" className="mt-3 text-sm text-risk">{catalogError}</p>}
                </>
              ) : (
                <p className="mt-5 border border-dashed border-primary/20 bg-light-surface/60 p-5 text-sm leading-6 text-primary/65">
                  No options saved yet. Explore the catalog to compare what may fit your plan.
                </p>
              )}
            </section>

            <p className="text-xs leading-5 text-primary/50 lg:col-span-2">
              This prototype saves account details under your account code. Prices are simulated by a prototype bank for education and comparison, not financial advice or recommendations.
            </p>
          </main>
        </>
      )}
    </div>
  );
}
