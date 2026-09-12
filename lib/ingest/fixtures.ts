import type { BenchwikiRecord } from "@/lib/schemas/benchwiki";

/**
 * Synthetic records for tests. The names are obviously invented so that nothing here can
 * ever be mistaken for real benchmark metadata if it leaks into a fixture-driven render.
 * Real upstream data lives in data/snapshots/ and is never copied into the test suite.
 */
export function benchwikiRecord(
  overrides: Partial<BenchwikiRecord> = {},
): BenchwikiRecord {
  return {
    name: "ExampleBench",
    slug: "examplebench",
    capability: "reasoning",
    secondary_capabilities: [],
    short_description: "A benchmark that exists only in this test suite.",
    launch_date: "2024-01-15T00:00:00.000Z",
    status: "active",
    status_evidence: null,
    saturated_date: null,
    successor: null,
    statistical_note: null,
    languages: ["english"],
    last_updated: "2026-09-01T00:00:00.000Z",
    metric: { primary: "accuracy (%)", scoring: "exact-match", judge_model: null },
    contamination: {
      risk: "low",
      refresh_cycle: "static",
      test_set_public: false,
      mitigation: null,
    },
    human_baseline: { score: null, note: null },
    leaderboards: [],
    performance_timeline: [],
    ...overrides,
  };
}

export function timelinePoint(
  overrides: Partial<BenchwikiRecord["performance_timeline"][number]> = {},
): BenchwikiRecord["performance_timeline"][number] {
  return {
    model: "Claude Opus 5",
    vendor: "anthropic",
    date: "2026-02-01T00:00:00.000Z",
    score: 91.2,
    source: "independent",
    source_url: "https://example.invalid/report",
    ...overrides,
  };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
