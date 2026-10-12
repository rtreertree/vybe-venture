'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BriefcaseBusiness, CircleUserRound, MessageCircle, Plus, Settings2 } from 'lucide-react';
import {
  DashboardFilters,
  DashboardHeatmap,
  DashboardSection,
  DashboardSelectButton,
  DashboardMetrics,
  DashboardMovers,
  DashboardNewsItem,
  DashboardPortfolioStatus,
  DashboardRanking,
  DashboardSegmentedControl,
  DashboardTrendChart,
  DashboardValuationTable,
  dashboardClass,
} from '../../components/dashboard-components';
import { accountSlug, readAccounts, type AccountRecord } from '../../libs/account-client';
import { MOVER_TABS, REGIONS, SECTORS, type DashboardRegion, type TimeRange } from '../../libs/dashboard-data';

const VALUATION_COLUMNS = ['Sector', 'P/E Ratio', 'Div. Yield', 'YTD', '1-Year', 'Weight'];
const NEWS_DISPLAY_COUNT = 6;
const ACTIVE_PORTFOLIO_KEY = 'dashboard_active_portfolio';
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

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Page() {
  const range: TimeRange = '3M';
  const [movers, setMovers] = useState<(typeof MOVER_TABS)[number]>('Gainers');
  const [region, setRegion] = useState<DashboardRegion>('Global');
  const [comparedSector, setComparedSector] = useState('Technology');
  const [sortDescending, setSortDescending] = useState(true);
  const [marketData, setMarketData] = useState<MarketState>({ status: 'loading' });
  const [portfolios, setPortfolios] = useState<AccountRecord[]>([]);
  const [activePortfolioId, setActivePortfolioId] = useState<string | null>(null);
  const [portfolioError, setPortfolioError] = useState('');

  useEffect(() => {
    const syncPortfolios = () => {
      try {
        const result = readAccounts();
        if (!result.ok) {
          setPortfolioError(result.message);
          return;
        }

        const savedId = window.localStorage.getItem(ACTIVE_PORTFOLIO_KEY);
        const active = result.accounts.find((portfolio) => portfolio.id === savedId) ?? result.accounts[0] ?? null;
        setPortfolios(result.accounts);
        setActivePortfolioId(active?.id ?? null);
        if (active && active.id !== savedId) window.localStorage.setItem(ACTIVE_PORTFOLIO_KEY, active.id);
        setPortfolioError('');
      } catch {
        setPortfolioError('Portfolio data could not be read from this device.');
      }
    };

    syncPortfolios();
    window.addEventListener('storage', syncPortfolios);
    return () => window.removeEventListener('storage', syncPortfolios);
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
  const performanceSectors = [...SECTORS].sort((a, b) => (getSectorReturn(b) ?? -Infinity) - (getSectorReturn(a) ?? -Infinity));
  const sortedSectors = sortDescending ? performanceSectors : [...performanceSectors].reverse();
  const availableSectors = SECTORS.filter((sector) => getSectorReturn(sector) !== null);
  const topSector = performanceSectors.find((sector) => getSectorReturn(sector) !== null) ?? SECTORS[0];
  const weakestSector = [...performanceSectors].reverse().find((sector) => getSectorReturn(sector) !== null) ?? SECTORS[0];
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
  const selectedSector = SECTORS.find((sector) => sector.name === comparedSector) ?? topSector;
  const selectedSectorReturn = getSectorReturn(selectedSector);
  const sectorTrendPath = makeTrendPath(getSectorSeries(selectedSector.name), range);
  const maxSectorReturn = Math.max(0.01, ...availableSectors.map((sector) => Math.abs(getSectorReturn(sector) ?? 0)));
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
  const activePortfolio = portfolios.find((portfolio) => portfolio.id === activePortfolioId) ?? null;

  return (
    <div className={dashboardClass('dashboard')}>
      <main className={dashboardClass('main')}>
          <section className={dashboardClass('portfolio-bar')} aria-label="Portfolio selector" data-reveal="panel">
            <div className={dashboardClass('portfolio-bar__identity')}>
              <span className={dashboardClass('portfolio-bar__icon')}><BriefcaseBusiness size={18} aria-hidden="true" /></span>
              <div className={dashboardClass('portfolio-bar__details')}>
                <label className={dashboardClass('portfolio-bar__label')} htmlFor="active-portfolio">Current portfolio</label>
                <select
                  id="active-portfolio"
                  className={dashboardClass('portfolio-bar__select')}
                  value={activePortfolioId ?? ''}
                  disabled={portfolios.length === 0}
                  onChange={(event) => {
                    const nextId = event.target.value;
                    setActivePortfolioId(nextId);
                    try {
                      window.localStorage.setItem(ACTIVE_PORTFOLIO_KEY, nextId);
                      setPortfolioError('');
                    } catch {
                      setPortfolioError('Your selected portfolio could not be saved on this device.');
                    }
                  }}
                >
                  {portfolios.length === 0 && <option value="">No portfolios yet</option>}
                  {portfolios.map((portfolio) => <option key={portfolio.id} value={portfolio.id}>{portfolio.accountName}</option>)}
                </select>
                {activePortfolio && <span className={dashboardClass('portfolio-bar__goal')}>{activePortfolio.goal}</span>}
              </div>
            </div>
            <div className={dashboardClass('portfolio-bar__actions')}>
              <button
                type="button"
                className={dashboardClass('portfolio-bar__icon-button')}
                aria-label="Portfolio settings, coming soon"
                title="Settings coming soon"
                disabled
              ><Settings2 size={17} aria-hidden="true" /></button>
              {activePortfolio && <>
                <Link className={dashboardClass('portfolio-bar__primary')} href={`/consult?account=${encodeURIComponent(activePortfolio.id)}`}>
                  <MessageCircle size={16} aria-hidden="true" /> <span>Consult</span>
                </Link>
                <Link className={dashboardClass('portfolio-bar__secondary')} href={`/account/${encodeURIComponent(accountSlug(activePortfolio.accountName, activePortfolio.id))}/create`}>
                  <CircleUserRound size={16} aria-hidden="true" /> <span>Account</span>
                </Link>
              </>}
              <Link className={dashboardClass('portfolio-bar__secondary')} href="/account/register?new=1">
                <Plus size={16} aria-hidden="true" /> <span>New portfolio</span>
              </Link>
            </div>
            {portfolioError && <p className={dashboardClass('portfolio-bar__error')} role="alert">{portfolioError}</p>}
          </section>

          <DashboardFilters
            region={region}
            onRegionChange={(value) => setRegion(value as DashboardRegion)}
            regions={REGIONS}
            marketStatus={marketData.status === 'loading' ? 'Loading market data...' : marketData.status === 'unavailable' || !marketSeries ? 'Market data unavailable' : 'Latest daily close'}
            lastUpdated={marketSeries?.regularMarketTime ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(marketSeries.regularMarketTime * 1000)) : '—'}
          />
          <p className={dashboardClass('filters__status')}>Live daily prices, index and sector ETF proxies, and headlines via Yahoo Finance · Five-minute cache · Demo feed, not licensed for commercial display</p>

          {/* ============ NEWS & RESEARCH ============ */}
          <DashboardSection id="news-h" variant="plain" title="News & Research" description="Current headlines retrieved from Yahoo Finance. Portfolio-specific AI analysis requires actual holdings.">
            <DashboardPortfolioStatus label="Portfolio focus" status="No portfolio holdings connected" badge="Portfolio data required" ariaLabel="AI portfolio summary placeholder" />
            {marketData.status === 'ready' ? marketData.data.news.slice(0, NEWS_DISPLAY_COUNT).map((item) => (
              <DashboardNewsItem key={item.link} item={{
                ...item,
                publishedAt: item.publishedAt ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.publishedAt * 1000)) : 'Publication time not provided',
              }} />
            )) : <p className="filters__status">{marketData.status === 'loading' ? 'Loading live headlines...' : 'Live headlines are currently unavailable.'}</p>}
          </DashboardSection>

          {/* ============ KEY METRICS ============ */}
          <DashboardSection id="kpi-h" variant="plain" title="Key Metrics" description="Calculated from live index and sector ETF daily closes. Sector ETFs are proxies, not official sector indexes.">
            <DashboardMetrics items={[
              { label: 'Market Return', value: formatMaybeReturn(marketReturn), note: `${selectedIndex.name} over ${getRangeLabel(range)}.` },
              { label: 'Top Sector Proxy', value: formatMaybeReturn(getSectorReturn(topSector)), note: `${topSector.name} ETF proxy.` },
              { label: 'Weakest Sector Proxy', value: formatMaybeReturn(getSectorReturn(weakestSector)), note: `${weakestSector.name} ETF proxy.` },
              { label: 'Market Breadth', value: marketData.status === 'ready' ? `${advancingCount} / ${availableSectors.length}` : '—', note: 'Available sector ETF proxies with positive returns.' },
            ]} />
          </DashboardSection>

          {/* ============ PERFORMANCE TREND ============ */}
          <DashboardSection id="trend-h" title="Performance Trend" description="Daily close history for the selected benchmark and a sector ETF proxy.">
            <DashboardSelectButton label="Compare with" value={selectedSector.name} options={SECTORS.map((sector) => sector.name)} onChange={setComparedSector} />
            <DashboardTrendChart
              label={`${selectedIndex.name} and ${selectedSector.name} daily price history`}
              axisLabels={[`${getRangeLabel(range)} start`, 'Mid-period', 'Latest']}
              series={[
                { label: `${selectedIndex.name} ${formatMaybeReturn(marketReturn)}`, path: trendPath, color: 'var(--midnight-ink)' },
                { label: `${selectedSector.name} ETF ${formatMaybeReturn(selectedSectorReturn)}`, path: sectorTrendPath, color: 'var(--electric-tangerine)', dashed: true },
              ]}
            />
          </DashboardSection>

          {/* ============ SECTOR HEATMAP ============ */}
          <DashboardSection id="heat-h" title="Sector Heatmap" description="Sector ETF proxy return over the selected period. Tile area does not represent market weight.">
            <DashboardHeatmap tiles={heatmapTiles} />
          </DashboardSection>

          {/* ============ SECTOR RANKING ============ */}
          <DashboardSection id="rank-h" tight title="Sector Ranking" description="Available sector ETF proxies sorted by actual return over the selected period."
            action={<button type="button" className={dashboardClass('link-btn')} aria-label={`Sort ${sortDescending ? 'ascending' : 'descending'}`} onClick={() => setSortDescending((descending) => !descending)}>Sort: {sortDescending ? 'Best first' : 'Worst first'}</button>}>
            <DashboardRanking items={sortedSectors.map((sector) => ({
              name: sector.name,
              value: formatMaybeReturn(getSectorReturn(sector)),
              magnitude: (Math.abs(getSectorReturn(sector) ?? 0) / maxSectorReturn) * 100,
            }))} />
          </DashboardSection>

          {/* ============ TOP MOVERS ============ */}
          <DashboardSection id="mov-h" title="Tracked Stocks" description="Latest available daily close, calculated daily change, and volume for tracked stocks. The tabs sort this fixed list; they are not full-market movers.">
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

          {/* ============ VALUATION SNAPSHOT ============ */}
          <DashboardSection id="val-h" title="Valuation Snapshot" description="The live quote feed does not supply sector valuation ratios or weights; unavailable fields are left blank rather than estimated.">
            <DashboardValuationTable
              columns={VALUATION_COLUMNS}
              rows={SECTORS.slice(0, 6).map((sector) => ({
                sector: sector.name,
                values: ['—', '—', formatMaybeReturn(getSectorReturn(sector)), formatMaybeReturn(seriesReturn(getSectorSeries(sector.name), '1Y')), '—'],
              }))}
            />
          </DashboardSection>

          {/* ============ CLIENT EXPOSURE ============ */}
          <DashboardSection id="exp-h" tight title="Client Exposure vs. Benchmark" description="Connect a real portfolio before displaying client exposure. No holdings are currently connected.">
            <DashboardPortfolioStatus label="Portfolio holdings" status="No client portfolio data connected" badge="Unavailable" />
            <div className={dashboardClass('legend')}>
              <span className={dashboardClass('legend__item')}><span className={dashboardClass('swatch', 'swatch--bar')} style={{ background: 'var(--navy)' }} />Client</span>
              <span className={dashboardClass('legend__item')}><span className={dashboardClass('swatch', 'swatch--bar')} style={{ background: 'var(--bar-light)' }} />Benchmark weight source unavailable</span>
            </div>
            <p className={dashboardClass('filters__status')}>Load a client portfolio and a licensed benchmark constituent-weight source to calculate exposure. No exposure is estimated here.</p>
          </DashboardSection>

          {/* ============ ADVISOR INSIGHTS ============ */}
          <DashboardSection id="adv-h" variant="plain" title="Advisor Insights" description="Calculated from live sector ETF proxy returns; not investment advice.">
            {availableSectors.length > 0 ? <>
              <div className={dashboardClass('insight')}><span className={dashboardClass('chip', 'chip--up')}>Strongest proxy</span><p>{topSector.name} ETF: {formatMaybeReturn(getSectorReturn(topSector))} over {getRangeLabel(range)}.</p></div>
              <div className={dashboardClass('insight')}><span className={dashboardClass('chip', 'chip--down')}>Weakest proxy</span><p>{weakestSector.name} ETF: {formatMaybeReturn(getSectorReturn(weakestSector))} over {getRangeLabel(range)}.</p></div>
              <div className={dashboardClass('insight')}><span className={dashboardClass('chip', 'chip--info')}>Portfolio</span><p>Connect real holdings to generate client-specific exposure insights.</p></div>
            </> : <div className={dashboardClass('insight')}><span className={dashboardClass('chip', 'chip--info')}>Live data unavailable</span><p>Sector insights will appear when the market data source responds.</p></div>}
          </DashboardSection>

          <footer className={dashboardClass('foot')} data-reveal="status">
            Market data and headlines are fetched through an unofficial Yahoo Finance endpoint for non-commercial demo use, may be delayed or unavailable, and are not licensed here for commercial redistribution. Sector funds are proxies rather than index constituents. Valuations, benchmark weights, and client exposures require data sources and holdings that are not connected. Not investment advice.
          </footer>
        </main>
      </div>
  );
}
