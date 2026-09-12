import type { ReactNode } from "react";

/**
 * specs/03-sections/evals.md — `<Callout type="warning|note|pitfall">`. `pitfall` is the
 * common one here: most of what this section has to say is about what a measure misses.
 *
 * Colour is not the only carrier; each type states what it is.
 */
const LABEL = {
  warning: "Warning",
  note: "Note",
  pitfall: "Common pitfall",
} as const;

const COLOUR = {
  warning: "var(--risk-medium)",
  note: "var(--ink-mute)",
  pitfall: "var(--risk-high)",
} as const;

export function Callout({
  type = "note",
  children,
}: {
  type?: keyof typeof LABEL;
  children: ReactNode;
}) {
  return (
    <aside className="my-6 border-l-2 pl-4" style={{ borderColor: COLOUR[type] }}>
      <p className="text-xs font-medium" style={{ color: COLOUR[type] }}>
        {LABEL[type]}
      </p>
      <div className="mt-1 [&>p]:mt-2 [&>p:first-child]:mt-0">{children}</div>
    </aside>
  );
}
