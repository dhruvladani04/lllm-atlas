import { loadRegistryIndex } from "@/lib/registry/load";
import { UNRESOLVED_PATH, loadUnresolved } from "@/lib/registry/load";
import { mergeUnresolved, writeUnresolved } from "@/lib/registry/unresolved";
import {
  buildFreshness,
  ingestBenchwiki,
  writeDerived,
  type SourceOutcome,
} from "@/lib/ingest/run";
import {
  INGESTION_LOG_PATH,
  appendRun,
  readIngestionLog,
  sourcesNeedingAlarm,
  writeIngestionLog,
} from "@/lib/ingest/log";

/**
 * Entry point for the scheduled job — specs/01-architecture/data-pipeline.md.
 *
 * Every source runs independently: one failing must not abort the others, so nothing here
 * throws on a source's behalf. The process exits non-zero only when a source has failed
 * three runs in a row, which is the point at which a human needs to be told.
 */

async function main(): Promise<void> {
  const now = new Date();
  const nowIso = now.toISOString();
  const date = nowIso.slice(0, 10);

  const registry = loadRegistryIndex();
  const outcomes: SourceOutcome[] = [];

  outcomes.push(await ingestBenchwiki({ date, now: nowIso, registry }));

  for (const outcome of outcomes) {
    const { result } = outcome;
    const detail = result.message === null ? "" : ` — ${result.message}`;
    console.log(
      `[${result.source_id}] ${result.status} (${result.record_count} records)${detail}`,
    );
    if (result.unresolved_models.length > 0) {
      console.log(
        `[${result.source_id}] ${result.unresolved_models.length} unresolved model names ` +
          `written to ${UNRESOLVED_PATH} for review`,
      );
    }
  }

  writeDerived(
    "benchmarks.json",
    outcomes.flatMap((outcome) => outcome.benchmarks),
  );
  writeDerived("freshness.json", buildFreshness(outcomes));

  const sightings = outcomes.flatMap((outcome) => outcome.unresolved);
  writeUnresolved(UNRESOLVED_PATH, mergeUnresolved(loadUnresolved(), sightings, date));

  const log = appendRun(readIngestionLog(), {
    run_at: nowIso,
    results: outcomes.map((outcome) => outcome.result),
  });
  writeIngestionLog(log, INGESTION_LOG_PATH);

  const alarms = sourcesNeedingAlarm(log);
  if (alarms.length > 0) {
    for (const alarm of alarms) {
      console.error(
        `[${alarm.source_id}] has failed ${alarm.consecutive_failures} runs in a row. ` +
          `The site is serving the last good snapshot; this needs a human.`,
      );
    }
    process.exitCode = 1;
  }
}

await main();
