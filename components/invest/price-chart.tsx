"use client";

import { useEffect, useId, useMemo, useState } from "react";
import type { InvestResult } from "@/libs/invest-client";
import type { ChartRange, ChartSeries } from "@/libs/bank/types";
import { changeColor, formatAsOf, formatPercent, formatUsd } from "@/components/invest/money";

const RANGES: ChartRange[] = ["1D", "1W", "1M", "3M", "1Y", "ALL"];
const WIDTH = 640;
const HEIGHT = 240;
const PAD_X = 8;
const PAD_Y = 16;

type PriceChartProps = {
  label: string;
  load: (range: ChartRange) => Promise<InvestResult<ChartSeries>>;
  initialRange?: ChartRange;
  reloadKey?: number;
};

type ChartResult = { key: string } & ({ status: "error"; message: string } | { status: "ready"; series: ChartSeries });
type ChartState = { status: "loading" } | ChartResult;

function toCoordinates(series: ChartSeries) {
  const times = series.points.map((point) => Date.parse(point.t));
  const values = series.points.map((point) => point.v);
  const minT = Math.min(...times);
  const spanT = Math.max(...times) - minT || 1;
  const minV = Math.min(...values);
  const spanV = Math.max(...values) - minV || 1;
  return series.points.map((_, index) => ({
    x: PAD_X + ((times[index] - minT) / spanT) * (WIDTH - PAD_X * 2),
    y: HEIGHT - PAD_Y - ((values[index] - minV) / spanV) * (HEIGHT - PAD_Y * 2),
  }));
}

export function PriceChart({ label, load, initialRange = "1M", reloadKey = 0 }: PriceChartProps) {
  const [range, setRange] = useState<ChartRange>(initialRange);
  const [result, setResult] = useState<ChartResult | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const gradientId = useId();

  const requestKey = `${range}:${attempt}:${reloadKey}`;
  useEffect(() => {
    let active = true;
    void load(range).then((response) => {
      if (!active) return;
      setHover(null);
      setResult(response.ok ? { key: requestKey, status: "ready", series: response.data } : { key: requestKey, status: "error", message: response.message });
    });
    return () => { active = false; };
  }, [load, range, requestKey]);
  const state: ChartState = result && result.key === requestKey ? result : { status: "loading" };

  const series = state.status === "ready" ? state.series : null;
  const coordinates = useMemo(() => (series && series.points.length >= 2 ? toCoordinates(series) : []), [series]);
  const summary = series?.summary ?? null;
  const rising = (summary?.change ?? 0) >= 0;
  const linePath = coordinates.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const areaPath = coordinates.length ? `${linePath} L${coordinates[coordinates.length - 1].x.toFixed(1)} ${HEIGHT} L${coordinates[0].x.toFixed(1)} ${HEIGHT} Z` : "";
  const hovered = series && hover !== null ? series.points[hover] : null;

  const onPointer = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!coordinates.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    coordinates.forEach((point, index) => {
      if (Math.abs(point.x - x) < Math.abs(coordinates[nearest].x - x)) nearest = index;
    });
    setHover(nearest);
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-h-12" aria-live="polite">
          {hovered ? (
            <>
              <p className="font-display text-2xl font-bold">{formatUsd(hovered.v)}</p>
              <p className="text-xs text-primary/60">{formatAsOf(hovered.t)}</p>
            </>
          ) : summary ? (
            <>
              <p className="font-display text-2xl font-bold">{formatUsd(summary.end)}</p>
              <p className={`text-sm font-semibold ${changeColor(summary.change)}`}>
                {summary.change > 0 ? "+" : ""}{formatUsd(summary.change)} ({formatPercent(summary.changePercent)}) <span className="font-normal text-primary/60">over {range === "ALL" ? "all time" : range}</span>
              </p>
            </>
          ) : null}
        </div>
        <div role="group" aria-label={`${label} time range`} className="flex border border-primary/15 bg-white">
          {RANGES.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={range === item}
              onClick={() => setRange(item)}
              className={`min-h-11 min-w-11 px-2.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:px-3 ${range === item ? "bg-primary text-white" : "text-primary/70 hover:bg-primary/5"}`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {state.status === "loading" ? (
          <div className="skeleton-block h-60 w-full" role="status" aria-label="Loading chart" />
        ) : state.status === "error" ? (
          <div className="border border-risk/30 bg-risk/10 p-4">
            <p role="alert" className="text-sm leading-6">{state.message}</p>
            <button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-3 min-h-11 border border-primary/25 px-4 text-sm font-semibold hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Try again</button>
          </div>
        ) : coordinates.length < 2 ? (
          <p className="grid h-60 place-items-center border border-dashed border-primary/20 bg-light-surface/60 px-4 text-center text-sm text-primary/65">Not enough history yet</p>
        ) : (
          <div className={rising ? "text-growth" : "text-risk"}>
            <svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              role="img"
              aria-label={`${label}, ${range}: from ${formatUsd(summary?.start ?? 0)} to ${formatUsd(summary?.end ?? 0)}, ${formatPercent(summary?.changePercent ?? 0)}`}
              className="h-60 w-full touch-pan-y"
              preserveAspectRatio="none"
              onPointerMove={onPointer}
              onPointerLeave={() => setHover(null)}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill={`url(#${gradientId})`} />
              <path d={linePath} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              {hover !== null && (
                <>
                  <line x1={coordinates[hover].x} x2={coordinates[hover].x} y1="0" y2={HEIGHT} stroke="var(--slate-blue)" strokeOpacity="0.3" vectorEffect="non-scaling-stroke" />
                  <circle cx={coordinates[hover].x} cy={coordinates[hover].y} r="4" fill="currentColor" stroke="var(--warm-porcelain)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                </>
              )}
            </svg>
            {summary && (
              <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-primary/65">
                <div className="flex gap-1.5"><dt>Low</dt><dd className="font-semibold text-primary">{formatUsd(summary.low)}</dd></div>
                <div className="flex gap-1.5"><dt>High</dt><dd className="font-semibold text-primary">{formatUsd(summary.high)}</dd></div>
                <div className="flex gap-1.5"><dt>Start</dt><dd className="font-semibold text-primary">{formatUsd(summary.start)}</dd></div>
              </dl>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
