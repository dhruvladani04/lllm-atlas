import type { Benchmark } from "@/lib/schemas/benchmark";
import type { BenchmarkStatus } from "@/lib/schemas/common";

/**
 * specs/03-sections/benchmarks.md — the capability × status matrix.
 *
 * The same primitive benchwiki uses, because it is the right one: the grid *is* the
 * information. It shows at a glance that a whole capability area has gone saturated, which
 * a list of cards cannot.
 */

export const STATUS_ORDER = [
  "active",
  "nearing-saturation",
  "saturated",
  "deprecated",
] as const satisfies readonly BenchmarkStatus[];

export const STATUS_HEADING: Record<BenchmarkStatus, string> = {
  active: "Active",
  "nearing-saturation": "Nearing saturation",
  saturated: "Saturated",
  deprecated: "Deprecated",
};

export interface MatrixFilters {
  contaminationRisk: "any" | "low" | "medium" | "high" | "unknown";
  refreshCycle: string;
  language: string;
  /** The addition no upstream view offers: only benchmarks models on this site are scored on. */
  hasScoresHere: boolean;
  /** Free-text search over name, slug and description. Empty means no constraint. */
  query: string;
}

export const DEFAULT_FILTERS: MatrixFilters = {
  contaminationRisk: "any",
  refreshCycle: "any",
  language: "any",
  hasScoresHere: false,
  query: "",
};

export function applyFilters(
  benchmarks: readonly Benchmark[],
  filters: MatrixFilters,
  scoredSlugs: ReadonlySet<string>,
): Benchmark[] {
  return benchmarks.filter((benchmark) => {
    if (
      filters.contaminationRisk !== "any" &&
      benchmark.contamination.risk !== filters.contaminationRisk
    ) {
      return false;
    }
    if (
      filters.refreshCycle !== "any" &&
      benchmark.contamination.refresh_cycle !== filters.refreshCycle
    ) {
      return false;
    }
    if (filters.language !== "any" && !benchmark.languages.includes(filters.language)) {
      return false;
    }
    if (filters.hasScoresHere && !scoredSlugs.has(benchmark.slug)) return false;

    // Matched against what the reader can actually see or would plausibly type: the name,
    // the slug in the URL, and the one-line description. Not the status evidence or the
    // contamination prose, where a common word would match almost everything and make the
    // search feel broken.
    const query = filters.query.trim().toLowerCase();
    if (query !== "") {
      const haystack = [
        benchmark.name,
        benchmark.slug,
        benchmark.short_description,
        benchmark.capability,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });
}

export interface MatrixCell {
  capability: string;
  status: BenchmarkStatus;
  benchmarks: Benchmark[];
}

export interface MatrixRow {
  capability: string;
  cells: MatrixCell[];
  total: number;
  /** Nothing in this capability still discriminates — the fact the grid exists to expose. */
  allRetired: boolean;
}

export function buildMatrix(benchmarks: readonly Benchmark[]): MatrixRow[] {
  const capabilities = [
    ...new Set(benchmarks.map((benchmark) => benchmark.capability)),
  ].sort();

  return capabilities.map((capability) => {
    const inCapability = benchmarks.filter(
      (benchmark) => benchmark.capability === capability,
    );
    const cells = STATUS_ORDER.map((status) => ({
      capability,
      status,
      benchmarks: inCapability
        .filter((benchmark) => benchmark.status === status)
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));

    const live = inCapability.filter(
      (benchmark) =>
        benchmark.status === "active" || benchmark.status === "nearing-saturation",
    );

    return {
      capability,
      cells,
      total: inCapability.length,
      allRetired: inCapability.length > 0 && live.length === 0,
    };
  });
}

export function refreshCycles(benchmarks: readonly Benchmark[]): string[] {
  return [
    ...new Set(
      benchmarks
        .map((benchmark) => benchmark.contamination.refresh_cycle)
        .filter((cycle): cycle is string => cycle !== null),
    ),
  ].sort();
}

export function languages(benchmarks: readonly Benchmark[]): string[] {
  return [...new Set(benchmarks.flatMap((benchmark) => benchmark.languages))].sort();
}
