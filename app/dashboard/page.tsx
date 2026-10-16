'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, BriefcaseBusiness, ExternalLink, Plus, RefreshCw, Sparkles } from 'lucide-react';
import {
  DashboardFilters,
  DashboardHeatmap,
  DashboardSection,
  DashboardSelectButton,
  DashboardMetrics,
  DashboardNewsItem,
  DashboardMovers,
  DashboardSegmentedControl,
  DashboardTrendChart,
  dashboardClass,
} from '../../components/dashboard-components';
import { accountSlug, readAccounts, type AccountRecord } from '../../libs/account-client';
import { MOVER_TABS, REGIONS, SECTORS, type DashboardRegion, type TimeRange } from '../../libs/dashboard-data';

const NEWS_DISPLAY_COUNT = 4;
const SECTOR_SYMBOLS: Record<string, string> = {
  Technology: 'XLK',
  Financials: 'XLF',
  Healthcare: 'XLV',
  'Consumer Cyclical': 'XLY',
  Industrials: 'XLI',
  Communication: 'XLC',
  Staples: 'XLP',
  Energy: 'XLE',
  Utilities: 'XLU',
  'Real Estate': 'XLRE',
  'Basic Materials': 'XLB',
};
const INDEX_SYMBOLS: Record<DashboardRegion, { symbol: string; name: string }> = {
  Global: { symbol: 'ACWI', name: 'MSCI ACWI ETF proxy' },
  'North America': { symbol: '^GSPC', name: 'S&P 500' },
  Europe: { symbol: '^STOXX50E', name: 'EURO STOXX 50' },
  'Asia-Pacific': { symbol: '^N225', name: 'Nikkei 225' },
};
const STOCK_DETAILS: Record<string, { name: string; sector: string }> = {
  NVDA: { name: 'NVIDIA', sector: 'Technology' },
  TSLA: { name: 'Tesla', sector: 'Consumer Cyclical' },
  PLTR: { name: 'Palantir Technologies', sector: 'Technology' },
  AMD: { name: 'Advanced Micro Devices', sector: 'Technology' },
  NKE: { name: 'Nike', sector: 'Consumer Cyclical' },
  INTC: { name: 'Intel', sector: 'Technology' },
  BA: { name: 'Boeing', sector: 'Industrials' },
  CVS: { name: 'CVS Health', sector: 'Healthcare' },
  AAPL: { name: 'Apple', sector: 'Technology' },
};
const STOCK_SYMBOLS = Object.keys(STOCK_DETAILS);
type MarketSeries = {
  symbol: string;
  name: string | null;
  regularMarketPrice: number | null;
  regularMarketTime: number | null;
  timestamps: number[];
  closes: Array<number | null>;
  volumes: Array<number | null>;
};
type MarketPayload = {
  symbols: Record<string, MarketSeries | null>;
  news: Array<{
    title: string;
    publisher: string;
    link: string;
    publishedAt: number | null;
    image: string | null;
  }>;
};
type MarketState =
  | { status: 'loading' }
  | { status: 'ready'; data: MarketPayload }
  | { status: 'unavailable' };
type EconomicBrief = {
  summary: string;
  keyDevelopments: string[];
  sources: Array<{ title: string; url: string }>;
  generatedAt: string;
};
type EconomicBriefState = {
  data: EconomicBrief | null;
  loading: boolean;
  refreshing: boolean;
  error: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBriefPointList(value: unknown): value is string[] {
  return Array.isArray(value) &&
    value.length >= 3 &&
    value.every((item) => typeof item === 'string' && item.trim().length > 0);
}

function parseEconomicBrief(value: unknown): EconomicBrief | null {
  if (!isRecord(value)) return null;
  const brief = value;
  if (
    typeof brief.summary !== 'string'
    || !brief.summary.trim()
    || !isBriefPointList(brief.keyDevelopments)
    || !Array.isArray(brief.sources)
    || brief.sources.length === 0
    || typeof brief.generatedAt !== 'string'
    || Number.isNaN(new Date(brief.generatedAt).getTime())
  ) return null;

  const sources = brief.sources.flatMap((source) => {
    if (!isRecord(source) || typeof source.title !== 'string' || typeof source.url !== 'string') return [];
    try {
      const parsedUrl = new URL(source.url);
      return parsedUrl.protocol === 'https:'
        ? [{ title: source.title, url: parsedUrl.href }]
        : [];
    } catch {
      return [];
    }
  });
  if (sources.length === 0) return null;

  return {
    summary: brief.summary,
    keyDevelopments: brief.keyDevelopments,
    sources,
    generatedAt: brief.generatedAt,
  };
}

function formatBriefTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Time unavailable'
    : new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function formatReturn(value: number) {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function formatMaybeReturn(value: number | null) {
  return value === null ? 'N/A' : formatReturn(value);
}

function getTone(value: number): 'up' | 'down' | 'flat' {
  return value > 0.05 ? 'up' : value < -0.05 ? 'down' : 'flat';
}

function getRangePeriod(range: TimeRange | 'daily') {
  switch (range) {
    case 'daily': return 1;
    case '3M': return 63;
    case 'YTD': return null;
    case '1Y': return 252;
    case '5Y': return 1260;
  }
}

function getRangeLabel(range: TimeRange) {
  switch (range) {
    case '3M': return '3 months';
    case 'YTD': return 'year to date';
    case '1Y': return '1 year';
    case '5Y': return '5 years';
  }
}

function seriesReturn(
  series: MarketSeries | null | undefined,
  range: TimeRange | 'daily',
) {
  if (!series) return null;

  const observations = series.closes.flatMap((close, index) => {
    const timestamp = series.timestamps[index];
    return typeof close === 'number' && Number.isFinite(close) && typeof timestamp === 'number'
      ? [{ close, timestamp }]
      : [];
  });
  if (observations.length < 2) return null;

  const latest = observations[observations.length - 1];
  const yearStartIndex = range === 'YTD'
    ? observations.findIndex((item) => new Date(item.timestamp * 1000).getUTCFullYear() === new Date().getUTCFullYear())
    : -1;
  if (range === 'YTD' && yearStartIndex < 0) return null;
  const startIndex = range === 'YTD'
    ? Math.max(0, yearStartIndex - 1)
    : Math.max(0, observations.length - Math.min(getRangePeriod(range)!, observations.length - 1) - 1);
  const from = observations[startIndex].close;
  return from > 0 ? ((latest.close - from) / from) * 100 : null;
}

function makeTrendPath(series: MarketSeries | null | undefined, range: TimeRange) {
  if (!series) return '';
  const values = series.closes.flatMap((close, index) => {
    const timestamp = series.timestamps[index];
    return typeof close === 'number' && Number.isFinite(close) && typeof timestamp === 'number'
      ? [{ close, timestamp }]
      : [];
  });
  if (values.length < 2) return '';

  const yearStartIndex = range === 'YTD'
    ? values.findIndex((item) => new Date(item.timestamp * 1000).getUTCFullYear() === new Date().getUTCFullYear())
    : -1;
  if (range === 'YTD' && yearStartIndex < 0) return '';
  const startIndex = range === 'YTD'
    ? Math.max(0, yearStartIndex)
    : Math.max(0, values.length - Math.min(getRangePeriod(range)!, values.length));
  const visible = values.slice(startIndex);
  const prices = visible.map((item) => item.close);
  const minimum = Math.min(...prices);
  const span = Math.max(...prices) - minimum || 1;
  return prices.map((value, index) => {
    const x = (index / (visible.length - 1)) * 326;
    const y = 140 - ((value - minimum) / span) * 120;
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
}

export default function Page() {
  const range: TimeRange = '3M';
  const [movers, setMovers] = useState<(typeof MOVER_TABS)[number]>('Gainers');
  const [region, setRegion] = useState<DashboardRegion>('Global');
  const [comparedSector, setComparedSector] = useState('Technology');
  const [marketData, setMarketData] = useState<MarketState>({ status: 'loading' });
  const [portfolios, setPortfolios] = useState<AccountRecord[]>([]);
  const [portfolioError, setPortfolioError] = useState('');
  const [portfoliosLoaded, setPortfoliosLoaded] = useState(false);
  const [economicBrief, setEconomicBrief] = useState<EconomicBriefState>({
    data: null,
    loading: true,
    refreshing: false,
    error: '',
  });
  const economicBriefRequest = useRef<AbortController | null>(null);

  const loadEconomicBrief = useCallback(async (forceRefresh = false) => {
    economicBriefRequest.current?.abort();
    const controller = new AbortController();
    economicBriefRequest.current = controller;
    setEconomicBrief((current) => ({
      ...current,
      loading: current.data === null,
      refreshing: current.data !== null,
      error: '',
    }));

    try {
      const endpoint = forceRefresh ? '/api/economic-brief?refresh=1' : '/api/economic-brief';
      const response = await fetch(endpoint, {
        signal: controller.signal,
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Economic brief request failed');
      const data = parseEconomicBrief(await response.json() as unknown);
      if (!data) throw new Error('Economic brief response was invalid');
      if (!controller.signal.aborted) {
        setEconomicBrief({ data, loading: false, refreshing: false, error: '' });
      }
    } catch {
      if (!controller.signal.aborted) {
        setEconomicBrief((current) => ({
          ...current,
          loading: false,
          refreshing: false,
          error: 'We could not load the global economic brief. The service may be temporarily unavailable. Try again.',
        }));
      }
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadEconomicBrief(); }, 0);
    return () => {
      window.clearTimeout(timer);
      economicBriefRequest.current?.abort();
    };
  }, [loadEconomicBrief]);

  useEffect(() => {
    const syncPortfolios = async () => {
      try {
        const result = await readAccounts();
        if (!result.ok) {
          setPortfolioError(result.message);
          setPortfoliosLoaded(true);
          return;
        }

        setPortfolios(result.accounts);
        setPortfolioError('');
        setPortfoliosLoaded(true);
      } catch {
        setPortfolioError('Portfolio data could not be loaded from the database.');
        setPortfoliosLoaded(true);
      }
    };

    void syncPortfolios();
    const refresh = () => { void syncPortfolios(); };
    window.addEventListener('account-data-changed', refresh);
    return () => window.removeEventListener('account-data-changed', refresh);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/market?withImages=1', { signal: controller.signal, cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('Market data request failed');
        return response.json() as Promise<MarketPayload>;
      })
      .then((data) => { if (!controller.signal.aborted) setMarketData({ status: 'ready', data }); })
      .catch(() => { if (!controller.signal.aborted) setMarketData({ status: 'unavailable' }); });
    return () => controller.abort();
  }, []);

  const liveSymbols = marketData.status === 'ready' ? marketData.data.symbols : {};
  const indexSelection = INDEX_SYMBOLS[region];
  const primaryMarketSeries = liveSymbols[indexSelection.symbol];
  const useNorthAmericaFallback = region === 'Global' && !primaryMarketSeries && Boolean(liveSymbols['^GSPC']);
  const marketSeries = primaryMarketSeries ?? (useNorthAmericaFallback ? liveSymbols['^GSPC'] : undefined);
  const selectedIndex = useNorthAmericaFallback
    ? { symbol: '^GSPC', name: 'S&P 500 (fallback)' }
    : indexSelection;
  const getSectorSeries = (name: string) => liveSymbols[SECTOR_SYMBOLS[name]];
  const getSectorReturn = (sector: (typeof SECTORS)[number]) => seriesReturn(getSectorSeries(sector.name), range);
  const availableSectors = SECTORS.filter((sector) => getSectorReturn(sector) !== null);
  const advancingCount = availableSectors.filter((sector) => (getSectorReturn(sector) ?? 0) > 0).length;
  const marketReturn = seriesReturn(marketSeries, range);
  const availableStockRows = STOCK_SYMBOLS.map((symbol) => {
    const series = liveSymbols[symbol];
    const details = STOCK_DETAILS[symbol];
    const volume = series?.volumes
      .filter((value): value is number => typeof value === 'number')
      .at(-1) ?? null;

    return {
      ...details,
      ticker: symbol,
      price: series?.regularMarketPrice ?? null,
      change: seriesReturn(series, 'daily'),
      volume,
    };
  }).filter((stock) => stock.price !== null);
  const selectedMovers = [...availableStockRows]
    .sort((left, right) => {
      if (movers === 'Losers') return (left.change ?? 0) - (right.change ?? 0);
      if (movers === 'Most Active') return (right.volume ?? 0) - (left.volume ?? 0);
      return (right.change ?? 0) - (left.change ?? 0);
    })
    .slice(0, 4);
  const trendPath = makeTrendPath(marketSeries, range);
  const selectedSector = SECTORS.find((sector) => sector.name === comparedSector) ?? SECTORS[0];
  const sectorTrendPath = makeTrendPath(getSectorSeries(selectedSector.name), range);
  const heatmapTiles = SECTORS.map((sector) => {
    const sectorReturn = getSectorReturn(sector);
    return {
      name: sector.name,
      tone: sectorReturn === null ? 'flat' as const : getTone(sectorReturn),
      change: sectorReturn === null ? 'N/A' : formatReturn(sectorReturn),
      selected: comparedSector === sector.name,
      onClick: () => setComparedSector(sector.name),
    };
  });
  return (
    <div className={dashboardClass('dashboard')}>
      <header className={dashboardClass('header')}>
        <div className={dashboardClass('header__inner')}>
          <Link className={dashboardClass('wordmark')} href="/" aria-label={`${process.env.NEXT_PUBLIC_APP_NAME} home` || "CAN'T LOAD ENV"}>
           {process.env.NEXT_PUBLIC_APP_NAME || "CAN'T LOAD ENV"}<span aria-hidden="true">.</span>
          </Link>
          <nav className={dashboardClass('nav')} aria-label="Dashboard sections">
            <a href="#accounts-section">Your accounts</a>
            <a href="#economic-brief-section">Economic brief</a>
            <a href="#kpi-h-section">Market snapshot</a>
            <a href="#news-h-section">Market news</a>
          </nav>
          <Link className={dashboardClass('header__label')} href="/access?switch=1">Account code</Link>
        </div>
      </header>
      <main className={dashboardClass('main')}>
          <section className={dashboardClass('dashboard-intro')} data-reveal="panel">
            <p className={dashboardClass('dashboard-intro__eyebrow')}>Your financial overview</p>
            <h1 className={dashboardClass('dashboard-intro__title')}>Your money, in clearer view.</h1>
            <p className={dashboardClass('dashboard-intro__description')}>
              Keep your goals close and the wider market in perspective.
            </p>
          </section>

          <section
            id="economic-brief-section"
            className={dashboardClass('economic-brief')}
            aria-labelledby="economic-brief-heading"
            aria-busy={economicBrief.loading || economicBrief.refreshing}
            data-reveal="panel"
          >
            <div className={dashboardClass('economic-brief__header')}>
              <div className={dashboardClass('economic-brief__heading')}>
                <span className={dashboardClass('economic-brief__icon')} aria-hidden="true"><Sparkles size={18} /></span>
                <div>
                  <p className={dashboardClass('economic-brief__eyebrow')}>Global markets · Executive brief</p>
                  <h2 id="economic-brief-heading">The global economy, in brief</h2>
                </div>
              </div>
              <button
                type="button"
                className={dashboardClass('economic-brief__refresh')}
                onClick={() => void loadEconomicBrief(true)}
                disabled={economicBrief.loading || economicBrief.refreshing}
                aria-label={economicBrief.refreshing ? 'Refreshing economic brief' : 'Refresh economic brief'}
              >
                <RefreshCw
                  size={15}
                  aria-hidden="true"
                  className={dashboardClass(economicBrief.refreshing && 'economic-brief__refresh-icon')}
                />
                <span>{economicBrief.refreshing ? 'Refreshing' : 'Refresh'}</span>
              </button>
            </div>

            <div className={dashboardClass('economic-brief__labels')}>
              <span className={dashboardClass('economic-brief__ai-label')}><Sparkles size={13} aria-hidden="true" /> AI-generated</span>
              <span className={dashboardClass('economic-brief__disclaimer')}>Informational only · Not financial advice</span>
            </div>

            {economicBrief.loading ? (
              <p className={dashboardClass('economic-brief__message')} role="status" aria-live="polite">
                <span className={dashboardClass('economic-brief__loader')} aria-hidden="true" />
                Loading the latest global economic brief…
              </p>
            ) : null}

            {economicBrief.error ? (
              economicBrief.data ? (
                <p className={dashboardClass('economic-brief__error')} role="alert">
                  <AlertCircle size={16} aria-hidden="true" />
                  {economicBrief.error} The last available brief is shown below.
                </p>
              ) : (
                <div className={dashboardClass('economic-brief__message', 'economic-brief__message--error')} role="alert">
                  <AlertCircle size={18} aria-hidden="true" />
                  <div>
                    <p>{economicBrief.error}</p>
                    <button type="button" className={dashboardClass('economic-brief__retry')} onClick={() => void loadEconomicBrief(true)}>
                      Try again
                    </button>
                  </div>
                </div>
              )
            ) : null}

            {economicBrief.data ? (
              <>
                {economicBrief.data.summary.trim() || economicBrief.data.keyDevelopments.length > 0 ? (
                  <div className={dashboardClass('economic-brief__content')}>
                    {economicBrief.data.summary.trim() ? (
                      <p className={dashboardClass('economic-brief__summary')}>{economicBrief.data.summary}</p>
                    ) : null}
                    {economicBrief.data.keyDevelopments.length > 0 ? (
                      <div className={dashboardClass('economic-brief__developments')}>
                        <h3>Key developments</h3>
                        <ul>
                          {economicBrief.data.keyDevelopments.map((development, index) => (
                            <li key={`${index}-${development}`}>{development}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className={dashboardClass('economic-brief__empty')} role="status">
                    No global economic updates are available right now. Refresh to check again.
                  </p>
                )}

                <div className={dashboardClass('economic-brief__footer')}>
                  <p className={dashboardClass('economic-brief__updated')}>
                    Generated <time dateTime={economicBrief.data.generatedAt}>{formatBriefTime(economicBrief.data.generatedAt)}</time>
                  </p>
                  {economicBrief.data.sources.length > 0 ? (
                    <div className={dashboardClass('economic-brief__sources')}>
                      <h3>Sources</h3>
                      <ul>
                        {economicBrief.data.sources.map((source, index) => (
                          <li key={`${source.url}-${index}`}>
                            <a href={source.url} target="_blank" rel="noreferrer">
                              <span>{source.title || source.url}</span>
                              <ExternalLink size={13} aria-hidden="true" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}
          </section>

          <section id="accounts-section" className={dashboardClass('accounts-panel')} aria-labelledby="accounts-heading" data-reveal="panel">
            <div className={dashboardClass('accounts-panel__header')}>
              <div>
                <h2 id="accounts-heading">Your accounts</h2>
              </div>
              <Link className={dashboardClass('accounts-panel__add')} href={portfolios.length ? "/account/register?new=1" : "/question/register"}>
                <Plus size={16} aria-hidden="true" /> <span>{portfolios.length ? "Add account" : "Start setup"}</span>
              </Link>
            </div>
            {portfolios.length > 0 ? (
              <div className={dashboardClass('account-list')}>
                {portfolios.map((account) => {
                  return (
                    <Link
                      key={account.id}
                      className={dashboardClass('account-card')}
                      href={`/account/${encodeURIComponent(accountSlug(account.accountName, account.id))}`}
                      aria-label={`View ${account.accountName} account details`}
                    >
                      <span className={dashboardClass('account-card__body')}>
                        <span className={dashboardClass('account-card__name')}>{account.accountName}</span>
                        <span className={dashboardClass('account-card__goal')}>{account.goal}</span>
                      </span>
                      <span className={dashboardClass('account-card__end')}>
                        {account.planning.targetAmount
                          ? <span className={dashboardClass('account-card__target')}>{formatUsd(account.planning.targetAmount.amount)}</span>
                          : null}
                        <ArrowRight size={18} aria-hidden="true" />
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className={dashboardClass('accounts-empty')}>
                <span className={dashboardClass('accounts-empty__icon')}><BriefcaseBusiness size={20} aria-hidden="true" /></span>
                <div>
                  <h3>{portfoliosLoaded ? 'No accounts yet' : 'Loading your accounts…'}</h3>
                  <p>{portfolioError || (portfoliosLoaded ? 'Add an account to keep its goal and plan here.' : 'Your saved accounts will appear here.')}</p>
                </div>
              </div>
            )}
          </section>

          <DashboardFilters
            region={region}
            onRegionChange={(value) => setRegion(value as DashboardRegion)}
            regions={REGIONS}
            marketStatus={marketData.status === 'loading' ? 'Loading market data...' : marketData.status === 'unavailable' || !marketSeries ? 'Market data unavailable' : 'Latest daily close'}
            lastUpdated={marketSeries?.regularMarketTime ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(marketSeries.regularMarketTime * 1000)) : '—'}
          />
          {/* ============ MARKET SNAPSHOT ============ */}
          <DashboardSection id="kpi-h" variant="plain" title="Market snapshot" description={`${selectedIndex.name} and available sector ETF proxies.`}>
            <DashboardMetrics items={[
              { label: 'Market Return', value: formatMaybeReturn(marketReturn), note: `${selectedIndex.name} over ${getRangeLabel(range)}.` },
              { label: 'Market Breadth', value: marketData.status === 'ready' ? `${advancingCount} / ${availableSectors.length}` : '—', note: 'Available sector ETF proxies with positive returns.' },
            ]} />
          </DashboardSection>

          {/* ============ PERFORMANCE TREND ============ */}
          <DashboardSection id="trend-h" title="Performance" description="Compare the selected index with a sector ETF.">
            <DashboardSelectButton label="Compare with" value={selectedSector.name} options={SECTORS.map((sector) => sector.name)} onChange={setComparedSector} />
            <DashboardTrendChart
              label={`${selectedIndex.name} and ${selectedSector.name} daily price history`}
              axisLabels={[`${getRangeLabel(range)} start`, 'Mid-period', 'Latest']}
              series={[
                { label: selectedIndex.name, path: trendPath, color: 'var(--midnight-ink)' },
                { label: `${selectedSector.name} ETF`, path: sectorTrendPath, color: 'var(--electric-tangerine)', dashed: true },
              ]}
            />
          </DashboardSection>

          {/* ============ SECTOR HEATMAP ============ */}
          <DashboardSection id="heat-h" title="Sector performance" description="Three-month return by sector ETF proxy.">
            <DashboardHeatmap tiles={heatmapTiles} />
          </DashboardSection>

          {/* ============ TRACKED STOCKS ============ */}
          <DashboardSection id="mov-h" title="Tracked stocks" description="Daily price changes for this tracked list.">
            <DashboardSegmentedControl label="Mover type" options={MOVER_TABS} value={movers} onChange={(value) => setMovers(value as (typeof MOVER_TABS)[number])} />
            <DashboardMovers
              status={selectedMovers.length === 0 ? 'Tracked stock prices are currently unavailable.' : null}
              items={selectedMovers.map((company) => ({
                ticker: company.ticker,
                name: company.name,
                sector: company.sector,
                price: formatUsd(company.price!),
                change: formatMaybeReturn(company.change),
              }))}
            />
          </DashboardSection>

          {/* ============ MARKET NEWS ============ */}
          <DashboardSection id="news-h" variant="plain" title="Market news" description="Recent headlines from Yahoo Finance.">
            {marketData.status === 'ready' ? marketData.data.news.slice(0, NEWS_DISPLAY_COUNT).map((item) => (
              <DashboardNewsItem key={item.link} item={{
                ...item,
                publishedAt: item.publishedAt ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.publishedAt * 1000)) : 'Publication time not provided',
              }} />
            )) : <p className={dashboardClass('filters__status')}>{marketData.status === 'loading' ? 'Loading live headlines...' : 'Live headlines are currently unavailable.'}</p>}
          </DashboardSection>

          <footer className={dashboardClass('foot')} data-reveal="status">
            Market data and headlines use an unofficial Yahoo Finance feed for demo purposes; data may be delayed or unavailable. Sector funds are proxies, not official indexes. Not investment advice.
          </footer>
        </main>
      </div>
  );
}
