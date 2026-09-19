"use client";

import { useMemo, useState } from "react";
import type { Candidate, Confidence } from "@/lib/schemas/candidate";

/**
 * Bulk review for generated registry candidates. Development only — see the page that
 * renders it.
 *
 * The evidence is shown inline, not behind a link, because the whole point is that a
 * reviewer can judge without leaving. "Select all high-confidence" selects; it does not
 * approve. Submitting writes decisions to a file; a separate command merges them into the
 * registry. Three steps, each reversible, because the registry is what every score on this
 * site is attributed through.
 */

const TIER_ORDER: Confidence[] = ["high", "medium", "low", "conflict"];

const TIER_NOTE: Record<Confidence, string> = {
  high: "Single creator, released recently, measured on several benchmarks. Still worth a glance — a context or budget variant can look like a separate model.",
  medium: "Something is thin: one benchmark, an older release, or no published display name.",
  low: "Old, undated, or the name could not be split from its tier reliably.",
  conflict:
    "Cannot be approved here. Either the registry already claims this name or two candidates collapse to one id — both are merge decisions that belong in the file by hand.",
};

function Evidence({ candidate }: { candidate: Candidate }) {
  const { evidence, proposed } = candidate;
  return (
    <div className="mt-2 space-y-1 text-xs text-ink-mute">
      <p>{evidence.reasons.join(" ")}</p>
      <p>
        <span className="font-mono">{evidence.stem}</span> · {evidence.total_occurrences} rows
        across {evidence.benchmarks.length} benchmark
        {evidence.benchmarks.length === 1 ? "" : "s"}
        {evidence.openrouter ? (
          <> · served by OpenRouter as {evidence.openrouter.id}</>
        ) : (
          <> · not currently served by OpenRouter</>
        )}
      </p>
      <p>
        variants:{" "}
        {proposed.variants
          .map((variant) => `${variant.variant} (${variant.aliases.length} aliases)`)
          .join(", ")}
      </p>
      {evidence.raw_display_names.length > 0 ? (
        <p>names seen: {evidence.raw_display_names.join(" · ")}</p>
      ) : (
        <p>No source published a display name for this model.</p>
      )}
      {evidence.dropped_aliases.length > 0 ? (
        <p>
          dropped, already claimed:{" "}
          {evidence.dropped_aliases
            .map((entry) => `${entry.alias} → ${entry.claimed_by}`)
            .join(", ")}
        </p>
      ) : null}
    </div>
  );
}

export function ReviewList({ candidates }: { candidates: Candidate[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const byTier = useMemo(() => {
    const groups = new Map<Confidence, Candidate[]>();
    for (const tier of TIER_ORDER) groups.set(tier, []);
    for (const candidate of candidates) {
      groups.get(candidate.confidence)?.push(candidate);
    }
    return groups;
  }, [candidates]);

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectTier = (tier: Confidence) =>
    setSelected((current) => {
      const next = new Set(current);
      for (const candidate of byTier.get(tier) ?? []) next.add(candidate.proposed.model_id);
      return next;
    });

  const submit = async () => {
    setBusy(true);
    setStatus(null);
    const approved = [...selected];
    const rejected = candidates
      .map((candidate) => candidate.proposed.model_id)
      .filter((id) => !selected.has(id));

    try {
      const response = await fetch("/api/registry-approve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          decided_at: new Date().toISOString(),
          approved,
          rejected,
        }),
      });
      if (!response.ok) {
        setStatus(`Failed (${response.status}). Is LLM_ATLAS_REVIEW=1 set?`);
        return;
      }
      setStatus(
        `Wrote ${approved.length} approvals. Run \`pnpm registry:approve\` to merge them, then \`pnpm ingest\`.`,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-4 border-y border-rule bg-paper py-3 text-sm">
        <strong className="font-medium">{selected.size} selected</strong>
        <button
          type="button"
          onClick={() => selectTier("high")}
          className="rounded-sm border border-rule px-2 py-1 hover:text-accent"
        >
          Select all high-confidence
        </button>
        <button
          type="button"
          onClick={() => setSelected(new Set())}
          className="rounded-sm border border-rule px-2 py-1 hover:text-accent"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy || selected.size === 0}
          className="rounded-sm border border-rule bg-surface px-3 py-1 font-medium disabled:opacity-50"
        >
          {busy ? "Writing…" : "Write decisions"}
        </button>
        {status !== null ? <span className="text-xs text-ink-mute">{status}</span> : null}
      </div>

      {TIER_ORDER.map((tier) => {
        const group = byTier.get(tier) ?? [];
        if (group.length === 0) return null;

        return (
          <section key={tier} className="mt-8">
            <h2 className="text-lg font-medium">
              {tier} <span className="text-sm text-ink-mute">({group.length})</span>
            </h2>
            <p className="mt-1 max-w-[80ch] text-sm text-ink-mute">{TIER_NOTE[tier]}</p>

            <ul className="mt-3 divide-y divide-rule border-y border-rule">
              {group.map((candidate) => {
                const id = candidate.proposed.model_id;
                const blocked = candidate.confidence === "conflict";
                return (
                  <li key={id} className="py-3">
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={selected.has(id)}
                        disabled={blocked}
                        onChange={() => toggle(id)}
                      />
                      <span className="min-w-0">
                        <span className="text-sm font-medium">
                          {candidate.proposed.display_name}
                        </span>{" "}
                        <span className="font-mono text-xs text-ink-mute">{id}</span>
                        <span className="block text-xs text-ink-mute">
                          {candidate.proposed.creator} ·{" "}
                          {candidate.proposed.released_at ?? "no release date"} ·{" "}
                          {candidate.proposed.modality}
                        </span>
                        <Evidence candidate={candidate} />
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
