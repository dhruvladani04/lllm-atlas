import { ARENA_ORIGINATOR_URL } from "@/lib/ingest/arena";
import type {
  BuildRowsResult,
  LeaderboardRow,
  RowProvenance,
} from "@/lib/leaderboard/rows";
import type { Benchmark } from "@/lib/schemas/benchmark";
import type { QuotedNumber } from "@/lib/schemas/common";
import type { Model } from "@/lib/schemas/model";
import type { HealthFlag, Score } from "@/lib/schemas/score";

/**
 * specs/03-sections/leaderboard.md — the summary cards.
 *
 * Each card is one real row lifted out of a ranking the site already publishes, with the
 * rule that picked it stated on the card. Nothing is computed here that the table below
 * does not also show, and a card whose rule matches no row is left out — never filled with
 * the nearest thing.
 *
 * A card carries the same health flags, benchmark status and provenance as its row. A card
 * showing a bare number would be the exact thing this site argues against, at the top of
 * the page and in larger type.
 */

/** How close to the leader a model has to score to count for the price card. */
export const NEAR_TOP_FRACTION = 0.9;

export interface SummaryCard {
  kind: "top-text" | "top-agentic" | "top-open-weights" | "lowest-price" | "top-image";
  /** The rule that picked this row, as a heading. */
  label: string;
  /** What the rule leaves out, where a reader would otherwise assume more than it says. */
  qualifier: string | null;
  model_id: string;
  display_name: string;
  creator: string;
  variant: string;
  value: number;
  unit: Score["unit"];
  confidence_interval: number | null;
  /** Null for the arena card: no benchmark health record exists for an arena board. */
  benchmark: { slug: string; name: string; status: Benchmark["status"] } | null;
  health_flags: HealthFlag[] | null;
  provenance: RowProvenance | null;
  source_url: string;
  price: { input: QuotedNumber; output: QuotedNumber } | null;
}

function fromRow(
  row: LeaderboardRow,
  kind: SummaryCard["kind"],
  label: string,
  qualifier: string | null,
): SummaryCard {
  return {
    kind,
    label,
    qualifier,
    model_id: row.model.model_id,
    display_name: row.model.display_name,
    creator: row.model.creator,
    variant: row.variant,
    value: row.score.value,
    unit: row.score.unit,
    confidence_interval: row.score.confidence_interval,
    benchmark: {
      slug: row.score.benchmark.slug,
      name: row.score.benchmark.name,
      status: row.score.benchmark.status,
    },
    health_flags: row.score.health_flags,
    provenance: row.provenance,
    source_url: row.score.source.source_url,
    price: null,
  };
}

function priced(
  row: LeaderboardRow,
): { row: LeaderboardRow; input: QuotedNumber; output: QuotedNumber } | null {
  const input = row.model.price_input_per_mtok;
  const output = row.model.price_output_per_mtok;
  return input === null || output === null ? null : { row, input, output };
}

export function buildSummaryCards(input: {
  /** The text and agentic tabs exactly as the leaderboard ranks them by default. */
  text: BuildRowsResult;
  agentic: BuildRowsResult;
  image: readonly Score[];
  models: readonly Model[];
}): SummaryCard[] {
  const cards: SummaryCard[] = [];
  const { text, agentic } = input;

  const topText = text.rows[0];
  if (text.reference !== null && topText !== undefined) {
    const reference = text.reference.name;
    cards.push(fromRow(topText, "top-text", `Highest on ${reference}`, null));

    const open = text.rows.find((row) => row.model.open_weights === true);
    if (open !== undefined) {
      const unknown = text.rows.filter((row) => row.model.open_weights === null).length;
      cards.push(
        fromRow(
          open,
          "top-open-weights",
          `Highest with open weights on ${reference}`,
          unknown === 0
            ? null
            : `Among models recorded as releasing their weights. ${unknown} of the ${text.rows.length} ranked rows have no recorded answer and are not counted either way.`,
        ),
      );
    }

    // "Within 10% of the leader" only means something on a ratio scale. An Elo or an
    // index has no zero to take a fraction of, so the card is skipped for those.
    if (topText.score.unit === "percent") {
      const floor = topText.score.value * NEAR_TOP_FRACTION;
      const cheapest = text.rows
        .filter((row) => row.score.value >= floor)
        .map(priced)
        .filter((entry) => entry !== null)
        .sort(
          (a, b) =>
            a.input.value + a.output.value - (b.input.value + b.output.value) ||
            b.row.score.value - a.row.score.value,
        )[0];
      if (cheapest !== undefined) {
        cards.push({
          ...fromRow(
            cheapest.row,
            "lowest-price",
            `Lowest price within 10% of the top on ${reference}`,
            "Ranked by input plus output price per million tokens. Models with no readable price are not counted.",
          ),
          price: { input: cheapest.input, output: cheapest.output },
        });
      }
    }
  }

  const topAgentic = agentic.rows[0];
  if (agentic.reference !== null && topAgentic !== undefined) {
    cards.push(
      fromRow(
        topAgentic,
        "top-agentic",
        `Highest on ${agentic.reference.name}`,
        "A system score: the model and its harness measured together.",
      ),
    );
  }

  const byId = new Map(input.models.map((model) => [model.model_id, model]));
  const topImage = [...input.image].sort((a, b) => b.value - a.value)[0];
  const imageModel = topImage === undefined ? undefined : byId.get(topImage.model_id);
  if (topImage !== undefined && imageModel !== undefined) {
    cards.push({
      kind: "top-image",
      label: "Highest Arena Elo, text to image",
      qualifier:
        "A preference ranking from public pairwise votes, not a benchmark score.",
      model_id: imageModel.model_id,
      display_name: imageModel.display_name,
      creator: imageModel.creator,
      variant: topImage.variant,
      value: topImage.value,
      unit: topImage.unit,
      confidence_interval: topImage.confidence_interval,
      benchmark: null,
      health_flags: null,
      provenance: null,
      // Arena's own board, not the API the pipeline read; the snapshot keeps that URL.
      source_url: ARENA_ORIGINATOR_URL,
      price: null,
    });
  }

  return cards;
}
