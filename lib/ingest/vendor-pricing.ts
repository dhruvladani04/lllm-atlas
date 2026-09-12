import type { Fetcher } from "@/lib/ingest/benchwiki";
import type { PriceQuote, PriceTable } from "@/lib/join/models";

/**
 * Vendor pricing pages — specs/02-data/sources-and-licensing.md source 5.
 *
 * A price is a fact and is not copyrightable; the page it sits on is. This module extracts
 * numbers, links back to the page, and reproduces no prose. It is the most fragile source
 * in the project by design constraint rather than by accident: every other source is JSON
 * from an endpoint, and this one is HTML that changes for cosmetic reasons. It is written
 * to fail loudly and fall back, because a misparsed price shown as a vendor list price is
 * worse than a visible gap.
 */

export const SCRAPER_USER_AGENT =
  "llm-atlas-bot/0.1 (+https://github.com/llm-atlas; daily price check; contact via repository issues)";

export interface VendorTarget {
  model_id: string;
  /** The string on the page that names this model. Matched literally, never fuzzily. */
  anchor: string;
}

export interface VendorScraper {
  creator: string;
  pricing_url: string;
  targets: VendorTarget[];
  extract: (
    text: string,
    target: VendorTarget,
  ) => Omit<PriceQuote, "source_url" | "fetched_at"> | null;
}

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Minimal robots.txt evaluation for the wildcard agent. Deliberately conservative: an
 * unreadable or unparseable robots.txt means we do not fetch. Being wrong in the cautious
 * direction costs a price cell; being wrong the other way is a breach of someone's stated
 * wishes.
 */
export function isPathAllowed(robotsTxt: string, path: string): boolean {
  let applies = false;
  const rules: { allow: boolean; path: string }[] = [];

  for (const raw of robotsTxt.split("\n")) {
    const line = raw.split("#")[0]?.trim() ?? "";
    if (line === "") continue;
    const [field = "", ...rest] = line.split(":");
    const value = rest.join(":").trim();
    const name = field.trim().toLowerCase();

    if (name === "user-agent") applies = value === "*";
    else if (applies && (name === "allow" || name === "disallow")) {
      if (name === "disallow" && value === "") continue;
      rules.push({ allow: name === "allow", path: value });
    }
  }

  // Longest matching rule wins, allow breaking ties — the documented convention.
  let decision = true;
  let matched = -1;
  for (const rule of rules) {
    if (rule.path !== "" && path.startsWith(rule.path) && rule.path.length >= matched) {
      if (rule.path.length === matched && !rule.allow) continue;
      matched = rule.path.length;
      decision = rule.allow;
    }
  }
  return decision;
}

const MONEY = String.raw`\$\s?([0-9]+(?:\.[0-9]+)?)`;

/**
 * Anthropic's pricing page names a model and then states its two prices in a fixed order:
 * "Opus 5 ... Input $5 / MTok Output $25 / MTok". The anchor must be found first, and both
 * prices must appear within a short window of it, or nothing is returned.
 */
export function extractAnchoredMTokPrices(
  text: string,
  target: VendorTarget,
  windowChars = 220,
): Omit<PriceQuote, "source_url" | "fetched_at"> | null {
  const at = text.indexOf(target.anchor);
  if (at === -1) return null;

  const window = text.slice(
    at + target.anchor.length,
    at + target.anchor.length + windowChars,
  );
  const pattern = new RegExp(
    String.raw`Input\s*${MONEY}\s*/\s*MTok[\s\S]{0,80}?Output\s*${MONEY}\s*/\s*MTok`,
    "i",
  );
  const match = pattern.exec(window);
  if (!match?.[1] || !match[2]) return null;

  const input = Number.parseFloat(match[1]);
  const output = Number.parseFloat(match[2]);
  if (!Number.isFinite(input) || !Number.isFinite(output)) return null;

  return {
    price_input_per_mtok: input,
    price_output_per_mtok: output,
    // The page states a context window per plan rather than per model, so it is not read
    // here. OpenRouter supplies it, labelled.
    context_window: null,
  };
}

/**
 * The registry of scrapers. A creator is listed only when its page states prices in a form
 * that can be read without assuming anything — DeepSeek's table, for instance, splits peak
 * from off-peak and cache-hit from cache-miss, and picking one of those four to call "the"
 * price would be a guess, so it is absent and falls back to OpenRouter.
 */
export const VENDOR_SCRAPERS: VendorScraper[] = [
  {
    creator: "Anthropic",
    pricing_url: "https://www.anthropic.com/pricing",
    targets: [
      { model_id: "anthropic/claude-opus-5", anchor: "Opus 5" },
      { model_id: "anthropic/claude-sonnet-5", anchor: "Sonnet 5" },
      { model_id: "anthropic/claude-haiku-4.5", anchor: "Haiku 4.5" },
      { model_id: "anthropic/claude-fable-5.1", anchor: "Fable 5.1" },
    ],
    extract: extractAnchoredMTokPrices,
  },
];

export interface VendorScrapeFailure {
  creator: string;
  reason: string;
}

export interface VendorScrapeResult {
  prices: PriceTable;
  failures: VendorScrapeFailure[];
}

/**
 * One request per vendor per day, robots.txt honoured, no retries. Each vendor is
 * independent: one failing leaves the others alone and leaves its models to the fallback.
 */
export async function scrapeVendorPrices(
  now: string,
  fetcher: Fetcher = fetch,
  scrapers: readonly VendorScraper[] = VENDOR_SCRAPERS,
): Promise<VendorScrapeResult> {
  const prices: PriceTable = new Map();
  const failures: VendorScrapeFailure[] = [];

  for (const scraper of scrapers) {
    try {
      const url = new URL(scraper.pricing_url);
      const robots = await fetcher(`${url.origin}/robots.txt`);
      if (!robots.ok) {
        failures.push({
          creator: scraper.creator,
          reason: `robots.txt unreadable (${robots.status})`,
        });
        continue;
      }
      if (!isPathAllowed(await robots.text(), url.pathname)) {
        failures.push({
          creator: scraper.creator,
          reason: `robots.txt disallows ${url.pathname}`,
        });
        continue;
      }

      const response = await fetcher(scraper.pricing_url);
      if (!response.ok) {
        failures.push({
          creator: scraper.creator,
          reason: `page responded ${response.status}`,
        });
        continue;
      }

      const text = htmlToText(await response.text());
      const found: string[] = [];
      for (const target of scraper.targets) {
        const extracted = scraper.extract(text, target);
        if (extracted === null) continue;
        prices.set(target.model_id, {
          ...extracted,
          source_url: scraper.pricing_url,
          fetched_at: now,
        });
        found.push(target.model_id);
      }

      if (found.length === 0) {
        failures.push({
          creator: scraper.creator,
          reason: "page loaded but no anchor matched — the layout has probably changed",
        });
      }
    } catch (error) {
      failures.push({
        creator: scraper.creator,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { prices, failures };
}
