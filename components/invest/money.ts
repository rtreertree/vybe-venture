export function formatUsd(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Math.min(2, maximumFractionDigits),
    maximumFractionDigits,
  }).format(value);
}

export function formatCompactUsd(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatPercent(value: number | null, options: { signed?: boolean } = {}) {
  if (value === null) return "—";
  const signed = options.signed ?? true;
  return `${signed && value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function formatQuantity(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(value);
}

export function formatAsOf(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}

export function changeColor(value: number) {
  return value > 0 ? "text-growth" : value < 0 ? "text-risk" : "text-primary/70";
}
