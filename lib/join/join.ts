import type { Benchmark } from "@/lib/schemas/benchmark";
import type { JoinedScore, Score } from "@/lib/schemas/score";
import type { BenchmarkIndex } from "@/lib/registry/benchmarks";
import { deriveHealthFlags, measurementKey, scoreKey } from "@/lib/join/health-flags";

/**
 * The core artefact — specs/01-architecture/data-pipeline.md, `model-benchmark-join.json`.
 *
 * Every score joined to the health record of the benchmark that produced it. A score whose
 * benchmark has no health record is not rendered at all: showing a bare number is the one
 * thing section 1 forbids, so an unmatched benchmark is reported rather than displayed.
 */

export interface JoinResult {
  joined: JoinedScore[];
  /** Benchmark names no rule matched. Reported, never guessed at. */
  unmatchedBenchmarks: string[];
}

export function joinScores(
  scores: readonly Score[],
  index: BenchmarkIndex,
  now: string,
): JoinResult {
  // Which measurements have an independent number? Computed once over the whole corpus,
  // because `vendor-reported-only` is a statement about the corpus, not about one row.
  const independent = new Set<string>();
  for (const score of scores) {
    if (score.provenance === "independent") independent.add(scoreKey(score));
  }

  // Measurements the source reports more than one value for. Rounded before comparing so
  // float noise is not mistaken for disagreement.
  const valuesSeen = new Map<string, Set<string>>();
  for (const score of scores) {
    const key = measurementKey(score);
    const values = valuesSeen.get(key) ?? new Set<string>();
    values.add(score.value.toFixed(6));
    valuesSeen.set(key, values);
  }
  const disputed = new Set(
    [...valuesSeen].filter(([, values]) => values.size > 1).map(([key]) => key),
  );

  const joined: JoinedScore[] = [];
  const unmatched = new Set<string>();

  for (const score of scores) {
    const benchmark: Benchmark | undefined = index.bySlug.get(score.benchmark_slug);
    if (benchmark === undefined) {
      unmatched.add(score.benchmark_slug);
      continue;
    }

    joined.push({
      ...score,
      benchmark,
      health_flags: deriveHealthFlags(score, benchmark, {
        independentExists: independent.has(scoreKey(score)),
        disputed: disputed.has(measurementKey(score)),
        now,
      }),
    });
  }

  return { joined, unmatchedBenchmarks: [...unmatched].sort() };
}

/** Reverse index: benchmark slug to the models scored on it — section 2's contribution. */
export function buildBenchmarkModels(
  joined: readonly JoinedScore[],
): Record<string, string[]> {
  const index: Record<string, Set<string>> = {};
  for (const score of joined) {
    (index[score.benchmark_slug] ??= new Set()).add(score.model_id);
  }
  return Object.fromEntries(
    Object.entries(index).map(([slug, models]) => [slug, [...models].sort()]),
  );
}
