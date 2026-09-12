import { describe, expect, it } from "vitest";
import {
  buildModels,
  deriveState,
  selectQuoted,
  type PriceQuote,
} from "@/lib/join/models";
import type { ModelRegistry } from "@/lib/schemas/model";
import type { Score } from "@/lib/schemas/score";

/**
 * The price rule from specs/02-data/sources-and-licensing.md source 5: a vendor list price
 * wins, an OpenRouter routed price is the labelled fallback, and the label travels with the
 * number so the two claims can never be presented as one.
 */

const vendor: PriceQuote = {
  price_input_per_mtok: 5,
  price_output_per_mtok: 25,
  context_window: null,
  source_url: "https://www.anthropic.com/pricing",
  fetched_at: "2026-09-12T06:00:00.000Z",
};

const openrouter: PriceQuote = {
  price_input_per_mtok: 5.2,
  price_output_per_mtok: 26,
  context_window: 200_000,
  source_url: "https://openrouter.ai/anthropic/claude-opus-5",
  fetched_at: "2026-09-12T06:00:00.000Z",
};

describe("selectQuoted", () => {
  it("prefers the vendor's own list price", () => {
    expect(selectQuoted("price_input_per_mtok", vendor, openrouter)).toMatchObject({
      value: 5,
      quoted_by: "vendor",
      source_url: "https://www.anthropic.com/pricing",
    });
  });

  it("falls back to OpenRouter, labelled as such", () => {
    expect(selectQuoted("price_input_per_mtok", undefined, openrouter)).toMatchObject({
      value: 5.2,
      quoted_by: "openrouter",
    });
  });

  it("falls back per field, not per model", () => {
    // Anthropic's page states prices but not a per-model context window. Losing the context
    // window because the price came from the vendor would be a worse answer than mixing.
    expect(selectQuoted("context_window", vendor, openrouter)).toMatchObject({
      value: 200_000,
      quoted_by: "openrouter",
    });
  });

  it("renders nothing rather than a zero when neither source has it", () => {
    expect(selectQuoted("price_input_per_mtok", undefined, undefined)).toBeNull();
    const empty: PriceQuote = { ...vendor, price_input_per_mtok: null };
    expect(selectQuoted("price_input_per_mtok", empty, undefined)).toBeNull();
  });

  it("carries the fetch date of whichever source won", () => {
    const older: PriceQuote = { ...vendor, fetched_at: "2026-09-01T06:00:00.000Z" };
    expect(selectQuoted("price_output_per_mtok", older, openrouter)).toMatchObject({
      fetched_at: "2026-09-01T06:00:00.000Z",
    });
  });
});

describe("deriveState", () => {
  it("is ranked when scores exist", () => {
    expect(deriveState(true, "2026-01-15")).toBe("ranked");
  });

  it("is released_unranked when it shipped but nothing has scored it", () => {
    // A feature, not an empty state: an honest "released 3 days ago, no scores yet" beats
    // a competitor's placeholder ranking.
    expect(deriveState(false, "2026-09-09")).toBe("released_unranked");
  });

  it("is announced when there is neither a score nor a release date", () => {
    expect(deriveState(false, null)).toBe("announced");
  });
});

describe("buildModels", () => {
  const registry: ModelRegistry = [
    {
      model_id: "anthropic/claude-opus-5",
      display_name: "Claude Opus 5",
      creator: "Anthropic",
      released_at: "2026-01-15",
      open_weights: false,
      aliases: ["claude-opus-5"],
      variants: [{ variant: "base", aliases: ["Claude Opus 5"] }],
    },
  ];

  const score = {
    model_id: "anthropic/claude-opus-5",
    variant: "base",
    benchmark_slug: "gpqa",
    harness: null,
    value: 91,
    unit: "percent",
    confidence_interval: null,
    sample_size: null,
    provenance: "independent",
    measured_at: null,
    source: {
      source_id: "epoch",
      source_url: "https://epoch.ai/data/benchmark_data.zip",
      fetched_at: "2026-09-12T06:00:00.000Z",
      licence: "CC BY 4.0",
      attribution: "Epoch AI",
    },
    notes: null,
  } satisfies Score;

  it("keeps registry identity and adds only what was ingested", () => {
    const [model] = buildModels(
      registry,
      [score],
      new Map([["anthropic/claude-opus-5", vendor]]),
      new Map([["anthropic/claude-opus-5", openrouter]]),
    );

    expect(model).toMatchObject({
      model_id: "anthropic/claude-opus-5",
      display_name: "Claude Opus 5",
      state: "ranked",
      price_input_per_mtok: { value: 5, quoted_by: "vendor" },
      context_window: { value: 200_000, quoted_by: "openrouter" },
    });
  });

  it("gives a model with no price anywhere explicit nulls, not zeroes", () => {
    const [model] = buildModels(registry, [], new Map(), new Map());
    expect(model?.price_input_per_mtok).toBeNull();
    expect(model?.price_output_per_mtok).toBeNull();
    expect(model?.context_window).toBeNull();
    expect(model?.state).toBe("released_unranked");
  });
});
