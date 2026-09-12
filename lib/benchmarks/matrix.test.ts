import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILTERS,
  STATUS_ORDER,
  applyFilters,
  buildMatrix,
  languages,
  refreshCycles,
} from "@/lib/benchmarks/matrix";
import { loadBenchmarks } from "@/lib/data/derived";
import type { Benchmark } from "@/lib/schemas/benchmark";

function benchmark(overrides: Partial<Benchmark> = {}): Benchmark {
  return {
    slug: "examplebench",
    name: "ExampleBench",
    capability: "reasoning",
    languages: ["english"],
    secondary_capabilities: [],
    short_description: "",
    launch_date: null,
    status: "active",
    status_evidence: null,
    saturated_date: null,
    successor: null,
    contamination: {
      risk: "low",
      refresh_cycle: "static",
      test_set_public: null,
      mitigation: null,
    },
    human_baseline: { score: null, note: null },
    statistical_note: null,
    metric_primary: null,
    judge_model: null,
    last_updated: "2026-09-01",
    leaderboards: [],
    performance_timeline: [],
    source_url: "https://benchwiki.vercel.app/benchmarks/examplebench",
    ...overrides,
  };
}

describe("buildMatrix", () => {
  it("puts every benchmark in exactly one capability row and status column", () => {
    const matrix = buildMatrix([
      benchmark({ slug: "a", capability: "reasoning", status: "active" }),
      benchmark({ slug: "b", capability: "reasoning", status: "saturated" }),
      benchmark({ slug: "c", capability: "coding", status: "deprecated" }),
    ]);

    expect(matrix.map((row) => row.capability)).toEqual(["coding", "reasoning"]);
    const reasoning = matrix.find((row) => row.capability === "reasoning");
    expect(reasoning?.total).toBe(2);
    expect(
      reasoning?.cells.find((cell) => cell.status === "active")?.benchmarks,
    ).toHaveLength(1);
  });

  it("always emits every status column, empty or not", () => {
    const matrix = buildMatrix([benchmark()]);
    expect(matrix[0]?.cells.map((cell) => cell.status)).toEqual([...STATUS_ORDER]);
  });

  it("flags a capability where nothing still discriminates", () => {
    // The fact the grid exists to expose: a whole area gone saturated at a glance.
    const matrix = buildMatrix([
      benchmark({ slug: "a", status: "saturated" }),
      benchmark({ slug: "b", status: "deprecated" }),
    ]);
    expect(matrix[0]?.allRetired).toBe(true);
  });

  it("does not flag a capability that still has a live benchmark", () => {
    const matrix = buildMatrix([
      benchmark({ slug: "a", status: "saturated" }),
      benchmark({ slug: "b", status: "nearing-saturation" }),
    ]);
    expect(matrix[0]?.allRetired).toBe(false);
  });
});

describe("applyFilters", () => {
  const benchmarks = [
    benchmark({
      slug: "a",
      contamination: {
        risk: "high",
        refresh_cycle: "static",
        test_set_public: true,
        mitigation: null,
      },
    }),
    benchmark({
      slug: "b",
      contamination: {
        risk: "low",
        refresh_cycle: "yearly",
        test_set_public: false,
        mitigation: null,
      },
      languages: ["chinese"],
    }),
  ];
  const scored = new Set(["a"]);

  it("passes everything through by default", () => {
    expect(applyFilters(benchmarks, DEFAULT_FILTERS, scored)).toHaveLength(2);
  });

  it("filters on contamination risk", () => {
    const result = applyFilters(
      benchmarks,
      { ...DEFAULT_FILTERS, contaminationRisk: "high" },
      scored,
    );
    expect(result.map((entry) => entry.slug)).toEqual(["a"]);
  });

  it("filters on refresh cycle", () => {
    const result = applyFilters(
      benchmarks,
      { ...DEFAULT_FILTERS, refreshCycle: "yearly" },
      scored,
    );
    expect(result.map((entry) => entry.slug)).toEqual(["b"]);
  });

  it("filters on language", () => {
    const result = applyFilters(
      benchmarks,
      { ...DEFAULT_FILTERS, language: "chinese" },
      scored,
    );
    expect(result.map((entry) => entry.slug)).toEqual(["b"]);
  });

  it("filters to benchmarks models on this site are scored on", () => {
    // The addition no upstream view offers.
    const result = applyFilters(
      benchmarks,
      { ...DEFAULT_FILTERS, hasScoresHere: true },
      scored,
    );
    expect(result.map((entry) => entry.slug)).toEqual(["a"]);
  });

  it("combines filters rather than replacing them", () => {
    const result = applyFilters(
      benchmarks,
      { ...DEFAULT_FILTERS, contaminationRisk: "high", language: "chinese" },
      scored,
    );
    expect(result).toHaveLength(0);
  });
});

describe("filter options come from the data", () => {
  it("lists the refresh cycles and languages actually present", () => {
    const benchmarks = [
      benchmark({ languages: ["english", "python"] }),
      benchmark({
        contamination: {
          risk: "low",
          refresh_cycle: "continuous",
          test_set_public: null,
          mitigation: null,
        },
      }),
    ];
    expect(refreshCycles(benchmarks)).toEqual(["continuous", "static"]);
    expect(languages(benchmarks)).toEqual(["english", "python"]);
  });

  it("omits a null refresh cycle rather than offering it as a choice", () => {
    const benchmarks = [
      benchmark({
        contamination: {
          risk: "low",
          refresh_cycle: null,
          test_set_public: null,
          mitigation: null,
        },
      }),
    ];
    expect(refreshCycles(benchmarks)).toEqual([]);
  });
});

describe("the committed benchmark data", () => {
  const benchmarks = loadBenchmarks();

  it("builds a matrix with every benchmark placed", () => {
    const matrix = buildMatrix(benchmarks);
    const placed = matrix.flatMap((row) => row.cells.flatMap((cell) => cell.benchmarks));
    expect(placed).toHaveLength(benchmarks.length);
  });

  it("has a canonical benchwiki URL for every mirrored record", () => {
    for (const entry of benchmarks) {
      expect(entry.source_url).toBe(
        `https://benchwiki.vercel.app/benchmarks/${entry.slug}`,
      );
    }
  });
});
