import { describe, expect, it } from "vitest";
import { groupScores } from "@/lib/models/score-groups";
import type { JoinedScore } from "@/lib/schemas/score";

function score(overrides: Partial<JoinedScore>): JoinedScore {
  return {
    model_id: "a/m",
    variant: "base",
    benchmark_slug: "arc-agi-2",
    harness: null,
    value: 50,
    unit: "percent",
    confidence_interval: null,
    sample_size: null,
    provenance: "independent",
    measured_at: "2026-09-01",
    source: {
      source_id: "epoch",
      source_url: "https://epoch.ai/data/benchmark_data.zip",
      fetched_at: "2026-09-12T06:00:00.000Z",
      licence: "CC BY 4.0",
      attribution: "Epoch AI",
    },
    notes: null,
    benchmark: {
      slug: "arc-agi-2",
      name: "ARC-AGI-2",
      status: "active",
    } as JoinedScore["benchmark"],
    health_flags: [],
    ...overrides,
  };
}

describe("groupScores", () => {
  it("puts every configuration of one benchmark under its best", () => {
    const [group, ...rest] = groupScores([
      score({ variant: "low", value: 20 }),
      score({ variant: "max", value: 61 }),
      score({ variant: "high", value: 48 }),
    ]);
    expect(rest).toHaveLength(0);
    expect(group?.best.variant).toBe("max");
    expect(group?.others.map((line) => line.variant)).toEqual(["high", "low"]);
  });

  it("never folds a different harness or a vendor's number under another", () => {
    const groups = groupScores([
      score({ value: 40 }),
      score({ value: 70, harness: "openhands" }),
      score({ value: 90, provenance: "vendor-reported" }),
    ]);
    expect(groups).toHaveLength(3);
    for (const group of groups) expect(group.others).toHaveLength(0);
  });

  it("keeps every score: the groups hold as many lines as went in", () => {
    const input = [
      score({ variant: "a" }),
      score({ variant: "b" }),
      score({ variant: "c" }),
    ];
    const groups = groupScores(input);
    expect(groups.reduce((n, g) => n + 1 + g.others.length, 0)).toBe(input.length);
  });
});
