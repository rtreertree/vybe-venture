export type TimeRange = '3M' | 'YTD' | '1Y' | '5Y';

export const REGIONS = ['Global', 'North America', 'Europe', 'Asia-Pacific'] as const;
export type DashboardRegion = (typeof REGIONS)[number];

export const MOVER_TABS = ['Gainers', 'Losers', 'Most Active'] as const;

export const SECTORS = [
  { name: 'Technology' },
  { name: 'Financials' },
  { name: 'Healthcare' },
  { name: 'Consumer Cyclical' },
  { name: 'Industrials' },
  { name: 'Communication' },
  { name: 'Staples' },
  { name: 'Energy' },
  { name: 'Utilities' },
  { name: 'Real Estate' },
  { name: 'Basic Materials' },
] as const;