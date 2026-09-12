import { z } from "zod";

/**
 * The arena leaderboard mirror — specs/02-data/sources-and-licensing.md source 4.
 *
 * Unofficial and best-effort: LMArena publishes no API, and this is a community project
 * that snapshots the public leaderboards daily. LMArena is the originator; the mirror is
 * the transport, and both are credited. If it fails, the image tab renders its empty state
 * and explains itself — it never falls back to a ranking from another modality.
 */

export const ArenaRow = z.object({
  rank: z.number().int().positive(),
  model: z.string().min(1),
  vendor: z.string().nullable(),
  license: z.string().nullable(),
  score: z.number(),
  ci: z.number().nullable(),
  votes: z.number().int().nonnegative().nullable(),
});
export type ArenaRow = z.infer<typeof ArenaRow>;

export const ArenaLeaderboard = z.object({
  meta: z.object({
    leaderboard: z.string().min(1),
    source_url: z.string(),
    fetched_at: z.string(),
    last_updated: z.string().nullable(),
    model_count: z.number().int().nonnegative(),
  }),
  models: z.array(ArenaRow),
});
export type ArenaLeaderboard = z.infer<typeof ArenaLeaderboard>;
