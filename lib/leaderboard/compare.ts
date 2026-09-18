import type { JoinedScore } from "@/lib/schemas/score";

/**
 * Comparing two models is the feature people come to a leaderboard for, and it is also the
 * easiest place on this site to tell a lie by omission.
 *
 * Two models only have a comparable pair of numbers on a benchmark **both** were measured
 * on. Everywhere else a side-by-side table shows a number against a blank and invites the
 * reader to conclude the blank is worse, when it means nothing was run. So the comparison
 * is split: rows where every selected model has a score, and rows where some do not — the
 * second group stated as an absence of measurement rather than rendered as a gap.
 */

export interface CompareCell {
  model_id: string;
  score: JoinedScore | null;
}

export interface CompareRow {
  benchmark_slug: string;
  benchmark_name: string;
  status: JoinedScore["benchmark"]["status"];
  cells: CompareCell[];
  /** True when every selected model has a score here — the only comparable case. */
  complete: boolean;
}

export interface CompareResult {
  comparable: CompareRow[];
  incomplete: CompareRow[];
}

/** Of several scores for one model on one benchmark, the one the table should show. */
function pick(scores: readonly JoinedScore[]): JoinedScore | null {
  if (scores.length === 0) return null;
  const independent = scores.filter((score) => score.provenance === "independent");
  const pool = independent.length > 0 ? independent : scores;
  return pool.reduce((best, score) => (score.value > best.value ? score : best));
}

export function compareModels(
  scores: readonly JoinedScore[],
  modelIds: readonly string[],
): CompareResult {
  const selected = modelIds.filter((id) => id !== "");
  if (selected.length < 2) return { comparable: [], incomplete: [] };

  const byBenchmark = new Map<string, Map<string, JoinedScore[]>>();
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
      benchmark_name: any.benchmark.name,
      status: any.benchmark.status,
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
