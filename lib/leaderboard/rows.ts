import type { Benchmark } from "@/lib/schemas/benchmark";
import type { JoinedScore } from "@/lib/schemas/score";
import type { Model } from "@/lib/schemas/model";

/**
 * How the leaderboard ranks — specs/03-sections/leaderboard.md.
 *
 * Models are scored on different benchmarks, so there is no honest way to rank a model
 * measured on GPQA against one measured on Terminal-Bench. The site therefore picks one
 * **reference benchmark** per tab, names it in the column header, and ranks only the models
 * scored on it. Everything else is listed below, unranked, saying why.
 *
 * "Hide saturated benchmarks" removes saturated and deprecated benchmarks from the tab
 * altogether: they cannot be the reference, and their scores do not appear. A model whose
 * only measurements sit on benchmarks that no longer discriminate drops out of the ranking
 * and is listed below saying exactly that. That is the site's whole argument made
 * interactive — the ranking is not a fixed fact, it depends on which tests you still
 * believe in.
 */

export const TABS = ["text", "agentic", "image"] as const;
export type Tab = (typeof TABS)[number];

/** An agent score is a system score: anything measured under a harness belongs to agentic. */
export function tabForScore(score: JoinedScore): Exclude<Tab, "image"> {
  if (score.harness !== null) return "agentic";
  return score.benchmark.capability === "agentic-tool-use" ? "agentic" : "text";
}

const STATUS_PRIORITY: Record<Benchmark["status"], number> = {
  active: 0,
  "nearing-saturation": 1,
  saturated: 2,
  deprecated: 3,
};

export function isDiscriminating(benchmark: Benchmark): boolean {
  return benchmark.status !== "saturated" && benchmark.status !== "deprecated";
}

export interface ReferenceCandidate {
  slug: string;
  benchmark: Benchmark;
  coverage: number;
  scores: number;
}

/**
 * Candidate references, most-covered first. Coverage counts distinct model+variant rows,
 * because a benchmark two models share ranks less usefully than one six models share.
 *
 * Ties are broken on health, then on total scores, then on slug. Health has to come first:
 * ARC-AGI and ARC-AGI-2 currently cover the same 49 model-variants and differ by a single
 * score, so a count-only rule would hand the entire ranking to whichever of them gained one
 * row overnight — and half the time that is the saturated one. When two benchmarks measure
 * the same models, rank on the one that still discriminates.
 */
export function referenceCandidates(
  scores: readonly JoinedScore[],
): ReferenceCandidate[] {
  const byBenchmark = new Map<
    string,
    { benchmark: Benchmark; models: Set<string>; scores: number }
  >();

  for (const score of scores) {
    const entry = byBenchmark.get(score.benchmark_slug) ?? {
      benchmark: score.benchmark,
      models: new Set<string>(),
      scores: 0,
    };
    entry.models.add(`${score.model_id}#${score.variant}`);
    entry.scores += 1;
    byBenchmark.set(score.benchmark_slug, entry);
  }

  return [...byBenchmark.entries()]
    .map(([slug, entry]) => ({
      slug,
      benchmark: entry.benchmark,
      coverage: entry.models.size,
      scores: entry.scores,
    }))
    .sort(
      (a, b) =>
        b.coverage - a.coverage ||
        STATUS_PRIORITY[a.benchmark.status] - STATUS_PRIORITY[b.benchmark.status] ||
        b.scores - a.scores ||
        a.slug.localeCompare(b.slug),
    );
}

export function selectReferenceBenchmark(
  scores: readonly JoinedScore[],
  hideSaturated: boolean,
): Benchmark | null {
  const candidates = referenceCandidates(scores).filter((candidate) =>
    hideSaturated ? isDiscriminating(candidate.benchmark) : true,
  );
  return candidates[0]?.benchmark ?? null;
}

export type RowProvenance = "independent" | "vendor-reported" | "mixed";

export interface LeaderboardRow {
  model: Model;
  variant: string;
  /** The score on the reference benchmark. Independent is preferred where both exist. */
  score: JoinedScore;
  /** Every score behind this row's number, so the provenance summary can be honest. */
  provenance: RowProvenance;
  capabilityIndex: CapabilityIndexEntry | null;
}

export interface CapabilityIndexEntry {
  eci: number;
  ci_low: number | null;
  ci_high: number | null;
}

export interface UnrankedRow {
  model: Model;
  /** Why this model is not in the ranked table, said plainly. */
  reason:
    "no-score-on-reference" | "only-saturated-scores" | "released_unranked" | "announced";
  scoreCount: number;
}

function summariseProvenance(scores: readonly JoinedScore[]): RowProvenance {
  const independent = scores.some((score) => score.provenance === "independent");
  const vendor = scores.some((score) => score.provenance === "vendor-reported");
  if (independent && vendor) return "mixed";
  return independent ? "independent" : "vendor-reported";
}

/** The number shown: an independent measurement where one exists, the vendor's otherwise. */
function pickDisplayScore(scores: readonly JoinedScore[]): JoinedScore | null {
  const independent = scores.filter((score) => score.provenance === "independent");
  const pool = independent.length > 0 ? independent : scores;
  return pool.reduce<JoinedScore | null>(
    (best, score) => (best === null || score.value > best.value ? score : best),
    null,
  );
}

export interface BuildRowsInput {
  scores: readonly JoinedScore[];
  models: readonly Model[];
  capabilityIndex: ReadonlyMap<string, CapabilityIndexEntry>;
  tab: Exclude<Tab, "image">;
  hideSaturated: boolean;
}

export interface BuildRowsResult {
  reference: Benchmark | null;
  rows: LeaderboardRow[];
  unranked: UnrankedRow[];
  /** What the saturated toggle is keeping out of this view, so the control can say so. */
  excluded: { benchmarks: number; scores: number };
}

export function buildRows(input: BuildRowsInput): BuildRowsResult {
  const all = input.scores.filter((score) => tabForScore(score) === input.tab);
  // Hiding saturated benchmarks removes their scores, not just their candidacy. Otherwise
  // the toggle would change nothing whenever the most-covered benchmark happens to be
  // healthy, and the control has to mean what its label says.
  const inTab = input.hideSaturated
    ? all.filter((score) => isDiscriminating(score.benchmark))
    : all;
  const reference = selectReferenceBenchmark(inTab, input.hideSaturated);
  const excludedScores = all.length - inTab.length;
  const excludedBenchmarks = new Set(
    all
      .filter((score) => !isDiscriminating(score.benchmark))
      .map((score) => score.benchmark_slug),
  );
  const byModelId = new Map(input.models.map((model) => [model.model_id, model]));

  const rows: LeaderboardRow[] = [];
  const ranked = new Set<string>();

  if (reference !== null) {
    const onReference = new Map<string, JoinedScore[]>();
    for (const score of inTab) {
      if (score.benchmark_slug !== reference.slug) continue;
      const key = `${score.model_id}#${score.variant}`;
      onReference.set(key, [...(onReference.get(key) ?? []), score]);
    }

    for (const [key, scores] of onReference) {
      const [model_id = "", variant = "base"] = key.split("#");
      const model = byModelId.get(model_id);
      const score = pickDisplayScore(scores);
      if (model === undefined || score === null) continue;

      ranked.add(model_id);
      rows.push({
        model,
        variant,
        score,
        provenance: summariseProvenance(scores),
        capabilityIndex: input.capabilityIndex.get(model_id) ?? null,
      });
    }

    rows.sort((a, b) => b.score.value - a.score.value);
  }

  // Everything the ranking cannot speak to. A block, not an omission: a model released
  // three days ago with no independent scores yet is information, not an empty state.
  const scoreCounts = new Map<string, number>();
  for (const score of inTab) {
    scoreCounts.set(score.model_id, (scoreCounts.get(score.model_id) ?? 0) + 1);
  }
  const scoredAtAll = new Set(all.map((score) => score.model_id));

  const unranked: UnrankedRow[] = input.models
    .filter((model) => !ranked.has(model.model_id))
    .map((model) => ({
      model,
      reason:
        model.state === "announced"
          ? ("announced" as const)
          : (scoreCounts.get(model.model_id) ?? 0) > 0
            ? ("no-score-on-reference" as const)
            : scoredAtAll.has(model.model_id)
              ? ("only-saturated-scores" as const)
              : ("released_unranked" as const),
      scoreCount: scoreCounts.get(model.model_id) ?? 0,
    }))
    .sort(
      (a, b) =>
        (b.model.released_at ?? "").localeCompare(a.model.released_at ?? "") ||
        a.model.display_name.localeCompare(b.model.display_name),
    );

  return {
    reference,
    rows,
    unranked,
    excluded: {
      benchmarks: input.hideSaturated ? excludedBenchmarks.size : 0,
      scores: input.hideSaturated ? excludedScores : 0,
    },
  };
}
