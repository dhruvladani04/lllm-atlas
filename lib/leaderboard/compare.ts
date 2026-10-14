import type { HealthFlag, JoinedScore } from "@/lib/schemas/score";
import type { Benchmark } from "@/lib/schemas/benchmark";
import type { BuildRowsResult } from "@/lib/leaderboard/rows";

/**
 * Comparing two models is the feature people come to a leaderboard for, and it is also the
 * easiest place on this site to tell a lie by omission.
 *
 * Two models only have a comparable pair of numbers on a benchmark **both** were measured
 * on. Everywhere else a side-by-side table shows a number against a blank and invites the
 * reader to conclude the blank is worse, when it means nothing was run. So the comparison
 * is split: rows where every selected model has a score, and rows where some do not — the
 * second group stated as an absence of measurement rather than rendered as a gap.
 *
 * The compact types below exist for the same reason as `view.ts`: a `JoinedScore` carries
 * its whole benchmark record — statistical notes, leaderboard links, the performance
 * timeline — and this page ships every score for every model so the comparison can run in
 * the browser. Sending the full records put 4MB of JSON into the page for data nothing on
 * screen used, which gzips to a harmless 67KB and still has to be parsed on the main
 * thread. The benchmark's name and status travel once, in a lookup, not once per score.
 */

export interface CompareScore {
  model_id: string;
  benchmark_slug: string;
  value: number;
  unit: JoinedScore["unit"];
  confidence_interval: number | null;
  provenance: JoinedScore["provenance"];
  health_flags: HealthFlag[];
}

export interface CompareBenchmark {
  name: string;
  status: Benchmark["status"];
}

export function toCompareScores(scores: readonly JoinedScore[]): CompareScore[] {
  return scores.map((score) => ({
    model_id: score.model_id,
    benchmark_slug: score.benchmark_slug,
    value: score.value,
    unit: score.unit,
    confidence_interval: score.confidence_interval,
    provenance: score.provenance,
    health_flags: score.health_flags,
  }));
}

/** Only the benchmarks something was actually scored on, named once each. */
export function toCompareBenchmarks(
  scores: readonly JoinedScore[],
): Record<string, CompareBenchmark> {
  const lookup: Record<string, CompareBenchmark> = {};
  for (const score of scores) {
    lookup[score.benchmark_slug] ??= {
      name: score.benchmark.name,
      status: score.benchmark.status,
    };
  }
  return lookup;
}

export interface CompareCell {
  model_id: string;
  score: CompareScore | null;
}

export interface CompareRow {
  benchmark_slug: string;
  benchmark_name: string;
  status: Benchmark["status"];
  cells: CompareCell[];
  /** True when every selected model has a score here — the only comparable case. */
  complete: boolean;
}

export interface CompareResult {
  comparable: CompareRow[];
  incomplete: CompareRow[];
}

/** Of several scores for one model on one benchmark, the one the table should show. */
function pick(scores: readonly CompareScore[]): CompareScore | null {
  if (scores.length === 0) return null;
  const independent = scores.filter((score) => score.provenance === "independent");
  const pool = independent.length > 0 ? independent : scores;
  return pool.reduce((best, score) => (score.value > best.value ? score : best));
}

export function compareModels(
  scores: readonly CompareScore[],
  modelIds: readonly string[],
  benchmarks: Record<string, CompareBenchmark> = {},
): CompareResult {
  const selected = modelIds.filter((id) => id !== "");
  if (selected.length < 2) return { comparable: [], incomplete: [] };

  const byBenchmark = new Map<string, Map<string, CompareScore[]>>();
  for (const score of scores) {
    if (!selected.includes(score.model_id)) continue;
    const perModel = byBenchmark.get(score.benchmark_slug) ?? new Map();
    perModel.set(score.model_id, [...(perModel.get(score.model_id) ?? []), score]);
    byBenchmark.set(score.benchmark_slug, perModel);
  }

  const rows: CompareRow[] = [];
  for (const [slug, perModel] of byBenchmark) {
    const cells = selected.map((model_id) => ({
      model_id,
      score: pick(perModel.get(model_id) ?? []),
    }));
    const any = cells.find((cell) => cell.score !== null)?.score ?? null;
    if (any === null) continue;

    rows.push({
      benchmark_slug: slug,
      benchmark_name: benchmarks[slug]?.name ?? slug,
      status: benchmarks[slug]?.status ?? "active",
      cells,
      complete: cells.every((cell) => cell.score !== null),
    });
  }

  const byName = (a: CompareRow, b: CompareRow) =>
    a.benchmark_name.localeCompare(b.benchmark_name);

  return {
    comparable: rows.filter((row) => row.complete).sort(byName),
    incomplete: rows.filter((row) => !row.complete).sort(byName),
  };
}

/** A pair worth comparing, and the rule that picked it. */
export interface SuggestedPair {
  label: string;
  ids: [string, string];
}

/**
 * Starting points for an empty comparison, taken from the rankings rather than chosen by
 * hand: the top two on each tab's reference benchmark, and the top model against the top
 * open-weights one. Each pair shares at least that benchmark, so every suggestion opens on
 * a comparison with something in it. A rule that matches nothing suggests nothing.
 */
export function suggestedPairs(
  text: BuildRowsResult,
  agentic: BuildRowsResult,
): SuggestedPair[] {
  // One entry per model, keeping its best (first) row: rows are per configuration.
  const models = (result: BuildRowsResult) => {
    const seen = new Set<string>();
    return result.rows.filter((row) => {
      if (seen.has(row.model.model_id)) return false;
      seen.add(row.model.model_id);
      return true;
    });
  };

  const pairs: SuggestedPair[] = [];
  const textModels = models(text);
  const [first, second] = textModels;
  if (text.reference !== null && first !== undefined && second !== undefined) {
    pairs.push({
      label: `The top two on ${text.reference.name}`,
      ids: [first.model.model_id, second.model.model_id],
    });
    const open = textModels.find((row) => row.model.open_weights === true);
    if (open !== undefined && open.model.model_id !== first.model.model_id) {
      pairs.push({
        label: `The top model and the top open-weights model on ${text.reference.name}`,
        ids: [first.model.model_id, open.model.model_id],
      });
    }
  }

  const [a, b] = models(agentic);
  if (agentic.reference !== null && a !== undefined && b !== undefined) {
    pairs.push({
      label: `The top two on ${agentic.reference.name}`,
      ids: [a.model.model_id, b.model.model_id],
    });
  }
  return pairs;
}
