import type { JoinedScore } from "@/lib/schemas/score";
import type { Model } from "@/lib/schemas/model";

/**
 * specs/03-sections/leaderboard.md — the home page.
 *
 * "Lead with a single real leaderboard row in which a model shows a high score *and* a
 * saturation flag on the benchmark producing it — the argument shown, not stated."
 *
 * Nothing here is hardcoded. The row is chosen from the committed data every build, so the
 * home page cannot drift into claiming something the data stopped supporting. If no such
 * row exists, the page says so rather than inventing one.
 */

export interface Demonstration {
  model: Model;
  variant: string;
  /** The flattering number: high, on a benchmark that no longer discriminates. */
  headline: JoinedScore;
  /** The same model on the successor benchmark, where one exists and has a score. */
  successor: JoinedScore | null;
}

export function selectDemonstration(
  scores: readonly JoinedScore[],
  models: readonly Model[],
): Demonstration | null {
  const byId = new Map(models.map((model) => [model.model_id, model]));

  const candidates = scores
    .filter(
      (score) =>
        score.unit === "percent" &&
        score.health_flags.includes("saturated") &&
        byId.has(score.model_id),
    )
    .sort((a, b) => b.value - a.value);

  for (const headline of candidates) {
    const model = byId.get(headline.model_id);
    if (model === undefined) continue;

    // Prefer a candidate whose successor benchmark also has a score for the same model and
    // variant: the pair is the argument, not the single number.
    const successorSlug = headline.benchmark.successor;
    const successor =
      successorSlug === null
        ? null
        : (scores.find(
            (score) =>
              score.benchmark_slug === successorSlug &&
              score.model_id === headline.model_id &&
              score.variant === headline.variant,
          ) ?? null);

    if (successor !== null) {
      return { model, variant: headline.variant, headline, successor };
    }
  }

  // Nothing with a successor pair. A lone saturated row still makes the point.
  const fallback = candidates[0];
  if (fallback === undefined) return null;
  const model = byId.get(fallback.model_id);
  if (model === undefined) return null;

  return { model, variant: fallback.variant, headline: fallback, successor: null };
}
