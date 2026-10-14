import {
  BarChart3,
  Target,
  ShieldCheck,
  MessageCircle,
  Clock,
  Coins,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { CountUp, ScrollAnimations } from "@/components/scroll-animations";
import { MakePlanLink } from "../components/make-plan-link";
import styles from "./home.module.css";

const features = [
  {
    Icon: BarChart3,
    number: "01",
    title: "See the full picture",
    text: "Get a clearer view of what you have, what you owe, and where your money can go next.",
  },
  {
    Icon: Target,
    number: "02",
    title: "Plan around your life",
    text: "Turn goals like a first home, more flexibility, or retirement into steps you can act on.",
  },
  {
    Icon: ShieldCheck,
    number: "03",
    title: "Choose with confidence",
    text: "Understand the trade-offs and risks before making a decision that affects your future.",
  },
  {
    Icon: MessageCircle,
    number: "04",
    title: "Talk it through",
    text: "Get a second perspective when you need help making sense of your options.",
  },
];

const steps = [
  { number: "I", title: "Start with a conversation", text: "Tell us what matters to you and what you want your money to make possible." },
  { number: "II", title: "Get a plan that fits", text: "Review a practical next step shaped around your goals and comfort with risk." },
  { number: "III", title: "Make progress at your pace", text: "Check in, ask questions, and adjust your plan as life changes." },
];

const reasons = [
  { Icon: Clock, title: "Time can be an advantage", text: "Starting earlier gives a long-term plan more time to grow, though returns are never guaranteed." },
  { Icon: Coins, title: "Small steps still count", text: "A thoughtful plan can help make consistent choices feel more manageable." },
];

const projection = [
  { label: "NOW", height: "h-3" },
  { label: "5Y", height: "h-5" },
  { label: "10Y", height: "h-8" },
  { label: "20Y", height: "h-12" },
  { label: "30Y", height: "h-16" },
];

const planHighlights = [
  { Icon: Sparkles, title: "Personalized from the start", text: "Your goals, life stage, and comfort with risk shape the route." },
  { Icon: CheckCircle2, title: "One clear next move", text: "No clutter—just the action that matters most right now." },
  { Icon: ShieldCheck, title: "Built with context in mind", text: "We slow the noise down so trade-offs feel easier to compare." },
];

export default function Page() {
  return (
    <div className={`${styles.home} min-h-screen overflow-x-hidden bg-light-surface text-primary`}>
      <ScrollAnimations />
      <header className="sticky top-0 z-30 border-b border-primary/10 bg-light-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <a href="#home" className="font-display text-sm font-bold text-primary sm:text-base">
           {process.env.NEXT_PUBLIC_APP_NAME || "CAN'T LOAD ENV"}<span className="text-accent">.</span>
          </a>
          <nav aria-label="Main navigation" className="hidden items-center gap-8 text-sm font-medium text-primary/70 md:flex">
            <a className="transition-colors hover:text-primary" href="#features">What you get</a>
            <a className="transition-colors hover:text-primary" href="#how-it-works">How it works</a>
            <a className="transition-colors hover:text-primary" href="#why-invest">Why plan</a>
          </nav>
        </div>
      </header>

      <main>
        <section id="home" className="scroll-mt-16 border-b border-primary/10 bg-light-surface">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 sm:py-16 md:grid-cols-[1.08fr_0.92fr] md:items-center md:gap-16 md:py-24">
            <div data-reveal>
              <p className="mb-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-secondary">
                <span className="h-px w-8 bg-accent" /> A clearer next step
              </p>
              <h1 className="max-w-3xl font-display text-[42px] font-bold leading-[1.04] text-primary sm:text-6xl md:text-7xl">
                Make your money work toward a life you choose.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-ink/70 sm:text-lg">
                Personal guidance for your goals, your questions, and the decisions you would rather make with confidence.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <MakePlanLink
                  label="Find your next step"
                  className="inline-flex min-h-12 items-center justify-center gap-3 bg-accent px-6 font-semibold text-primary transition-colors hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                />
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[28px] border border-primary/10 bg-primary p-6 text-white shadow-lg shadow-primary/10 sm:p-8" data-reveal style={{ transitionDelay: "120ms" }}>
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.2) 1px, transparent 1px)", backgroundSize: "28px 28px" }} aria-hidden />
              <div className="relative">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Long-view path</p>
                  <span className="rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/80">Illustrative</span>
                </div>
                <p className="mt-8 text-sm text-white/75"><CountUp value={10000} prefix="$" /> invested once</p>
                <p className="mt-1 font-display text-5xl font-bold text-white sm:text-6xl"><CountUp value={76123} prefix="$" /></p>
                <p className="mt-2 text-sm text-white/75">after 30 years at an assumed 7% annual return</p>
                <p className="mt-6 text-sm leading-6 text-white/75">The right next step is often the one that lowers uncertainty and keeps you moving with purpose.</p>
                <div role="img" aria-label="Illustrative investment growth over 30 years" className="mt-8 flex h-28 items-end justify-between gap-3 border-b border-white/30 px-2" data-reveal>
                  {projection.map(({ label, height }, index) => (
                    <div key={label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                      <span data-reveal="bar" style={{ transitionDelay: `${index * 90}ms` }} className={`w-full max-w-10 ${height} ${label === "30Y" ? "bg-growth" : "bg-accent"}`} />
                      <span className="pb-2 text-[10px] font-medium text-white/65">{label}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs leading-5 text-white/65">
                  Example only. Assumes compounding and a steady return; <span className="text-risk">real returns vary</span> and are not guaranteed.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-16 px-5 py-16 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary" data-reveal>A plan that starts with you</p>
                <h2 className="mt-4 max-w-xl font-display text-3xl font-bold leading-tight text-primary sm:text-4xl" data-reveal>
                  Clarity for the decisions that matter.
                </h2>
              </div>
              <p className="max-w-xl text-base leading-7 text-ink/70" data-reveal>
                Good guidance makes the bigger picture easier to understand, without losing sight of what matters most today.
              </p>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {planHighlights.map(({ Icon, title, text }, index) => (
                <div key={title} data-reveal style={{ transitionDelay: `${index * 90}ms` }} className="rounded-3xl border border-primary/10 bg-white p-5 shadow-sm shadow-primary/5 sm:p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/12 text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="mt-5 font-display text-xl font-semibold text-primary">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink/70">{text}</p>
                </div>
              ))}
            </div>

            <div className="mt-12">
              <ul className="divide-y divide-primary/15 rounded-3xl border border-primary/10 bg-white/60">
                {features.map(({ Icon, number, title, text }, index) => (
                  <li key={number} data-reveal style={{ transitionDelay: `${index * 80}ms` }} className="grid grid-cols-[2.5rem_2rem_1fr] gap-3 px-5 py-5 sm:grid-cols-[3rem_2.5rem_1fr] sm:gap-5 sm:px-6">
                    <span className="pt-1 font-mono text-xs font-semibold text-secondary">{number}</span>
                    <Icon className="mt-0.5 h-5 w-5 text-primary" aria-hidden />
                    <div>
                      <h3 className="font-display text-lg font-semibold text-primary">{title}</h3>
                      <p className="mt-1 text-sm leading-6 text-ink/65">{text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-16 bg-primary px-5 py-16 text-white sm:px-8 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent" data-reveal>The process</p>
            <h2 className="mt-4 max-w-2xl font-display text-3xl font-bold leading-tight sm:text-5xl" data-reveal>
              A few good steps. A direction that feels like yours.
            </h2>
            <ol className="mt-10 grid gap-8 border-t border-white/25 pt-6 md:grid-cols-3 md:gap-10">
              {steps.map(({ number, title, text }, index) => (
                <li key={number} data-reveal style={{ transitionDelay: `${index * 100}ms` }}>
                  <p className="font-mono text-sm font-semibold text-accent">{number}</p>
                  <h3 className="mt-5 font-display text-xl font-semibold">{title}</h3>
                  <p className="mt-3 max-w-sm text-sm leading-6 text-white/75">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="why-invest" className="scroll-mt-16 bg-light-surface px-5 py-16 sm:px-8 sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary" data-reveal>Think long term</p>
              <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-primary sm:text-4xl" data-reveal>
                Your future is built one decision at a time.
              </h2>
            </div>
            <div>
              <p className="max-w-2xl text-base leading-7 text-ink/75" data-reveal>
                Investing involves uncertainty. A plan can help you understand the risks, keep your goals in view, and make choices at a pace that works for you.
              </p>
              <ul className="mt-8">
                {reasons.map(({ Icon, title, text }, index) => (
                  <li key={title} data-reveal style={{ transitionDelay: `${index * 100}ms` }} className="flex gap-4 border-t border-secondary/15 py-5">
                    <Icon className="mt-1 h-5 w-5 shrink-0 text-secondary" aria-hidden />
                    <div>
                      <h3 className="font-display text-lg font-semibold text-primary">{title}</h3>
                      <p className="mt-1 text-sm leading-6 text-ink/70">{text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

      </main>

      <footer className="bg-primary px-5 py-8 text-white sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-display text-sm font-bold">{process.env.NEXT_PUBLIC_APP_NAME || "CAN'T LOAD ENV"}<span className="text-accent">.</span></p>
            <p className="mt-2 max-w-xl text-xs leading-5 text-white/65">
              Investing involves risk, including possible loss of principal. Examples are for illustration only and are not financial advice.
            </p>
          </div>
          <a href="#home" className="text-sm font-medium text-white/80 transition-colors hover:text-white">Back to top ↑</a>
        </div>
      </footer>
    </div>
  );
}
