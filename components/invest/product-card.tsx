import type { ReactNode } from "react";
import type { ProductListItem, RiskLevel } from "@/libs/bank/types";
import { changeColor, formatAsOf, formatPercent, formatUsd } from "@/components/invest/money";

const RISK_LABELS: Record<RiskLevel, string> = { low: "Lower risk", medium: "Medium risk", high: "Higher risk" };
const TYPE_LABELS = { stock: "Stock", fund: "Fund", bond: "Bond", crypto: "Crypto" } as const;

export const riskLabel = (risk: RiskLevel) => RISK_LABELS[risk];
export const typeLabel = (type: ProductListItem["type"]) => TYPE_LABELS[type];

type ProductCardProps = {
  product: ProductListItem;
  chosen?: boolean;
  note?: string;
  children?: ReactNode;
};

export function ProductCard({ product, chosen = false, note, children }: ProductCardProps) {
  return (
    <article className={`flex min-h-80 flex-col border bg-white p-5 transition-shadow hover:shadow-lg hover:shadow-primary/5 ${chosen ? "border-growth ring-1 ring-growth" : "border-primary/15"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="bg-light-surface px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-secondary">{typeLabel(product.type)}</span>
        <span className="bg-light-surface px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-secondary">{product.area}</span>
        <span className="ml-auto font-mono text-xs text-secondary">{product.symbol}</span>
      </div>
      <h3 className="mt-4 font-display text-xl font-bold">{product.name}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-primary/65">{product.description}</p>
      {note && <p className="mt-3 border-l-2 border-accent bg-accent/10 px-3 py-2 text-xs font-semibold text-primary">{note}</p>}
      <div className="mt-4 flex items-end justify-between gap-3 border-y border-primary/10 py-4">
        <div>
          <p className="font-display text-2xl font-bold">{formatUsd(product.currentPrice)}</p>
          <p className="mt-0.5 text-[11px] text-primary/55">As of {formatAsOf(product.asOf)}</p>
        </div>
        <div className="text-right text-xs">
          <p className={`text-sm font-semibold ${changeColor(product.dayChangePercent)}`}>{formatPercent(product.dayChangePercent)}</p>
          <p className="mt-0.5 text-primary/55">{riskLabel(product.risk)}</p>
        </div>
      </div>
      {children && <div className="mt-auto flex gap-2 pt-5">{children}</div>}
    </article>
  );
}
