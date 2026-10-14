import { ARENA_DATASET_URL, ARENA_ORIGINATOR_URL } from "@/lib/ingest/arena";
import type { Score } from "@/lib/schemas/score";
import type { SourceMeta } from "@/lib/schemas/common";

/**
 * The image tab's data, as the browser needs it.
 *
 * The derived file carries a full `Score` per row, each repeating the same five-field source
 * block; shipped as-is it was 54KB of a page whose client data is parsed on every load.
 * The source is the same for every row, so it travels once, and the links are the pages a
 * person can read — Arena's board and the dataset page — rather than the JSON API the
 * pipeline fetched from, which stays recorded in the snapshot as the provenance of record.
 *
 * Server-only: this imports the ingest module's constants, and nothing that a client
 * component imports at runtime should pull ingest code (and its schemas) into the bundle.
 * Client components import its types only.
 */

export interface ImageBoardRow {
  model_id: string;
  variant: string;
  value: number;
  confidence_interval: number | null;
  sample_size: number | null;
}

export interface ImageBoard {
  rows: ImageBoardRow[];
  /** Arena's own leaderboard page. */
  boardUrl: string;
  /** The dataset page the numbers were taken from. */
  dataUrl: string;
  licence: string;
  attribution: string;
}

export function toImageBoard(
  file: { source: SourceMeta; scores: readonly Score[] } | null,
): ImageBoard | null {
  if (file === null) return null;
  return {
    rows: file.scores
      .map((score) => ({
        model_id: score.model_id,
        variant: score.variant,
        value: score.value,
        confidence_interval: score.confidence_interval,
        sample_size: score.sample_size,
      }))
      .sort((a, b) => b.value - a.value),
    boardUrl: ARENA_ORIGINATOR_URL,
    dataUrl: ARENA_DATASET_URL,
    licence: file.source.licence,
    attribution: file.source.attribution,
  };
}
