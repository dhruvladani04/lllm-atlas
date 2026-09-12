import type { Benchmark } from "@/lib/schemas/benchmark";
import { normaliseName } from "@/lib/registry/resolve";

/**
 * Benchmarks have the same identity problem models do. Epoch calls it "GPQA diamond";
 * benchwiki's slug is `gpqa-diamond`. The rules are deliberately the same as
 * specs/01-architecture/model-registry.md, including the refusal to fuzzy match: a score
 * attached to the wrong benchmark would be joined to the wrong health record, which is the
 * one join this entire site exists to get right.
 */

export interface BenchmarkIndex {
  readonly bySlug: ReadonlyMap<string, Benchmark>;
  readonly exact: ReadonlyMap<string, string>;
  readonly normalised: ReadonlyMap<string, string>;
  /**
   * Names that two benchmarks both answer to. Unlike the model registry, this index is
   * built from upstream data rather than a hand-maintained file, so a collision is not a
   * mistake someone can be asked to fix before the build runs. The ambiguous key is
   * withdrawn from the normalised map instead: neither benchmark resolves through it, both
   * still resolve by their exact name and slug, and the collision is reported.
   */
  readonly conflicts: readonly string[];
}

export class BenchmarkConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BenchmarkConflictError";
  }
}

/** Hand-maintained: upstream benchmark name to benchwiki slug. Reviewed, never inferred. */
export type BenchmarkAliases = Record<string, string>;

function claim(
  map: Map<string, string>,
  key: string,
  slug: string,
  kind: string,
  conflicts: string[],
): void {
  const existing = map.get(key);
  if (existing !== undefined && existing !== slug) {
    // Withdraw the key rather than pick a winner. A benchmark resolved to the wrong health
    // record is the one error this site cannot afford; an unresolved one is merely visible.
    map.delete(key);
    conflicts.push(`${kind} "${key}" is claimed by both "${existing}" and "${slug}"`);
    return;
  }
  if (!conflicts.some((entry) => entry.includes(`"${key}"`))) map.set(key, slug);
}

export function buildBenchmarkIndex(
  benchmarks: readonly Benchmark[],
  aliases: BenchmarkAliases = {},
): BenchmarkIndex {
  const bySlug = new Map<string, Benchmark>();
  const exact = new Map<string, string>();
  const normalised = new Map<string, string>();
  const conflicts: string[] = [];

  for (const benchmark of benchmarks) {
    if (bySlug.has(benchmark.slug)) {
      throw new BenchmarkConflictError(`duplicate benchmark slug "${benchmark.slug}"`);
    }
    bySlug.set(benchmark.slug, benchmark);
    claim(exact, benchmark.name, benchmark.slug, "benchmark name", conflicts);
    claim(
      normalised,
      normaliseName(benchmark.slug),
      benchmark.slug,
      "normalised slug",
      conflicts,
    );
    claim(
      normalised,
      normaliseName(benchmark.name),
      benchmark.slug,
      "normalised name",
      conflicts,
    );
  }

  for (const [alias, slug] of Object.entries(aliases)) {
    if (!bySlug.has(slug)) {
      throw new BenchmarkConflictError(
        `alias "${alias}" points at "${slug}", which is not a benchmark on this site`,
      );
    }
    claim(exact, alias, slug, "benchmark alias", conflicts);
    claim(
      normalised,
      normaliseName(alias),
      slug,
      "normalised benchmark alias",
      conflicts,
    );
  }

  return { bySlug, exact, normalised, conflicts };
}

export type BenchmarkResolution =
  | { resolved: true; slug: string; matched_on: "slug" | "name" | "normalised" | "alias" }
  | { resolved: false; name: string };

export function resolveBenchmarkName(
  index: BenchmarkIndex,
  rawName: string,
): BenchmarkResolution {
  const name = rawName.trim();
  if (name === "") return { resolved: false, name: rawName };

  if (index.bySlug.has(name)) return { resolved: true, slug: name, matched_on: "slug" };

  const exact = index.exact.get(name);
  if (exact !== undefined) return { resolved: true, slug: exact, matched_on: "name" };

  const normalised = index.normalised.get(normaliseName(name));
  if (normalised !== undefined) {
    return { resolved: true, slug: normalised, matched_on: "normalised" };
  }

  return { resolved: false, name };
}
