import type { Benchmark } from "@/lib/schemas/benchmark";
import type { HealthFlag, Score } from "@/lib/schemas/score";

/**
 * The flag derivation table from specs/02-data/schemas.md, in exactly one place.
 *
 * These flags are the site's entire argument in code form: a score is never shown without
 * the health of the benchmark that produced it. Computed at build time so the logic is
 * testable and lives once, with the single exception noted on `stale-source`.
 */

export const STALE_AFTER_DAYS = 7;

export interface FlagContext {
  /** Does an `independent` score exist for this exact (model, variant, benchmark, harness)? */
  independentExists: boolean;
  /** Build time, as an ISO datetime. Supplied, never read from the clock, so builds are reproducible. */
  now: string;
  /** Does the source report more than one value for this exact measurement? */
  disputed: boolean;
}

export function daysBetween(earlier: string, later: string): number {
  const from = Date.parse(earlier);
  const to = Date.parse(later);
  if (Number.isNaN(from) || Number.isNaN(to)) {
    throw new TypeError(`cannot compare dates ${earlier} and ${later}`);
  }
  return (to - from) / 86_400_000;
}

export function deriveHealthFlags(
  score: Score,
  benchmark: Benchmark,
  context: FlagContext,
): HealthFlag[] {
  const flags: HealthFlag[] = [];

  if (benchmark.status === "saturated") flags.push("saturated");
  if (benchmark.status === "deprecated") flags.push("deprecated");
  if (benchmark.contamination.risk === "high") flags.push("high-contamination");

  // Keyed on the full score tuple: a model's `high` variant being independently measured
  // says nothing about its base variant, and neither says anything about another harness.
  if (score.provenance === "vendor-reported" && !context.independentExists) {
    flags.push("vendor-reported-only");
  }

  if (benchmark.successor !== null) flags.push("superseded");

  // Two different numbers for one measurement, and no field distinguishing them. Epoch
  // reports this for a handful of rows — two HLE scores for the same model on the same day,
  // which its own note says can differ by tens of points between tool configurations it
  // does not record per score. Showing both silently makes the table look broken; showing
  // one would be a coin toss presented as a fact. Both are shown, and both say so.
  if (context.disputed) flags.push("disputed");

  // A floor, not the whole story: the pipeline commits only when data changes, so a build
  // can be older than the data it carries. FreshnessStamp recomputes this at render time.
  if (daysBetween(score.source.fetched_at, context.now) > STALE_AFTER_DAYS) {
    flags.push("stale-source");
  }

  return flags;
}

/** The key that decides whether two scores are the same measurement. */
export function scoreKey(score: Score): string {
  return [
    score.model_id,
    score.variant,
    score.benchmark_slug,
    score.harness ?? "\u0000none",
  ].join("\u0001");
}

/**
 * The full identity `02-data/schemas.md` declares for a score — everything `scoreKey`
 * covers plus the two fields that make two rows different claims rather than the same one.
 *
 * Two scores equal on this key and unequal in value are a contradiction in the source, not
 * two measurements, and the `disputed` flag is derived from exactly that.
 */
export function measurementKey(score: Score): string {
  return [scoreKey(score), score.provenance, score.measured_at ?? "\u0000none"].join(
    "\u0001",
  );
}
