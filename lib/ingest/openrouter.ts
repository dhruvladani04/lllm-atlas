import type { SourceMeta } from "@/lib/schemas/common";
import { OpenRouterModelsPayload } from "@/lib/schemas/openrouter";
import type { Fetcher } from "@/lib/ingest/benchwiki";

/**
 * OpenRouter — specs/02-data/sources-and-licensing.md source 2.
 *
 * Used for two things, kept strictly apart: adoption (a usage rank, never blended into a
 * capability ranking) and the fallback price when a vendor's own page cannot be read.
 * An OpenRouter price is the routed price OpenRouter charges, not the vendor's list
 * price, and it is labelled as such wherever it appears.
 */

export const OPENROUTER_SOURCE_ID = "openrouter";
export const OPENROUTER_MODELS_ENDPOINT = "https://openrouter.ai/api/v1/models";
export const OPENROUTER_LICENCE = "CC BY 4.0";
export const OPENROUTER_ATTRIBUTION = "Usage data from OpenRouter, CC BY 4.0.";

export function openRouterSourceMeta(fetchedAt: string): SourceMeta {
  return {
    source_id: OPENROUTER_SOURCE_ID,
    source_url: OPENROUTER_MODELS_ENDPOINT,
    fetched_at: fetchedAt,
    licence: OPENROUTER_LICENCE,
    attribution: OPENROUTER_ATTRIBUTION,
  };
}

const TOKENS_PER_MTOK = 1_000_000;

/**
 * Prices arrive as USD-per-token decimal strings. A string that does not parse is an
 * upstream change, not a zero: returning null keeps it out of the data entirely, where
 * the site renders a gap.
 */
export function perMillionTokens(usdPerToken: string): number | null {
  const parsed = Number.parseFloat(usdPerToken);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed * TOKENS_PER_MTOK;
}

export async function fetchOpenRouterModels(
  fetcher: Fetcher = fetch,
): Promise<{ payload: OpenRouterModelsPayload; raw: unknown }> {
  const response = await fetcher(OPENROUTER_MODELS_ENDPOINT);
  if (!response.ok) {
    throw new Error(`openrouter responded ${response.status} ${response.statusText}`);
  }
  const raw: unknown = await response.json();
  return { payload: OpenRouterModelsPayload.parse(raw), raw };
}
