import { readFileSync } from "node:fs";
import {
  UNRESOLVED_PATH,
  loadRegistry,
  loadRegistryIndex,
  loadUnresolved,
} from "@/lib/registry/load";
import { mergeUnresolved, writeUnresolved } from "@/lib/registry/unresolved";
import { buildBenchmarkIndex, type BenchmarkAliases } from "@/lib/registry/benchmarks";
import { resolveModelName } from "@/lib/registry/resolve";
import { toBenchmark } from "@/lib/ingest/benchwiki";
import { BenchwikiPayload } from "@/lib/schemas/benchwiki";
import { ArenaRow } from "@/lib/schemas/arena";
import { OpenRouterModel } from "@/lib/schemas/openrouter";
import { perMillionTokens } from "@/lib/ingest/openrouter";
import { harvestArenaScores, harvestEpochScores } from "@/lib/ingest/scores";
import { scrapeVendorPrices } from "@/lib/ingest/vendor-pricing";
import { buildModels, type PriceTable } from "@/lib/join/models";
import { buildBenchmarkModels, joinScores } from "@/lib/join/join";
import {
  arenaSource,
  benchwikiSource,
  bundleFromSnapshot,
  epochSource,
  openRouterSource,
} from "@/lib/ingest/sources";
import {
  buildFreshness,
  runSource,
  writeDerived,
  type SourceRun,
} from "@/lib/ingest/run";
import {
  INGESTION_LOG_PATH,
  appendRun,
  readIngestionLog,
  sourcesNeedingAlarm,
  writeIngestionLog,
} from "@/lib/ingest/log";
import type { UnresolvedSighting } from "@/lib/registry/unresolved";

/**
 * Entry point for the scheduled job — specs/01-architecture/data-pipeline.md.
 *
 * Sources run independently and nothing here throws on a source's behalf. The process
 * exits non-zero only when a source has failed three runs in a row, which is the point at
 * which a human needs to be told.
 */

const BENCHMARK_ALIASES_PATH = "data/registry/benchmark-aliases.json";

function report(run: SourceRun): void {
  const { result } = run;
  const detail = result.message === null ? "" : ` — ${result.message}`;
  console.log(
    `[${result.source_id}] ${result.status} (${result.record_count} records)${detail}`,
  );
}

async function main(): Promise<void> {
  const nowIso = new Date().toISOString();
  const date = nowIso.slice(0, 10);
  const options = { date, now: nowIso };

  const registry = loadRegistry();
  const modelIndex = loadRegistryIndex();
  const resolve = (name: string) => {
    const resolution = resolveModelName(modelIndex, name);
    return resolution.resolved ? resolution.model_id : null;
  };

  const unresolvedModels: UnresolvedSighting[] = [];
  const runs: SourceRun[] = [];

  // 1. Benchmark health, which everything else is joined against.
  const benchwiki = await runSource(benchwikiSource, options);
  runs.push(benchwiki);
  const benchmarks = BenchwikiPayload.parse(benchwiki.records).map((record) =>
    toBenchmark(record, resolve),
  );
  const aliases = JSON.parse(
    readFileSync(BENCHMARK_ALIASES_PATH, "utf8"),
  ) as BenchmarkAliases;
  const benchmarkIndex = buildBenchmarkIndex(benchmarks, aliases);

  // 2. Independent scores.
  const epoch = await runSource(epochSource, options);
  runs.push(epoch);
  const epochHarvest = harvestEpochScores(
    bundleFromSnapshot(epoch.records),
    modelIndex,
    benchmarkIndex,
    epoch.source,
  );
  unresolvedModels.push(...epochHarvest.unresolvedModels);

  // 3. Arena Elo for the image tab. Not joined: no benchmark health record exists for it.
  const arena = await runSource(arenaSource(date), options);
  runs.push(arena);
  const arenaHarvest = harvestArenaScores(
    arena.records.map((row) => ArenaRow.parse(row)),
    modelIndex,
    arena.source,
  );
  unresolvedModels.push(...arenaHarvest.unresolvedModels);

  // 4. Prices: the vendor's own page first, OpenRouter as the labelled fallback.
  const openrouter = await runSource(openRouterSource, options);
  runs.push(openrouter);
  const openRouterPrices: PriceTable = new Map();
  for (const row of openrouter.records) {
    const model = OpenRouterModel.parse(row);
    const model_id = resolve(model.id) ?? resolve(model.name);
    if (model_id === null) continue;
    openRouterPrices.set(model_id, {
      price_input_per_mtok: perMillionTokens(model.pricing.prompt),
      price_output_per_mtok: perMillionTokens(model.pricing.completion),
      context_window: model.context_length,
      source_url: `https://openrouter.ai/${model.id}`,
      fetched_at: openrouter.source.fetched_at,
    });
  }

  const vendor = await scrapeVendorPrices(nowIso);
  for (const failure of vendor.failures) {
    console.log(
      `[vendor-pricing] ${failure.creator}: ${failure.reason} — falling back to OpenRouter`,
    );
  }
  console.log(
    `[vendor-pricing] ${vendor.prices.size} models priced from a vendor's own page`,
  );

  // 5. The join — the core artefact.
  const scores = [...epochHarvest.scores];
  const { joined, unmatchedBenchmarks } = joinScores(scores, benchmarkIndex, nowIso);

  writeDerived("benchmarks.json", benchmarks);
  writeDerived("model-benchmark-join.json", joined);
  writeDerived("benchmark-models.json", buildBenchmarkModels(joined));
  writeDerived(
    "models.json",
    buildModels(registry, scores, vendor.prices, openRouterPrices),
  );
  writeDerived("leaderboard-image.json", {
    note:
      "Arena Elo has no benchmark health record upstream, so these rows are not part of " +
      "model-benchmark-join.json. They are a preference ranking, not a benchmark score.",
    source: arena.source,
    scores: arenaHarvest.scores,
  });
  writeDerived("freshness.json", buildFreshness(runs));

  // 6. What did not resolve. Never dropped silently.
  const allUnmatchedBenchmarks = [
    ...new Set([...epochHarvest.unresolvedBenchmarks, ...unmatchedBenchmarks]),
  ].sort();
  writeDerived("unresolved-benchmarks.json", allUnmatchedBenchmarks, "data/registry");
  writeUnresolved(
    UNRESOLVED_PATH,
    mergeUnresolved(loadUnresolved(), unresolvedModels, date),
  );

  for (const run of runs) report(run);
  console.log(
    `[join] ${joined.length} joined scores | ${arenaHarvest.scores.length} arena rows | ` +
      `${unresolvedModels.length} unresolved model names | ` +
      `${allUnmatchedBenchmarks.length} unmatched benchmarks`,
  );

  const log = appendRun(readIngestionLog(), {
    run_at: nowIso,
    results: runs.map((run) => run.result),
  });
  writeIngestionLog(log, INGESTION_LOG_PATH);

  const alarms = sourcesNeedingAlarm(log);
  for (const alarm of alarms) {
    console.error(
      `[${alarm.source_id}] has failed ${alarm.consecutive_failures} runs in a row. ` +
        `The site is serving the last good snapshot; this needs a human.`,
    );
  }
  if (alarms.length > 0) process.exitCode = 1;
}

await main();
