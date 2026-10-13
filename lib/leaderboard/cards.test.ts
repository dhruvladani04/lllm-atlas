import { describe, expect, it } from "vitest";
import { buildSummaryCards } from "@/lib/leaderboard/cards";
import { buildRows } from "@/lib/leaderboard/rows";
import type { Benchmark } from "@/lib/schemas/benchmark";
import type { QuotedNumber } from "@/lib/schemas/common";
import type { Model } from "@/lib/schemas/model";
import type { JoinedScore, Score } from "@/lib/schemas/score";

/**
 * A card is a row with a rule on it. These tests hold the two promises that makes: the rule
 * picks the row it says it picks, and the row arrives with its caveats attached.
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

const SOURCE = {
  source_id: "epoch",
  source_url: "https://epoch.ai/data/benchmark_data.zip",
  fetched_at: "2026-09-12T06:00:00.000Z",
  licence: "CC BY 4.0",
  attribution: "Epoch AI",
};

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
    source: SOURCE,
    notes: null,
    benchmark: bench,
    health_flags: [],
    ...overrides,
  };
}

function price(value: number): QuotedNumber {
  return {
    value,
    quoted_by: "vendor",
    source_url: "https://example.com/pricing",
    fetched_at: "2026-09-12T06:00:00.000Z",
  };
}

function model(model_id: string, overrides: Partial<Model> = {}): Model {
  return {
    model_id,
    display_name: model_id,
    creator: "ExampleCorp",
    modality: "text",
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

const REASONING = benchmark("reasoning-bench", { name: "Reasoning Bench" });
const TOOLS = benchmark("tool-bench", {
  name: "Tool Bench",
  capability: "agentic-tool-use",
});

function cards(
  models: Model[],
  scores: JoinedScore[],
  image: Score[] = [],
): ReturnType<typeof buildSummaryCards> {
  const ranked = (tab: "text" | "agentic") =>
    buildRows({ scores, models, capabilityIndex: new Map(), tab, hideSaturated: true });
  return buildSummaryCards({
    text: ranked("text"),
    agentic: ranked("agentic"),
    image,
    models,
  });
}

describe("buildSummaryCards", () => {
  it("names the top row of each tab and the benchmark it is top on", () => {
    const result = cards(
      [model("a/one"), model("a/two")],
      [
        score("a/one", REASONING, 80),
        score("a/two", REASONING, 70),
        score("a/two", TOOLS, 55),
      ],
    );
    const top = result.find((card) => card.kind === "top-text");
    expect(top).toMatchObject({ model_id: "a/one", label: "Highest on Reasoning Bench" });
    expect(result.find((card) => card.kind === "top-agentic")).toMatchObject({
      model_id: "a/two",
      label: "Highest on Tool Bench",
    });
  });

  it("carries the row's health flags, status and provenance onto the card", () => {
    const flagged = benchmark("flagged", { status: "nearing-saturation" });
    const [top] = cards(
      [model("a/one")],
      [
        score("a/one", flagged, 91, {
          provenance: "vendor-reported",
          health_flags: ["vendor-reported-only", "superseded"],
        }),
      ],
    );
    expect(top?.health_flags).toEqual(["vendor-reported-only", "superseded"]);
    expect(top?.benchmark?.status).toBe("nearing-saturation");
    expect(top?.provenance).toBe("vendor-reported");
  });

  it("counts only models recorded as open, and says how many are unrecorded", () => {
    const result = cards(
      [
        model("a/closed"),
        model("a/unknown", { open_weights: null }),
        model("a/open", { open_weights: true }),
      ],
      [
        score("a/closed", REASONING, 90),
        score("a/unknown", REASONING, 85),
        score("a/open", REASONING, 60),
      ],
    );
    const open = result.find((card) => card.kind === "top-open-weights");
    expect(open?.model_id).toBe("a/open");
    expect(open?.qualifier).toContain("1 of the 3 ranked rows");
  });

  it("picks the cheapest priced model within 10% of the leader, not the cheapest overall", () => {
    const result = cards(
      [
        model("a/leader", {
          price_input_per_mtok: price(10),
          price_output_per_mtok: price(30),
        }),
        model("a/close", {
          price_input_per_mtok: price(1),
          price_output_per_mtok: price(4),
        }),
        model("a/cheap-and-far", {
          price_input_per_mtok: price(0.1),
          price_output_per_mtok: price(0.2),
        }),
        model("a/close-unpriced"),
      ],
      [
        score("a/leader", REASONING, 80),
        score("a/close", REASONING, 73),
        score("a/cheap-and-far", REASONING, 50),
        score("a/close-unpriced", REASONING, 79),
      ],
    );
    const cheapest = result.find((card) => card.kind === "lowest-price");
    expect(cheapest?.model_id).toBe("a/close");
    expect(cheapest?.price?.input.value).toBe(1);
  });

  it("skips the price card on a scale with no zero to take a fraction of", () => {
    const result = cards(
      [
        model("a/one", {
          price_input_per_mtok: price(1),
          price_output_per_mtok: price(2),
        }),
      ],
      [score("a/one", REASONING, 1400, { unit: "elo" })],
    );
    expect(result.some((card) => card.kind === "lowest-price")).toBe(false);
  });

  it("gives the arena card no health flags and no provenance to pretend with", () => {
    const {
      benchmark: _b,
      health_flags: _h,
      ...elo
    } = score("img/one", REASONING, 1250, {
      unit: "elo",
      confidence_interval: 7.5,
    });
    const [card] = cards([model("img/one", { modality: "image" })], [], [elo]);
    expect(card).toMatchObject({
      kind: "top-image",
      model_id: "img/one",
      benchmark: null,
      health_flags: null,
      provenance: null,
    });
  });

  it("leaves a card out when its rule matches nothing", () => {
    expect(cards([model("a/one")], [])).toEqual([]);
    // An arena row naming a model the registry does not hold is not shown under a guess.
    const {
      benchmark: _b,
      health_flags: _h,
      ...elo
    } = score("ghost", REASONING, 1300, {
      unit: "elo",
    });
    expect(cards([model("a/one")], [], [elo])).toEqual([]);
  });
});
