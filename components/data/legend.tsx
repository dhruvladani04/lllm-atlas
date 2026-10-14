import type { ReactNode } from "react";

/**
 * specs/04-design/design-system.md — a key for the marks a table uses.
 *
 * Always visible and placed *above* the rows it explains, for the same reason the shared
 * caveats are: a reader should meet the meaning of `~` before the first `~`, not after 25
 * rows of them. Each mark also carries a `title` where it appears; this is the place that
 * works on touch, in print and for a screen reader, which a tooltip is not.
 */

export interface LegendItem {
  mark: ReactNode;
  meaning: string;
}

export function Legend({ items, label = "Key" }: { items: LegendItem[]; label?: string }) {
  return (
    <dl
      aria-label={label}
      className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-ink-mute"
    >
      {items.map((item) => (
        <div key={item.meaning} className="flex items-baseline gap-1.5">
          <dt className="text-ink">{item.mark}</dt>
          <dd>{item.meaning}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The marks shared by every table that shows a model and its numbers. */
export const MODEL_TABLE_MARKS: LegendItem[] = [
  { mark: <span className="font-mono">ind.</span>, meaning: "independently measured" },
  { mark: <span className="font-mono">vendor</span>, meaning: "reported by the model's maker" },
  { mark: "~", meaning: "OpenRouter's routed price, not a list price" },
  { mark: "◇", meaning: "open weights" },
  { mark: <span className="font-mono">(max)</span>, meaning: "the setting a score was measured at" },
  { mark: "—", meaning: "not reported" },
];
