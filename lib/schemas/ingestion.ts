import { z } from "zod";

/** specs/02-data/schemas.md — the per-run ingestion log. */

export const IngestionStatus = z.enum(["ok", "unreachable", "schema-error", "truncated"]);
export type IngestionStatus = z.infer<typeof IngestionStatus>;

export const IngestionResult = z.object({
  source_id: z.string().min(1),
  status: IngestionStatus,
  record_count: z.number().int().nonnegative(),
  previous_record_count: z.number().int().nonnegative().nullable(),
  unresolved_models: z.array(z.string().min(1)),
  message: z.string().nullable(),
});
export type IngestionResult = z.infer<typeof IngestionResult>;

export const IngestionRun = z.object({
  run_at: z.iso.datetime(),
  results: z.array(IngestionResult),
});
export type IngestionRun = z.infer<typeof IngestionRun>;

export const IngestionLog = z.array(IngestionRun);
export type IngestionLog = z.infer<typeof IngestionLog>;
