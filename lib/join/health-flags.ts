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
