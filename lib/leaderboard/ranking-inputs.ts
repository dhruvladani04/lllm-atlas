import {
  loadBenchmarks,
  loadCapabilityIndex,
  loadJoinedScores,
  loadModels,
} from "@/lib/data/derived";
import {
  buildRows,
  type BuildRowsResult,
  type CapabilityIndexEntry,
} from "@/lib/leaderboard/rows";

/**
 * Everything `buildRows` needs, read once from the committed derived files.
 *
 * Shared by the leaderboard page, which renders the default ranking, and the static ranking
 * files the page fetches when a reader picks another basis — so the two cannot disagree
 * about what a ranking contains. Server-only: it reads the filesystem.
 */
export function rankingInputs() {
  const indexFile = loadCapabilityIndex();
  return {
    scores: loadJoinedScores(),
    models: loadModels(),
    // Names for every benchmark, not only the scored ones: the ranking rationale may need
    // to name a successor that has no scores here yet.
    benchmarkNames: new Map(loadBenchmarks().map((b) => [b.slug, b.name])),
    capabilityIndex: new Map<string, CapabilityIndexEntry>(
      (indexFile?.rows ?? []).map((row) => [
        row.model_id,
        { eci: row.eci, ci_low: row.eci_ci_low, ci_high: row.eci_ci_high },
      ]),
    ),
  };
}

export type RankingTab = "text" | "agentic";
export type RankingView = "hidden" | "shown";

export function rank(
  inputs: ReturnType<typeof rankingInputs>,
  tab: RankingTab,
  view: RankingView,
  basis: string | null = null,
): BuildRowsResult {
  return buildRows({ ...inputs, tab, hideSaturated: view === "hidden", basis });
}
