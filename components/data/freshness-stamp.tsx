"use client";

import { useSyncExternalStore } from "react";

/**
 * specs/04-design/design-system.md — FreshnessStamp.
 *
 * The relative time is computed in the browser from the `fetched_at` the page was built
 * with, not baked in at build time. A build-time string freezes whenever the pipeline has
 * nothing to commit, and a stamp reading "fetched 4 hours ago" three weeks later is the
 * exact dishonesty this site exists to avoid.
 *
 * The absolute date renders on the server and is replaced by the relative form once the
 * clock store has a value, so there is no hydration mismatch and the page stays correct
 * with JavaScript disabled.
 */

const STALE_AFTER_DAYS = 7;
const TICK_MS = 60_000;

/** One clock shared by every stamp on the page, so N stamps are not N intervals. */
const clock = (() => {
  const listeners = new Set<() => void>();
  let now = 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (timer === null) {
        now = Date.now();
        timer = setInterval(() => {
          now = Date.now();
          for (const notify of listeners) notify();
        }, TICK_MS);
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && timer !== null) {
          clearInterval(timer);
          timer = null;
        }
      };
    },
    // Stable between notifications, which is what useSyncExternalStore requires.
    getSnapshot: () => (now === 0 ? (now = Date.now()) : now),
    getServerSnapshot: () => null,
  };
})();

export function relativeTime(fetchedAt: string, now: number): string {
  const then = Date.parse(fetchedAt);
  if (Number.isNaN(then)) return "at an unknown time";

  const minutes = Math.round((now - then) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function isStale(fetchedAt: string, now: number): boolean {
  const then = Date.parse(fetchedAt);
  if (Number.isNaN(then)) return true;
  return now - then > STALE_AFTER_DAYS * 86_400_000;
}

export function formatIsoDate(value: string): string {
  return value.slice(0, 10);
}

export function FreshnessStamp({
  fetchedAt,
  label = "fetched",
  failed = false,
}: {
  fetchedAt: string | null;
  label?: string;
  failed?: boolean;
}) {
  const now = useSyncExternalStore(clock.subscribe, clock.getSnapshot, clock.getServerSnapshot);

  if (fetchedAt === null) {
    return (
      <span className="text-xs" style={{ color: "var(--stale)" }}>
        never fetched successfully
      </span>
    );
  }

  const stale = now !== null && isStale(fetchedAt, now);
  const text =
    now === null
      ? `${label} ${formatIsoDate(fetchedAt)}`
      : `${label} ${relativeTime(fetchedAt, now)}`;

  return (
    <span
      className="text-xs whitespace-nowrap"
      style={{ color: stale || failed ? "var(--stale)" : "var(--ink-mute)" }}
      title={`Fetched at ${fetchedAt}`}
    >
      {failed ? `last successful fetch ${formatIsoDate(fetchedAt)}` : text}
      {stale && !failed ? " — stale" : ""}
    </span>
  );
}
