"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  MessageCircle,
  Newspaper,
  ShieldAlert,
  Target,
  TrendingDown,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ConsultingChat } from "@/components/consulting-chat";
import {
  readAccounts,
  writeAccounts,
  type AccountRecord,
} from "@/libs/account-client";
import {
  calculateWithdrawalScenario,
  type WithdrawalScenarioInput,
  type WithdrawalScenarioResult,
} from "@/libs/investment-scenarios";

type View = "home" | "details" | "news" | "what-if" | "general";
type DetailsDraft = {
  goal: string;
  timeframe: string;
  targetValue: string;
  riskAttitude: string;
  liquidityNeeds: string;
  lossReaction: string;
};

const SAMPLE_BRIEFS = [
  {
    id: "long-term-planning",
    tag: "Planning",
    headline: "How a longer time horizon can change the way you think about volatility",
    summary: "A fictional example for exploring how short-term price changes may feel different when considered alongside a longer-term goal.",
  },
  {
    id: "diversification",
    tag: "Risk",
    headline: "Diversification is about balancing exposures, not eliminating risk",
    summary: "A fictional example for discussing how different investments can respond to the same economic event in different ways.",
  },
  {
    id: "cash-flow",
    tag: "Cash flow",
    headline: "Why near-term spending needs may affect an investment plan",
    summary: "A fictional example for considering how liquidity needs and investment timeframes can influence planning choices.",
  },
] as const;

const topicCards = [
  {
    id: "details" as const,
    Icon: UserRound,
    number: "01",
    title: "Personal details",
    description: "Review the goal, timeframe, and preferences behind this account.",
    action: "Review details",
  },
  {
    id: "news" as const,
    Icon: Newspaper,
    number: "02",
    title: "News & information",
    description: "Explore sample briefs and ask what their themes could mean.",
    action: "Explore information",
  },
  {
    id: "what-if" as const,
    Icon: TrendingDown,
    number: "03",
    title: "What If",
    description: "See how withdrawing money now could change an illustrative future value.",
    action: "Compare a withdrawal",
  },
] as const;

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function detailsFromAccount(account: AccountRecord): DetailsDraft {
  const target = account.planning.targetAmount?.amount;
  return {
    goal: account.goal,
    timeframe: account.timeframeYears?.toString() ?? "",
    targetValue: typeof target === "number" && Number.isFinite(target) ? String(target) : "",
    riskAttitude: account.planning.riskAttitude ?? "",
    liquidityNeeds: account.planning.liquidityNeeds ?? "",
    lossReaction: account.planning.lossReaction ?? "",
  };
}

function initialYears(account: AccountRecord) {
  const years = account.timeframeYears;
  return years !== null && years >= 1 && years <= 50 ? String(years) : "5";
}

function formatScenarioResults(results: WithdrawalScenarioResult[]) {
  return results.map((result) => ({
    annual_return: `${(result.annualReturn * 100).toFixed(0)}%`,
    without_withdrawal: Math.round(result.withoutWithdrawal),
    after_withdrawal: Math.round(result.afterWithdrawal),
    future_value_difference: Math.round(result.futureValueDifference),
  }));
}

export function InvestmentConsulting() {
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [accountsError, setAccountsError] = useState("");
  const [accountId, setAccountId] = useState("");
  const [view, setView] = useState<View>("home");
  const [isReady, setIsReady] = useState(false);
  const [selectedBriefId, setSelectedBriefId] = useState("");
  const [details, setDetails] = useState<DetailsDraft>({
    goal: "",
    timeframe: "",
    targetValue: "",
    riskAttitude: "",
    liquidityNeeds: "",
    lossReaction: "",
  });
  const [detailsMessage, setDetailsMessage] = useState("");
  const [detailsError, setDetailsError] = useState("");
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [balance, setBalance] = useState("10000");
  const [withdrawal, setWithdrawal] = useState("2000");
  const [years, setYears] = useState("5");
  const [scenarioInput, setScenarioInput] = useState<WithdrawalScenarioInput | null>(null);
  const [scenarioResults, setScenarioResults] = useState<WithdrawalScenarioResult[] | null>(null);
  const [scenarioError, setScenarioError] = useState("");

  const account = useMemo(
    () => accounts.find((item) => item.id === accountId) ?? null,
    [accounts, accountId],
  );

  const resetForAccount = useCallback((nextAccount: AccountRecord) => {
    setAccountId(nextAccount.id);
    setDetails(detailsFromAccount(nextAccount));
    setDetailsMessage("");
    setDetailsError("");
    setBalance("10000");
    setWithdrawal("2000");
    setYears(initialYears(nextAccount));
    setScenarioInput(null);
    setScenarioResults(null);
    setScenarioError("");
    setSelectedBriefId("");
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const accountResult = readAccounts();
      if (!accountResult.ok) {
        setAccountsError(accountResult.message);
        setIsReady(true);
        return;
      }
      const savedAccounts = accountResult.accounts;
      const url = new URL(window.location.href);
      const requestedId = url.searchParams.get("account");
      const requestedView = url.searchParams.get("topic");
      const validViews: Record<string, View> = {
        details: "details",
        news: "news",
        "what-if": "what-if",
        chat: "general",
      };
      const selectedAccount = savedAccounts.find((item) => item.id === requestedId) ?? savedAccounts[0];

      setAccounts(savedAccounts);
      setAccountsError("");
      if (selectedAccount) resetForAccount(selectedAccount);
      setView(requestedView && validViews[requestedView] ? validViews[requestedView] : "home");
      setIsReady(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [resetForAccount]);

  useEffect(() => {
    if (!isReady) return;
    const url = new URL(window.location.href);
    if (accountId) url.searchParams.set("account", accountId);
    else url.searchParams.delete("account");
    if (view === "home") url.searchParams.delete("topic");
    else url.searchParams.set("topic", view === "general" ? "chat" : view);
    window.history.replaceState(null, "", url);
  }, [accountId, isReady, view]);

  useEffect(() => {
    const restoreRoute = () => {
      const url = new URL(window.location.href);
      const route = url.searchParams.get("topic");
      const routes: Record<string, View> = {
        details: "details",
        news: "news",
        "what-if": "what-if",
        chat: "general",
      };
      const nextAccountId = url.searchParams.get("account");
      const nextAccount = accounts.find((item) => item.id === nextAccountId);
      if (nextAccount) resetForAccount(nextAccount);
      setView(route && routes[route] ? routes[route] : "home");
    };
    window.addEventListener("popstate", restoreRoute);
    return () => window.removeEventListener("popstate", restoreRoute);
  }, [accounts, resetForAccount]);

  const visit = (nextView: View) => {
    setView(nextView);
    setDetailsMessage("");
    setDetailsError("");
    const url = new URL(window.location.href);
    if (accountId) url.searchParams.set("account", accountId);
    if (nextView === "home") url.searchParams.delete("topic");
    else url.searchParams.set("topic", nextView === "general" ? "chat" : nextView);
    window.history.pushState(null, "", url);
  };

  const saveDetails = () => {
    if (!account) return;
    const goal = details.goal.trim().slice(0, 300);
    if (!goal) {
      setDetailsError("Add a goal before saving these account details.");
      setDetailsMessage("");
      return;
    }
    const targetValue = details.targetValue.trim() === "" ? null : Number(details.targetValue);
    if (targetValue !== null && (!Number.isFinite(targetValue) || targetValue < 0 || targetValue > 100_000_000)) {
      setDetailsError("Enter a target amount between $0 and $100,000,000, or leave it blank.");
      setDetailsMessage("");
      return;
    }
    const timeframeYears = details.timeframe.trim() === "" ? null : Number(details.timeframe);
    if (timeframeYears !== null && (!Number.isInteger(timeframeYears) || timeframeYears < 1 || timeframeYears > 50)) {
      setDetailsError("Enter a whole number of years between 1 and 50, or leave the timeframe blank.");
      setDetailsMessage("");
      return;
    }

    setIsSavingDetails(true);
    setDetailsError("");
    try {
      const updatedAccount: AccountRecord = {
        ...account,
        goal,
        timeframeYears,
        planning: {
          ...account.planning,
          targetAmount: targetValue === null ? null : { amount: targetValue, currency: "USD" },
          riskAttitude: details.riskAttitude.trim().slice(0, 100) || null,
          liquidityNeeds: details.liquidityNeeds.trim().slice(0, 100) || null,
          lossReaction: details.lossReaction.trim().slice(0, 100) || null,
        },
      };
      const updatedAccounts = accounts.map((item) => item.id === account.id ? updatedAccount : item);
      writeAccounts(updatedAccounts);
      setAccounts(updatedAccounts);
      setDetailsMessage("These details are saved in this browser on this device.");
    } catch {
      setDetailsError("We couldn't save these details in this browser. Your previous account information is unchanged.");
    } finally {
      setIsSavingDetails(false);
    }
  };

  const runScenario = () => {
    setScenarioError("");
    const input = {
      balance: balance.trim() === "" ? Number.NaN : Number(balance),
      withdrawal: withdrawal.trim() === "" ? Number.NaN : Number(withdrawal),
      years: years.trim() === "" ? Number.NaN : Number(years),
    };
    try {
      const results = calculateWithdrawalScenario(input);
      setScenarioInput(input);
      setScenarioResults(results);
    } catch (error) {
      setScenarioResults(null);
      setScenarioInput(null);
      setScenarioError(error instanceof Error ? error.message : "Check the scenario values and try again.");
    }
  };

  if (!isReady) {
    return <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center px-5 sm:px-8"><p role="status" className="text-sm text-secondary">Loading your saved accounts…</p></div>;
  }

  if (!accounts.length) {
    return (
      <section className="mx-auto max-w-4xl px-5 py-16 sm:px-8 sm:py-24">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-secondary">Investment consulting</p>
        <h1 className="mt-4 max-w-2xl font-display text-4xl font-bold leading-tight sm:text-6xl">Start with an account and a goal.</h1>
        {accountsError && <p role="alert" className="mt-4 text-sm font-medium text-risk">{accountsError}</p>}
        <p className="mt-5 max-w-2xl text-base leading-7 text-ink/70">Your consulting topics use the goal and planning context saved with an account on this device.</p>
        <Link href="/question/register" className="mt-8 inline-flex min-h-12 items-center justify-center gap-3 bg-accent px-6 font-semibold text-primary transition-colors hover:bg-accent/90">
          Set up an account <ArrowRight className="h-5 w-5" aria-hidden />
        </Link>
        <p className="mt-6 max-w-xl text-sm leading-6 text-secondary">This prototype stores account details in this browser. If your saved account is missing, confirm that you are on the same device and browser where you created it.</p>
      </section>
    );
  }

  if (!account) return null;

  const scenarioIsCurrent = Boolean(
    scenarioInput
    && Number(balance) === scenarioInput.balance
    && Number(withdrawal) === scenarioInput.withdrawal
    && Number(years) === scenarioInput.years,
  );
  const scenarioContext = scenarioIsCurrent && scenarioResults
    ? JSON.stringify({
      inputs: scenarioInput,
      assumptions: "Fixed illustrative annual return assumptions of -5%, 2%, 5%, and 8%, compounded monthly. These are scenarios, not probabilities; no fees, taxes, inflation, or additional contributions.",
      results: formatScenarioResults(scenarioResults),
    })
    : "";
  return (
    <div className="mx-auto max-w-7xl px-5 sm:px-8">
      <section className="border-b border-primary/10 py-10 sm:py-14">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl min-w-0">
            <p className="mb-4 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.12em] text-secondary">
              <span className="h-px w-8 bg-accent" /> Investment consulting
            </p>
            <h1 className="break-words font-display text-[2.125rem] font-bold leading-[1.06] sm:text-6xl">What would you like to work through?</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ink/70">
              Explore your details, learn from information, or compare a hypothetical change—one clear step at a time.
            </p>
          </div>
          <div className="w-full min-w-0 max-w-sm">
            <label htmlFor="consult-account" className="mb-2 block text-xs font-bold uppercase tracking-widest text-secondary">Selected account</label>
            <select
              id="consult-account"
              value={account.id}
              onChange={(event) => {
                const nextAccount = accounts.find((item) => item.id === event.target.value);
                if (nextAccount) resetForAccount(nextAccount);
              }}
              className="min-h-12 w-full min-w-0 max-w-full border border-primary/20 bg-white px-3 text-sm font-semibold text-primary outline-none focus:border-primary focus:ring-2 focus:ring-accent/40 sm:px-4"
            >
              {accounts.map((item) => <option key={item.id} value={item.id}>{item.accountName}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-8 grid gap-4 border-t border-primary/10 pt-5 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-secondary">Working toward</p>
            <p className="mt-1 wrap-anywhere font-display text-lg font-semibold text-primary">{account.goal}</p>
            <p className="mt-1 text-sm text-ink/65">
              {account.timeframeYears ? `Timeframe: ${account.timeframeYears} years` : "Add a timeframe in Personal details whenever you’re ready."}
            </p>
          </div>
          <button type="button" onClick={() => visit("general")} className="inline-flex min-h-12 w-full items-center justify-center gap-2 border border-primary/25 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-auto sm:px-5">
            <MessageCircle className="h-4 w-4" aria-hidden /> Ask about this account
          </button>
        </div>
      </section>

      <aside className="my-6 flex items-start gap-3 border border-risk/30 bg-risk/10 p-4 sm:p-5" aria-label="Prototype privacy and investment notice">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-risk" aria-hidden />
        <p className="min-w-0 wrap-anywhere text-sm leading-6 text-primary/85">
          <strong>Prototype notice.</strong> Account and conversation details are stored in this browser, which is not secure; use sample data on a private device. Chat context is sent to the configured AI service. This tool is educational, not financial advice, and it does not provide live news or market data.
        </p>
      </aside>

      {view === "home" ? (
        <>
          <section className="min-w-0 py-7 sm:py-10" aria-labelledby="consult-topics-title">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-secondary">Your next step</p>
            <h2 id="consult-topics-title" className="mt-3 font-display text-2xl font-bold sm:text-3xl">Choose a topic</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {topicCards.map(({ id, Icon, number, title, description, action }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => visit(id)}
                  className="group flex min-h-64 flex-col border border-primary/15 bg-white p-5 text-left transition-colors hover:border-primary/45 hover:bg-white/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-6"
                >
                  <span className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.12em] text-secondary">
                    <span>{number}</span>
                    <Icon className="h-5 w-5 text-primary" aria-hidden />
                  </span>
                  <span className="mt-8 wrap-anywhere font-display text-xl font-semibold text-primary">{title}</span>
                  <span className="mt-2 flex-1 text-sm leading-6 text-ink/70">{description}</span>
                  <span className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary underline decoration-accent decoration-2 underline-offset-4">
                    {action} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="grid gap-5 border-t border-primary/10 py-8 sm:grid-cols-2 sm:py-10">
            <div className="flex items-start gap-4">
              <Target className="mt-1 h-5 w-5 shrink-0 text-secondary" aria-hidden />
              <div>
                <h2 className="font-display text-lg font-semibold">Keep the goal in view</h2>
                <p className="mt-2 text-sm leading-6 text-ink/70">Details and scenario inputs are tied to the account you selected, so its context stays clear.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Clock3 className="mt-1 h-5 w-5 shrink-0 text-secondary" aria-hidden />
              <div>
                <h2 className="font-display text-lg font-semibold">Compare, don’t predict</h2>
                <p className="mt-2 text-sm leading-6 text-ink/70">What If values use fixed assumptions to illustrate trade-offs. Real market returns are uncertain.</p>
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="py-6 sm:py-9">
          <button type="button" onClick={() => visit("home")} className="inline-flex min-h-11 items-center gap-2 px-1 text-sm font-semibold text-secondary transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
            <ArrowLeft className="h-4 w-4" aria-hidden /> All topics
          </button>

          {view === "details" && (
            <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.72fr)]">
              <section className="min-w-0 border border-primary/15 bg-white p-4 sm:p-8" aria-labelledby="details-title">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-secondary">01 · Personal details</p>
                <h2 id="details-title" className="mt-3 break-words font-display text-2xl font-bold sm:text-3xl">Review this account’s plan.</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/70">These planning details apply to <strong>{account.accountName}</strong> only. Update what is useful; leave optional fields blank if you prefer.</p>
                <div className="mt-7 grid gap-5">
                  <Field label="Account goal" id="details-goal" value={details.goal} onChange={(value) => setDetails({ ...details, goal: value })} placeholder="What is this account working toward?" maxLength={300} />
                  <Field label="Timeframe (years)" id="details-timeframe" type="number" min="1" max="50" value={details.timeframe} onChange={(value) => setDetails({ ...details, timeframe: value })} placeholder="Optional" />
                  <Field label="Target amount (USD)" id="details-target" type="number" min="0" max="100000000" value={details.targetValue} onChange={(value) => setDetails({ ...details, targetValue: value })} placeholder="Optional" />
                  <Field label="Comfort with investment risk" id="details-risk" value={details.riskAttitude} onChange={(value) => setDetails({ ...details, riskAttitude: value })} placeholder="In your own words" maxLength={100} />
                  <Field label="When you may need access to this money" id="details-liquidity" value={details.liquidityNeeds} onChange={(value) => setDetails({ ...details, liquidityNeeds: value })} placeholder="Optional" maxLength={100} />
                  <Field label="How you might react to a temporary loss" id="details-loss" value={details.lossReaction} onChange={(value) => setDetails({ ...details, lossReaction: value })} placeholder="Optional" maxLength={100} />
                </div>
                {detailsError && <p role="alert" className="mt-4 text-sm font-medium text-risk">{detailsError}</p>}
                {detailsMessage && <p role="status" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-growth"><Check className="h-4 w-4" aria-hidden /> {detailsMessage}</p>}
                <button type="button" onClick={saveDetails} disabled={isSavingDetails} className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 bg-accent px-6 font-semibold text-primary transition-colors hover:bg-accent/90 disabled:cursor-wait disabled:opacity-60">
                  {isSavingDetails ? "Saving…" : "Save account details"} <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              </section>
              <div className="min-w-0 space-y-5">
                <div className="border border-primary/15 bg-primary p-5 text-white sm:p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-accent">Your information</p>
                  <h3 className="mt-3 font-display text-xl font-semibold">Only the context this topic needs.</h3>
                  <p className="mt-3 text-sm leading-6 text-white/75">The assistant receives this account’s goal, timeframe, and relevant planning preferences—not your separate personal profile fields.</p>
                </div>
                <ConsultingChat key={`${account.id}-details`} account={account} topic="details" />
              </div>
            </div>
          )}

          {view === "news" && (
            <div className="mt-5">
              <div className="flex flex-col gap-4 border-b border-primary/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-secondary">02 · News & information</p>
                  <h2 className="mt-3 break-words font-display text-2xl font-bold sm:text-3xl">Explore a theme, not a trading signal.</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/70">These briefs are fictional interface samples from the demo dashboard. They are not sourced, verified, or current news.</p>
                </div>
                <span className="inline-flex min-h-9 items-center self-start border border-risk/30 bg-risk/10 px-3 text-xs font-bold uppercase tracking-[0.08em] text-primary sm:self-auto">Illustrative samples · not live</span>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {SAMPLE_BRIEFS.map((brief) => (
                  <article key={brief.id} className="flex min-w-0 flex-col border border-primary/15 bg-white p-4 sm:p-6">
                    <p className="text-xs font-bold uppercase tracking-widest text-secondary">{brief.tag} · sample brief</p>
                    <h3 className="mt-3 wrap-anywhere font-display text-lg font-semibold leading-7">{brief.headline}</h3>
                    <p className="mt-3 flex-1 text-sm leading-6 text-ink/70">{brief.summary}</p>
                    <button
                      type="button"
                      onClick={() => setSelectedBriefId(brief.id)}
                      aria-expanded={selectedBriefId === brief.id}
                      aria-controls={`news-chat-${account.id}-${brief.id}`}
                      className="mt-5 inline-flex min-h-11 items-center gap-2 self-start text-sm font-semibold text-primary underline decoration-accent decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      <MessageCircle className="h-4 w-4" aria-hidden /> Ask about this sample
                    </button>
                    {selectedBriefId === brief.id && (
                      <div id={`news-chat-${account.id}-${brief.id}`} className="mt-5 border-t border-primary/10 pt-5">
                        <ConsultingChat
                          key={`${account.id}-news-${brief.id}`}
                          account={account}
                          topic="news"
                          context={`Fictional illustrative brief. Headline: ${brief.headline}. Summary: ${brief.summary}. Topic label: ${brief.tag}. This is not a verified news story, source, or live market update.`}
                          sessionScope={brief.id}
                        />
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </div>
          )}

          {view === "what-if" && (
            <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.72fr)]">
              <section className="min-w-0 border border-primary/15 bg-white p-4 sm:p-8" aria-labelledby="scenario-title">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-secondary">03 · What If</p>
                <h2 id="scenario-title" className="mt-3 break-words font-display text-2xl font-bold sm:text-3xl">What if you withdrew some money now?</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/70">Compare leaving the full balance invested with withdrawing an amount today and leaving the rest invested for the selected period.</p>

                <div className="mt-7 grid min-w-0 gap-5 sm:grid-cols-2">
                  <Field label="Current account balance (USD)" id="scenario-balance" type="number" min="0" max="100000000" value={balance} onChange={setBalance} />
                  <Field label="Amount to withdraw now (USD)" id="scenario-withdrawal" type="number" min="0" max="100000000" value={withdrawal} onChange={setWithdrawal} />
                  <Field label="Years until your goal" id="scenario-years" type="number" min="1" max="50" value={years} onChange={setYears} />
                </div>
                <button type="button" onClick={runScenario} className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 bg-accent px-6 font-semibold text-primary transition-colors hover:bg-accent/90">
                  Compare scenarios <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
                {scenarioError && <p role="alert" className="mt-4 text-sm font-medium text-risk">{scenarioError}</p>}

                {scenarioResults && scenarioInput && scenarioIsCurrent && (
                  <div className="mt-8 border-t border-primary/10 pt-6" aria-live="polite">
                    <div className="flex items-start gap-3">
                      <TrendingDown className="mt-1 h-5 w-5 shrink-0 text-secondary" aria-hidden />
                      <div>
                        <h3 className="font-display text-xl font-semibold">Illustrative value after {scenarioInput.years} years</h3>
                        <p className="mt-2 text-sm leading-6 text-ink/70">Withdrawing {money.format(scenarioInput.withdrawal)} now leaves {money.format(scenarioInput.balance - scenarioInput.withdrawal)} invested.</p>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-3 md:hidden">
                      {scenarioResults.map((result) => (
                        <article key={result.annualReturn} className="min-w-0 border border-primary/15 bg-light-surface p-4">
                          <h4 className="font-display text-base font-semibold">{(result.annualReturn * 100).toFixed(0)}% annual return scenario</h4>
                          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-4">
                            <div className="min-w-0">
                              <dt className="text-xs leading-5 text-secondary">No withdrawal</dt>
                              <dd className="mt-1 wrap-anywhere text-sm font-semibold">{money.format(result.withoutWithdrawal)}</dd>
                            </div>
                            <div className="min-w-0">
                              <dt className="text-xs leading-5 text-secondary">Withdraw now</dt>
                              <dd className="mt-1 wrap-anywhere text-sm font-semibold">{money.format(result.afterWithdrawal)}</dd>
                            </div>
                            <div className="col-span-2 min-w-0 border-t border-primary/10 pt-3">
                              <dt className="text-xs leading-5 text-secondary">Difference at goal, including the withdrawal</dt>
                              <dd className="mt-1 wrap-anywhere text-sm font-semibold">{money.format(result.futureValueDifference)}</dd>
                            </div>
                          </dl>
                        </article>
                      ))}
                    </div>
                    <div className="mt-5 hidden min-w-0 max-w-full overflow-x-auto md:block">
                      <table className="w-full min-w-136 text-left text-sm">
                        <caption className="sr-only">Illustrative future account values at different fixed return assumptions</caption>
                        <thead>
                          <tr className="border-b border-primary/15 text-xs font-bold uppercase tracking-[0.08em] text-secondary">
                            <th className="pb-3 pr-4">Assumed return</th>
                            <th className="pb-3 pr-4">No withdrawal</th>
                            <th className="pb-3 pr-4">Withdraw now</th>
                            <th className="pb-3">Difference at goal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scenarioResults.map((result) => (
                            <tr key={result.annualReturn} className="border-b border-primary/10 last:border-0">
                              <th scope="row" className="py-4 pr-4 font-semibold">{(result.annualReturn * 100).toFixed(0)}% / year</th>
                              <td className="py-4 pr-4">{money.format(result.withoutWithdrawal)}</td>
                              <td className="py-4 pr-4">{money.format(result.afterWithdrawal)}</td>
                              <td className="py-4 font-semibold">{money.format(result.futureValueDifference)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-4 text-xs leading-5 text-secondary">
                      The difference includes the withdrawn amount and the growth it might otherwise have earned; it is not a loss estimate. Assumptions: fixed -5%, 2%, 5%, and 8% annual returns, compounded monthly. These scenarios are not probabilities. The calculation excludes fees, taxes, inflation, and additional contributions; it does not predict an actual result.
                    </p>
                    {scenarioInput.withdrawal === 0 && <p className="mt-3 text-xs leading-5 text-secondary">A zero withdrawal makes both scenarios equal by design.</p>}
                  </div>
                )}
                {scenarioResults && scenarioInput && !scenarioIsCurrent && <p role="status" className="mt-5 text-sm text-secondary">Your inputs changed. Run the comparison again to update the results.</p>}
              </section>

              <div className="min-w-0 space-y-5">
                <aside className="border border-risk/30 bg-risk/10 p-5 sm:p-6" aria-label="Scenario limitations">
                  <ShieldAlert className="h-5 w-5 text-risk" aria-hidden />
                  <h3 className="mt-3 font-display text-lg font-semibold">An illustration, not a forecast.</h3>
                  <p className="mt-2 text-sm leading-6 text-primary/80">The four fixed return assumptions include one negative and three positive examples for comparing compounding effects; they are not probabilities. Actual returns vary, including losses. No fees, taxes, inflation, or future deposits are modeled.</p>
                </aside>
                <ConsultingChat
                  key={`${account.id}-what-if`}
                  account={account}
                  topic="what-if"
                  context={scenarioContext}
                />
              </div>
            </div>
          )}

          {view === "general" && (
            <div className="mx-auto mt-5 max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-secondary">Account conversation</p>
              <h2 className="mt-3 wrap-anywhere font-display text-2xl font-bold sm:text-3xl">Ask about {account.accountName}.</h2>
              <p className="mt-3 text-sm leading-6 text-ink/70">Talk through the goal and planning trade-offs for this account.</p>
              <div className="mt-6">
                <ConsultingChat key={`${account.id}-general`} account={account} topic="general" />
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Field({ label, id, value, onChange, placeholder, type = "text", min, max, maxLength }: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "number";
  min?: string;
  max?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-primary">{label}</label>
      <input
        id={id}
        type={type}
        min={min}
        max={max}
        maxLength={type === "text" ? maxLength : undefined}
        step={type === "number" && id === "scenario-years" ? 1 : "any"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 min-h-12 w-full border border-primary/20 bg-light-surface px-4 text-sm text-primary outline-none placeholder:text-secondary/55 focus:border-primary focus:ring-2 focus:ring-accent/40"
      />
    </div>
  );
}
