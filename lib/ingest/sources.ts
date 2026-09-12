import {
  BENCHWIKI_SOURCE_ID,
  benchwikiSourceMeta,
  fetchBenchwiki,
} from "@/lib/ingest/benchwiki";
import {
  EPOCH_SOURCE_ID,
  epochSourceMeta,
  fetchEpochBundle,
  type EpochBundle,
} from "@/lib/ingest/epoch";
import {
  OPENROUTER_SOURCE_ID,
  fetchOpenRouterModels,
  openRouterSourceMeta,
} from "@/lib/ingest/openrouter";
import {
  ARENA_SOURCE_ID,
  arenaSourceMeta,
  arenaSnapshotUrl,
  fetchArenaLeaderboard,
} from "@/lib/ingest/arena";
import type { SourceDefinition } from "@/lib/ingest/run";
import {
  EpochBenchmarkMeta,
  EpochCapabilityIndexRow,
  EpochResultRow,
} from "@/lib/schemas/epoch";
import { z } from "zod";

/**
 * Each source as a definition the generic runner can execute. They are deliberately thin:
 * fetch, validate, hand back records. Everything about failure handling lives in the
 * runner so all four sources behave identically when upstream breaks.
 */

export const benchwikiSource: SourceDefinition = {
  source_id: BENCHWIKI_SOURCE_ID,
  sourceMeta: benchwikiSourceMeta,
  fetchRecords: async (fetcher) => (await fetchBenchwiki(fetcher)).payload,
};

export const openRouterSource: SourceDefinition = {
  source_id: OPENROUTER_SOURCE_ID,
  sourceMeta: openRouterSourceMeta,
  fetchRecords: async (fetcher) => (await fetchOpenRouterModels(fetcher)).payload.data,
};

/**
 * Epoch ships a ZIP of CSVs. The snapshot stores one record per benchmark — its metadata
 * and its rows — which is the closest honest equivalent of the raw payload in JSON, and
 * keeps the bundle's history diffable like every other source.
 */
export const EpochSnapshotRecord = z.object({
  meta: EpochBenchmarkMeta,
  rows: z.array(EpochResultRow),
});
export type EpochSnapshotRecord = z.infer<typeof EpochSnapshotRecord>;

export const epochSource: SourceDefinition = {
  source_id: EPOCH_SOURCE_ID,
  sourceMeta: epochSourceMeta,
  fetchRecords: async (fetcher) => {
    const { bundle } = await fetchEpochBundle(fetcher);
    return bundle.benchmarks.map((meta) => ({
      meta,
      rows: bundle.results.get(meta.benchmark) ?? [],
    }));
  },
};

export function bundleFromSnapshot(records: readonly unknown[]): EpochBundle {
  const parsed = records.map((record) => EpochSnapshotRecord.parse(record));
  return {
    benchmarks: parsed.map((record) => record.meta),
    results: new Map(parsed.map((record) => [record.meta.benchmark, record.rows])),
    capabilityIndex: [],
  };
}

/**
 * Epoch's capability index, as its own source so it carries its own snapshot and its own
 * freshness stamp. It is a composite and has no benchmark health record behind it, so it is
 * never the leaderboard's ranking basis and is always labelled as Epoch's number.
 */
export const EPOCH_ECI_SOURCE_ID = "epoch-eci";

export const epochCapabilityIndexSource: SourceDefinition = {
  source_id: EPOCH_ECI_SOURCE_ID,
  sourceMeta: (now) => ({ ...epochSourceMeta(now), source_id: EPOCH_ECI_SOURCE_ID }),
  fetchRecords: async (fetcher) =>
    (await fetchEpochBundle(fetcher)).bundle.capabilityIndex,
};

export function capabilityIndexFromSnapshot(
  records: readonly unknown[],
): EpochCapabilityIndexRow[] {
  return records.map((record) => EpochCapabilityIndexRow.parse(record));
}

export function arenaSource(date: string): SourceDefinition {
  return {
    source_id: ARENA_SOURCE_ID,
    sourceMeta: (now) => arenaSourceMeta(now, arenaSnapshotUrl(date)),
    fetchRecords: async (fetcher) => {
      const { payload } = await fetchArenaLeaderboard(date, fetcher);
      return payload.models;
    },
  };
}
