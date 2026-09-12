import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  IngestionLog,
  type IngestionResult,
  type IngestionRun,
} from "@/lib/schemas/ingestion";

/**
 * specs/01-architecture/data-pipeline.md — the run log, and the rule that three
 * consecutive failures for one source fail the Actions job so a notification fires.
 */

export const INGESTION_LOG_PATH = join("data", "meta", "ingestion-log.json");
export const CONSECUTIVE_FAILURE_LIMIT = 3;

/** Newest run first, so a reader sees the current state without scrolling. */
export function readIngestionLog(path: string = INGESTION_LOG_PATH): IngestionLog {
  if (!existsSync(path)) return [];
  return IngestionLog.parse(JSON.parse(readFileSync(path, "utf8")) as unknown);
}

export function writeIngestionLog(
  log: IngestionLog,
  path: string = INGESTION_LOG_PATH,
): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(log, null, 2)}\n`, "utf8");
}

export function appendRun(log: IngestionLog, run: IngestionRun): IngestionLog {
  return [run, ...log];
}

export function isFailure(result: IngestionResult): boolean {
  return result.status !== "ok";
}

/**
 * Counts how many runs in a row a source has failed, newest run first. A source that is
 * absent from a run is not counted either way — it did not succeed, but it also did not
 * fail, and inventing a failure would fire a false alarm.
 */
export function consecutiveFailures(log: IngestionLog, sourceId: string): number {
  let count = 0;
  for (const run of log) {
    const result = run.results.find((entry) => entry.source_id === sourceId);
    if (!result) continue;
    if (isFailure(result)) count += 1;
    else break;
  }
  return count;
}

export interface SourceAlarm {
  source_id: string;
  consecutive_failures: number;
}

/** Sources that have hit the limit. A non-empty list means the job must exit non-zero. */
export function sourcesNeedingAlarm(log: IngestionLog): SourceAlarm[] {
  const sourceIds = new Set(log.flatMap((run) => run.results.map((r) => r.source_id)));
  return [...sourceIds]
    .map((source_id) => ({
      source_id,
      consecutive_failures: consecutiveFailures(log, source_id),
    }))
    .filter((alarm) => alarm.consecutive_failures >= CONSECUTIVE_FAILURE_LIMIT)
    .sort((a, b) => a.source_id.localeCompare(b.source_id));
}
