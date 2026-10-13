import { z } from "zod";

/**
 * Arena's own leaderboard dataset — specs/02-data/sources-and-licensing.md source 4.
 *
 * This replaced an unofficial community mirror in October 2026. The mirror had no published
 * licence, was a third-party scrape, and stopped publishing after 2026-10-07; Arena now
 * publish the boards themselves on HuggingFace under CC BY 4.0, which is the first time
 * this data has been redistributable at all.
 *
 * The rows carry what the image tab already renders — an Elo, a confidence interval, a vote
 * count — and the interval now arrives as explicit bounds rather than a half-width, which
 * is what the upstream actually computes.
 */

export const ArenaDatasetRow = z.object({
  model_name: z.string().min(1),
  organization: z.string().nullable(),
  /** The *model's* licence, as Arena records it. Not the dataset's. */
  license: z.string().nullable(),
  rating: z.number(),
  rating_lower: z.number().nullable(),
  rating_upper: z.number().nullable(),
  variance: z.number().nullable(),
  vote_count: z.number().int().nonnegative().nullable(),
  rank: z.number().int().positive(),
  /** `overall` is the board itself; the rest are sub-boards like `3d_modeling`. */
  category: z.string().min(1),
  leaderboard_publish_date: z.string().min(1),
});
export type ArenaDatasetRow = z.infer<typeof ArenaDatasetRow>;

/** What the HuggingFace datasets-server returns from `/rows`. */
export const ArenaDatasetPage = z.object({
  num_rows_total: z.number().int().nonnegative(),
  rows: z.array(z.object({ row: ArenaDatasetRow })),
});
export type ArenaDatasetPage = z.infer<typeof ArenaDatasetPage>;

/** The shape the rest of the pipeline consumes, after the sub-boards are filtered out. */
export const ArenaRow = z.object({
  rank: z.number().int().positive(),
  model: z.string().min(1),
  vendor: z.string().nullable(),
  license: z.string().nullable(),
  score: z.number(),
  /** Half-width, derived from the published bounds — the unit the site renders in. */
  ci: z.number().nullable(),
  votes: z.number().int().nonnegative().nullable(),
});
export type ArenaRow = z.infer<typeof ArenaRow>;

export const ArenaLeaderboard = z.object({
  meta: z.object({
    leaderboard: z.string().min(1),
    source_url: z.string(),
    fetched_at: z.string(),
    /** The date Arena published this board, which is not the date we fetched it. */
    last_updated: z.string().nullable(),
    model_count: z.number().int().nonnegative(),
  }),
  models: z.array(ArenaRow),
});
export type ArenaLeaderboard = z.infer<typeof ArenaLeaderboard>;
