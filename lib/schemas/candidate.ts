import { z } from "zod";
import { RegistryModel } from "@/lib/schemas/model";
import { IsoDate } from "@/lib/schemas/common";

/**
 * A proposed registry entry, derived from snapshot evidence and awaiting a human.
 *
 * specs/01-architecture/model-registry.md says registry growth is manual because automating
 * it automates the wrong-merge risk. This file does not change that: nothing here ever
 * enters the registry without someone approving it. What it changes is the amount of
 * transcription a human does before they can exercise that judgement — 1,351 unresolved
 * names is not a queue anyone works through by hand, so in practice "manual" had come to
 * mean "not at all", and the site was discarding score data for hundreds of models it
 * already legally ingests.
 *
 * The evidence block is the point. A candidate a reviewer cannot check is one they have to
 * take on trust, which is the failure this project exists to argue against — so every
 * proposal carries the rows that produced it, what disagreed, and what it could not prove.
 */

export const Confidence = z.enum(["high", "medium", "low", "conflict"]);
export type Confidence = z.infer<typeof Confidence>;

export const CandidateEvidence = z.object({
  /** The `model_version` with any tier suffix stripped — what grouped these rows. */
  stem: z.string().min(1),
  sources: z.array(z.string().min(1)),
  /** Every distinct `organization` seen. More than one means the rows disagree. */
  organizations: z.array(z.string()),
  release_dates: z.array(z.string()),
  benchmarks: z.array(z.object({ benchmark: z.string(), rows: z.number().int() })),
  /** How many of those this site can actually join to a health record. */
  benchmarks_resolvable: z.number().int().nonnegative(),
  total_occurrences: z.number().int().nonnegative(),
  raw_model_versions: z.array(z.string()),
  raw_display_names: z.array(z.string()),
  /** Evidence the model is servable today, not evidence of identity. */
  openrouter: z.object({ id: z.string(), canonical_slug: z.string() }).nullable(),
  /** Aliases removed because the registry already claims them, and who claims them. */
  dropped_aliases: z.array(z.object({ alias: z.string(), claimed_by: z.string() })),
  /** Why this landed in its tier, in words a reviewer can act on. */
  reasons: z.array(z.string()),
});
export type CandidateEvidence = z.infer<typeof CandidateEvidence>;

export const Candidate = z.object({
  /** Already `RegistryModel`-shaped, so the reviewer never sees an invalid proposal. */
  proposed: RegistryModel,
  confidence: Confidence,
  evidence: CandidateEvidence,
});
export type Candidate = z.infer<typeof Candidate>;

export const CandidateFile = z.object({
  generated_at: z.iso.datetime(),
  snapshot_date: IsoDate,
  candidates: z.array(Candidate),
});
export type CandidateFile = z.infer<typeof CandidateFile>;

/** What the review UI writes and `scripts/registry-approve.ts` reads. */
export const ApprovalFile = z.object({
  decided_at: z.iso.datetime(),
  approved: z.array(z.string().min(1)),
  rejected: z.array(z.string().min(1)),
});
export type ApprovalFile = z.infer<typeof ApprovalFile>;
