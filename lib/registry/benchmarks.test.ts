import { describe, expect, it } from "vitest";
import { buildBenchmarkIndex, resolveBenchmarkName } from "@/lib/registry/benchmarks";
import type { Benchmark } from "@/lib/schemas/benchmark";

/**
 * Benchmarks need the same identity discipline as models: a score attached to the wrong
 * benchmark is joined to the wrong health record, which is the one join this site exists
 * to get right.
 */

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

const GPQA = benchmark("gpqa", "GPQA");
const HUMANEVAL = benchmark("humaneval", "HumanEval");
const HUMANEVAL_PLUS = benchmark("humaneval-plus", "HumanEval+");

describe("resolveBenchmarkName", () => {
  const index = buildBenchmarkIndex([GPQA], { "GPQA diamond": "gpqa" });

  it("matches an exact slug", () => {
    expect(resolveBenchmarkName(index, "gpqa")).toMatchObject({
      resolved: true,
      slug: "gpqa",
    });
  });

  it("matches an exact name", () => {
    expect(resolveBenchmarkName(index, "GPQA")).toMatchObject({ matched_on: "name" });
  });

  it("matches a reviewed alias", () => {
    expect(resolveBenchmarkName(index, "GPQA diamond")).toMatchObject({
      resolved: true,
      slug: "gpqa",
    });
  });

  it("refuses a benchmark it does not know", () => {
    expect(resolveBenchmarkName(index, "OSWorld")).toEqual({
      resolved: false,
      name: "OSWorld",
    });
  });

  it("refuses a near miss rather than guessing", () => {
    expect(resolveBenchmarkName(index, "GPQA-Pro")).toMatchObject({ resolved: false });
  });
});

describe("plus is semantic, not punctuation", () => {
  it("keeps HumanEval and HumanEval+ apart", () => {
    // Real collision found against live benchwiki data: stripping "+" merged two distinct
    // benchmarks, and the merged score would have been silently wrong.
    const index = buildBenchmarkIndex([HUMANEVAL, HUMANEVAL_PLUS]);
    expect(resolveBenchmarkName(index, "HumanEval")).toMatchObject({ slug: "humaneval" });
    expect(resolveBenchmarkName(index, "HumanEval+")).toMatchObject({
      slug: "humaneval-plus",
    });
  });
});

describe("an ambiguous name is withdrawn, not guessed", () => {
  const twins = buildBenchmarkIndex([
    benchmark("swe-bench", "SWE-bench"),
    benchmark("swe-bench-verified", "SWE bench"),
  ]);

  it("records the collision", () => {
    expect(twins.conflicts.length).toBeGreaterThan(0);
  });

  it("stops resolving the ambiguous name at all", () => {
    expect(resolveBenchmarkName(twins, "swe bench")).toMatchObject({ resolved: false });
  });

  it("still resolves each benchmark by its own exact slug", () => {
    expect(resolveBenchmarkName(twins, "swe-bench")).toMatchObject({ slug: "swe-bench" });
    expect(resolveBenchmarkName(twins, "swe-bench-verified")).toMatchObject({
      slug: "swe-bench-verified",
    });
  });

  it("does not abort the build, because the collision came from upstream data", () => {
    expect(() =>
      buildBenchmarkIndex([HUMANEVAL, benchmark("he2", "HumanEval")]),
    ).not.toThrow();
  });
});

describe("a bad alias file is a hard error", () => {
  it("refuses an alias pointing at a benchmark that does not exist", () => {
    // The alias file is hand-maintained, so a mistake in it is someone's to fix.
    expect(() => buildBenchmarkIndex([GPQA], { "Some Name": "not-a-benchmark" })).toThrow(
      /not a benchmark on this site/,
    );
  });

  it("refuses a duplicate slug", () => {
    expect(() => buildBenchmarkIndex([GPQA, GPQA])).toThrow(/duplicate benchmark slug/);
  });
});
