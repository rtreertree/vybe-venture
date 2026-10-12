"use client";

import { useEffect, useRef, useState } from "react";

export function ScrollAnimations() {
  useEffect(() => {
    const root = document.documentElement;
    const previousScrollRestoration = window.history.scrollRestoration;
    const previousScrollBehavior = root.style.scrollBehavior;
    window.history.scrollRestoration = "manual";
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    root.style.scrollBehavior = previousScrollBehavior;

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) {
      return () => {
        window.history.scrollRestoration = previousScrollRestoration;
      };
    }

    const selector = "[data-reveal], header, header a, main h1, main h2, main h3, main p, main li, main a, footer p, footer a";
    const elements = document.querySelectorAll<HTMLElement>(selector);
    const siblingCounts = new Map<HTMLElement, number>();

    elements.forEach((element) => {
      element.removeAttribute("data-revealed");
      if (!element.hasAttribute("data-reveal")) {
        element.setAttribute("data-reveal", "true");
      }

      const parent = element.parentElement;
      if (!parent || element.style.transitionDelay) return;

      const siblingIndex = siblingCounts.get(parent) ?? 0;
      element.style.setProperty("--reveal-delay", `${Math.min(siblingIndex, 4) * 100}ms`);
      siblingCounts.set(parent, siblingIndex + 1);
    });

    root.classList.add("motion-ready");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.setAttribute("data-revealed", "true");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    elements.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
      root.classList.remove("motion-ready");
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  return null;
}

type CountUpProps = {
  value: number;
  prefix?: string;
  duration?: number;
  className?: string;
};

export function CountUp({
  value,
  prefix = "",
  duration = 2400,
  className,
}: CountUpProps) {
  const numberRef = useRef<HTMLSpanElement>(null);
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const element = numberRef.current;
    if (
      !element ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) {
      return;
    }

    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;

      observer.disconnect();
      let startTime: number | undefined;

      const tick = (time: number) => {
        startTime ??= time;
        const progress = Math.min((time - startTime) / duration, 1);
        const easedProgress = 1 - (1 - progress) ** 3;
        setDisplayValue(Math.round(value * easedProgress));

        if (progress < 1) frame = requestAnimationFrame(tick);
      };

      frame = requestAnimationFrame(tick);
    }, { threshold: 0.5 });

    observer.observe(element);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [duration, value]);

  const formattedValue = `${prefix}${displayValue.toLocaleString("en-US")}`;
  const accessibleValue = `${prefix}${value.toLocaleString("en-US")}`;

  return (
    <span ref={numberRef} className={className}>
      <span aria-hidden="true">{formattedValue}</span>
      <span className="sr-only">{accessibleValue}</span>
    </span>
  );
}