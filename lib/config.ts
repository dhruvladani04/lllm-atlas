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

/**
 * The origin every canonical URL, `og:url`, sitemap entry and robots directive is built
 * from. Getting this wrong is not cosmetic: a deployed site that still says
 * `http://localhost:3000` publishes broken share cards and a sitemap no crawler can use.
 *
 * `VERCEL_PROJECT_PRODUCTION_URL` is preferred over `VERCEL_URL` deliberately. The latter
 * is the per-deployment hostname, so a preview build would advertise itself as the
 * canonical home of every page; the former is the stable production domain, which is the
 * only honest thing for a canonical URL to name.
 */
export function siteUrl(): string {
  const explicit = process.env.SITE_URL;
  if (explicit !== undefined && explicit !== "") return explicit.replace(/\/$/, "");

  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL ?? null;
  if (vercel !== null && vercel !== "") return `https://${vercel}`;

  return "http://localhost:3000";
}
