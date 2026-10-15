"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import type { PriceScoreChart as Chart } from "@/components/leaderboard/price-score-chart";

/**
 * The price chart, drawn only when the reader gets near it.
 *
 * It sits under 25 rows, so on a phone it is thousands of pixels below the first screen —
 * and drawing it on load meant building and hydrating a couple of hundred SVG nodes during
 * the page's busiest moment, for something most visits never scroll to. Its code is split
 * out and fetched with it.
 *
 * The placeholder holds roughly the chart's height, so nothing below it jumps when it draws.
 * Where IntersectionObserver is missing the chart simply draws at once.
 */

const PriceScoreChart = dynamic(
  () =>
    import("@/components/leaderboard/price-score-chart").then((m) => m.PriceScoreChart),
  {
    ssr: false,
    loading: () => <div className="mt-10 min-h-[26rem]" aria-hidden="true" />,
  },
);

export function LazyPriceScoreChart(props: ComponentProps<typeof Chart>) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (element === null) return;
    if (typeof IntersectionObserver === "undefined") {
      // Nothing to wait for; an observer callback is where this would otherwise happen.
      queueMicrotask(() => setNear(true));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return near ? (
    <PriceScoreChart {...props} />
  ) : (
    <div ref={ref} className="mt-10 min-h-[26rem]" aria-hidden="true" />
  );
}
