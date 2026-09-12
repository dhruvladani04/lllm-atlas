import { describe, expect, it } from "vitest";
import {
  epochProvenance,
  harvestArenaScores,
  harvestEpochScores,
} from "@/lib/ingest/scores";
import { buildBenchmarkIndex } from "@/lib/registry/benchmarks";
import { buildRegistryIndex } from "@/lib/registry/resolve";
import { loadRegistry } from "@/lib/registry/load";
import { epochSourceMeta } from "@/lib/ingest/epoch";
import { arenaSourceMeta } from "@/lib/ingest/arena";
import type { Benchmark } from "@/lib/schemas/benchmark";
import type { EpochBundle } from "@/lib/ingest/epoch";

const NOW = "2026-09-12T06:00:00.000Z";
const models = buildRegistryIndex(loadRegistry());

function benchmark(slug: string, name: string): Benchmark {
  return {
    slug,
    name,
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
  };
}

const benchmarks = buildBenchmarkIndex([benchmark("gpqa", "GPQA")]);

describe("epochProvenance", () => {
  it("calls a number vendor-reported when the citation is the vendor's own publication", () => {
    const { provenance, note } = epochProvenance(
      "DeepSeek",
      "DeepSeek-V3 Technical Report",
    );
    expect(provenance).toBe("vendor-reported");
    expect(note).toContain("DeepSeek");
  });

  it("calls a number independent when a third party measured it", () => {
    expect(epochProvenance("OpenAI", "ARC Prize Leaderboard").provenance).toBe(
      "independent",
    );
  });

  it("errs toward vendor-reported when the organisation is unknown", () => {
    // The weaker of the two claims: better to under-credit a number than to present a
    // vendor's own figure as an independent measurement.
    expect(epochProvenance(null, "Some Leaderboard").provenance).toBe("vendor-reported");
  });

  it("always explains how the label was decided", () => {
    expect(epochProvenance("Meta", "Llama 4 Technical Report").note).not.toBe("");
  });
});

describe("harvestEpochScores", () => {
  function bundle(
    rows: EpochBundle["results"] extends Map<string, infer R> ? R : never,
  ): EpochBundle {
    return {
      benchmarks: [
        {
          benchmark: "GPQA",
          in_eci: true,
          source_file: "gpqa.csv",
          score_column: "Score",
          scale: 1,
          random_baseline: 0.25,
          score_ceiling: 1,
          release_date: null,
          superseded_by: null,
        },
      ],
      results: new Map([["GPQA", rows]]),
      capabilityIndex: [],
    };
  }

  it("scales a fraction onto the 0-100 percent the site stores", () => {
    const { scores } = harvestEpochScores(
      bundle([
        {
          model_version: "claude-opus-5",
          display_name: "Claude Opus 5",
          score: 0.912,
          release_date: "2026-01-15",
          organization: "Anthropic",
          harness: null,
          source_link: "Epoch AI evaluation",
        },
      ]),
      models,
      benchmarks,
      epochSourceMeta(NOW),
    );

    expect(scores[0]).toMatchObject({
      model_id: "anthropic/claude-opus-5",
      variant: "base",
      benchmark_slug: "gpqa",
      unit: "percent",
      provenance: "independent",
    });
    expect(scores[0]?.value).toBeCloseTo(91.2);
  });

  it("keeps the harness on an agentic score, because an agent score is a system score", () => {
    const { scores } = harvestEpochScores(
      bundle([
        {
          model_version: "claude-opus-5",
          display_name: "Claude Opus 5",
          score: 0.7,
          release_date: null,
          organization: "Anthropic",
          harness: "openhands",
          source_link: "Epoch AI evaluation",
        },
      ]),
      models,
      benchmarks,
      epochSourceMeta(NOW),
    );
    expect(scores[0]?.harness).toBe("openhands");
  });

  it("drops a row it cannot resolve and queues the name instead of guessing", () => {
    const { scores, unresolvedModels } = harvestEpochScores(
      bundle([
        {
          model_version: "totally-unknown-model_max",
          display_name: "Totally Unknown Model (Max)",
          score: 0.95,
          release_date: "2026-09-03",
          organization: "ExampleCorp",
          harness: null,
          source_link: "Epoch AI evaluation",
        },
      ]),
      models,
      benchmarks,
      epochSourceMeta(NOW),
    );

    expect(scores).toHaveLength(0);
    expect(unresolvedModels).toEqual([
      { name: "Totally Unknown Model (Max)", source_id: "epoch" },
    ]);
  });

  it("reports a benchmark with no health record rather than scoring against nothing", () => {
    const unknown = harvestEpochScores(
      {
        benchmarks: [
          {
            benchmark: "OSWorld",
            in_eci: false,
            source_file: "osworld.csv",
            score_column: "Score",
            scale: 1,
            random_baseline: null,
            score_ceiling: null,
            release_date: null,
            superseded_by: null,
          },
        ],
        results: new Map(),
        capabilityIndex: [],
      },
      models,
      benchmarks,
      epochSourceMeta(NOW),
    );
    expect(unknown.unresolvedBenchmarks).toEqual(["OSWorld"]);
  });
});

describe("harvestArenaScores", () => {
  const source = arenaSourceMeta(NOW, "https://example.invalid/text-to-image.json");

  it("carries the confidence interval and vote count an Elo needs to be read", () => {
    const { scores } = harvestArenaScores(
      [
        {
          rank: 1,
          model: "GPT Image 1",
          vendor: "OpenAI",
          license: "proprietary",
          score: 1421,
          ci: 13,
          votes: 3149,
        },
      ],
      models,
      source,
    );

    expect(scores[0]).toMatchObject({
      model_id: "openai/gpt-image-1",
      unit: "elo",
      confidence_interval: 13,
      sample_size: 3149,
      provenance: "independent",
      harness: null,
    });
  });

  it("queues a model the registry does not know", () => {
    const { scores, unresolvedModels } = harvestArenaScores(
      [
        {
          rank: 1,
          model: "gpt-image-2.5-sunburst",
          vendor: "OpenAI",
          license: "proprietary",
          score: 1421,
          ci: 13,
          votes: 3149,
        },
      ],
      models,
      source,
    );
    expect(scores).toHaveLength(0);
    expect(unresolvedModels[0]?.name).toBe("gpt-image-2.5-sunburst");
  });
});
