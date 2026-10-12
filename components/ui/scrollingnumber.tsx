"use client";

export type MarqueeStat = {
  value: string;
  label: string;
  company: string;
};

const DEFAULT_STATS: MarqueeStat[] = [
  { value: "20 days", label: "saved on builds", company: "NETFLIX" },
  { value: "98%", label: "faster deployment", company: "STRIPE" },
  { value: "300%", label: "throughput increase", company: "LINEAR" },
  { value: "6x", label: "faster to ship", company: "NOTION" },
];

type StatsMarqueeProps = {
  stats?: MarqueeStat[];
  durationSeconds?: number;
  className?: string;
};

/**
 * THEME VARIABLES
 * Change the defaults below, or override from anywhere (globals.css,
 * a parent element, the className prop) with the same variable names:
 *
 *   --marquee-font-value     big number
 *   --marquee-font-label     description text
 *   --marquee-font-company   company name
 *   --marquee-color-value    big number
 *   --marquee-color-label    description text
 *   --marquee-color-company  company name
 *
 * Defaults sit inside :where(), which has zero specificity, so any
 * override you write will win without needing !important.
 */
export function StatsMarquee({
  stats = DEFAULT_STATS,
  durationSeconds = 30,
  className = "",
}: StatsMarqueeProps) {
  return (
    <div
      className={`stats-marquee-root relative w-full overflow-hidden ${className}`}
      aria-label="Customer results"
    >
      <style>{`
        :where(.stats-marquee-root) {
          --marquee-font-value: ui-monospace, SFMono-Regular, Menlo, monospace;
          --marquee-font-label: inherit;
          --marquee-font-company: var(--marquee-font-value);

          --marquee-color-value: currentColor;
          --marquee-color-label: color-mix(in srgb, currentColor 60%, transparent);
          --marquee-color-company: var(--marquee-color-label);
        }

        .stats-marquee-value {
          font-family: var(--marquee-font-value);
          color: var(--marquee-color-value);
        }
        .stats-marquee-label {
          font-family: var(--marquee-font-label);
          color: var(--marquee-color-label);
        }
        .stats-marquee-company {
          font-family: var(--marquee-font-company);
          color: var(--marquee-color-company);
        }

        @keyframes stats-marquee-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .stats-marquee-track {
          animation: stats-marquee-scroll var(--stats-marquee-duration) linear infinite;
        }
        .stats-marquee-root:hover .stats-marquee-track {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .stats-marquee-track { animation: none; }
        }
      `}</style>

      <div
        className="stats-marquee-track flex w-max gap-16 whitespace-nowrap"
        style={{ ["--stats-marquee-duration" as string]: `${durationSeconds}s` }}
      >
        {[0, 1].map((copy) => (
          <ul
            key={copy}
            className="flex gap-16"
            aria-hidden={copy === 1 ? true : undefined}
          >
            {stats.map((stat) => (
              <li
                key={`${stat.company}-${copy}`}
                className="flex items-baseline gap-4"
              >
                <span className="stats-marquee-value text-4xl lg:text-5xl">
                  {stat.value}
                </span>
                <span className="stats-marquee-label text-sm">
                  {stat.label}
                  <span className="stats-marquee-company mt-1 block text-xs">
                    {stat.company}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

export default StatsMarquee;