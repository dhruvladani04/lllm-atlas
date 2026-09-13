import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { Benchmark } from "@/lib/schemas/benchmark";
import { BenchmarkHistory } from "@/lib/schemas/benchmark-history";
import { JoinedScore, Score } from "@/lib/schemas/score";
import { Model } from "@/lib/schemas/model";
import { SourceMeta } from "@/lib/schemas/common";

/**
 * Reads the committed derived files at build time.
 *
 * Nothing here runs on a user request: specs/01-architecture/stack-and-structure.md forbids
 * client-side fetching of leaderboard or benchmark data, and every page renders from JSON
 * read during the build. Everything is Zod-parsed rather than cast, so a malformed derived
 * file fails the build instead of reaching a reader.
 */

const DERIVED = join(process.cwd(), "data", "derived");
const REGISTRY = join(process.cwd(), "data", "registry");

function read<T>(fileName: string, schema: z.ZodType<T>, fallback: T): T {
  const path = join(DERIVED, fileName);
  if (!existsSync(path)) return fallback;
  return schema.parse(JSON.parse(readFileSync(path, "utf8")) as unknown);
}

export const CapabilityIndexRow = z.object({
  model: z.string(),
  display_name: z.string(),
  model_id: z.string(),
  eci: z.number(),
  eci_ci_low: z.number().nullable(),
  eci_ci_high: z.number().nullable(),
  date: z.string().nullable(),
  organization: z.string().nullable(),
});
export type CapabilityIndexRow = z.infer<typeof CapabilityIndexRow>;

const CapabilityIndexFile = z.object({
  note: z.string(),
  source: SourceMeta,
  rows: z.array(CapabilityIndexRow),
});

const ImageLeaderboardFile = z.object({
  note: z.string(),
  source: SourceMeta,
  scores: z.array(Score),
});

export const Freshness = z.record(z.string(), z.string().nullable());
export type Freshness = z.infer<typeof Freshness>;

export function loadJoinedScores(): JoinedScore[] {
  return read("model-benchmark-join.json", z.array(JoinedScore), []);
}

export function loadModels(): Model[] {
  return read("models.json", z.array(Model), []);
}

export function loadBenchmarks(): Benchmark[] {
  return read("benchmarks.json", z.array(Benchmark), []);
}

/**
 * Hand-maintained, not ingested — see `lib/schemas/benchmark-history.ts`. Lives under
 * `data/registry/` rather than `data/derived/` because nothing generates it; a human edits
 * it directly, the same way `data/registry/models.json` is edited directly.
 */
export function loadBenchmarkHistory(): BenchmarkHistory {
  const path = join(REGISTRY, "benchmark-history.json");
  if (!existsSync(path)) return {};
  return BenchmarkHistory.parse(JSON.parse(readFileSync(path, "utf8")) as unknown);
}

export function loadFreshness(): Freshness {
  return read("freshness.json", Freshness, {});
}

export function loadCapabilityIndex(): z.infer<typeof CapabilityIndexFile> | null {
  const path = join(DERIVED, "capability-index.json");
  if (!existsSync(path)) return null;
  return CapabilityIndexFile.parse(JSON.parse(readFileSync(path, "utf8")) as unknown);
}

export function loadImageLeaderboard(): z.infer<typeof ImageLeaderboardFile> | null {
  const path = join(DERIVED, "leaderboard-image.json");
  if (!existsSync(path)) return null;
  return ImageLeaderboardFile.parse(JSON.parse(readFileSync(path, "utf8")) as unknown);
}
