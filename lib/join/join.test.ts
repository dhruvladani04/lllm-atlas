import { describe, expect, it } from "vitest";
import { buildBenchmarkModels, joinScores } from "@/lib/join/join";
import { buildBenchmarkIndex } from "@/lib/registry/benchmarks";
import type { Benchmark } from "@/lib/schemas/benchmark";
import type { Score } from "@/lib/schemas/score";

const NOW = "2026-09-12T06:00:00.000Z";

function benchmark(slug: string, overrides: Partial<Benchmark> = {}): Benchmark {
  return {
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
    ...overrides,
  };
}

function score(overrides: Partial<Score> = {}): Score {
  return {
    model_id: "anthropic/claude-opus-5",
    variant: "base",
    benchmark_slug: "gpqa",
    harness: null,
    value: 90,
    unit: "percent",
    confidence_interval: null,
    sample_size: null,
    provenance: "vendor-reported",
    measured_at: null,
    source: {
      source_id: "epoch",
      source_url: "https://epoch.ai/data/benchmark_data.zip",
      fetched_at: NOW,
      licence: "CC BY 4.0",
      attribution: "Epoch AI",
    },
    notes: null,
    ...overrides,
  };
}

const index = buildBenchmarkIndex([
  benchmark("gpqa"),
  benchmark("mmlu", {
    status: "saturated",
    successor: "mmlu-pro",
    contamination: {
      risk: "high",
      refresh_cycle: null,
      test_set_public: true,
      mitigation: null,
    },
  }),
]);

describe("joinScores", () => {
  it("attaches the benchmark's health record to every score", () => {
    const { joined } = joinScores([score()], index, NOW);
    expect(joined[0]?.benchmark.slug).toBe("gpqa");
  });

  it("produces the milestone's case: saturated and high-contamination together", () => {
    const { joined } = joinScores(
      [score({ benchmark_slug: "mmlu", provenance: "independent" })],
      index,
      NOW,
    );
    expect(joined[0]?.health_flags).toEqual(
      expect.arrayContaining(["saturated", "high-contamination", "superseded"]),
    );
  });

  it("excludes a score whose benchmark has no health record, and reports it", () => {
    // Rendering a bare number is the one thing section 1 forbids, so an unmatched
    // benchmark means the score does not appear at all.
    const { joined, unmatchedBenchmarks } = joinScores(
      [score({ benchmark_slug: "some-unknown-bench" })],
      index,
      NOW,
    );
    expect(joined).toHaveLength(0);
    expect(unmatchedBenchmarks).toEqual(["some-unknown-bench"]);
  });
});

describe("vendor-reported-only is a statement about the corpus", () => {
  it("clears when an independent score of the same measurement exists", () => {
    const { joined } = joinScores(
      [score(), score({ provenance: "independent", value: 88 })],
      index,
      NOW,
    );
    for (const row of joined)
      expect(row.health_flags).not.toContain("vendor-reported-only");
  });

  it("stays set when the independent score is of a different harness", () => {
    // An agent score is a system score. Measuring a model under one scaffold says nothing
    // about the same model under another.
    const { joined } = joinScores(
      [
        score({ harness: "openhands" }),
        score({ harness: "swe-agent", provenance: "independent" }),
      ],
      index,
      NOW,
    );
    const vendorRow = joined.find((row) => row.harness === "openhands");
    expect(vendorRow?.health_flags).toContain("vendor-reported-only");
  });

  it("stays set when the independent score is of a different variant", () => {
    const { joined } = joinScores(
      [score(), score({ variant: "high", provenance: "independent" })],
      index,
      NOW,
    );
    const baseRow = joined.find((row) => row.variant === "base");
    expect(baseRow?.health_flags).toContain("vendor-reported-only");
  });
});

describe("buildBenchmarkModels", () => {
  it("builds the reverse index section 2 is built on", () => {
    const { joined } = joinScores(
      [score(), score({ model_id: "openai/gpt-5", provenance: "independent" })],
      index,
      NOW,
    );
    expect(buildBenchmarkModels(joined)).toEqual({
      gpqa: ["anthropic/claude-opus-5", "openai/gpt-5"],
    });
  });
});
