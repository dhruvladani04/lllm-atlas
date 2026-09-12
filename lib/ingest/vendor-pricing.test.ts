import { describe, expect, it } from "vitest";
import {
  extractAnchoredMTokPrices,
  htmlToText,
  isPathAllowed,
  scrapeVendorPrices,
  type VendorScraper,
} from "@/lib/ingest/vendor-pricing";

/**
 * The scraper is the most fragile source in the project, so its failure path matters more
 * than its success path: a misparsed price shown as a vendor list price is worse than a
 * visible gap, and worse than falling back to a labelled OpenRouter price.
 */

const PAGE = `
<html><body>
  <h2>Opus 5</h2><p>Ideal for complex agentic work</p>
  <span>Input</span> <span>$5 / MTok</span> <span>Output</span> <span>$25 / MTok</span>
  <h2>Sonnet 5</h2>
  <span>Input</span> <span>$2 / MTok</span> <span>Output</span> <span>$10 / MTok</span>
</body></html>`;

describe("isPathAllowed", () => {
  it("allows a path no rule mentions", () => {
    expect(isPathAllowed("User-agent: *\nDisallow: /admin/", "/pricing")).toBe(true);
  });

  it("refuses a disallowed path", () => {
    expect(isPathAllowed("User-agent: *\nDisallow: /pricing", "/pricing")).toBe(false);
  });

  it("ignores rules aimed at another agent", () => {
    expect(isPathAllowed("User-agent: GPTBot\nDisallow: /\n", "/pricing")).toBe(true);
  });

  it("treats an empty Disallow as permission, per the convention", () => {
    expect(isPathAllowed("User-agent: *\nDisallow:", "/pricing")).toBe(true);
  });

  it("lets a longer Allow override a broad Disallow", () => {
    const robots = "User-agent: *\nDisallow: /\nAllow: /pricing";
    expect(isPathAllowed(robots, "/pricing")).toBe(true);
    expect(isPathAllowed(robots, "/internal")).toBe(false);
  });

  it("ignores comments", () => {
    expect(isPathAllowed("User-agent: *\n# Disallow: /pricing\n", "/pricing")).toBe(true);
  });
});

describe("extractAnchoredMTokPrices", () => {
  const text = htmlToText(PAGE);

  it("reads both prices stated after a model's name", () => {
    expect(extractAnchoredMTokPrices(text, { model_id: "x", anchor: "Opus 5" })).toEqual({
      price_input_per_mtok: 5,
      price_output_per_mtok: 25,
      context_window: null,
    });
  });

  it("does not bleed one model's prices onto another", () => {
    expect(
      extractAnchoredMTokPrices(text, { model_id: "x", anchor: "Sonnet 5" }),
    ).toMatchObject({
      price_input_per_mtok: 2,
      price_output_per_mtok: 10,
    });
  });

  it("returns nothing when the model is not on the page", () => {
    expect(
      extractAnchoredMTokPrices(text, { model_id: "x", anchor: "Haiku 9" }),
    ).toBeNull();
  });

  it("returns nothing when only one of the two prices is present", () => {
    const partial = htmlToText("<p>Opus 5 Input $5 / MTok</p>");
    expect(
      extractAnchoredMTokPrices(partial, { model_id: "x", anchor: "Opus 5" }),
    ).toBeNull();
  });

  it("refuses a price that is too far from the anchor to be its own", () => {
    const distant = htmlToText(
      `<p>Opus 5</p>${"<p>filler text </p>".repeat(60)}<p>Input $5 / MTok Output $25 / MTok</p>`,
    );
    expect(
      extractAnchoredMTokPrices(distant, { model_id: "x", anchor: "Opus 5" }),
    ).toBeNull();
  });
});

describe("scrapeVendorPrices", () => {
  const scraper: VendorScraper = {
    creator: "ExampleCorp",
    pricing_url: "https://example.invalid/pricing",
    targets: [{ model_id: "example/model-1", anchor: "Opus 5" }],
    extract: extractAnchoredMTokPrices,
  };

  const respond =
    (robots: string, page: string, pageStatus = 200) =>
    async (url: string) =>
      url.endsWith("/robots.txt")
        ? new Response(robots, { status: 200 })
        : new Response(page, { status: pageStatus });

  it("reads prices when robots.txt permits", async () => {
    const result = await scrapeVendorPrices(
      "2026-09-12T06:00:00.000Z",
      respond("User-agent: *\nDisallow: /admin", PAGE),
      [scraper],
    );
    expect(result.prices.get("example/model-1")).toMatchObject({
      price_input_per_mtok: 5,
      source_url: "https://example.invalid/pricing",
    });
    expect(result.failures).toEqual([]);
  });

  it("does not fetch a page robots.txt disallows", async () => {
    const seen: string[] = [];
    const result = await scrapeVendorPrices(
      "2026-09-12T06:00:00.000Z",
      async (url) => {
        seen.push(url);
        return url.endsWith("/robots.txt")
          ? new Response("User-agent: *\nDisallow: /pricing", { status: 200 })
          : new Response(PAGE, { status: 200 });
      },
      [scraper],
    );
    expect(seen).toEqual(["https://example.invalid/robots.txt"]);
    expect(result.prices.size).toBe(0);
    expect(result.failures[0]?.reason).toContain("disallows");
  });

  it("treats an unreadable robots.txt as a refusal", async () => {
    const result = await scrapeVendorPrices(
      "2026-09-12T06:00:00.000Z",
      async (url) =>
        url.endsWith("/robots.txt")
          ? new Response("", { status: 500 })
          : new Response(PAGE, { status: 200 }),
      [scraper],
    );
    expect(result.prices.size).toBe(0);
  });

  it("reports a layout change instead of emitting a partial price", async () => {
    const result = await scrapeVendorPrices(
      "2026-09-12T06:00:00.000Z",
      respond("User-agent: *\n", "<html><body><p>Pricing has moved</p></body></html>"),
      [scraper],
    );
    expect(result.prices.size).toBe(0);
    expect(result.failures[0]?.reason).toContain("layout has probably changed");
  });

  it("leaves one vendor's failure to that vendor alone", async () => {
    const other: VendorScraper = {
      ...scraper,
      creator: "OtherCorp",
      pricing_url: "https://other.invalid/pricing",
    };
    const result = await scrapeVendorPrices(
      "2026-09-12T06:00:00.000Z",
      async (url) => {
        if (url.startsWith("https://other.invalid")) throw new Error("connection reset");
        return url.endsWith("/robots.txt")
          ? new Response("User-agent: *\n", { status: 200 })
          : new Response(PAGE, { status: 200 });
      },
      [scraper, other],
    );
    expect(result.prices.size).toBe(1);
    expect(result.failures.map((f) => f.creator)).toEqual(["OtherCorp"]);
  });
});
