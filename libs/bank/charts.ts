import type { ChartRange, ChartSummary } from "@/libs/bank/types";
import { DAY_MS, FIVE_MIN_MS, HOUR_MS } from "@/libs/bank/walk";

export const MAX_CHART_POINTS = 300;
const WEEK_MS = 7 * DAY_MS;

// durationMs is null for ALL. baseMs is the preferred bucket width for the range.
export const RANGE_SPECS: Record<ChartRange, { durationMs: number | null; baseMs: number }> = {
  "1D": { durationMs: DAY_MS, baseMs: FIVE_MIN_MS },
  "1W": { durationMs: 7 * DAY_MS, baseMs: HOUR_MS },
  "1M": { durationMs: 30 * DAY_MS, baseMs: DAY_MS },
  "3M": { durationMs: 90 * DAY_MS, baseMs: DAY_MS },
  "1Y": { durationMs: 365 * DAY_MS, baseMs: DAY_MS },
  "ALL": { durationMs: null, baseMs: WEEK_MS },
};

export function round2(value: number) {
  return Math.round(value * 100) / 100;
}

// Widens the bucket in whole base units until the span fits in MAX_CHART_POINTS.
export function bucketWidth(baseMs: number, spanMs: number) {
  const units = Math.max(1, Math.ceil(spanMs / baseMs / MAX_CHART_POINTS));
  return baseMs * units;
}

export function intervalLabel(bucketMs: number) {
  if (bucketMs % WEEK_MS === 0) return `${bucketMs / WEEK_MS}w`;
  if (bucketMs % DAY_MS === 0) return `${bucketMs / DAY_MS}d`;
  if (bucketMs % HOUR_MS === 0) return `${bucketMs / HOUR_MS}h`;
  return `${bucketMs / 60_000}m`;
}

// Keeps the last value of each bucket. Input must be ascending by time.
export function downsample(points: { t: number; v: number }[], bucketMs: number) {
  const buckets = new Map<number, { t: number; v: number }>();
  for (const point of points) buckets.set(Math.floor(point.t / bucketMs), point);
  return [...buckets.values()];
}

export function summarize(values: number[]): ChartSummary | null {
  if (values.length === 0) return null;
  const start = values[0];
  const end = values[values.length - 1];
  return {
    start: round2(start),
    end: round2(end),
    change: round2(end - start),
    changePercent: start === 0 ? 0 : round2(((end - start) / start) * 100),
    high: round2(Math.max(...values)),
    low: round2(Math.min(...values)),
  };
}
