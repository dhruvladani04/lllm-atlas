import { daysSinceVerified, isStale } from "@/lib/evals/load";

/**
 * specs/03-sections/evals.md — `verified_on` drives a visible staleness marker on anything
 * older than 180 days. This is the same discipline benchwiki applies to scores, applied to
 * prose: an undated framework comparison is wrong within a quarter and nobody notices.
 */
export function VerifiedStamp({ verifiedOn }: { verifiedOn: string }) {
  const now = new Date();
  const stale = isStale(verifiedOn, now);
  const days = daysSinceVerified(verifiedOn, now);

  return (
    <span
      className="text-xs whitespace-nowrap"
      style={{ color: stale ? "var(--stale)" : "var(--ink-mute)" }}
    >
      Last verified {verifiedOn}
      {stale ? ` — ${days} days ago, treat specifics as out of date` : ""}
    </span>
  );
}
