/**
 * specs/03-sections/benchmarks.md — the best score on a benchmark, as it was over time.
 *
 * A saturating benchmark has a shape: the best score climbs and then flattens against the
 * ceiling. The record-setters — each score that beat every score measured before it — are
 * that shape, and a step line through them is a claim the data supports: on this date, this
 * was the best measured result.
 *
 * The line is only drawn when every score was measured the same way. Under several agent
 * harnesses a "record" may be a better harness rather than a better model, and joining
 * those would assert a continuity the design spec forbids drawing. Then the points are
 * shown and the line is not.
 */

export interface DatedScore {
  model_id: string;
  value: number;
  measured_at: string | null;
  harness: string | null;
}

export interface BestOverTime {
  points: { time: number; value: number; model_id: string }[];
  /** Each score that beat every earlier one, in date order. Empty when no line is drawn. */
  records: { time: number; value: number; model_id: string }[];
  /** Why there is no line, when there is none. */
  noLine: "harnesses" | "too-few" | null;
}

export function bestOverTime(scores: readonly DatedScore[]): BestOverTime {
  const points = scores
    .filter(
      (score) =>
        score.measured_at !== null && /^\d{4}-\d{2}-\d{2}/.test(score.measured_at),
    )
    .map((score) => ({
      time: Date.parse(score.measured_at!.slice(0, 10)),
      value: score.value,
      model_id: score.model_id,
    }))
    .sort((a, b) => a.time - b.time || b.value - a.value);

  if (new Set(scores.map((score) => score.harness ?? "")).size > 1) {
    return { points, records: [], noLine: "harnesses" };
  }
  if (points.length < 2) return { points, records: [], noLine: "too-few" };

  const records: BestOverTime["records"] = [];
  for (const point of points) {
    const best = records[records.length - 1];
    if (best === undefined || point.value > best.value) records.push(point);
  }
  return { points, records, noLine: null };
}
