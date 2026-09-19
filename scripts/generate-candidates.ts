import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadRegistry } from "@/lib/registry/load";
import { buildCandidates, indexesCleanly } from "@/lib/registry/candidates";
import type { OpenRouterRef, SourceRow } from "@/lib/registry/candidates";
import { CandidateFile } from "@/lib/schemas/candidate";
import { buildBenchmarkIndex, resolveBenchmarkName } from "@/lib/registry/benchmarks";
import type { BenchmarkAliases } from "@/lib/registry/benchmarks";
import { toBenchmark } from "@/lib/ingest/benchwiki";
import { BenchwikiPayload } from "@/lib/schemas/benchwiki";

/**
 * Proposes registry entries from the newest snapshot — `pnpm generate-candidates`.
 *
 * Writes `data/registry/candidates.json` for a human to review at `/review`. Nothing here
 * touches the registry: this script only ever writes the candidates file, and refuses even
 * that if the proposals could not coexist with the registry.
 */

const SNAPSHOTS = join("data", "snapshots");
const OUTPUT = join("data", "registry", "candidates.json");

function latestSnapshotDate(): string {
  const dates = readdirSync(SNAPSHOTS)
    .filter((name) => /^\d{4}-\d{2}-\d{2}$/.test(name))
    .sort();
  const latest = dates[dates.length - 1];
  if (latest === undefined) throw new Error(`no snapshots in ${SNAPSHOTS}`);
  return latest;
}

function readSnapshot(date: string, source: string): unknown {
  return JSON.parse(
    readFileSync(join(SNAPSHOTS, date, `${source}.json`), "utf8"),
  ) as unknown;
}

interface EpochSnapshot {
  records: {
    meta: { benchmark: string };
    rows: {
      model_version: string;
      display_name: string | null;
      organization: string | null;
      release_date: string | null;
    }[];
  }[];
}

interface OpenRouterSnapshot {
  records: { id: string; canonical_slug: string; name: string }[];
}

interface ArenaSnapshot {
  records: { model: string }[];
}

function main(): void {
  const date = latestSnapshotDate();
  const registry = loadRegistry();

  const epoch = readSnapshot(date, "epoch") as EpochSnapshot;
  const rows: SourceRow[] = [];
  for (const record of epoch.records) {
    for (const row of record.rows) {
      rows.push({
        model_version: row.model_version,
        display_name: row.display_name,
        organization: row.organization,
        release_date: row.release_date,
        benchmark: record.meta.benchmark,
        source_id: "epoch",
      });
    }
  }

  const openrouter = (readSnapshot(date, "openrouter") as OpenRouterSnapshot).records.map(
    (record): OpenRouterRef => ({
      id: record.id,
      canonical_slug: record.canonical_slug,
      name: record.name,
    }),
  );

  // The arena mirror only lists image models, so anything it names is one. Epoch publishes
  // no image benchmarks, which is why modality cannot be inferred from the scores alone.
  const arena = readSnapshot(date, "arena-mirror") as ArenaSnapshot;
  const imageStems = new Set(arena.records.map((record) => record.model));

  // Which benchmark names this site can actually join to a health record. A model measured
  // only on benchmarks we cannot resolve adds nothing when approved, and the reviewer should
  // not have to discover that by approving it.
  const benchwiki = BenchwikiPayload.parse(
    (readSnapshot(date, "benchwiki") as { records: unknown }).records,
  ).map((record) => toBenchmark(record));
  const aliases = JSON.parse(
    readFileSync(join("data", "registry", "benchmark-aliases.json"), "utf8"),
  ) as BenchmarkAliases;
  const benchmarkIndex = buildBenchmarkIndex(benchwiki, aliases);

  const resolvableBenchmarks = new Set(
    [...new Set(rows.map((row) => row.benchmark))].filter(
      (name) => resolveBenchmarkName(benchmarkIndex, name).resolved,
    ),
  );

  const candidates = buildCandidates({
    rows,
    registry,
    openrouter,
    imageStems,
    resolvableBenchmarks,
  });

  const check = indexesCleanly(
    registry,
    candidates.filter((c) => c.confidence !== "conflict").map((c) => c.proposed),
  );
  if (!check.ok) {
    console.error(
      `[candidates] refusing to write: the proposals would not index cleanly.\n${check.error}`,
    );
    process.exitCode = 1;
    return;
  }

  const file = CandidateFile.parse({
    generated_at: new Date().toISOString(),
    snapshot_date: date,
    candidates,
  });
  writeFileSync(OUTPUT, `${JSON.stringify(file, null, 2)}\n`, "utf8");

  const byTier = new Map<string, number>();
  for (const candidate of candidates) {
    byTier.set(candidate.confidence, (byTier.get(candidate.confidence) ?? 0) + 1);
  }

  console.log(`[candidates] snapshot ${date}, registry has ${registry.length} models`);
  console.log(
    `[candidates] ${candidates.length} proposed — ` +
      ["high", "medium", "low", "conflict"]
        .map((tier) => `${byTier.get(tier) ?? 0} ${tier}`)
        .join(", "),
  );
  console.log(`[candidates] written to ${OUTPUT}. Run pnpm review, then open /review.`);
}

main();
