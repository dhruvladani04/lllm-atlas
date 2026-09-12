import { z } from "zod";

/**
 * The benchwiki payload as it actually arrives, not as the site wishes it looked.
 *
 * This schema exists to detect upstream change, so it mirrors the real response shape.
 * Mapping it onto the site's `Benchmark` record happens in lib/ingest/benchwiki.ts, and
 * the two are deliberately separate: when upstream renames a field, this schema fails
 * loudly and the site keeps serving its last good snapshot.
 */

export const BenchwikiTimelinePoint = z.object({
  model: z.string(),
  vendor: z.string().nullable(),
  date: z.string(),
  score: z.number(),
  source: z.enum(["independent", "vendor-reported"]),
  source_url: z.string(),
});
export type BenchwikiTimelinePoint = z.infer<typeof BenchwikiTimelinePoint>;

export const BenchwikiLeaderboard = z.object({
  name: z.string(),
  url: z.string(),
  type: z.string().nullable(),
});

export const BenchwikiRecord = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  capability: z.string(),
  secondary_capabilities: z.array(z.string()),
  short_description: z.string(),
  launch_date: z.string().nullable(),
  status: z.enum(["active", "nearing-saturation", "saturated", "deprecated"]),
  status_evidence: z.string().nullable(),
  saturated_date: z.string().nullable(),
  successor: z.string().nullable(),
  statistical_note: z.string().nullable(),
  languages: z.array(z.string()),
  last_updated: z.string(),
  metric: z.object({
    primary: z.string().nullable(),
    scoring: z.string().nullable(),
    judge_model: z.string().nullable(),
  }),
  contamination: z.object({
    risk: z.enum(["low", "medium", "high", "unknown"]),
    refresh_cycle: z.string().nullable(),
    test_set_public: z.boolean().nullable(),
    mitigation: z.string().nullable(),
  }),
  human_baseline: z.object({
    score: z.number().nullable(),
    note: z.string().nullable(),
  }),
  leaderboards: z.array(BenchwikiLeaderboard),
  performance_timeline: z.array(BenchwikiTimelinePoint),
});
export type BenchwikiRecord = z.infer<typeof BenchwikiRecord>;

export const BenchwikiPayload = z.array(BenchwikiRecord);
export type BenchwikiPayload = z.infer<typeof BenchwikiPayload>;
