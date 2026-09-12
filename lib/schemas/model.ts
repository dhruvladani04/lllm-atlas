import { z } from "zod";
import { IsoDate, ModelState, QuotedNumber } from "@/lib/schemas/common";

/**
 * specs/01-architecture/model-registry.md — the registry holds identity only. Price,
 * context window and state are ingested or derived and live in data/derived/models.json.
 */

export const ModelVariant = z.object({
  variant: z.string().min(1),
  aliases: z.array(z.string().min(1)),
});
export type ModelVariant = z.infer<typeof ModelVariant>;

export const RegistryModel = z.object({
  model_id: z.string().min(1),
  display_name: z.string().min(1),
  creator: z.string().min(1),
  released_at: IsoDate.nullable(),
  open_weights: z.boolean().nullable(),
  aliases: z.array(z.string().min(1)),
  variants: z.array(ModelVariant).min(1),
});
export type RegistryModel = z.infer<typeof RegistryModel>;

export const ModelRegistry = z.array(RegistryModel);
export type ModelRegistry = z.infer<typeof ModelRegistry>;

/** The derived record the UI reads. Identity from the registry, the rest ingested. */
export const Model = RegistryModel.extend({
  state: ModelState,
  context_window: QuotedNumber.nullable(),
  price_input_per_mtok: QuotedNumber.nullable(),
  price_output_per_mtok: QuotedNumber.nullable(),
});
export type Model = z.infer<typeof Model>;

/**
 * An upstream name that resolved to nothing. Never dropped, never guessed — a wrong match
 * is invisible and a missing match is visible.
 */
export const UnresolvedName = z.object({
  name: z.string().min(1),
  source_id: z.string().min(1),
  first_seen_at: IsoDate,
  last_seen_at: IsoDate,
  occurrences: z.number().int().positive(),
});
export type UnresolvedName = z.infer<typeof UnresolvedName>;

export const UnresolvedNames = z.array(UnresolvedName);
export type UnresolvedNames = z.infer<typeof UnresolvedNames>;
