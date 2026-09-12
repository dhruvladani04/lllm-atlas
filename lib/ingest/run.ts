import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ZodError } from "zod";
import type { Benchmark } from "@/lib/schemas/benchmark";
import type { IngestionResult } from "@/lib/schemas/ingestion";
import {
  BENCHWIKI_SOURCE_ID,
  type Fetcher,
  fetchBenchwiki,
  toBenchmark,
} from "@/lib/ingest/benchwiki";
import { checkTruncation } from "@/lib/ingest/guard";
import {
  type Snapshot,
  type SnapshotStatus,
  SNAPSHOT_ROOT,
  findLatestSnapshot,
  writeSnapshot,
} from "@/lib/ingest/snapshot";
import { benchwikiSourceMeta } from "@/lib/ingest/benchwiki";
import { BenchwikiPayload } from "@/lib/schemas/benchwiki";
import { resolveModelName } from "@/lib/registry/resolve";
import type { RegistryIndex } from "@/lib/registry/resolve";
import type { UnresolvedSighting } from "@/lib/registry/unresolved";

/**
 * One source failing must not abort the others, so every outcome here is a returned value
 * rather than a thrown error. The rule the whole module serves: when a fetch fails, the
 * previous snapshot stands and the site keeps serving it — visibly stale, never blank and
 * never invented.
 */

export const DERIVED_ROOT = join("data", "derived");

export interface SourceOutcome {
  result: IngestionResult;
  benchmarks: Benchmark[];
  unresolved: UnresolvedSighting[];
  /** The fetch date the served data actually carries, which is not today's when a fetch failed. */
  served_from: string | null;
}

function classifyFailure(error: unknown): { status: SnapshotStatus; message: string } {
  if (error instanceof ZodError) {
    return {
      status: "schema-error",
      message: `payload did not match the schema: ${error.issues
        .slice(0, 3)
        .map((issue) => `${issue.path.join(".") || "(root)"} ${issue.message}`)
        .join("; ")}`,
    };
  }
  return {
    status: "unreachable",
    message: error instanceof Error ? error.message : String(error),
  };
}

function benchmarksFromSnapshot(snapshot: Snapshot, index: RegistryIndex): Benchmark[] {
  // A committed snapshot was validated when it was written; re-parsing it keeps the
  // guarantee that nothing reaches the site unchecked.
  return BenchwikiPayload.parse(snapshot.records).map((record) =>
    toBenchmark(record, (name) => resolveOrNull(index, name)),
  );
}

function resolveOrNull(index: RegistryIndex, name: string): string | null {
  const resolution = resolveModelName(index, name);
  return resolution.resolved ? resolution.model_id : null;
}

export interface IngestOptions {
  /** ISO date for the snapshot directory. Supplied, never read from the clock, so runs are reproducible. */
  date: string;
  /** ISO datetime recorded as `fetched_at`. */
  now: string;
  registry: RegistryIndex;
  fetcher?: Fetcher;
  snapshotRoot?: string;
}

export async function ingestBenchwiki(options: IngestOptions): Promise<SourceOutcome> {
  const root = options.snapshotRoot ?? SNAPSHOT_ROOT;
  const previous = findLatestSnapshot(BENCHWIKI_SOURCE_ID, root, options.date);
  const previousCount = previous?.snapshot._meta.record_count ?? null;

  const fallback = (status: SnapshotStatus, message: string): SourceOutcome => ({
    result: {
      source_id: BENCHWIKI_SOURCE_ID,
      status,
      record_count: previous ? previous.snapshot._meta.record_count : 0,
      previous_record_count: previousCount,
      unresolved_models: [],
      message,
    },
    benchmarks: previous
      ? benchmarksFromSnapshot(previous.snapshot, options.registry)
      : [],
    unresolved: [],
    served_from: previous ? previous.snapshot._meta.fetched_at : null,
  });

  let payload;
  let raw: unknown;
  try {
    const fetched = await fetchBenchwiki(options.fetcher ?? fetch);
    payload = fetched.payload;
    raw = fetched.raw;
  } catch (error) {
    const { status, message } = classifyFailure(error);
    return fallback(status, message);
  }

  const truncation = checkTruncation(payload.length, previousCount);
  if (truncation.truncated) {
    return fallback("truncated", truncation.message ?? "record count below the floor");
  }

  const unresolved: UnresolvedSighting[] = [];
  const seen = new Set<string>();
  const benchmarks = payload.map((record) =>
    toBenchmark(record, (name) => {
      const model_id = resolveOrNull(options.registry, name);
      if (model_id === null && !seen.has(name)) {
        seen.add(name);
        unresolved.push({ name, source_id: BENCHWIKI_SOURCE_ID });
      }
      return model_id;
    }),
  );

  writeSnapshot(
    options.date,
    {
      ...benchwikiSourceMeta(options.now),
      record_count: payload.length,
      status: "ok",
    },
    Array.isArray(raw) ? raw : payload,
    root,
  );

  return {
    result: {
      source_id: BENCHWIKI_SOURCE_ID,
      status: "ok",
      record_count: payload.length,
      previous_record_count: previousCount,
      unresolved_models: unresolved.map((sighting) => sighting.name).sort(),
      message: null,
    },
    benchmarks,
    unresolved,
    served_from: options.now,
  };
}

export function writeDerived(
  fileName: string,
  value: unknown,
  root: string = DERIVED_ROOT,
): string {
  mkdirSync(root, { recursive: true });
  const path = join(root, fileName);
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return path;
}

/** Per-source last-success timestamp, read by the freshness stamp. */
export function buildFreshness(
  outcomes: readonly SourceOutcome[],
): Record<string, string | null> {
  const freshness: Record<string, string | null> = {};
  for (const outcome of outcomes) {
    freshness[outcome.result.source_id] = outcome.served_from;
  }
  return freshness;
}
