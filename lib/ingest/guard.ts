/**
 * specs/01-architecture/data-pipeline.md — failure behaviour.
 *
 * "Source returns fewer than 50% of the previous record count: treat as failure and keep
 * the previous snapshot." The guard exists so upstream truncation is not silently
 * mirrored: half a leaderboard looks like a leaderboard, which is what makes it dangerous.
 */

export const TRUNCATION_THRESHOLD = 0.5;

export interface TruncationVerdict {
  truncated: boolean;
  message: string | null;
}

export function checkTruncation(
  recordCount: number,
  previousRecordCount: number | null,
): TruncationVerdict {
  if (previousRecordCount === null || previousRecordCount === 0) {
    return { truncated: false, message: null };
  }
  const ratio = recordCount / previousRecordCount;
  if (ratio < TRUNCATION_THRESHOLD) {
    return {
      truncated: true,
      message:
        `returned ${recordCount} records against a previous ${previousRecordCount} ` +
        `(${Math.round(ratio * 100)}% of the last run, below the ${
          TRUNCATION_THRESHOLD * 100
        }% floor) — keeping the previous snapshot`,
    };
  }
  return { truncated: false, message: null };
}
