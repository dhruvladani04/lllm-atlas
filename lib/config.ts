/**
 * specs/01-architecture/stack-and-structure.md — environment variables.
 *
 * `BENCHWIKI_MODE` is a one-variable kill switch for section 2. In `link` mode the
 * mirrored pages are replaced by a short explanation and a link to benchwiki, and nothing
 * else about the site changes: the leaderboard's health flags keep working, because the
 * join reads the last committed snapshot regardless of display mode.
 */

export type BenchwikiMode = "mirror" | "link";

export function benchwikiMode(): BenchwikiMode {
  return process.env.BENCHWIKI_MODE === "link" ? "link" : "mirror";
}

export const BENCHWIKI_SITE = "https://benchwiki.vercel.app";

export function benchwikiUrl(slug?: string): string {
  return slug === undefined ? BENCHWIKI_SITE : `${BENCHWIKI_SITE}/benchmarks/${slug}`;
}
