'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { OrderDialog, type OrderProduct } from '@/components/invest/order-dialog';
import { PriceChart } from '@/components/invest/price-chart';
import { changeColor, formatAsOf, formatPercent, formatQuantity, formatUsd } from '@/components/invest/money';
import { accountSlug, readAccounts, type AccountRecord } from '@/libs/account-client';
import { cancelOrder, fetchOrders, fetchPortfolio, fetchPortfolioHistory, PORTFOLIO_CHANGED_EVENT } from '@/libs/invest-client';
import type { BankOrderResponse, ChartRange, Portfolio } from '@/libs/bank/types';

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

type AccountState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'not-found' }
  | { status: 'ready'; account: AccountRecord };
type Loadable<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: T };

function Tile({ label, value, detail, tone }: { label: string; value: string; detail?: string; tone?: string }) {
  return (
    <div className="border border-primary/10 bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-secondary">{label}</p>
      <p className={`mt-2 font-display text-2xl font-bold ${tone ?? ''}`}>{value}</p>
      {detail && <p className="mt-1 text-xs text-primary/60">{detail}</p>}
    </div>
  );
}

export default function AccountPortfolioPage() {
  const { accountName: routeSlug } = useParams<{ accountName: string }>();
  const [accountState, setAccountState] = useState<AccountState>({ status: 'loading' });
  const [portfolio, setPortfolio] = useState<Loadable<Portfolio>>({ status: 'loading' });
  const [orders, setOrders] = useState<Loadable<BankOrderResponse[]>>({ status: 'loading' });
  const [changes, setChanges] = useState(0);
  const [selling, setSelling] = useState<OrderProduct | null>(null);
  const [cancelError, setCancelError] = useState('');
  const [cancelling, setCancelling] = useState<string | null>(null);

  const account = accountState.status === 'ready' ? accountState.account : null;
  const accountId = account?.id ?? null;
  const overviewHref = `/account/${routeSlug}`;

  useEffect(() => {
    let active = true;
    const load = async () => {
      const result = await readAccounts();
      if (!active) return;
      if (!result.ok) return setAccountState({ status: 'error', message: result.message });
      const match = result.accounts.find((item) => accountSlug(item.accountName, item.id) === routeSlug);
      setAccountState(match ? { status: 'ready', account: match } : { status: 'not-found' });
    };
    void load();
    window.addEventListener('account-data-changed', load);
    return () => { active = false; window.removeEventListener('account-data-changed', load); };
  }, [routeSlug]);

  useEffect(() => {
    const onChange = () => setChanges((value) => value + 1);
    window.addEventListener(PORTFOLIO_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(PORTFOLIO_CHANGED_EVENT, onChange);
  }, []);

  useEffect(() => {
    if (!accountId) return;
    let active = true;
    void fetchPortfolio(accountId).then((result) => {
      if (active) setPortfolio(result.ok ? { status: 'ready', data: result.data } : { status: 'error', message: result.message });
    });
    void fetchOrders(accountId).then((result) => {
      if (active) setOrders(result.ok ? { status: 'ready', data: result.data.orders } : { status: 'error', message: result.message });
    });
    return () => { active = false; };
  }, [accountId, changes]);

  const loadHistory = useCallback((range: ChartRange) => fetchPortfolioHistory(range, accountId ?? undefined), [accountId]);

  const allocation = useMemo(() => {
    if (portfolio.status !== 'ready') return [];
    const byArea = new Map<string, number>();
    for (const holding of portfolio.data.holdings) byArea.set(holding.area, (byArea.get(holding.area) ?? 0) + holding.weightPercent);
    return [...byArea].map(([area, weight]) => ({ area, weight })).sort((a, b) => b.weight - a.weight);
  }, [portfolio]);

  const cancel = async (orderId: string) => {
    setCancelling(orderId);
    setCancelError('');
    const result = await cancelOrder(orderId);
    setCancelling(null);
    if (!result.ok) return setCancelError(result.message);
    setChanges((value) => value + 1);
  };

  const header = (
    <header className="border-b border-primary/10 bg-light-surface/95">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/dashboard" className="font-display text-sm font-bold sm:text-base">{process.env.NEXT_PUBLIC_APP_NAME || "CAN'T LOAD ENV"}<span className="text-accent">.</span></Link>
        <Link href={overviewHref} className={`inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary/65 transition-colors hover:text-primary ${focusRing}`}>
          <ArrowLeft className="h-4 w-4" aria-hidden /> Account overview
        </Link>
      </div>
    </header>
  );

  if (accountState.status === 'loading') {
    return (
      <div className="min-h-dvh bg-light-surface text-primary">
        {header}
        <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8" role="status" aria-label="Loading portfolio"><div className="skeleton-block h-40 w-full" /></main>
      </div>
    );
  }

  if (accountState.status !== 'ready') {
    return (
      <div className="min-h-dvh bg-light-surface text-primary">
        {header}
        <main className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-8">
          <div className="border border-risk/30 bg-risk/10 p-6 sm:p-8">
            <h1 className="font-display text-2xl font-bold">{accountState.status === 'not-found' ? 'Account not found' : 'Portfolio unavailable'}</h1>
            <p role="alert" className="mt-3 text-sm leading-6 text-primary/75">{accountState.status === 'not-found' ? 'This account was not found for your code.' : accountState.message}</p>
            <Link href="/dashboard" className={`mt-6 inline-flex min-h-11 items-center gap-2 bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 ${focusRing}`}><ArrowLeft className="h-4 w-4" aria-hidden /> Back to dashboard</Link>
          </div>
        </main>
      </div>
    );
  }

  const data = portfolio.status === 'ready' ? portfolio.data : null;
  const empty = data !== null && data.holdings.length === 0;

  return (
    <div className="min-h-dvh bg-light-surface text-primary">
      {header}
      <section className="bg-primary px-5 py-10 text-white sm:px-8 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Portfolio</p>
          <h1 className="mt-3 wrap-anywhere font-display text-4xl font-bold leading-tight sm:text-5xl">{accountState.account.accountName}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">What you hold in this planning account, valued at simulated current prices.</p>
        </div>
      </section>

      <main className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-5 px-5 py-8 sm:px-8 sm:py-10">
        {portfolio.status === 'error' && (
          <div className="border border-risk/30 bg-risk/10 p-5">
            <p role="alert" className="text-sm leading-6">{portfolio.message}</p>
            <button type="button" onClick={() => { setPortfolio({ status: 'loading' }); setChanges((value) => value + 1); }} className={`mt-3 min-h-11 border border-primary/25 px-4 text-sm font-semibold hover:bg-primary/5 ${focusRing}`}>Try again</button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          {data ? (
            <>
              <Tile label="Holdings value" value={formatUsd(data.totals.holdingsValue)} detail={`As of ${formatAsOf(data.asOf)}`} />
              <Tile label="Unrealised profit / loss" value={`${data.totals.unrealizedPL > 0 ? '+' : ''}${formatUsd(data.totals.unrealizedPL)}`} detail={formatPercent(data.totals.unrealizedPLPercent)} tone={changeColor(data.totals.unrealizedPL)} />
              <Tile label="Cash available" value={formatUsd(data.cashBalance)} detail="Shared across all your accounts" />
            </>
          ) : (
            [0, 1, 2].map((item) => <div key={item} className="skeleton-block h-28" role={item === 0 ? 'status' : undefined} aria-label={item === 0 ? 'Loading totals' : undefined} />)
          )}
        </div>

        {empty ? (
          <section className="border border-dashed border-primary/25 bg-white p-8 text-center">
            <h2 className="font-display text-2xl font-bold">No investments in this account yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-primary/65">When you buy an option for this account, it shows up here with its value and profit or loss.</p>
            <Link href={`${overviewHref}/create`} className={`mt-5 inline-flex min-h-11 items-center gap-2 bg-accent px-5 text-sm font-semibold text-primary hover:bg-accent/90 ${focusRing}`}><Sparkles className="h-4 w-4" aria-hidden /> Explore options</Link>
          </section>
        ) : (
          <>
            <section className="border border-primary/10 bg-white p-5 sm:p-7" aria-labelledby="history-title">
              <h2 id="history-title" className="font-display text-2xl font-bold">Value over time</h2>
              <div className="mt-4"><PriceChart label="Holdings value" load={loadHistory} initialRange="3M" reloadKey={changes} /></div>
            </section>

            <section className="border border-primary/10 bg-white p-5 sm:p-7" aria-labelledby="allocation-title">
              <h2 id="allocation-title" className="font-display text-2xl font-bold">Allocation by area</h2>
              {data ? (
                <ul className="mt-4 space-y-3">
                  {allocation.map((item) => (
                    <li key={item.area}>
                      <div className="flex justify-between gap-4 text-sm"><span className="font-semibold">{item.area}</span><span>{formatPercent(item.weight, { signed: false })}</span></div>
                      <div className="mt-1.5 h-2.5 bg-light-surface" role="img" aria-label={`${item.area}: ${formatPercent(item.weight, { signed: false })}`}><div className="h-full bg-secondary" style={{ width: `${Math.min(100, item.weight)}%` }} /></div>
                    </li>
                  ))}
                </ul>
              ) : <div className="skeleton-block mt-4 h-24" />}
            </section>

            <section className="border border-primary/10 bg-white p-5 sm:p-7" aria-labelledby="holdings-title">
              <h2 id="holdings-title" className="font-display text-2xl font-bold">Holdings</h2>
              {data ? (
                <div className="relative mt-4 overflow-x-auto">
                  <table className="w-full min-w-205 text-left text-sm">
                    <thead>
                      <tr className="border-b border-primary/15 text-secondary">
                        {['Symbol', 'Area', 'Quantity', 'Avg cost', 'Price', 'Value', 'Profit / loss', 'Weight', ''].map((label, index) => <th key={label || index} className={`pb-3 pr-4 font-semibold ${index >= 2 && index <= 7 ? 'text-right' : ''}`}>{label || <span className="sr-only">Actions</span>}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {data.holdings.map((holding) => (
                        <tr key={holding.symbol} className="border-b border-primary/10 last:border-0">
                          <td className="py-3 pr-4">
                            <Link href={`/products/${encodeURIComponent(holding.symbol)}?account=${encodeURIComponent(accountState.account.id)}`} className={`font-semibold hover:underline ${focusRing}`}>
                              <span className="font-mono">{holding.symbol}</span><span className="block text-xs font-normal text-primary/60">{holding.name}</span>
                            </Link>
                          </td>
                          <td className="py-3 pr-4">{holding.area}</td>
                          <td className="py-3 pr-4 text-right">{formatQuantity(holding.quantity)}</td>
                          <td className="py-3 pr-4 text-right">{formatUsd(holding.avgCost)}</td>
                          <td className="py-3 pr-4 text-right">{formatUsd(holding.currentPrice)}</td>
                          <td className="py-3 pr-4 text-right font-semibold">{formatUsd(holding.marketValue)}</td>
                          <td className={`py-3 pr-4 text-right font-semibold ${changeColor(holding.unrealizedPL)}`}>{holding.unrealizedPL > 0 ? '+' : ''}{formatUsd(holding.unrealizedPL)}<span className="block text-xs">{formatPercent(holding.unrealizedPLPercent)}</span></td>
                          <td className="py-3 pr-4 text-right">{formatPercent(holding.weightPercent, { signed: false })}</td>
                          <td className="py-3 text-right">
                            <button type="button" onClick={() => setSelling({ symbol: holding.symbol, name: holding.name, currentPrice: holding.currentPrice, asOf: data.asOf })} className={`min-h-11 border border-primary/25 px-3 text-sm font-semibold hover:bg-primary/5 ${focusRing}`}>Sell</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div className="skeleton-block mt-4 h-32" />}
            </section>
          </>
        )}

        <section className="border border-primary/10 bg-white p-5 sm:p-7" aria-labelledby="orders-title">
          <h2 id="orders-title" className="font-display text-2xl font-bold">Order history</h2>
          {cancelError && <p role="alert" className="mt-3 text-sm text-risk">{cancelError}</p>}
          {orders.status === 'loading' ? (
            <div className="skeleton-block mt-4 h-24" role="status" aria-label="Loading orders" />
          ) : orders.status === 'error' ? (
            <p role="alert" className="mt-4 text-sm text-risk">{orders.message}</p>
          ) : orders.data.length === 0 ? (
            <p className="mt-4 text-sm text-primary/65">No orders for this account yet.</p>
          ) : (
            <div className="relative mt-4 overflow-x-auto">
              <table className="w-full min-w-150 text-left text-sm">
                <thead>
                  <tr className="border-b border-primary/15 text-secondary">
                    {['Date', 'Side', 'Symbol', 'Quantity', 'Filled price', 'Total', 'Status'].map((label, index) => <th key={label} className={`pb-3 pr-4 font-semibold ${index >= 3 && index <= 5 ? 'text-right' : ''}`}>{label}</th>)}
                    <th className="pb-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.data.map((order) => (
                    <tr key={order.orderId} className="border-b border-primary/10 last:border-0">
                      <td className="py-3 pr-4">{formatAsOf(order.createdAt)}</td>
                      <td className="py-3 pr-4 capitalize">{order.side}</td>
                      <td className="py-3 pr-4 font-mono">{order.symbol}</td>
                      <td className="py-3 pr-4 text-right">{formatQuantity(order.quantity)}</td>
                      <td className="py-3 pr-4 text-right">{formatUsd(order.filledPrice)}</td>
                      <td className="py-3 pr-4 text-right font-semibold">{formatUsd(order.total)}</td>
                      <td className="py-3 pr-4 capitalize">{order.status}</td>
                      <td className="py-3 text-right">
                        {order.status === 'pending' && (
                          <button type="button" disabled={cancelling === order.orderId} onClick={() => void cancel(order.orderId)} className={`min-h-11 border border-primary/25 px-3 text-sm font-semibold hover:bg-primary/5 disabled:opacity-40 ${focusRing}`}>Cancel</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="text-xs leading-5 text-primary/50">Simulated prices from a prototype bank, for education only. Past results do not predict future returns. This is not financial advice.</p>
      </main>

      {selling && (
        <OrderDialog product={selling} side="sell" accountRef={accountState.account.id} accountName={accountState.account.accountName} onClose={() => setSelling(null)} />
      )}
    </div>
  );
}
