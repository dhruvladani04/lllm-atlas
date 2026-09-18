import type { Provenance, SourceMeta } from "@/lib/schemas/common";
import type { Score } from "@/lib/schemas/score";
import type { ArenaRow } from "@/lib/schemas/arena";
import type { EpochBundle } from "@/lib/ingest/epoch";
import type { BenchmarkIndex } from "@/lib/registry/benchmarks";
import { resolveBenchmarkName } from "@/lib/registry/benchmarks";
import type { RegistryIndex } from "@/lib/registry/resolve";
import { resolveModelName } from "@/lib/registry/resolve";
import type { UnresolvedSighting } from "@/lib/registry/unresolved";

/**
 * Turns an ingested payload into score rows. Two rules govern everything here:
 *
 * - A name that does not resolve is reported, not guessed at. The row is dropped and the
 *   name goes to the review queue.
 * - A score's provenance is read from the data, never defaulted. Where a source does not
 *   state it, the rule used to decide it is recorded in `notes` so a reader can audit the
 *   label rather than trust it.
 */

export interface ScoreHarvest {
  scores: Score[];
  unresolvedModels: UnresolvedSighting[];
  unresolvedBenchmarks: string[];
  /** Rows dropped because the source contradicted itself — see `contradictoryRow`. */
  conflicts: string[];
}

/**
 * Epoch's CSVs carry a model twice: once as `model_version` (`claude-opus-5_max`) and once
 * as `display_name` ("Claude Opus 5 (Max)"). Usually they agree. Where they do not, the
 * row is a transcription error upstream, and a real one: ARC-AGI-2 ships a row whose
 * `model_version` says `_max` while its `display_name` says "(High)", carrying the same
 * score as the genuine `_high` row. Trusting `model_version` invents a "max" score that
 * nobody measured and that then collides with the real one.
 *
 * There is no way to tell which half of a contradictory row is right, so the row is
 * dropped and recorded rather than guessed at — the same rule the registry applies to a
 * name it cannot resolve.
 */
function contradictoryRow(
  models: RegistryIndex,
  modelVersion: string,
  displayName: string | null,
): boolean {
  if (displayName === null) return false;
  const byVersion = resolveModelName(models, modelVersion);
  const byDisplay = resolveModelName(models, displayName);
  if (!byVersion.resolved || !byDisplay.resolved) return false;
  return (
    byVersion.model_id !== byDisplay.model_id || byVersion.variant !== byDisplay.variant
  );
}

/**
 * Epoch also ships byte-identical duplicate rows (ARC-AGI-2 lists GPT-5 (Low) at 1.94%
 * twice). Collapsing those loses nothing; two rows differing in *value* are never merged
 * here, because that would be averaging two different claims.
 */
function dropExactDuplicates(scores: readonly Score[]): Score[] {
  const seen = new Set<string>();
  const kept: Score[] = [];
  for (const score of scores) {
    const key = [
      score.model_id,
      score.variant,
      score.benchmark_slug,
      score.harness ?? "none",
      score.provenance,
      score.measured_at ?? "none",
      // Epoch ships the same measurement at both 0.283 and 0.28300000000000003; scaling to
      // percent turns that into 28.299999999999997 vs 28.300000000000004. Comparing the raw
      // floats would call one measurement two, so identity rounds to a precision far finer
      // than any score is actually reported at.
      score.value.toFixed(6),
    ].join("#");
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(score);
  }
  return kept;
}

function collect(): {
  models: UnresolvedSighting[];
  benchmarks: Set<string>;
  seenModels: Set<string>;
} {
  return { models: [], benchmarks: new Set(), seenModels: new Set() };
}

/**
 * Epoch's `Source` column cites where a number came from. When that citation names the
 * model's own organisation — "DeepSeek-V3 Technical Report" for a DeepSeek model — the
 * number is the vendor's own claim. Anything else is a third-party measurement.
 *
 * This is a stated rule applied to real data, not a default, and every score it produces
 * carries a note saying so. Where the organisation is unknown the row is treated as
 * vendor-reported, because that is the weaker claim of the two and the honest direction to
 * err in.
 */
export function epochProvenance(
  organization: string | null,
  sourceCitation: string | null,
): { provenance: Provenance; note: string } {
  if (organization === null) {
    return {
      provenance: "vendor-reported",
      note: "Provenance could not be established from Epoch's source citation; treated as vendor-reported, the weaker claim.",
    };
  }
  const org = organization.toLowerCase();
  const citation = (sourceCitation ?? "").toLowerCase();
  const vendorAuthored = citation.includes(org);
  return {
    provenance: vendorAuthored ? "vendor-reported" : "independent",
    note: vendorAuthored
      ? `Epoch cites ${organization}'s own publication for this number.`
      : "Epoch cites a third-party source for this number.",
  };
}

export function harvestEpochScores(
  bundle: EpochBundle,
  models: RegistryIndex,
  benchmarks: BenchmarkIndex,
  source: SourceMeta,
): ScoreHarvest {
  const found = collect();
  const scores: Score[] = [];
  const conflicts: string[] = [];

  for (const meta of bundle.benchmarks) {
    const benchmark = resolveBenchmarkName(benchmarks, meta.benchmark);
    if (!benchmark.resolved) {
      found.benchmarks.add(meta.benchmark);
      continue;
    }

    for (const row of bundle.results.get(meta.benchmark) ?? []) {
      if (contradictoryRow(models, row.model_version, row.display_name)) {
        conflicts.push(
          `${meta.benchmark}: "${row.model_version}" vs "${row.display_name}" resolve to different models`,
        );
        continue;
      }

      const resolution = resolveModelName(models, row.model_version).resolved
        ? resolveModelName(models, row.model_version)
        : resolveModelName(models, row.display_name ?? row.model_version);

      if (!resolution.resolved) {
        const name = row.display_name ?? row.model_version;
        if (!found.seenModels.has(name)) {
          found.seenModels.add(name);
          found.models.push({ name, source_id: source.source_id });
        }
        continue;
      }

      const { provenance, note } = epochProvenance(row.organization, row.source_link);

      scores.push({
        model_id: resolution.model_id,
        variant: resolution.variant,
        benchmark_slug: benchmark.slug,
        harness: row.harness,
        // `scale` converts the file's native units to a fraction; the site stores percent
        // on a 0-100 scale so the unit means one thing everywhere.
        value: row.score * meta.scale * 100,
        unit: "percent",
        confidence_interval: null,
        sample_size: null,
        provenance,
        measured_at: row.release_date,
        source,
        notes: note,
      });
    }
  }

  return {
    scores: dropExactDuplicates(scores),
    unresolvedModels: found.models,
    unresolvedBenchmarks: [...found.benchmarks].sort(),
    conflicts: conflicts.sort(),
  };
}

/**
 * Arena Elo. Provenance is unambiguous here: the numbers come from public head-to-head
 * votes, not from any vendor, so every row is independent. Elo carries its confidence
 * interval and vote count, because an Elo on 40 votes is not an Elo on 40,000 and the
 * image tab shows both.
 *
 * These scores are not part of the benchmark join: benchwiki publishes no health record for
 * an arena board, and the site will not invent one. They are written to their own derived
 * file and rendered with that absence stated, which is itself worth knowing -- a preference
 * ranking is a different kind of claim from a benchmark score.
 */
export const ARENA_BENCHMARK_SLUG = "lmarena-text-to-image";

export function harvestArenaScores(
  rows: readonly ArenaRow[],
  models: RegistryIndex,
  source: SourceMeta,
  benchmarkSlug: string = ARENA_BENCHMARK_SLUG,
): ScoreHarvest {
  const found = collect();
  const scores: Score[] = [];

  for (const row of rows) {
    const resolution = resolveModelName(models, row.model);
    if (!resolution.resolved) {
      if (!found.seenModels.has(row.model)) {
        found.seenModels.add(row.model);
        found.models.push({ name: row.model, source_id: source.source_id });
      }
      continue;
    }

    scores.push({
      model_id: resolution.model_id,
      variant: resolution.variant,
      benchmark_slug: benchmarkSlug,
      harness: null,
      value: row.score,
      unit: "elo",
      confidence_interval: row.ci,
      sample_size: row.votes,
      provenance: "independent",
      measured_at: null,
      source,
      notes: "Arena Elo from public pairwise votes.",
    });
  }

  return {
    scores: dropExactDuplicates(scores),
    unresolvedModels: found.models,
    unresolvedBenchmarks: [],
    conflicts: [],
  };
}
