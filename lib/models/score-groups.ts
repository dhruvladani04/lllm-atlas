import type { HealthFlag, JoinedScore } from "@/lib/schemas/score";
import type { Benchmark } from "@/lib/schemas/benchmark";

/**
 * specs/03-sections/leaderboard.md — the model page's scores, grouped.
 *
 * One model measured on ARC-AGI-2 at five reasoning efforts used to take five rows, which
 * read as five benchmarks. A group is one benchmark under one harness from one kind of
 * source; its headline row is the best configuration, and the others are listed under it
 * on request. Nothing is averaged and no row is dropped — the same rule the leaderboard's
 * "best of N configurations" follows.
 *
 * Harness and provenance are part of the key on purpose. A different harness is a
 * different system being measured, and a vendor's number is never folded under an
 * independent one.
 */

export interface ScoreLine {
  key: string;
  benchmark_slug: string;
  benchmark_name: string;
  status: Benchmark["status"];
  variant: string;
  value: number;
  unit: JoinedScore["unit"];
  confidence_interval: number | null;
  harness: string | null;
  provenance: JoinedScore["provenance"];
  measured_at: string | null;
  health_flags: HealthFlag[];
}

export interface ScoreGroup {
  key: string;
  best: ScoreLine;
  /** The other configurations, best first. */
  others: ScoreLine[];
}

function toLine(score: JoinedScore, index: number): ScoreLine {
  return {
    key: `${score.benchmark_slug}#${score.variant}#${score.harness ?? "none"}#${score.provenance}#${score.measured_at ?? "none"}#${index}`,
    benchmark_slug: score.benchmark_slug,
    benchmark_name: score.benchmark.name,
    status: score.benchmark.status,
    variant: score.variant,
    value: score.value,
    unit: score.unit,
    confidence_interval: score.confidence_interval,
    harness: score.harness,
    provenance: score.provenance,
    measured_at: score.measured_at,
    health_flags: score.health_flags,
  };
}

export function groupScores(scores: readonly JoinedScore[]): ScoreGroup[] {
  const groups = new Map<string, ScoreLine[]>();
  scores.forEach((score, index) => {
    const key = `${score.benchmark_slug}#${score.harness ?? "none"}#${score.provenance}`;
    groups.set(key, [...(groups.get(key) ?? []), toLine(score, index)]);
  });

  return [...groups.entries()].map(([key, lines]) => {
    const [best, ...others] = [...lines].sort((a, b) => b.value - a.value);
    return { key, best: best!, others };
  });
}
