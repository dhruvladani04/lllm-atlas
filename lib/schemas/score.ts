import { z } from "zod";
import { Provenance, SourceMeta } from "@/lib/schemas/common";
import { Benchmark } from "@/lib/schemas/benchmark";

/**
 * specs/02-data/schemas.md — Score, the central record.
 *
 * A score row is keyed by (model_id, variant, benchmark_slug, harness, provenance,
 * measured_at). Not by model name, and not by model name plus benchmark. Two scores
 * differing only in harness are two rows; so are two differing only in provenance.
 * Neither pair is ever averaged.
 *
 * That key is not actually unique in upstream data — Epoch has reported two HLE scores
 * for the same model on the same day with no distinguishing `harness` (the benchmark's
 * own statistical_note names no-tools / tool-augmented / multi-agent as materially
 * different configurations it does not otherwise capture per-score). Rendered lists key
 * on this tuple plus an array-index tiebreaker rather than assume it disambiguates.
 */

export const ScoreUnit = z.enum(["percent", "elo", "index", "count", "usd", "seconds"]);
export type ScoreUnit = z.infer<typeof ScoreUnit>;

export const Score = z.object({
  model_id: z.string().min(1),
  variant: z.string().min(1),
  benchmark_slug: z.string().min(1),
  harness: z.string().min(1).nullable(),
  value: z.number(),
  unit: ScoreUnit,
  /** Half-width of the reported interval, in the same unit. Elo without one is not comparable. */
  confidence_interval: z.number().nonnegative().nullable(),
  /** Votes, tasks or runs behind the number — an Elo on 40 votes is not an Elo on 40,000. */
  sample_size: z.number().int().nonnegative().nullable(),
  provenance: Provenance,
  measured_at: z.string().nullable(),
  source: SourceMeta,
  notes: z.string().nullable(),
});
export type Score = z.infer<typeof Score>;

export const HealthFlag = z.enum([
  "saturated",
  "deprecated",
  "high-contamination",
  "vendor-reported-only",
  "superseded",
  "stale-source",
]);
export type HealthFlag = z.infer<typeof HealthFlag>;

/** The core artefact: every score joined to the health of the benchmark that produced it. */
export const JoinedScore = Score.extend({
  benchmark: Benchmark,
  health_flags: z.array(HealthFlag),
});
export type JoinedScore = z.infer<typeof JoinedScore>;
