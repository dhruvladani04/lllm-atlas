import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ZodError } from "zod";
import type { SourceMeta } from "@/lib/schemas/common";
import type { IngestionResult } from "@/lib/schemas/ingestion";
import type { Fetcher } from "@/lib/ingest/benchwiki";
import { checkTruncation } from "@/lib/ingest/guard";
import {
  SNAPSHOT_ROOT,
  type SnapshotStatus,
  findLatestSnapshot,
  writeSnapshot,
} from "@/lib/ingest/snapshot";

/**
 * The shared shape of a source run — specs/01-architecture/data-pipeline.md.
 *
 * One source failing must not abort the others, so nothing here throws on a source's
 * behalf: every outcome is a returned value. When a fetch fails, the previous snapshot
 * stands and the site keeps serving it — visibly stale, never blank, never invented.
 */

export const DERIVED_ROOT = join("data", "derived");

export interface SourceRun {
  result: IngestionResult;
  /** Records as fetched, or the last good snapshot's records when today's fetch failed. */
  records: unknown[];
  /** When the served records were actually fetched. Not today's date if a fetch failed. */
  served_from: string | null;
  source: SourceMeta;
}

export interface SourceDefinition {
  source_id: string;
  sourceMeta: (now: string) => SourceMeta;
  /** Fetches and validates. Throws on transport or schema failure; the runner classifies. */
  fetchRecords: (fetcher: Fetcher) => Promise<unknown[]>;
}

export interface RunOptions {
  date: string;
  now: string;
  fetcher?: Fetcher;
  snapshotRoot?: string;
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

export async function runSource(
  definition: SourceDefinition,
  options: RunOptions,
): Promise<SourceRun> {
  const root = options.snapshotRoot ?? SNAPSHOT_ROOT;
  const source = definition.sourceMeta(options.now);
  const previous = findLatestSnapshot(definition.source_id, root, options.date);
  const previousCount = previous?.snapshot._meta.record_count ?? null;

  const keepPrevious = (status: SnapshotStatus, message: string): SourceRun => ({
    result: {
      source_id: definition.source_id,
      status,
      record_count: previous?.snapshot._meta.record_count ?? 0,
      previous_record_count: previousCount,
      unresolved_models: [],
      message,
    },
    records: previous ? [...previous.snapshot.records] : [],
    served_from: previous?.snapshot._meta.fetched_at ?? null,
    // The served data carries the fetch date it was actually fetched on.
    source: previous
      ? { ...source, fetched_at: previous.snapshot._meta.fetched_at }
      : source,
  });

  let records: unknown[];
  try {
    records = await definition.fetchRecords(options.fetcher ?? fetch);
  } catch (error) {
    const { status, message } = classifyFailure(error);
    return keepPrevious(status, message);
  }

  const truncation = checkTruncation(records.length, previousCount);
  if (truncation.truncated) {
    return keepPrevious(
      "truncated",
      truncation.message ?? "record count below the floor",
    );
  }

  writeSnapshot(
    options.date,
    { ...source, record_count: records.length, status: "ok" },
    records,
    root,
  );

  return {
    result: {
      source_id: definition.source_id,
      status: "ok",
      record_count: records.length,
      previous_record_count: previousCount,
      unresolved_models: [],
      message: null,
    },
    records,
    served_from: options.now,
    source,
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
  runs: readonly SourceRun[],
): Record<string, string | null> {
  const freshness: Record<string, string | null> = {};
  for (const run of runs) freshness[run.result.source_id] = run.served_from;
  return freshness;
}
