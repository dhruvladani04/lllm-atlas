import { z } from "zod";

/**
 * Epoch AI's benchmark data bundle — specs/02-data/sources-and-licensing.md source 3.
 * CC BY 4.0. Some third-party data inside the bundle carries its own licence (Aider
 * Polyglot and Terminal-Bench are Apache 2.0); those notices are preserved on display.
 *
 * The bundle is a ZIP of CSVs: one metadata file naming every benchmark and which column
 * in which file holds its score, plus one file per benchmark.
 */

export const EpochBenchmarkMeta = z.object({
  benchmark: z.string().min(1),
  in_eci: z.boolean(),
  source_file: z.string().min(1),
  score_column: z.string().min(1),
  scale: z.number(),
  random_baseline: z.number().nullable(),
  score_ceiling: z.number().nullable(),
  release_date: z.string().nullable(),
  superseded_by: z.string().nullable(),
});
export type EpochBenchmarkMeta = z.infer<typeof EpochBenchmarkMeta>;

/** One row of one benchmark's result file. Columns vary per benchmark. */
export const EpochResultRow = z.object({
  model_version: z.string().min(1),
  display_name: z.string().nullable(),
  score: z.number(),
  release_date: z.string().nullable(),
  organization: z.string().nullable(),
  harness: z.string().nullable(),
  source_link: z.string().nullable(),
});
export type EpochResultRow = z.infer<typeof EpochResultRow>;

export const EpochCapabilityIndexRow = z.object({
  model: z.string().min(1),
  display_name: z.string().min(1),
  eci: z.number(),
  eci_ci_low: z.number().nullable(),
  eci_ci_high: z.number().nullable(),
  date: z.string().nullable(),
  organization: z.string().nullable(),
});
export type EpochCapabilityIndexRow = z.infer<typeof EpochCapabilityIndexRow>;
