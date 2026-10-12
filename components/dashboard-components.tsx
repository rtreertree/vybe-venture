'use client';

import type { ReactNode } from 'react';
import styles from './dashboard-components.module.css';

const dashboardStyles = styles as Record<string, string>;

export function dashboardClass(...names: Array<string | false | undefined>) {
  return names.map((name) => name && (dashboardStyles[name] || name)).filter(Boolean).join(' ');
}

export type DashboardIconName = 'chevron';

const ICON_PATHS: Record<DashboardIconName, ReactNode> = {
  chevron: <path d="m6 9 6 6 6-6" />,
};

export function DashboardIcon({ name, size = 22 }: { name: DashboardIconName; size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {ICON_PATHS[name]}
    </svg>
  );
}

export function DashboardSelectButton({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className={dashboardClass('select')} data-reveal="select">
      <span className={dashboardClass('select__label')}><span className={dashboardClass('muted')}>{label}</span> ·</span>
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <DashboardIcon name="chevron" size={16} />
    </label>
  );
}

export function DashboardFilters({ marketStatus, lastUpdated }: {
  region: string;
  onRegionChange: (region: string) => void;
  marketStatus: string;
  lastUpdated: string;
  regions: readonly string[];
}) {
  return (
    <section aria-label="Filters" className={dashboardClass('filters')} data-reveal="panel">
      <div className={dashboardClass('filters__status')} data-reveal="status">Market status: {marketStatus} · Last updated: {lastUpdated}</div>
    </section>
  );
}

export function DashboardSection({ id, title, description, action, variant = 'card', tight = false, children }: {
  id: string;
  title: string;
  description: string;
  action?: ReactNode;
  variant?: 'card' | 'plain';
  tight?: boolean;
  children: ReactNode;
}) {
  const className = dashboardClass(variant === 'card' ? 'card' : 'plain', tight && variant === 'card' && 'card--tight');
  return (
    <section id={`${id}-section`} aria-labelledby={id} className={className} data-reveal={variant === 'card' ? 'panel' : 'panel-soft'}>
      <div className={dashboardClass('sec-head')} data-reveal="panel-header">
        <div>
          <h2 id={id}>{title}</h2>
          <p className={dashboardClass('sec-desc')}>{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function DashboardTile({ name, tone, change, size, wide, selected, onClick }: {
  name: string;
  tone: 'up' | 'down' | 'flat' | 'info';
  change: string;
  size?: 'sm' | 'xs';
  wide?: boolean;
  selected?: boolean;
  onClick?: () => void;
}) {
  const className = dashboardClass('tile', `tile--${tone}`, size ? `tile--${size}` : '', wide && 'tile--wide', selected && 'tile--selected');
  return (
    <button type="button" className={className} aria-pressed={selected} onClick={onClick} data-reveal="tile">
      <span>{name}</span>
      <span className={dashboardClass('tile__val', 'mono')}>{change}</span>
    </button>
  );
}

export type DashboardMetric = { label: string; value: string; note: string };

export function DashboardMetrics({ items }: { items: DashboardMetric[] }) {
  return (
    <div className={dashboardClass('kpis')} data-reveal="metric">
      {items.map((item) => (
        <div className={dashboardClass('kpi')} key={item.label} data-reveal="metric-item">
          <div className={dashboardClass('kpi__label')}>{item.label}</div>
          <div className={dashboardClass('kpi__value', 'mono')}>{item.value}</div>
          <div className={dashboardClass('kpi__note')}>{item.note}</div>
        </div>
      ))}
    </div>
  );
}

export type DashboardNewsItemData = {
  title: string;
  publisher: string;
  link: string;
  publishedAt: string;
  image: string | null;
};

export function DashboardNewsItem({ item }: { item: DashboardNewsItemData }) {
  return (
    <article className={dashboardClass('news')} data-reveal="news">
      <div className={dashboardClass('thumb')} aria-hidden="true">
        {item.image && <img className={dashboardClass('thumb__image')} src={`/api/market?image=${encodeURIComponent(item.image)}`} alt="" loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} />}
      </div>
      <div className={dashboardClass('news__body')}>
        <span className={dashboardClass('news__tag')}>{item.publisher}</span>
        <a className={dashboardClass('news__title')} href={item.link} target="_blank" rel="noreferrer">{item.title}</a>
        <span className={dashboardClass('news__summary')}>{item.publishedAt}</span>
      </div>
    </article>
  );
}

export function DashboardPortfolioStatus({ label, status, badge, ariaLabel }: {
  label: string;
  status: string;
  badge: string;
  ariaLabel?: string;
}) {
  return (
    <div className={dashboardClass('news-assistant')} aria-label={ariaLabel} data-reveal="status">
      <div className={dashboardClass('news-assistant__focus')}>
        <span className={dashboardClass('news-assistant__label')}>{label}</span>
        <span className={dashboardClass('news-assistant__sectors')}>{status}</span>
      </div>
      <span className={dashboardClass('chip', 'chip--info')}>{badge}</span>
    </div>
  );
}

export type DashboardChartSeries = { label: string; path: string; color: string; dashed?: boolean };

export function DashboardTrendChart({ label, axisLabels, series }: {
  label: string;
  axisLabels: [string, string, string];
  series: DashboardChartSeries[];
}) {
  return (
    <>
      <svg role="img" aria-label={label} viewBox="0 0 326 160" className={dashboardClass('chart')}>
        <g stroke="var(--line)" strokeWidth="1">
          <line x1="0" y1="20" x2="326" y2="20" /><line x1="0" y1="60" x2="326" y2="60" />
          <line x1="0" y1="100" x2="326" y2="100" /><line x1="0" y1="140" x2="326" y2="140" />
        </g>
        {series.filter((item) => item.path).map((item) => (
          <path
            key={item.label}
            d={item.path}
            fill="none"
            stroke={item.color}
            strokeWidth="2.5"
            className={dashboardClass('chart__line')}
            strokeDasharray={item.dashed ? '6 5' : undefined}
            strokeLinecap="round"
          />
        ))}
      </svg>
      <div className={dashboardClass('axis')}>{axisLabels.map((item) => <span key={item}>{item}</span>)}</div>
      <div className={dashboardClass('legend')}>
        {series.map((item) => (
          <span className={dashboardClass('legend__item')} key={item.label}>
            <svg aria-hidden="true" width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke={item.color} strokeWidth="3" strokeDasharray={item.dashed ? '5 3' : undefined} /></svg>
            {item.label}
          </span>
        ))}
      </div>
    </>
  );
}

export type DashboardHeatmapTile = {
  name: string;
  tone: 'up' | 'down' | 'flat' | 'info';
  change: string;
  onClick: () => void;
  selected: boolean;
};

export function DashboardHeatmap({ tiles }: { tiles: DashboardHeatmapTile[] }) {
  const byName = new Map(tiles.map((tile) => [tile.name, tile]));
  const renderTile = (name: string, size?: 'sm' | 'xs', wide = false) => {
    const tile = byName.get(name);
    return tile ? <DashboardTile key={name} {...tile} size={size} wide={wide} /> : null;
  };

  return (
    <>
      <div className={dashboardClass('heat')}>
        <div className={dashboardClass('heat__top')}>
          {renderTile('Technology')}
          <div className={dashboardClass('heat__stack')}>
            {renderTile('Financials')}
            {renderTile('Healthcare')}
          </div>
        </div>
        <div className={dashboardClass('heat__row')}>
          {renderTile('Consumer Cyclical', 'sm')}
          {renderTile('Industrials', 'sm')}
          {renderTile('Communication', 'sm')}
        </div>
        <div className={dashboardClass('heat__small')}>
          {renderTile('Staples', 'xs')}
          {renderTile('Energy', 'xs')}
          {renderTile('Utilities', 'xs')}
          {renderTile('Real Estate', 'xs')}
          {renderTile('Basic Materials', 'xs', true)}
        </div>
      </div>
      <div className={dashboardClass('heat-legend')}>
        <span className={dashboardClass('heat-legend__item')}><span className={dashboardClass('swatch')} style={{ background: 'var(--tint-down)' }} />Declining</span>
        <span className={dashboardClass('heat-legend__item')}><span className={dashboardClass('swatch')} style={{ background: 'var(--tint-flat)' }} />Flat</span>
        <span className={dashboardClass('heat-legend__item')}><span className={dashboardClass('swatch')} style={{ background: 'var(--tint-up)' }} />Advancing</span>
        <span className={dashboardClass('heat-legend__note')}>Live ETF proxy performance</span>
      </div>
    </>
  );
}

export type DashboardRankItem = { name: string; value: string; magnitude: number };

export function DashboardRanking({ items }: { items: DashboardRankItem[] }) {
  return items.map((item) => (
    <div className={dashboardClass('rank-row')} key={item.name} data-reveal="rank">
      <div className={dashboardClass('rank-row__name')}>{item.name}</div>
      <div className={dashboardClass('track')}><div className={dashboardClass('fill')} style={{ width: `${Math.max(4, item.magnitude)}%` }} /></div>
      <div className={dashboardClass('rank-row__val', 'mono')}>{item.value}</div>
    </div>
  ));
}

export function DashboardSegmentedControl({ label, options, value, onChange }: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className={dashboardClass('seg')} role="group" aria-label={label} data-reveal="segment">
      {options.map((option) => (
        <button key={option} type="button" className={dashboardClass('pill')} aria-pressed={option === value} onClick={() => onChange(option)} data-reveal="pill">{option}</button>
      ))}
    </div>
  );
}

export type DashboardMover = { ticker: string; name: string; sector: string; price: string; change: string };

export function DashboardMovers({ items, status }: { items: DashboardMover[]; status: string | null }) {
  if (status) return <p className={dashboardClass('filters__status')} data-reveal="status">{status}</p>;
  return (
    <div data-reveal="mover-list">
      {items.map((company) => (
        <div className={dashboardClass('mover')} key={company.ticker} data-reveal="mover">
          <div className={dashboardClass('avatar')}>{company.ticker}</div>
          <div className={dashboardClass('mover__main')}>
            <div className={dashboardClass('mover__name')}>{company.name}</div>
            <div className={dashboardClass('mover__sub')}>{company.ticker} · {company.sector}</div>
          </div>
          <div className={dashboardClass('mover__end')}>
            <div className={dashboardClass('mover__price', 'mono')}>{company.price}</div>
            <div className={dashboardClass('mover__chg', 'mono')}>{company.change}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export type DashboardValuationRow = { sector: string; values: string[] };

export function DashboardValuationTable({ columns, rows }: {
  columns: readonly string[];
  rows: DashboardValuationRow[];
}) {
  return (
    <div className={dashboardClass('scroll-x')} data-reveal="table">
      <div className={dashboardClass('table')} role="table" aria-label="Valuation by sector">
        <div className={dashboardClass('table__row', 'table__head')} role="row">
          {columns.map((column) => <span key={column} role="columnheader">{column}</span>)}
        </div>
        {rows.map((row) => (
          <div className={dashboardClass('table__row', 'table__body', 'mono')} role="row" key={row.sector}>
            {[row.sector, ...row.values].map((value, index) => <span role="cell" key={`${row.sector}-${index}`}>{value}</span>)}
          </div>
        ))}
      </div>
    </div>
  );
}