import type { QuotedNumber } from "@/lib/schemas/common";
import { Model, type ModelRegistry } from "@/lib/schemas/model";
import type { Score } from "@/lib/schemas/score";

/**
 * Builds `data/derived/models.json`: registry identity plus the numbers that are ingested.
 *
 * The price rule, from specs/02-data/sources-and-licensing.md source 5: a vendor list
 * price wins; an OpenRouter routed price is the labelled fallback; neither means the cell
 * renders as an explained gap. The two are different claims and the label travels with the
 * number so the UI cannot accidentally present one as the other.
 */

export interface PriceQuote {
  price_input_per_mtok: number | null;
  price_output_per_mtok: number | null;
  context_window: number | null;
  source_url: string;
  fetched_at: string;
}

export type PriceTable = Map<string, PriceQuote>;

function quote(
  value: number | null,
  quoted_by: QuotedNumber["quoted_by"],
  source: PriceQuote,
): QuotedNumber | null {
  if (value === null) return null;
  return {
    value,
    quoted_by,
    source_url: source.source_url,
    fetched_at: source.fetched_at,
  };
}

/**
 * Picks one number, preferring the vendor's own page. Selection is per field, not per
 * model: a vendor page that publishes prices but not a context window should not drag the
 * context window down with it.
 */
export function selectQuoted(
  field: keyof Pick<
    PriceQuote,
    "price_input_per_mtok" | "price_output_per_mtok" | "context_window"
  >,
  vendor: PriceQuote | undefined,
  openrouter: PriceQuote | undefined,
): QuotedNumber | null {
  if (vendor !== undefined) {
    const fromVendor = quote(vendor[field], "vendor", vendor);
    if (fromVendor !== null) return fromVendor;
  }
  if (openrouter !== undefined) {
    return quote(openrouter[field], "openrouter", openrouter);
  }
  return null;
}

/**
 * `ranked` means scores exist. `released_unranked` means we know it shipped but nothing
 * has scored it yet — a feature, not an empty state. `announced` is the honest answer when
 * we have neither a score nor a release date: the site does not claim to know it is
 * servable.
 */
export function deriveState(
  hasScores: boolean,
  released_at: string | null,
): Model["state"] {
  if (hasScores) return "ranked";
  return released_at === null ? "announced" : "released_unranked";
}

export function buildModels(
  registry: ModelRegistry,
  scores: readonly Score[],
  vendorPrices: PriceTable,
  openRouterPrices: PriceTable,
): Model[] {
  const scored = new Set(scores.map((score) => score.model_id));

  return registry.map((entry) => {
    const vendor = vendorPrices.get(entry.model_id);
    const openrouter = openRouterPrices.get(entry.model_id);

    return Model.parse({
      ...entry,
      state: deriveState(scored.has(entry.model_id), entry.released_at),
      context_window: selectQuoted("context_window", vendor, openrouter),
      price_input_per_mtok: selectQuoted("price_input_per_mtok", vendor, openrouter),
      price_output_per_mtok: selectQuoted("price_output_per_mtok", vendor, openrouter),
    });
  });
}
