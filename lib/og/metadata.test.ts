import { describe, expect, it } from "vitest";
import { loadRegistry } from "@/lib/registry/load";
import { quotableScore, shareMetadata } from "@/lib/og/metadata";
import type { JoinedScore } from "@/lib/schemas/score";

const score = (overrides: Partial<JoinedScore>): JoinedScore =>
  ({
    model_id: "a/m",
    variant: "base",
    value: 50,
    unit: "percent",
    provenance: "independent",
    benchmark: { name: "B", status: "active" },
    ...overrides,
  }) as JoinedScore;

describe("model preview images", () => {
  it("can address every model: each id is exactly <creator>/<model>", () => {
    // The image route is /og/models/[creator]/[model]; a third segment would 404.
    for (const model of loadRegistry()) expect(model.model_id.split("/")).toHaveLength(2);
  });

  it("quote only an independent percentage on a benchmark that still discriminates", () => {
    const best = quotableScore([
      score({
        value: 99,
        benchmark: { name: "Old", status: "saturated" } as JoinedScore["benchmark"],
      }),
      score({ value: 95, provenance: "vendor-reported" }),
      score({ value: 1400, unit: "elo" }),
      score({ value: 70 }),
      score({ value: 60 }),
    ]);
    expect(best?.value).toBe(70);
    expect(quotableScore([score({ provenance: "vendor-reported" })])).toBeUndefined();
  });

  it("restate the whole Open Graph block, image included", () => {
    const meta = shareMetadata({
      title: "T",
      description: "D",
      path: "/x",
      image: "/og/site",
      alt: "A",
    });
    expect(meta.openGraph).toMatchObject({
      title: "T",
      url: "/x",
      siteName: "LLM Atlas",
    });
    expect(meta.twitter).toMatchObject({ card: "summary_large_image" });
  });
});
