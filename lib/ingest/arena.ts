import type { SourceMeta } from "@/lib/schemas/common";
import {
  ArenaDatasetPage,
  ArenaLeaderboard,
  type ArenaDatasetRow,
  type ArenaRow,
} from "@/lib/schemas/arena";
import type { Fetcher } from "@/lib/ingest/benchwiki";

/**
 * Arena's leaderboard dataset — specs/02-data/sources-and-licensing.md source 4.
 *
 * Until October 2026 this read an unofficial community mirror that scraped the public
 * boards into dated directories. That mirror had no published licence, so the data was
 * carried on permission-not-granted terms, and it stopped publishing after 2026-10-07.
 * Arena now publish the boards themselves under **CC BY 4.0**, which is both a better
 * source and the first version of it that may legally be redistributed.
 *
 * Read through the HuggingFace datasets-server rather than the parquet files: the dataset
 * is 124MB across every arena, and this pipeline wants one board as JSON. Nothing here
 * changes if it fails — the image tab still renders its empty state with the last
 * successful fetch date, and never a substitute ranking from another modality.
 */

export const ARENA_SOURCE_ID = "arena-mirror";
export const ARENA_DATASET = "lmarena-ai/leaderboard-dataset";
export const ARENA_DATASET_URL = `https://huggingface.co/datasets/${ARENA_DATASET}`;
export const ARENA_ORIGINATOR_URL = "https://arena.ai/leaderboard/text-to-image";
export const ARENA_LICENCE = "CC BY 4.0";
export const ARENA_ATTRIBUTION =
  "Arena leaderboard data from Arena (lmarena-ai/leaderboard-dataset) on HuggingFace, CC BY 4.0.";

/** text-to-image is the one media modality in v1 scope. */
export const ARENA_CONFIG = "text_to_image";
/** `latest` is the most recently published board; `full` is every board ever published. */
export const ARENA_SPLIT = "latest";
/** The board itself. Everything else in the config is a sub-board, e.g. `3d_modeling`. */
export const ARENA_CATEGORY = "overall";

/** The server caps a page at 100 rows, and the board is comfortably under that. */
const PAGE_SIZE = 100;

export function arenaRowsUrl(offset = 0, length = PAGE_SIZE): string {
  const params = new URLSearchParams({
    dataset: ARENA_DATASET,
    config: ARENA_CONFIG,
    split: ARENA_SPLIT,
    offset: String(offset),
    length: String(length),
  });
  return `https://datasets-server.huggingface.co/rows?${params.toString()}`;
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
 * Arena publishes an interval as explicit bounds; this site renders a half-width. Taking
 * the larger side keeps the stated uncertainty rather than understating it, and an
 * asymmetric interval is reported as the wider of the two rather than averaged into a
 * number neither bound supports.
 */
export function halfWidth(row: ArenaDatasetRow): number | null {
  if (row.rating_lower === null || row.rating_upper === null) return null;
  return Math.max(row.rating - row.rating_lower, row.rating_upper - row.rating);
}

export function toArenaRow(row: ArenaDatasetRow): ArenaRow {
  return {
    rank: row.rank,
    model: row.model_name,
    vendor: row.organization,
    license: row.license,
    score: row.rating,
    ci: halfWidth(row),
    votes: row.vote_count,
  };
}

/**
 * Fetches the board, paging until the rows run out.
 *
 * The `latest` split holds every arena's most recent board, so the category filter is what
 * selects text-to-image's own ranking from its sub-boards. A page that returns nothing
 * ends the walk; a board that comes back empty is a failure, not an empty leaderboard,
 * because Arena has never published one.
 */
export async function fetchArenaLeaderboard(
  fetchedAt: string,
  fetcher: Fetcher = fetch,
): Promise<{ payload: ArenaLeaderboard; raw: unknown; url: string }> {
  const rows: ArenaDatasetRow[] = [];
  const pages: unknown[] = [];
  let offset = 0;

  for (;;) {
    const url = arenaRowsUrl(offset);
    const response = await fetcher(url);
    if (!response.ok) {
      throw new Error(`arena dataset responded ${response.status} at offset ${offset}`);
    }

    const raw: unknown = await response.json();
    pages.push(raw);
    const page = ArenaDatasetPage.parse(raw);
    rows.push(...page.rows.map((entry) => entry.row));

    offset += PAGE_SIZE;
    if (page.rows.length === 0 || offset >= page.num_rows_total) break;
  }

  const board = rows.filter((row) => row.category === ARENA_CATEGORY);
  if (board.length === 0) {
    throw new Error(
      `arena dataset returned ${rows.length} rows but none in the "${ARENA_CATEGORY}" category`,
    );
  }

  const url = arenaRowsUrl();
  const payload = ArenaLeaderboard.parse({
    meta: {
      leaderboard: ARENA_CONFIG,
      source_url: url,
      fetched_at: fetchedAt,
      last_updated: board[0]?.leaderboard_publish_date ?? null,
      model_count: board.length,
    },
    models: board
      .slice()
      .sort((a, b) => a.rank - b.rank)
      .map(toArenaRow),
  });

  return { payload, raw: pages, url };
}
