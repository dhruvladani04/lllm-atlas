import { z } from "zod";

/**
 * OpenRouter's public model list — specs/02-data/sources-and-licensing.md source 2.
 * CC BY 4.0, so redistribution is permitted with attribution. No key is needed for this
 * endpoint; the usage rankings are a separate, keyed API.
 *
 * Prices arrive as USD-per-token decimal strings, which is why they are strings here:
 * parsing them is the ingest module's job, and a string that will not parse must fail
 * loudly rather than silently become NaN.
 */

export const OpenRouterPricing = z.object({
  prompt: z.string(),
  completion: z.string(),
});

export const OpenRouterModel = z.object({
  id: z.string().min(1),
  canonical_slug: z.string().nullish(),
  name: z.string().min(1),
  context_length: z.number().int().positive().nullable(),
  pricing: OpenRouterPricing,
});
export type OpenRouterModel = z.infer<typeof OpenRouterModel>;

export const OpenRouterModelsPayload = z.object({
  data: z.array(OpenRouterModel),
});
export type OpenRouterModelsPayload = z.infer<typeof OpenRouterModelsPayload>;
