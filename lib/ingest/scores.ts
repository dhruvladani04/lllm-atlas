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

  for (const meta of bundle.benchmarks) {
    const benchmark = resolveBenchmarkName(benchmarks, meta.benchmark);
    if (!benchmark.resolved) {
      found.benchmarks.add(meta.benchmark);
      continue;
    }

    for (const row of bundle.results.get(meta.benchmark) ?? []) {
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
    scores,
    unresolvedModels: found.models,
    unresolvedBenchmarks: [...found.benchmarks].sort(),
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
    scores,
    unresolvedModels: found.models,
    unresolvedBenchmarks: [],
  };
}
