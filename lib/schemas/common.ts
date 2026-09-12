import { z } from "zod";

/**
 * specs/02-data/schemas.md — Common.
 *
 * Nothing is `optional` when it could instead be `nullable`. A missing value must be
 * representable and renderable, never absent.
 */

export const Provenance = z.enum(["vendor-reported", "independent"]);
export type Provenance = z.infer<typeof Provenance>;

export const BenchmarkStatus = z.enum([
  "active",
  "nearing-saturation",
  "saturated",
  "deprecated",
]);
export type BenchmarkStatus = z.infer<typeof BenchmarkStatus>;

export const ContaminationRisk = z.enum(["low", "medium", "high", "unknown"]);
export type ContaminationRisk = z.infer<typeof ContaminationRisk>;

export const ModelState = z.enum(["ranked", "released_unranked", "announced"]);
export type ModelState = z.infer<typeof ModelState>;

export const PriceQuotedBy = z.enum(["vendor", "openrouter"]);
export type PriceQuotedBy = z.infer<typeof PriceQuotedBy>;

/**
 * A number that knows where it came from and when. A vendor list price and an OpenRouter
 * routed price are different claims, so the claim travels with the number.
 */
export const QuotedNumber = z.object({
  value: z.number(),
  quoted_by: PriceQuotedBy,
  source_url: z.url(),
  fetched_at: z.iso.datetime(),
});
export type QuotedNumber = z.infer<typeof QuotedNumber>;

export const SourceMeta = z.object({
  source_id: z.string().min(1),
  source_url: z.url(),
  fetched_at: z.iso.datetime(),
  licence: z.string().min(1),
  attribution: z.string().min(1),
});
export type SourceMeta = z.infer<typeof SourceMeta>;

/** ISO 8601 calendar date. Dates are strings everywhere on disk. */
export const IsoDate = z.iso.date();
