import { z } from "zod";
import {
  BenchmarkStatus,
  ContaminationRisk,
  IsoDate,
  Provenance,
} from "@/lib/schemas/common";

/**
 * specs/02-data/schemas.md — Benchmark. Mirrors the benchwiki record, trimmed to the
 * fields the site uses. `judge_model` is carried deliberately: section 3 uses it to make
 * the LLM-as-judge argument with real examples rather than as an abstract caveat.
 */

/**
 * One point on a benchmark's trajectory. Vendor-reported and independent points are
 * distinguished here so the chart can keep them apart, and never connected across
 * harnesses, exam years or protocol changes with a single line.
 */
export const TimelinePoint = z.object({
  model: z.string().min(1), // the name upstream reported, kept verbatim
  model_id: z.string().nullable(), // null when the registry could not resolve it
  vendor: z.string().nullable(),
  measured_at: IsoDate,
  score: z.number(),
  provenance: Provenance,
  source_url: z.url(),
});
export type TimelinePoint = z.infer<typeof TimelinePoint>;

export const BenchmarkLeaderboard = z.object({
  name: z.string().min(1),
  url: z.url(),
  type: z.string().nullable(),
});
export type BenchmarkLeaderboard = z.infer<typeof BenchmarkLeaderboard>;

export const Benchmark = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  capability: z.string().min(1),
  languages: z.array(z.string()),
  secondary_capabilities: z.array(z.string().min(1)),
  short_description: z.string(),
  launch_date: IsoDate.nullable(),
  status: BenchmarkStatus,
  status_evidence: z.string().nullable(),
  saturated_date: IsoDate.nullable(),
  successor: z.string().nullable(),
  contamination: z.object({
    risk: ContaminationRisk,
    refresh_cycle: z.string().nullable(),
    test_set_public: z.boolean().nullable(),
    mitigation: z.string().nullable(),
  }),
  human_baseline: z.object({
    score: z.number().nullable(),
    note: z.string().nullable(),
  }),
  statistical_note: z.string().nullable(),
  metric_primary: z.string().nullable(),
  judge_model: z.string().nullable(),
  last_updated: IsoDate,
  leaderboards: z.array(BenchmarkLeaderboard),
  performance_timeline: z.array(TimelinePoint),
  source_url: z.url(),
});
export type Benchmark = z.infer<typeof Benchmark>;
