import { z } from "zod";

/**
 * specs/03-sections/evals.md — MDX frontmatter.
 *
 * `verified_on` is the field that makes this section trustworthy in a category full of
 * stale content. Framework feature sets move fast; an undated comparison is wrong within a
 * quarter. It is required, not optional, and it drives a visible staleness marker.
 */

export const Archetype = z.enum([
  "foundations",
  "generation",
  "rag",
  "agentic",
  "multi-turn",
  "extraction",
  "code",
  "multimodal",
  "voice",
  "reference",
]);
export type Archetype = z.infer<typeof Archetype>;

/**
 * The unit of evaluation — the spine of the whole section, and the thing most eval content
 * gets wrong by assuming one input, one output, one score.
 */
export const UnitOfEvaluation = z.enum([
  "response",
  "response-plus-context",
  "trajectory",
  "session",
  "field",
  "execution",
  "turn-plus-audio",
  "not-applicable",
]);
export type UnitOfEvaluation = z.infer<typeof UnitOfEvaluation>;

/**
 * YAML parses an unquoted `2026-09-12` into a Date. The rest of the project keeps dates as
 * ISO strings on disk — Date objects live only inside formatting helpers — so a Date here is
 * narrowed back to a date string rather than rejected. Quoting the value in the file works
 * too; both spellings land in the same place.
 */
const FrontmatterDate = z.preprocess(
  (value) => (value instanceof Date ? value.toISOString().slice(0, 10) : value),
  z.iso.date(),
);

export const GuideFrontmatter = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  archetype: Archetype,
  unit_of_evaluation: UnitOfEvaluation,
  summary: z.string().min(1).max(160),
  level: z.enum(["intro", "intermediate", "advanced"]),
  frameworks: z.array(z.string()),
  prerequisites: z.array(z.string()),
  published_on: FrontmatterDate,
  verified_on: FrontmatterDate,
});
export type GuideFrontmatter = z.infer<typeof GuideFrontmatter>;

export const UNIT_LABEL: Record<UnitOfEvaluation, string> = {
  response: "one response",
  "response-plus-context": "one response plus its retrieved context",
  trajectory: "the whole trajectory",
  session: "the session",
  field: "each extracted field",
  execution: "the execution",
  "turn-plus-audio": "the turn, including its audio",
  "not-applicable": "varies by archetype",
};
