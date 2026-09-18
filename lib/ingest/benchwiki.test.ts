import { describe, expect, it } from "vitest";
import { benchwikiRecord, timelinePoint } from "@/lib/ingest/fixtures";
import {
  benchwikiCanonicalUrl,
  normaliseLanguages,
  toBenchmark,
  toIsoDate,
} from "@/lib/ingest/benchwiki";
import { buildRegistryIndex, resolveModelName } from "@/lib/registry/resolve";
import { loadRegistry } from "@/lib/registry/load";

const index = buildRegistryIndex(loadRegistry());
const resolve = (name: string) => {
  const resolution = resolveModelName(index, name);
  return resolution.resolved ? resolution.model_id : null;
};

describe("toBenchmark", () => {
  it("lifts metric.primary and metric.judge_model to the top level", () => {
    const mapped = toBenchmark(
      benchwikiRecord({
        metric: {
          primary: "pass@1",
          scoring: "exact-match",
          judge_model: "gpt-4o-as-judge",
        },
      }),
    );
    expect(mapped.metric_primary).toBe("pass@1");
    expect(mapped.judge_model).toBe("gpt-4o-as-judge");
  });

  it("derives the canonical benchwiki URL from the slug", () => {
    expect(toBenchmark(benchwikiRecord()).source_url).toBe(
      "https://benchwiki.vercel.app/benchmarks/examplebench",
    );
    expect(benchwikiCanonicalUrl("arc-agi")).toBe(
      "https://benchwiki.vercel.app/benchmarks/arc-agi",
    );
  });

  it("trims upstream midnight datetimes to calendar dates", () => {
    const mapped = toBenchmark(
      benchwikiRecord({ saturated_date: "2024-06-01T00:00:00.000Z" }),
    );
    expect(mapped.launch_date).toBe("2024-01-15");
    expect(mapped.saturated_date).toBe("2024-06-01");
    expect(mapped.last_updated).toBe("2026-09-01");
  });

  it("keeps a null date null rather than substituting a value", () => {
    expect(toBenchmark(benchwikiRecord()).saturated_date).toBeNull();
  });

  it("refuses a date it cannot parse instead of passing it downstream", () => {
    expect(() => toIsoDate("sometime in 2024")).toThrow(TypeError);
  });

  it("annotates a timeline point with a resolved model id", () => {
    const mapped = toBenchmark(
      benchwikiRecord({
        performance_timeline: [timelinePoint({ model: "DeepSeek-V3" })],
      }),
      resolve,
    );
    expect(mapped.performance_timeline[0]).toMatchObject({
      model: "DeepSeek-V3",
      model_id: "deepseek/deepseek-v3",
      measured_at: "2026-02-01",
      provenance: "independent",
    });
  });

  it("keeps an unresolvable point, reporting the upstream name and a null id", () => {
    // The point is benchmark metadata, not a score row: dropping it would distort the
    // benchmark's own trajectory. The site simply does not claim to know the model.
    const mapped = toBenchmark(
      benchwikiRecord({ performance_timeline: [timelinePoint({ model: "PaLM 2-L" })] }),
      resolve,
    );
    expect(mapped.performance_timeline[0]).toMatchObject({
      model: "PaLM 2-L",
      model_id: null,
    });
  });
});

describe("normaliseLanguages", () => {
  it("merges the same language spelled two ways", () => {
    expect(normaliseLanguages(["cpp", "c-plus-plus"])).toEqual(["c-plus-plus"]);
  });

  it("leaves a category that is not a language alone", () => {
    // "code" and "multilingual" are the honest answer for a benchmark spanning many
    // languages; folding them into a specific one would invent a fact.
    expect(normaliseLanguages(["code", "multilingual"])).toEqual(["code", "multilingual"]);
  });

  it("is case and whitespace insensitive, and deduplicates", () => {
    expect(normaliseLanguages([" Python ", "py", "PYTHON"])).toEqual(["python"]);
  });

  it("drops empty entries rather than emitting a blank filter option", () => {
    expect(normaliseLanguages(["", "  ", "go"])).toEqual(["go"]);
  });
});
