import type { SourceMeta } from "@/lib/schemas/common";
import { ArenaLeaderboard } from "@/lib/schemas/arena";
import type { Fetcher } from "@/lib/ingest/benchwiki";

/**
 * The arena leaderboard mirror — specs/02-data/sources-and-licensing.md source 4.
 *
 * Unofficial. LMArena publishes no API; this community project snapshots the public
 * leaderboards into dated directories. Treated as best-effort throughout: when it fails,
 * the image tab shows its empty state with the last successful fetch date, and never a
 * substitute ranking.
 */

export const ARENA_SOURCE_ID = "arena-mirror";
export const ARENA_MIRROR_REPO = "oolong-tea-2026/arena-ai-leaderboards";
export const ARENA_ORIGINATOR_URL = "https://arena.ai/leaderboard/text-to-image";
export const ARENA_LICENCE = "Unofficial mirror of LMArena's public leaderboards";
export const ARENA_ATTRIBUTION =
  "Arena Elo from LMArena, via the arena-ai-leaderboards daily mirror";

/** text-to-image is the only arena board v1 ingests: it is the one media modality in scope. */
export const ARENA_LEADERBOARD = "text-to-image";

export function arenaSnapshotUrl(date: string, leaderboard = ARENA_LEADERBOARD): string {
  return `https://raw.githubusercontent.com/${ARENA_MIRROR_REPO}/main/data/${date}/${leaderboard}.json`;
}

export function arenaSourceMeta(fetchedAt: string, url: string): SourceMeta {
  return {
    source_id: ARENA_SOURCE_ID,
    source_url: url,
    fetched_at: fetchedAt,
    licence: ARENA_LICENCE,
    attribution: ARENA_ATTRIBUTION,
  };
}

/**
 * The mirror publishes by date, and today's directory may not exist yet when the job runs.
 * Walking back a few days is not a fallback to different data — it is the same daily
 * snapshot, just the most recent one that exists. The date it came from is recorded so the
 * freshness stamp tells the truth.
 */
export const ARENA_MAX_LOOKBACK_DAYS = 7;

export function previousDate(date: string, daysBack: number): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() - daysBack);
  return parsed.toISOString().slice(0, 10);
}

export async function fetchArenaLeaderboard(
  date: string,
  fetcher: Fetcher = fetch,
  maxLookback = ARENA_MAX_LOOKBACK_DAYS,
): Promise<{ payload: ArenaLeaderboard; raw: unknown; date: string; url: string }> {
  const attempts: string[] = [];
  for (let back = 0; back <= maxLookback; back += 1) {
    const day = previousDate(date, back);
    const url = arenaSnapshotUrl(day);
    attempts.push(day);
    const response = await fetcher(url);
    if (response.status === 404) continue;
    if (!response.ok) {
      throw new Error(`arena mirror responded ${response.status} for ${day}`);
    }
    const raw: unknown = await response.json();
    return { payload: ArenaLeaderboard.parse(raw), raw, date: day, url };
  }
  throw new Error(
    `arena mirror has no snapshot for any of ${attempts[0]}..${attempts[attempts.length - 1]}`,
  );
}
