import { describe, expect, it } from "vitest";
import { compareModels } from "@/lib/leaderboard/compare";
import type { JoinedScore } from "@/lib/schemas/score";
import type { Benchmark } from "@/lib/schemas/benchmark";

const benchmark = (slug: string): Benchmark => ({
  slug,
  name: slug.toUpperCase(),
  capability: "reasoning",
  languages: [],
  secondary_capabilities: [],
  short_description: "",
  launch_date: null,
  status: "active",
  status_evidence: null,
  saturated_date: null,
  successor: null,
  contamination: {
    risk: "low",
    refresh_cycle: null,
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
  source_url: `https://benchwiki.vercel.app/benchmarks/${slug}`,
});

function score(
  model_id: string,
  slug: string,
  value: number,
  over: Partial<JoinedScore> = {},
): JoinedScore {
  return {
    model_id,
    variant: "base",
    benchmark_slug: slug,
    harness: null,
    value,
    unit: "percent",
    confidence_interval: null,
    sample_size: null,
    provenance: "independent",
    measured_at: "2026-01-01",
    source: {
      source_id: "epoch",
      source_url: "https://epoch.ai/data/benchmark_data.zip",
      fetched_at: "2026-09-18T00:00:00.000Z",
      licence: "CC BY 4.0",
      attribution: "Epoch AI",
    },
    notes: null,
    benchmark: benchmark(slug),
    health_flags: [],
    ...over,
  };
}

describe("compareModels", () => {
  it("only calls a benchmark comparable when every selected model has a score", () => {
    const result = compareModels(
      [score("a", "gpqa", 90), score("b", "gpqa", 80), score("a", "mmlu", 70)],
      ["a", "b"],
    );

    expect(result.comparable.map((row) => row.benchmark_slug)).toEqual(["gpqa"]);
    // MMLU is not a win for "a" — nobody ran "b" on it, which is a different claim.
    expect(result.incomplete.map((row) => row.benchmark_slug)).toEqual(["mmlu"]);
  });

  it("marks the missing side rather than dropping the row", () => {
    const result = compareModels([score("a", "mmlu", 70)], ["a", "b"]);
    const row = result.incomplete[0];
    expect(row?.cells.find((cell) => cell.model_id === "b")?.score).toBeNull();
  });

  it("prefers an independent measurement over a vendor-reported one", () => {
    const result = compareModels(
      [
        score("a", "gpqa", 99, { provenance: "vendor-reported" }),
        score("a", "gpqa", 90),
        score("b", "gpqa", 80),
      ],
      ["a", "b"],
    );
    expect(result.comparable[0]?.cells[0]?.score?.value).toBe(90);
  });

  it("returns nothing for fewer than two models", () => {
    expect(compareModels([score("a", "gpqa", 90)], ["a"])).toEqual({
      comparable: [],
      incomplete: [],
    });
  });

  it("ignores models that were not selected", () => {
    const result = compareModels(
      [score("a", "gpqa", 90), score("b", "gpqa", 80), score("c", "gpqa", 70)],
      ["a", "b"],
    );
    expect(result.comparable[0]?.cells).toHaveLength(2);
  });
});
