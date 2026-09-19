import { describe, expect, it } from "vitest";
import {
  buildCandidates,
  slugify,
  splitModelVersion,
  stripTier,
  indexesCleanly,
} from "@/lib/registry/candidates";
import type { SourceRow } from "@/lib/registry/candidates";
import type { RegistryModel } from "@/lib/schemas/model";

const registry: RegistryModel[] = [
  {
    model_id: "anthropic/claude-opus-5",
    display_name: "Claude Opus 5",
    creator: "Anthropic",
    modality: "text",
    released_at: "2026-07-24",
    open_weights: false,
    aliases: ["Claude Opus 5", "claude-opus-5"],
    variants: [{ variant: "base", aliases: ["claude-opus-5_unknown"] }],
  },
];

function row(over: Partial<SourceRow> = {}): SourceRow {
  return {
    model_version: "new-model",
    display_name: "New Model",
    organization: "ExampleCorp",
    release_date: "2026-01-01",
    benchmark: "GPQA",
    source_id: "epoch",
    ...over,
  };
}

describe("splitModelVersion", () => {
  it("reads a known tier suffix as the variant", () => {
    expect(splitModelVersion("claude-opus-5_max")).toMatchObject({
      stem: "claude-opus-5",
      variant: "max",
    });
  });

  it("treats _unknown and _none as base, the convention already in the registry", () => {
    expect(splitModelVersion("m_unknown").variant).toBe("base");
    expect(splitModelVersion("m_none").variant).toBe("base");
  });

  it("reads a token budget as a variant, not a separate model", () => {
    // Without this, one Claude 3.7 Sonnet arrives as nine models differing only in how
    // much room it was given to think.
    expect(splitModelVersion("claude-3-7-sonnet_16K")).toMatchObject({
      stem: "claude-3-7-sonnet",
      variant: "16k",
    });
  });

  it("keeps a parameter count in the name, because an 8B model is a different model", () => {
    expect(splitModelVersion("qwen3-8b").stem).toBe("qwen3-8b");
    expect(splitModelVersion("some-model_8B").stem).toBe("some-model_8B");
  });

  it("flags a suffix that looks like it swallowed part of the name", () => {
    expect(splitModelVersion("gpt-5.6-sol_promax")).toMatchObject({
      stem: "gpt-5.6-sol_promax",
      variant: "base",
      suspicious: true,
    });
  });

  it("leaves an unrecognised suffix inside the stem", () => {
    expect(splitModelVersion("model_experimental").stem).toBe("model_experimental");
  });
});

describe("stripTier and slugify", () => {
  it("strips a tier or budget marker but keeps a meaningful parenthetical", () => {
    expect(stripTier("Claude Opus 5 (Max)")).toBe("Claude Opus 5");
    expect(stripTier("Claude 3.7 (16K)")).toBe("Claude 3.7");
    expect(stripTier("Llama 3 (Instruct)")).toBe("Llama 3 (Instruct)");
  });

  it("keeps dots, matching the ids already in the registry", () => {
    expect(slugify("Claude Haiku 4.5")).toBe("claude-haiku-4.5");
  });
});

describe("buildCandidates", () => {
  it("proposes an entry with a base variant and the creator from the source", () => {
    const [candidate] = buildCandidates({
      rows: [row(), row({ benchmark: "MMLU" })],
      registry,
    });
    expect(candidate?.proposed.creator).toBe("ExampleCorp");
    expect(candidate?.proposed.variants.some((v) => v.variant === "base")).toBe(true);
    expect(candidate?.proposed.model_id).toBe("examplecorp/new-model");
  });

  it("never guesses open_weights, which no source states", () => {
    const [candidate] = buildCandidates({ rows: [row()], registry });
    expect(candidate?.proposed.open_weights).toBeNull();
  });

  it("skips a model the registry already resolves", () => {
    const candidates = buildCandidates({
      rows: [
        row({ model_version: "claude-opus-5_max", display_name: "Claude Opus 5 (Max)" }),
      ],
      registry,
    });
    expect(candidates).toHaveLength(0);
  });

  it("demotes a model whose creator the sources disagree about", () => {
    const candidates = buildCandidates({
      rows: [row(), row({ organization: "OtherCorp" })],
      registry,
    });
    expect(candidates[0]?.confidence).toBe("low");
  });

  it("keeps an ancient model out of the high tier", () => {
    const candidates = buildCandidates({
      rows: [row({ release_date: "2020-06-01", model_version: "ada" })],
      registry,
    });
    expect(candidates[0]?.confidence).toBe("low");
  });

  it("demotes a model measured only on benchmarks this site cannot join", () => {
    // Accurate and useless: approving it would add no scores at all.
    const candidates = buildCandidates({
      rows: [row({ benchmark: "DTBench" }), row({ benchmark: "LMCA" })],
      registry,
      resolvableBenchmarks: new Set(["GPQA"]),
    });
    expect(candidates[0]?.confidence).toBe("low");
    expect(candidates[0]?.evidence.benchmarks_resolvable).toBe(0);
  });

  it("does not let a display name claim both the model and a tier", () => {
    // "Claude Fable 5" on a _max row names the model, not the max tier; claiming both is
    // an ambiguous alias the registry index rightly refuses.
    const candidates = buildCandidates({
      rows: [
        row({ model_version: "fable_max", display_name: "Fable" }),
        row({ model_version: "fable_high", display_name: "Fable", benchmark: "MMLU" }),
      ],
      registry,
    });
    expect(
      indexesCleanly(
        registry,
        candidates.map((c) => c.proposed),
      ).ok,
    ).toBe(true);
  });

  it("flags two stems that collapse to one id rather than merging them", () => {
    const candidates = buildCandidates({
      rows: [
        row({ model_version: "Qwen3-235B", organization: "Alibaba" }),
        row({ model_version: "qwen3-235b", organization: "Alibaba", benchmark: "MMLU" }),
      ],
      registry,
    });
    expect(candidates.some((c) => c.confidence === "conflict")).toBe(true);
  });

  it("produces candidates that index cleanly alongside the registry", () => {
    const candidates = buildCandidates({
      rows: [
        row(),
        row({ model_version: "other", display_name: "Other", benchmark: "MMLU" }),
      ],
      registry,
    });
    expect(
      indexesCleanly(
        registry,
        candidates.filter((c) => c.confidence !== "conflict").map((c) => c.proposed),
      ).ok,
    ).toBe(true);
  });
});
