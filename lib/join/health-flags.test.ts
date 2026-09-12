import { describe, expect, it } from "vitest";
import type { Benchmark } from "@/lib/schemas/benchmark";
import type { Score } from "@/lib/schemas/score";
import { deriveHealthFlags } from "@/lib/join/health-flags";

/**
 * Every condition in the flag derivation table of specs/02-data/schemas.md, asserted
 * individually. This is the site's argument expressed as code, so it gets the closest
 * thing to a line-by-line proof the test suite can give.
 */

const NOW = "2026-09-12T06:00:00.000Z";

function benchmark(overrides: Partial<Benchmark> = {}): Benchmark {
  return {
    slug: "examplebench",
    name: "ExampleBench",
    capability: "reasoning",
    languages: ["english"],
    secondary_capabilities: [],
    short_description: "",
    launch_date: "2024-01-15",
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
    source_url: "https://benchwiki.vercel.app/benchmarks/examplebench",
    ...overrides,
  };
}

function score(overrides: Partial<Score> = {}): Score {
  return {
    model_id: "anthropic/claude-opus-5",
    variant: "base",
    benchmark_slug: "examplebench",
    harness: null,
    value: 91.2,
    unit: "percent",
    confidence_interval: null,
    sample_size: null,
    provenance: "independent",
    measured_at: "2026-02-01",
    source: {
      source_id: "epoch",
      source_url: "https://epoch.ai/data/benchmark_data.zip",
      fetched_at: "2026-09-12T06:00:00.000Z",
      licence: "CC BY 4.0",
      attribution: "Epoch AI",
    },
    notes: null,
    ...overrides,
  };
}

const flags = (s: Score, b: Benchmark, independentExists = false) =>
  deriveHealthFlags(s, b, { independentExists, now: NOW });

describe("a healthy score on a healthy benchmark", () => {
  it("carries no flags at all", () => {
    expect(flags(score(), benchmark())).toEqual([]);
  });
});

describe("saturated", () => {
  it("fires when the benchmark no longer discriminates", () => {
    expect(flags(score(), benchmark({ status: "saturated" }))).toContain("saturated");
  });
});

describe("deprecated", () => {
  it("fires on a deprecated benchmark", () => {
    expect(flags(score(), benchmark({ status: "deprecated" }))).toContain("deprecated");
  });

  it("does not also claim saturation", () => {
    expect(flags(score(), benchmark({ status: "deprecated" }))).not.toContain(
      "saturated",
    );
  });
});

describe("high-contamination", () => {
  it("fires only at high risk, not medium", () => {
    const high = benchmark({
      contamination: {
        risk: "high",
        refresh_cycle: null,
        test_set_public: true,
        mitigation: null,
      },
    });
    const medium = benchmark({
      contamination: {
        risk: "medium",
        refresh_cycle: null,
        test_set_public: true,
        mitigation: null,
      },
    });
    expect(flags(score(), high)).toContain("high-contamination");
    expect(flags(score(), medium)).not.toContain("high-contamination");
  });
});

describe("vendor-reported-only", () => {
  it("fires on a vendor number with no independent measurement", () => {
    expect(flags(score({ provenance: "vendor-reported" }), benchmark(), false)).toContain(
      "vendor-reported-only",
    );
  });

  it("clears once an independent measurement of the same thing exists", () => {
    expect(
      flags(score({ provenance: "vendor-reported" }), benchmark(), true),
    ).not.toContain("vendor-reported-only");
  });

  it("never fires on an independent score", () => {
    expect(flags(score({ provenance: "independent" }), benchmark(), false)).not.toContain(
      "vendor-reported-only",
    );
  });
});

describe("superseded", () => {
  it("fires when a successor exists, whatever the status", () => {
    expect(flags(score(), benchmark({ successor: "examplebench-2" }))).toContain(
      "superseded",
    );
  });
});

describe("stale-source", () => {
  it("does not fire inside the seven-day window", () => {
    const fresh = score({
      source: { ...score().source, fetched_at: "2026-09-06T06:00:00.000Z" },
    });
    expect(flags(fresh, benchmark())).not.toContain("stale-source");
  });

  it("fires past seven days", () => {
    const stale = score({
      source: { ...score().source, fetched_at: "2026-09-01T06:00:00.000Z" },
    });
    expect(flags(stale, benchmark())).toContain("stale-source");
  });
});

describe("flags combine", () => {
  it("reports a saturated, high-contamination, superseded, vendor-only score in full", () => {
    const rotten = benchmark({
      status: "saturated",
      successor: "examplebench-2",
      contamination: {
        risk: "high",
        refresh_cycle: null,
        test_set_public: true,
        mitigation: null,
      },
    });
    const result = flags(score({ provenance: "vendor-reported" }), rotten, false);
    expect(result).toEqual(
      expect.arrayContaining([
        "saturated",
        "high-contamination",
        "vendor-reported-only",
        "superseded",
      ]),
    );
  });
});
