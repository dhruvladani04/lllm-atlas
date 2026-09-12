import type { ReactNode } from "react";
import type { HealthFlag, JoinedScore } from "@/lib/schemas/score";
import type { Benchmark } from "@/lib/schemas/benchmark";
import type { QuotedNumber } from "@/lib/schemas/common";

/**
 * The components whose behaviour specs/04-design/design-system.md fixes.
 *
 * Colour never travels alone here: every status carries a label or a glyph, so the meaning
 * survives colour blindness, greyscale printing and disabled CSS.
 */

/** Never an em dash, never a zero, never a blank cell. */
export function MissingValue({ reason }: { reason: string }) {
  return (
    <span className="text-ink-mute" title={reason}>
      not reported
    </span>
  );
}

export function ProvenanceBadge({
  provenance,
}: {
  provenance: "independent" | "vendor-reported" | "mixed";
}) {
  const label =
    provenance === "independent" ? "ind." : provenance === "mixed" ? "mixed" : "vendor";
  const title =
    provenance === "independent"
      ? "Independently measured"
      : provenance === "mixed"
        ? "Both independent and vendor-reported numbers exist"
        : "Reported by the model's own vendor";

  return (
    <span
      title={title}
      className="font-mono text-xs"
      style={{
        color: provenance === "independent" ? "var(--ink-mute)" : "var(--provenance-vendor)",
      }}
    >
      {label}
    </span>
  );
}

const STATUS_GLYPH: Record<Benchmark["status"], string> = {
  active: "●",
  "nearing-saturation": "◐",
  saturated: "○",
  deprecated: "×",
};

const STATUS_LABEL: Record<Benchmark["status"], string> = {
  active: "active",
  "nearing-saturation": "nearing saturation",
  saturated: "saturated",
  deprecated: "deprecated",
};

const STATUS_COLOUR: Record<Benchmark["status"], string> = {
  active: "var(--status-active)",
  "nearing-saturation": "var(--status-nearing)",
  saturated: "var(--status-saturated)",
  deprecated: "var(--status-deprecated)",
};

export function StatusChip({ status }: { status: Benchmark["status"] }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs whitespace-nowrap"
      style={{ color: STATUS_COLOUR[status] }}
    >
      <span aria-hidden="true">{STATUS_GLYPH[status]}</span>
      {STATUS_LABEL[status]}
    </span>
  );
}

const FLAG_LABEL: Record<HealthFlag, { short: string; glyph: string; title: string }> = {
  saturated: {
    short: "saturated",
    glyph: "○",
    title: "This benchmark no longer separates strong models from weak ones",
  },
  deprecated: {
    short: "deprecated",
    glyph: "×",
    title: "This benchmark is no longer maintained",
  },
  "high-contamination": {
    short: "contaminated",
    glyph: "!",
    title: "High risk that this benchmark's test set is in training data",
  },
  "vendor-reported-only": {
    short: "vendor only",
    glyph: "v",
    title: "No independent measurement of this number exists",
  },
  superseded: {
    short: "superseded",
    glyph: "→",
    title: "A successor benchmark exists",
  },
  "stale-source": {
    short: "stale",
    glyph: "~",
    title: "This number was fetched more than seven days ago",
  },
};

const FLAG_COLOUR: Record<HealthFlag, string> = {
  saturated: "var(--status-saturated)",
  deprecated: "var(--status-deprecated)",
  "high-contamination": "var(--risk-high)",
  "vendor-reported-only": "var(--provenance-vendor)",
  superseded: "var(--ink-mute)",
  "stale-source": "var(--stale)",
};

export function HealthFlags({ flags }: { flags: readonly HealthFlag[] }) {
  if (flags.length === 0) {
    return (
      <span className="text-xs text-ink-mute" title="No health warnings on this benchmark">
        clear
      </span>
    );
  }

  return (
    <span className="flex flex-wrap gap-x-2 gap-y-0.5">
      {flags.map((flag) => (
        <span
          key={flag}
          title={FLAG_LABEL[flag].title}
          className="text-xs whitespace-nowrap"
          style={{ color: FLAG_COLOUR[flag] }}
        >
          <span aria-hidden="true">{FLAG_LABEL[flag].glyph} </span>
          {FLAG_LABEL[flag].short}
        </span>
      ))}
    </span>
  );
}

export function formatScore(value: number, unit: JoinedScore["unit"]): string {
  if (unit === "percent") return `${value.toFixed(1)}%`;
  if (unit === "elo") return Math.round(value).toString();
  if (unit === "usd") return `$${value.toFixed(2)}`;
  return value.toFixed(1);
}

/**
 * A saturated benchmark's score renders recessed — the number is not wrong, it simply no
 * longer means much, and greying it is a stronger signal than colouring it.
 */
export function ScoreCell({ score }: { score: JoinedScore }) {
  const recessed = score.health_flags.includes("saturated") ||
    score.health_flags.includes("deprecated");

  return (
    <span className="tabular whitespace-nowrap" style={{ color: recessed ? "var(--ink-mute)" : "var(--ink)" }}>
      {formatScore(score.value, score.unit)}
      {score.confidence_interval !== null ? (
        <span className="text-ink-mute"> ±{score.confidence_interval}</span>
      ) : null}
    </span>
  );
}

export function QuotedValue({
  quoted,
  format,
  missingReason,
}: {
  quoted: QuotedNumber | null;
  format: (value: number) => string;
  missingReason: string;
}) {
  if (quoted === null) return <MissingValue reason={missingReason} />;

  return (
    <span className="tabular whitespace-nowrap">
      {format(quoted.value)}
      {quoted.quoted_by === "openrouter" ? (
        <span
          className="text-ink-mute"
          title="OpenRouter's routed price, not the vendor's list price — the vendor's own page could not be read"
        >
          {" "}
          ~
        </span>
      ) : null}
    </span>
  );
}

export function Panel({ children }: { children: ReactNode }) {
  return <div className="border border-rule bg-surface p-4">{children}</div>;
}
