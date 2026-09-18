import { BenchwikiPayload, type BenchwikiRecord } from "@/lib/schemas/benchwiki";
import { Benchmark, type TimelinePoint } from "@/lib/schemas/benchmark";
import type { SourceMeta } from "@/lib/schemas/common";

/**
 * specs/02-data/sources-and-licensing.md, source 1.
 *
 * benchwiki publishes no licence. The endpoint is public but the terms are not stated, so
 * this is treated as permission-not-granted: attribution is persistent, mirrored pages
 * carry rel="canonical" back to the original, and the fetch happens once a day inside the
 * scheduled job. A user request never reaches this endpoint.
 */

export const BENCHWIKI_SOURCE_ID = "benchwiki";
export const BENCHWIKI_ENDPOINT = "https://benchwiki.vercel.app/api/benchmarks.json";
export const BENCHWIKI_SITE = "https://benchwiki.vercel.app";
export const BENCHWIKI_LICENCE =
  "No published licence — attributed, linked, not relicensed";
export const BENCHWIKI_ATTRIBUTION = "Benchmark metadata from benchwiki";

/** Verified against the live site: /benchmarks/<slug> is the canonical record page. */
export function benchwikiCanonicalUrl(slug: string): string {
  return `${BENCHWIKI_SITE}/benchmarks/${slug}`;
}

export function benchwikiSourceMeta(fetchedAt: string): SourceMeta {
  return {
    source_id: BENCHWIKI_SOURCE_ID,
    source_url: BENCHWIKI_ENDPOINT,
    fetched_at: fetchedAt,
    licence: BENCHWIKI_LICENCE,
    attribution: BENCHWIKI_ATTRIBUTION,
  };
}

/**
 * Upstream sends midnight-UTC datetimes where it means calendar dates. Trim to the date,
 * which is all the site ever renders, and refuse anything that is not a date at all rather
 * than passing a bad string downstream.
 */
export function toIsoDate(value: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  if (!match?.[1]) throw new TypeError(`not an ISO date: ${JSON.stringify(value)}`);
  return match[1];
}

function toIsoDateOrNull(value: string | null): string | null {
  return value === null || value.trim() === "" ? null : toIsoDate(value);
}

/** Resolves an upstream model name to a registry id, or null. Never guesses. */
export type ModelResolver = (name: string) => string | null;

function toTimelinePoint(
  point: BenchwikiRecord["performance_timeline"][number],
  resolve: ModelResolver,
): TimelinePoint {
  return {
    model: point.model,
    model_id: resolve(point.model),
    vendor: point.vendor,
    measured_at: toIsoDate(point.date),
    score: point.score,
    provenance: point.source,
    source_url: point.source_url,
  };
}

/**
 * Upstream spells the same language two ways. `cpp` and `c-plus-plus` are one language
 * filtered as two, which splits a filter that exists to gather things together.
 *
 * Only true synonyms are merged. `code`, `multilingual` and `language-neutral` look like
 * noise beside `python` and `french` but are not — they are the honest answer for a
 * benchmark that spans many languages or none, and collapsing them into a specific language
 * would be inventing a fact rather than tidying one.
 */
const LANGUAGE_SYNONYMS: Record<string, string> = {
  cpp: "c-plus-plus",
  "c++": "c-plus-plus",
  csharp: "c-sharp",
  "c#": "c-sharp",
  js: "javascript",
  ts: "typescript",
  py: "python",
};

export function normaliseLanguages(languages: readonly string[]): string[] {
  const seen = new Set<string>();
  for (const language of languages) {
    const key = language.trim().toLowerCase();
    if (key === "") continue;
    seen.add(LANGUAGE_SYNONYMS[key] ?? key);
  }
  return [...seen].sort();
}

/**
 * Maps an upstream record onto the site's Benchmark shape. Field names differ in several
 * places — `metric.primary` becomes `metric_primary`, `metric.judge_model` is lifted to the
 * top level — and the canonical URL is derived rather than supplied. Nothing is invented:
 * a field upstream does not send renders as a gap, never as a default.
 */
export function toBenchmark(
  record: BenchwikiRecord,
  resolve: ModelResolver = () => null,
): Benchmark {
  return Benchmark.parse({
    slug: record.slug,
    name: record.name,
    capability: record.capability,
    languages: normaliseLanguages(record.languages),
    secondary_capabilities: record.secondary_capabilities,
    short_description: record.short_description,
    launch_date: toIsoDateOrNull(record.launch_date),
    status: record.status,
    status_evidence: record.status_evidence,
    saturated_date: toIsoDateOrNull(record.saturated_date),
    successor: record.successor,
    contamination: record.contamination,
    human_baseline: record.human_baseline,
    statistical_note: record.statistical_note,
    metric_primary: record.metric.primary,
    judge_model: record.metric.judge_model,
    last_updated: toIsoDate(record.last_updated),
    leaderboards: record.leaderboards,
    performance_timeline: record.performance_timeline.map((point) =>
      toTimelinePoint(point, resolve),
    ),
    source_url: benchwikiCanonicalUrl(record.slug),
  });
}

export function parseBenchwikiPayload(raw: unknown): BenchwikiPayload {
  return BenchwikiPayload.parse(raw);
}

export type Fetcher = (url: string) => Promise<Response>;

/**
 * Fetches and validates. Throws on transport failure and on schema failure alike — the
 * caller decides what that means for the run, because "unreachable" and "schema-error"
 * are logged differently but behave identically: keep the previous snapshot.
 */
export async function fetchBenchwiki(
  fetcher: Fetcher = fetch,
): Promise<{ payload: BenchwikiPayload; raw: unknown }> {
  const response = await fetcher(BENCHWIKI_ENDPOINT);
  if (!response.ok) {
    throw new Error(`benchwiki responded ${response.status} ${response.statusText}`);
  }
  const raw: unknown = await response.json();
  return { payload: parseBenchwikiPayload(raw), raw };
}
