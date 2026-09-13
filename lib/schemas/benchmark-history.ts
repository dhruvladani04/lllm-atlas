import { z } from "zod";

/**
 * specs/03-sections/benchmarks.md — History & lineage.
 *
 * Unlike the rest of `data/registry/`, this is not model or benchmark identity — it is
 * hand-written editorial content, one step short of prose, citing the papers and
 * leaderboards a benchmark's lineage actually rests on. It is not part of the benchwiki
 * ingestion: benchwiki's payload carries a `successor` slug but no narrative and no
 * citations, so this file exists to hold the two things benchwiki does not give us. Every
 * entry names a real, dated, linkable source; nothing here is inferred or paraphrased from
 * an unlinked memory.
 */

export const LineageEvent = z.object({
  date: z.string().min(1), // month precision is normal here: "2026-04"
  note: z.string().min(1),
});
export type LineageEvent = z.infer<typeof LineageEvent>;

export const FurtherReadingLink = z.object({
  label: z.string().min(1),
  url: z.url(),
});
export type FurtherReadingLink = z.infer<typeof FurtherReadingLink>;

export const BenchmarkHistoryEntry = z.object({
  lineage: z.array(LineageEvent),
  further_reading: z.array(FurtherReadingLink),
});
export type BenchmarkHistoryEntry = z.infer<typeof BenchmarkHistoryEntry>;

/** Keyed by benchmark slug. A slug with no entry simply has no history section rendered. */
export const BenchmarkHistory = z.record(z.string(), BenchmarkHistoryEntry);
export type BenchmarkHistory = z.infer<typeof BenchmarkHistory>;
