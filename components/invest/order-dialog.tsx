"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { fetchPortfolio, newIdempotencyKey, placeOrder, PORTFOLIO_CHANGED_EVENT } from "@/libs/invest-client";
import type { BankOrderResponse, OrderSide } from "@/libs/bank/types";
import { formatAsOf, formatQuantity, formatUsd } from "@/components/invest/money";

export type OrderProduct = { symbol: string; name: string; currentPrice: number; asOf: string };

type OrderDialogProps = {
  product: OrderProduct;
  side: OrderSide;
  accountRef: string;
  accountName: string;
  onClose: () => void;
};

type Funds = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; cash: number; held: number };
type Mode = "quantity" | "amount";

const ERROR_MESSAGES: Record<string, string> = {
  INSUFFICIENT_FUNDS: "You don't have enough cash for this order.",
  INSUFFICIENT_HOLDINGS: "You don't hold enough of this product in this account to sell that much.",
  INVALID_REQUEST: "Check the quantity or amount and try again.",
  PRODUCT_NOT_FOUND: "This product is no longer available.",
  ACCOUNT_NOT_FOUND: "This planning account was not found for your code.",
  BANK_UNAVAILABLE: "The bank could not be reached. Check your portfolio before trying again; retrying is safe.",
  NETWORK: "The connection failed. Check your portfolio before trying again; retrying is safe.",
};

// Accepts plain decimals only, so "1e3", "-1" and "abc" are rejected.
function parsePositive(text: string, maxDecimals: number): { value: number } | { error: string } {
  const trimmed = text.trim();
  if (!trimmed) return { error: "Enter a number greater than 0." };
  if (!/^(\d+\.?\d*|\.\d+)$/.test(trimmed)) return { error: "Use digits only, for example 2.5." };
  const decimals = trimmed.split(".")[1]?.length ?? 0;
  if (decimals > maxDecimals) return { error: `Use at most ${maxDecimals} decimal places.` };
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0) return { error: "Enter a number greater than 0." };
  return { value };
}

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

export function OrderDialog({ product, side: initialSide, accountRef, accountName, onClose }: OrderDialogProps) {
  const titleId = useId();
  const inputId = useId();
  const errorId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<Element | null>(null);
  const keyRef = useRef(newIdempotencyKey());
  const attempted = useRef(false);

  const [side, setSide] = useState<OrderSide>(initialSide);
  const [mode, setMode] = useState<Mode>("quantity");
  const [text, setText] = useState("");
  const [touched, setTouched] = useState(false);
  const [step, setStep] = useState<"edit" | "review" | "done">("edit");
  const [funds, setFunds] = useState<Funds>({ status: "loading" });
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState("");
  const [filled, setFilled] = useState<BankOrderResponse | null>(null);

  useEffect(() => {
    previousFocus.current = document.activeElement;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      if (previousFocus.current instanceof HTMLElement) previousFocus.current.focus();
    };
  }, []);

  useEffect(() => {
    let active = true;
    void fetchPortfolio(accountRef).then((result) => {
      if (!active) return;
      if (!result.ok) return setFunds({ status: "error", message: result.message });
      const held = result.data.holdings.find((holding) => holding.symbol === product.symbol)?.quantity ?? 0;
      setFunds({ status: "ready", cash: result.data.cashBalance, held });
    });
    return () => { active = false; };
  }, [accountRef, product.symbol]);

  useEffect(() => {
    // Deferred so the Enter keypress that changed the step cannot activate the newly focused control.
    const timer = window.setTimeout(() => {
      const target = step === "edit" ? dialogRef.current?.querySelector<HTMLElement>("input") : dialogRef.current?.querySelector<HTMLElement>("h2");
      target?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [step]);

  const parsed = parsePositive(text, mode === "quantity" ? 6 : 2);
  const price = product.currentPrice;
  const estimate = "value" in parsed
    ? mode === "quantity"
      ? { quantity: parsed.value, total: parsed.value * price }
      : { quantity: Math.floor((parsed.value / price) * 1e6) / 1e6, total: parsed.value }
    : null;
  const exceeds = estimate && funds.status === "ready"
    ? side === "buy" ? estimate.total > funds.cash : estimate.quantity > funds.held
    : false;
  const canReview = estimate !== null && estimate.quantity > 0 && funds.status === "ready";

  const edited = () => {
    if (attempted.current) {
      keyRef.current = newIdempotencyKey();
      attempted.current = false;
    }
    setFailure("");
  };

  const confirm = async () => {
    if (submitting || !("value" in parsed)) return;
    setSubmitting(true);
    setFailure("");
    attempted.current = true;
    const result = await placeOrder({
      symbol: product.symbol,
      side,
      ...(mode === "quantity" ? { quantity: parsed.value } : { amount: parsed.value }),
      accountRef,
      idempotencyKey: keyRef.current,
    });
    setSubmitting(false);
    if (!result.ok) return setFailure(ERROR_MESSAGES[result.code] ?? result.message);
    setFilled(result.data);
    setStep("done");
    window.dispatchEvent(new Event(PORTFOLIO_CHANGED_EVENT));
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape" && !submitting) {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const items = [...(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const verb = side === "buy" ? "buy" : "sell";
  const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
  const showError = touched && "error" in parsed;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-primary/55 p-0 sm:items-center sm:justify-center sm:p-4" onKeyDown={onKeyDown}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="max-h-dvh w-full max-w-md overflow-y-auto bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-secondary">{step === "done" ? "Order filled" : step === "review" ? "Review your order" : "New order"}</p>
            <h2 id={titleId} tabIndex={-1} className="mt-1.5 font-display text-xl font-bold outline-none">{product.name} <span className="font-mono text-sm font-normal text-secondary">{product.symbol}</span></h2>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="Close order dialog" className={`grid h-11 w-11 shrink-0 place-items-center text-primary/70 hover:bg-primary/5 disabled:opacity-40 ${focusRing}`}>
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {step === "edit" && (
          <form
            className="mt-5"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              setTouched(true);
              if (canReview) setStep("review");
            }}
          >
            <div role="group" aria-label="Order side" className="grid grid-cols-2 border border-primary/20">
              {(["buy", "sell"] as const).map((item) => (
                <button key={item} type="button" aria-pressed={side === item} onClick={() => { setSide(item); edited(); }} className={`min-h-11 text-sm font-semibold capitalize ${focusRing} ${side === item ? "bg-primary text-white" : "hover:bg-primary/5"}`}>{item}</button>
              ))}
            </div>
            <div role="group" aria-label="Order size" className="mt-3 grid grid-cols-2 border border-primary/20">
              {([["quantity", "Quantity"], ["amount", "USD amount"]] as const).map(([item, itemLabel]) => (
                <button key={item} type="button" aria-pressed={mode === item} onClick={() => { setMode(item); setText(""); setTouched(false); edited(); }} className={`min-h-11 text-sm font-semibold ${focusRing} ${mode === item ? "bg-secondary text-white" : "hover:bg-primary/5"}`}>{itemLabel}</button>
              ))}
            </div>

            <label htmlFor={inputId} className="mt-4 block text-sm font-semibold">{mode === "quantity" ? `Quantity of ${product.symbol}` : "Amount in USD"}</label>
            <div className="mt-1.5 flex gap-2">
              <input
                id={inputId}
                inputMode="decimal"
                autoComplete="off"
                value={text}
                aria-invalid={showError}
                aria-describedby={showError ? errorId : undefined}
                onChange={(event) => { setText(event.target.value); edited(); }}
                onBlur={() => setTouched(true)}
                placeholder={mode === "quantity" ? "0.00" : "100.00"}
                className={`min-h-11 w-full border bg-white px-3 text-base outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 ${showError ? "border-risk" : "border-primary/25"}`}
              />
              {side === "sell" && funds.status === "ready" && funds.held > 0 && (
                <button type="button" onClick={() => { setMode("quantity"); setText(String(funds.held)); setTouched(true); edited(); }} className={`min-h-11 shrink-0 border border-primary/25 px-3 text-sm font-semibold hover:bg-primary/5 ${focusRing}`}>Sell all</button>
              )}
            </div>
            {showError && <p id={errorId} role="alert" className="mt-1.5 text-sm text-risk">{"error" in parsed ? parsed.error : ""}</p>}

            <dl className="mt-5 space-y-2 border-y border-primary/10 py-4 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-primary/65">Price</dt><dd className="font-semibold">{formatUsd(price)} <span className="font-normal text-primary/55">as of {formatAsOf(product.asOf)}</span></dd></div>
              {estimate && estimate.quantity > 0 && (
                <>
                  <div className="flex justify-between gap-4"><dt className="text-primary/65">Estimated quantity</dt><dd className="font-semibold">{formatQuantity(estimate.quantity)}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-primary/65">Estimated total</dt><dd className="font-semibold">{formatUsd(estimate.total)}</dd></div>
                </>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-primary/65">{side === "buy" ? "Cash available (shared)" : `Held in ${accountName}`}</dt>
                <dd className="font-semibold">
                  {funds.status === "loading" ? "Loading…" : funds.status === "error" ? "Unavailable" : side === "buy" ? formatUsd(funds.cash) : formatQuantity(funds.held)}
                </dd>
              </div>
            </dl>
            {funds.status === "error" && <p role="alert" className="mt-3 text-sm text-risk">{funds.message}</p>}
            {exceeds && <p role="alert" className="mt-3 text-sm text-risk">{side === "buy" ? "This is more than your available cash." : "This is more than you hold in this account."}</p>}
            <p className="mt-3 text-xs leading-5 text-primary/60">The price can move before the order fills, so the final total may differ slightly. Prices are simulated.</p>

            <button type="submit" disabled={funds.status !== "ready"} className={`mt-5 min-h-11 w-full bg-accent px-4 text-sm font-semibold text-primary hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}>Review order</button>
          </form>
        )}

        {step === "review" && estimate && (
          <div className="mt-5">
            <p className="text-base leading-7">
              You are about to {verb} <strong>{formatQuantity(estimate.quantity)} {product.symbol}</strong> for about <strong>{formatUsd(estimate.total)}</strong> {side === "buy" ? "from" : "into"} <strong>{accountName}</strong>.
            </p>
            <p className="mt-3 text-xs leading-5 text-primary/60">
              {mode === "amount" ? `Quantity is worked out from ${formatUsd(estimate.total)} at the price when the order fills. ` : ""}
              This is a simulated market order in a prototype bank. Nothing happens until you confirm. This is not financial advice.
            </p>
            {failure && <p role="alert" className="mt-4 border border-risk/30 bg-risk/10 p-3 text-sm leading-6">{failure}</p>}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => { setFailure(""); setStep("edit"); }} disabled={submitting} className={`min-h-11 border border-primary/25 px-4 text-sm font-semibold hover:bg-primary/5 disabled:opacity-40 ${focusRing}`}>Back</button>
              <button type="button" onClick={() => void confirm()} disabled={submitting} className={`min-h-11 bg-accent px-4 text-sm font-semibold text-primary hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}>{submitting ? "Placing order…" : failure ? "Try again" : "Confirm"}</button>
            </div>
          </div>
        )}

        {step === "done" && filled && (
          <div className="mt-5">
            <div role="status" className="border border-growth/40 bg-growth/10 p-4">
              <p className="flex items-center gap-2 font-semibold"><Check className="h-5 w-5 text-growth" aria-hidden /> Your {filled.side} order was filled.</p>
              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-primary/65">Quantity</dt><dd className="font-semibold">{formatQuantity(filled.filledQuantity)} {filled.symbol}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-primary/65">Filled price</dt><dd className="font-semibold">{formatUsd(filled.filledPrice)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-primary/65">Total</dt><dd className="font-semibold">{formatUsd(filled.total)}</dd></div>
              </dl>
            </div>
            <button type="button" onClick={onClose} className={`mt-5 min-h-11 w-full bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 ${focusRing}`}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
