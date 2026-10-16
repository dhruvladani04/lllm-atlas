import type { ReactNode } from "react";
import type { Benchmark } from "@/lib/schemas/benchmark";
import type { HealthFlag } from "@/lib/schemas/score";

/**
 * specs/04-design/design-system.md — the link-preview card.
 *
 * One layout for every shared link: the site's mark, a headline, and the facts a reader
 * would need to trust the headline — which benchmark, its status, who measured the number.
 * A preview showing a bare score would be the site's thesis broken in the one place it
 * reaches people who have not visited yet.
 *
 * Rendered by `next/og` at build time, so it uses literal dark-scheme values rather than
 * CSS variables, and flex layout throughout because that is what the renderer supports.
 */

export const OG_SIZE = { width: 1200, height: 630 };

const INK = "#e8e9e4";
const MUTE = "#9ba0a8";
const PAPER = "#101317";
const RULE = "#3a4149";
const ACCENT = "#93c5fd";

const STATUS: Record<Benchmark["status"], { label: string; colour: string }> = {
  active: { label: "active", colour: "#5cbf98" },
  "nearing-saturation": { label: "nearing saturation", colour: "#d9a441" },
  saturated: { label: "saturated", colour: "#9aa096" },
  deprecated: { label: "deprecated", colour: "#f08a86" },
};

/**
 * The status glyph drawn as a shape, not a character: the renderer's built-in font has no
 * ●, ◐ or ○, and a missing glyph would print as a box beside the label. Same meanings as
 * the site — filled, half, hollow, crossed — so colour is never the only carrier.
 */
function Glyph({ status, colour }: { status: Benchmark["status"]; colour: string }) {
  if (status === "deprecated") {
    return <div style={{ display: "flex", fontSize: 30, lineHeight: 1 }}>×</div>;
  }
  return (
    <div
      style={{
        width: 18,
        height: 18,
        borderRadius: 9,
        border: `3px solid ${colour}`,
        backgroundImage:
          status === "active"
            ? `linear-gradient(90deg, ${colour}, ${colour})`
            : status === "nearing-saturation"
              ? `linear-gradient(90deg, ${colour} 50%, transparent 50%)`
              : "none",
      }}
    />
  );
}

export function StatusPill({ status }: { status: Benchmark["status"] }) {
  const { label, colour } = STATUS[status];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        color: colour,
        border: `2px solid ${colour}`,
        borderRadius: 10,
        padding: "6px 16px",
        fontSize: 28,
      }}
    >
      <Glyph status={status} colour={colour} />
      {label}
    </div>
  );
}

export function OgCard({
  eyebrow,
  title,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  footer: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: PAPER,
        color: INK,
        padding: "64px 72px",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30 }}>
        <div style={{ width: 18, height: 18, borderRadius: 4, background: ACCENT }} />
        <div style={{ display: "flex", fontWeight: 600 }}>LLM Atlas</div>
        <div style={{ display: "flex", color: MUTE }}>{eyebrow}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", fontSize: 68, fontWeight: 600, lineHeight: 1.1 }}>
          {title}
        </div>
        {children}
      </div>

      <div
        style={{
          display: "flex",
          borderTop: `2px solid ${RULE}`,
          paddingTop: 24,
          fontSize: 24,
          color: MUTE,
        }}
      >
        {footer}
      </div>
    </div>
  );
}

export const OG_COLOURS = { INK, MUTE };

const FLAG_WORDS: Partial<Record<HealthFlag, string>> = {
  "high-contamination": "high contamination risk",
  "vendor-reported-only": "vendor-reported only",
  superseded: "superseded by a newer benchmark",
  disputed: "disputed",
  "stale-source": "stale source",
};

/**
 * The flags a row carries beyond its status, in words. The status pill already says
 * saturated or deprecated, so those are not repeated.
 */
export function flagSentence(flags: readonly HealthFlag[]): string | null {
  const words = flags
    .map((flag) => FLAG_WORDS[flag])
    .filter((word): word is string => word !== undefined);
  return words.length === 0 ? null : `Also flagged: ${words.join(", ")}.`;
}
