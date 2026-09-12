import { z } from "zod";
import { BenchmarkStatus, ContaminationRisk, IsoDate } from "@/lib/schemas/common";

/**
 * specs/02-data/schemas.md — Benchmark. Mirrors the benchwiki record, trimmed to the
 * fields the site uses. `judge_model` is carried deliberately: section 3 uses it to make
 * the LLM-as-judge argument with real examples rather than as an abstract caveat.
 */

export const Benchmark = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  capability: z.string().min(1),
  secondary_capabilities: z.array(z.string().min(1)),
  short_description: z.string(),
  status: BenchmarkStatus,
  status_evidence: z.string().nullable(),
  saturated_date: IsoDate.nullable(),
  successor: z.string().nullable(),
  contamination: z.object({
    risk: ContaminationRisk,
    refresh_cycle: z.string().nullable(),
    test_set_public: z.boolean().nullable(),
  }),
  human_baseline: z.object({
    score: z.number().nullable(),
    note: z.string().nullable(),
  }),
  statistical_note: z.string().nullable(),
  metric_primary: z.string().nullable(),
  judge_model: z.string().nullable(),
  last_updated: z.string().min(1),
  source_url: z.url(),
});
export type Benchmark = z.infer<typeof Benchmark>;
