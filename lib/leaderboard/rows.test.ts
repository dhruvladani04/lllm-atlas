import { describe, expect, it } from "vitest";
import { buildRows, selectReferenceBenchmark, tabForScore } from "@/lib/leaderboard/rows";
import type { Benchmark } from "@/lib/schemas/benchmark";
import type { JoinedScore } from "@/lib/schemas/score";
import type { Model } from "@/lib/schemas/model";

/**
 * The ranking rule — the thing the spec did not have and Milestone 4 had to settle.
 *
 * One reference benchmark per tab, named in the header, ranking only the models measured on
 * it. "Hide saturated benchmarks" changes which benchmark is eligible, which changes the
 * ranking. That reordering is the site's argument made interactive, so it is tested as a
 * behaviour rather than left to the eye.
 */

function benchmark(slug: string, overrides: Partial<Benchmark> = {}): Benchmark {
  return {
    slug,
    name: slug,
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

function score(
  model_id: string,
  bench: Benchmark,
  value: number,
  overrides: Partial<JoinedScore> = {},
): JoinedScore {
  return {
    model_id,
    variant: "base",
    benchmark_slug: bench.slug,
    harness: null,
    value,
    unit: "percent",
    confidence_interval: null,
    sample_size: null,
    provenance: "independent",
    measured_at: null,
    source: {
      source_id: "epoch",
      source_url: "https://epoch.ai/data/benchmark_data.zip",
      fetched_at: "2026-09-12T06:00:00.000Z",
      licence: "CC BY 4.0",
      attribution: "Epoch AI",
    },
    notes: null,
    benchmark: bench,
    health_flags: [],
    ...overrides,
  };
}

function model(model_id: string, overrides: Partial<Model> = {}): Model {
  return {
    model_id,
    display_name: model_id,
    creator: "ExampleCorp",
    released_at: "2026-01-01",
    open_weights: false,
    aliases: [],
    variants: [{ variant: "base", aliases: [] }],
    state: "ranked",
    context_window: null,
    price_input_per_mtok: null,
    price_output_per_mtok: null,
    ...overrides,
  };
}

const ACTIVE = benchmark("active-bench");
const SATURATED = benchmark("saturated-bench", { status: "saturated" });

describe("tabForScore", () => {
  it("sends anything measured under a harness to agentic", () => {
    expect(tabForScore(score("m", ACTIVE, 10, { harness: "openhands" }))).toBe("agentic");
  });

  it("sends agentic-tool-use benchmarks to agentic even without a harness", () => {
    const tools = benchmark("toolbench", { capability: "agentic-tool-use" });
    expect(tabForScore(score("m", tools, 10))).toBe("agentic");
  });

  it("sends everything else to text", () => {
    expect(tabForScore(score("m", ACTIVE, 10))).toBe("text");
  });
});

describe("selectReferenceBenchmark", () => {
  const scores = [
    score("a", SATURATED, 90),
    score("b", SATURATED, 80),
    score("c", SATURATED, 70),
    score("a", ACTIVE, 50),
    score("b", ACTIVE, 40),
  ];

  it("picks the most-covered benchmark when saturation is allowed", () => {
    expect(selectReferenceBenchmark(scores, false)?.slug).toBe("saturated-bench");
  });

  it("picks the most-covered discriminating benchmark when saturation is hidden", () => {
    expect(selectReferenceBenchmark(scores, true)?.slug).toBe("active-bench");
  });

  it("prefers an active benchmark over a nearing-saturation one at equal coverage", () => {
    const nearing = benchmark("nearing-bench", { status: "nearing-saturation" });
    const tied = [score("a", nearing, 10), score("a", ACTIVE, 10)];
    expect(selectReferenceBenchmark(tied, true)?.slug).toBe("active-bench");
  });

  it("returns nothing when every benchmark is saturated and they are hidden", () => {
    expect(selectReferenceBenchmark([score("a", SATURATED, 90)], true)).toBeNull();
  });
});

describe("the hide-saturated toggle changes the ranking", () => {
  // The saturated benchmark covers three models, the active one two, so it wins the
  // reference while saturation is shown and loses it the moment saturation is hidden.
  const scores = [
    score("winner-on-saturated", SATURATED, 99),
    score("winner-on-active", SATURATED, 60),
    score("saturated-only", SATURATED, 70),
    score("winner-on-saturated", ACTIVE, 40),
    score("winner-on-active", ACTIVE, 85),
  ];
  const models = [
    model("winner-on-saturated"),
    model("winner-on-active"),
    model("saturated-only"),
  ];
  const input = { scores, models, capabilityIndex: new Map(), tab: "text" as const };

  it("ranks one model first on the saturated benchmark", () => {
    const result = buildRows({ ...input, hideSaturated: false });
    expect(result.reference?.slug).toBe("saturated-bench");
    expect(result.rows[0]?.model.model_id).toBe("winner-on-saturated");
  });

  it("ranks the other first once saturated benchmarks are hidden", () => {
    // The signature control: the table visibly reorders, because the benchmark it is
    // ranked on has changed.
    const result = buildRows({ ...input, hideSaturated: true });
    expect(result.reference?.slug).toBe("active-bench");
    expect(result.rows[0]?.model.model_id).toBe("winner-on-active");
  });

  it("drops a model whose only scores are saturated, and says why", () => {
    const result = buildRows({ ...input, hideSaturated: true });
    expect(result.rows.map((row) => row.model.model_id)).not.toContain("saturated-only");
    expect(
      result.unranked.find((row) => row.model.model_id === "saturated-only")?.reason,
    ).toBe("only-saturated-scores");
  });

  it("removes saturated scores entirely, not just their candidacy", () => {
    const result = buildRows({ ...input, hideSaturated: true });
    for (const row of result.rows) {
      expect(row.score.benchmark.status).not.toBe("saturated");
    }
  });
});

describe("buildRows", () => {
  it("prefers an independent number over a vendor one for the same measurement", () => {
    const result = buildRows({
      scores: [
        score("a", ACTIVE, 95, { provenance: "vendor-reported" }),
        score("a", ACTIVE, 88, { provenance: "independent" }),
      ],
      models: [model("a")],
      capabilityIndex: new Map(),
      tab: "text",
      hideSaturated: true,
    });

    expect(result.rows[0]?.score.value).toBe(88);
    expect(result.rows[0]?.provenance).toBe("mixed");
  });

  it("marks a row vendor-reported when that is all there is", () => {
    const result = buildRows({
      scores: [score("a", ACTIVE, 95, { provenance: "vendor-reported" })],
      models: [model("a")],
      capabilityIndex: new Map(),
      tab: "text",
      hideSaturated: true,
    });
    expect(result.rows[0]?.provenance).toBe("vendor-reported");
  });

  it("lists a scored model that missed the reference benchmark, with the reason", () => {
    const other = benchmark("other-bench");
    const result = buildRows({
      scores: [score("a", ACTIVE, 90), score("b", ACTIVE, 80), score("c", other, 99)],
      models: [model("a"), model("b"), model("c")],
      capabilityIndex: new Map(),
      tab: "text",
      hideSaturated: true,
    });

    const missed = result.unranked.find((row) => row.model.model_id === "c");
    expect(missed?.reason).toBe("no-score-on-reference");
    expect(missed?.scoreCount).toBe(1);
  });

  it("lists a released model with no scores as released_unranked", () => {
    const result = buildRows({
      scores: [score("a", ACTIVE, 90)],
      models: [model("a"), model("b", { state: "released_unranked" })],
      capabilityIndex: new Map(),
      tab: "text",
      hideSaturated: true,
    });
    expect(result.unranked.find((row) => row.model.model_id === "b")?.reason).toBe(
      "released_unranked",
    );
  });

  it("keeps an announced model out of released_unranked", () => {
    const result = buildRows({
      scores: [],
      models: [model("b", { state: "announced", released_at: null })],
      capabilityIndex: new Map(),
      tab: "text",
      hideSaturated: true,
    });
    expect(result.unranked[0]?.reason).toBe("announced");
  });

  it("keeps variants of one model as separate rows", () => {
    const result = buildRows({
      scores: [score("a", ACTIVE, 80), score("a", ACTIVE, 92, { variant: "high" })],
      models: [model("a")],
      capabilityIndex: new Map(),
      tab: "text",
      hideSaturated: true,
    });

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]?.variant).toBe("high");
  });
});
