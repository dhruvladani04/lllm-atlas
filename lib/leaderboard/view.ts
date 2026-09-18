import type { QuotedNumber } from "@/lib/schemas/common";
import type { HealthFlag } from "@/lib/schemas/score";
import type { Model } from "@/lib/schemas/model";
import type {
  BuildRowsResult,
  LeaderboardRow,
  ReferenceRationale,
  UnrankedRow,
} from "@/lib/leaderboard/rows";

/**
 * What the client table actually needs.
 *
 * A `JoinedScore` carries its whole benchmark record — statistical notes, leaderboard links,
 * the performance timeline — which is right for the join and wrong to ship to a browser. The
 * table renders a name, a status and a number, so that is what crosses the wire. Sending the
 * full record for every row on both toggle states put 444KB into the page and 480ms of
 * blocking time into the reader's main thread, for data nothing on screen used.
 */

/**
 * Model facts are identical across every row for that model, and the page ships four
 * datasets (two tabs, two toggle states). Repeating a model's prices — each a quoted number
 * with a source URL — in every one of them put tens of kilobytes of duplicate JSON into the
 * page. They travel once, in a lookup, and rows reference them.
 */
export interface TableModel {
  display_name: string;
  creator: string;
  open_weights: boolean | null;
  released_at: string | null;
  context_window: QuotedNumber | null;
  price_input: QuotedNumber | null;
  price_output: QuotedNumber | null;
}

export interface TableRow {
  key: string;
  model_id: string;
  variant: string;
  value: number;
  unit: "percent" | "elo" | "index" | "count" | "usd" | "seconds";
  confidence_interval: number | null;
  provenance: "independent" | "vendor-reported" | "mixed";
  health_flags: HealthFlag[];
  benchmark_status: "active" | "nearing-saturation" | "saturated" | "deprecated";
  eci: number | null;
}

export interface TableUnranked {
  model_id: string;
  reason: UnrankedRow["reason"];
  scoreCount: number;
}

export interface TableData {
  reference: { slug: string; name: string; status: TableRow["benchmark_status"] } | null;
  /** Why a less-than-active benchmark is the ranking basis. Null when it is active. */
  rationale: ReferenceRationale | null;
  rows: TableRow[];
  unranked: TableUnranked[];
  excluded: { benchmarks: number; scores: number };
}

/**
 * Which columns say the same thing on every row.
 *
 * A column identical in all 49 rows is not information; it is a fact about the whole view
 * wearing a column's clothing, and it costs horizontal space on a table built for scanning.
 * Where provenance or health is uniform the column collapses into one sentence above the
 * table; where a filter or tab makes it vary again, it comes back. Returning `null` means
 * "varies — keep the column".
 */
export interface UniformColumns {
  provenance: TableRow["provenance"] | null;
  health: HealthFlag[] | null;
}

export function uniformColumns(rows: readonly TableRow[]): UniformColumns {
  const first = rows[0];
  if (first === undefined) return { provenance: null, health: null };

  const flagKey = (row: TableRow) => [...row.health_flags].sort().join(",");
  const firstFlags = flagKey(first);

  return {
    provenance: rows.every((row) => row.provenance === first.provenance)
      ? first.provenance
      : null,
    health: rows.every((row) => flagKey(row) === firstFlags) ? first.health_flags : null,
  };
}

/**
 * One row per model, carrying its best-scoring configuration.
 *
 * Reasoning-effort variants inflate the ranking badly: 49 rows describe 19 models, and a
 * single model holds ranks 1–4 because it was measured at six effort levels. A reader
 * asking "who is ahead" is answered worse by that than by one row per model.
 *
 * This is not the silent merge `03-sections/leaderboard.md` forbids. Nothing is averaged
 * and no number changes — the row keeps the variant that produced it, named, and reports
 * how many configurations it was chosen from, so "best of 6" is visible rather than
 * implied. Expanding back to every configuration is one toggle away.
 */
export interface CollapsedRow extends TableRow {
  /** How many configurations of this model were measured; 1 means nothing was collapsed. */
  configurations: number;
}

export function bestConfigurationPerModel(rows: readonly TableRow[]): CollapsedRow[] {
  const byModel = new Map<string, TableRow[]>();
  for (const row of rows) {
    byModel.set(row.model_id, [...(byModel.get(row.model_id) ?? []), row]);
  }

  const collapsed: CollapsedRow[] = [];
  for (const [, group] of byModel) {
    const best = group.reduce((a, b) => (b.value > a.value ? b : a));
    collapsed.push({ ...best, configurations: group.length });
  }

  return collapsed.sort((a, b) => b.value - a.value);
}

function toRow(row: LeaderboardRow): TableRow {
  return {
    key: `${row.model.model_id}#${row.variant}`,
    model_id: row.model.model_id,
    variant: row.variant,
    value: row.score.value,
    unit: row.score.unit,
    confidence_interval: row.score.confidence_interval,
    provenance: row.provenance,
    health_flags: row.score.health_flags,
    benchmark_status: row.score.benchmark.status,
    eci: row.capabilityIndex?.eci ?? null,
  };
}

export function toTableModels(models: readonly Model[]): Record<string, TableModel> {
  return Object.fromEntries(
    models.map((model) => [
      model.model_id,
      {
        display_name: model.display_name,
        creator: model.creator,
        open_weights: model.open_weights,
        released_at: model.released_at,
        context_window: model.context_window,
        price_input: model.price_input_per_mtok,
        price_output: model.price_output_per_mtok,
      },
    ]),
  );
}

export function toTableData(result: BuildRowsResult): TableData {
  return {
    reference:
      result.reference === null
        ? null
        : {
            slug: result.reference.slug,
            name: result.reference.name,
            status: result.reference.status,
          },
    rationale: result.rationale,
    rows: result.rows.map(toRow),
    unranked: result.unranked.map((entry) => ({
      model_id: entry.model.model_id,
      reason: entry.reason,
      scoreCount: entry.scoreCount,
    })),
    excluded: result.excluded,
  };
}
