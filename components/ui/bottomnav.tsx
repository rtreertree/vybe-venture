"use client";

import { useEffect, useState } from "react";
import { Home, LayoutGrid, TrendingUp } from "lucide-react";

const items = [
  { id: "home", label: "Home", Icon: Home },
  { id: "features", label: "What it does", Icon: LayoutGrid },
  { id: "why-invest", label: "Why invest", Icon: TrendingUp },
] as const;

/** Fixed bottom tab bar. Active tab = Royal Blue, tracked by scroll position. */
export function BottomNav() {
  const [active, setActive] = useState<string>("home");

  useEffect(() => {
    const sections = items.map((i) => document.getElementById(i.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => e.isIntersecting && setActive(e.target.id));
      },
      { rootMargin: "-45% 0px -50% 0px" } // thin band across the middle of the screen
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  return (
    <nav
      aria-label="Page sections"
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 border-t-2 border-royal/15 bg-canvas/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="grid grid-cols-3">
        {items.map(({ id, label, Icon }) => {
          const on = active === id;
          return (
            <li key={id}>
              <a
                href={`#${id}`}
                aria-current={on ? "true" : undefined}
                className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition-colors ${
                  on ? "text-royal" : "text-ink/50"
                }`}
              >
                <span
                  className={`absolute -top-[2px] h-[3px] rounded-full bg-royal transition-all duration-200 ${
                    on ? "w-10 opacity-100" : "w-0 opacity-0"
                  }`}
                />
                <Icon className="h-5 w-5" strokeWidth={on ? 2.4 : 1.9} aria-hidden />
                {label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default BottomNav;
