import { describe, expect, it } from "vitest";
import {
  BASE_VARIANT,
  RegistryConflictError,
  buildRegistryIndex,
  normaliseName,
  resolveModelName,
} from "@/lib/registry/resolve";
import type { RegistryModel } from "@/lib/schemas/model";

/**
 * The fixture is the example from specs/01-architecture/model-registry.md: a model whose
 * effort tier is a separate variant, because an effort variant can score very differently
 * from its base model and merging them silently produces a wrong number with no error
 * anywhere.
 */
const OPUS: RegistryModel = {
  model_id: "anthropic/claude-opus-5",
  display_name: "Claude Opus 5",
  creator: "Anthropic",
  modality: "text",
  released_at: "2026-01-15",
  open_weights: false,
  aliases: ["claude-opus-5", "Claude Opus 5", "claude-opus-5-20260115"],
  variants: [
    { variant: "base", aliases: ["Claude Opus 5"] },
    { variant: "high", aliases: ["Claude Opus 5 (high)", "claude-opus-5-high"] },
  ],
};

const SONNET: RegistryModel = {
  model_id: "anthropic/claude-sonnet-5",
  display_name: "Claude Sonnet 5",
  creator: "Anthropic",
  modality: "text",
  released_at: null,
  open_weights: false,
  aliases: ["claude-sonnet-5", "Claude Sonnet 5"],
  variants: [{ variant: "base", aliases: ["Claude Sonnet 5"] }],
};

const index = buildRegistryIndex([OPUS, SONNET]);

function resolve(name: string) {
  return resolveModelName(index, name);
}

describe("rule 1 — exact model_id", () => {
  it("resolves the canonical id to the base variant", () => {
    expect(resolve("anthropic/claude-opus-5")).toEqual({
      resolved: true,
      model_id: "anthropic/claude-opus-5",
      variant: BASE_VARIANT,
      matched_on: "model_id",
    });
  });
});

describe("rule 2 — exact alias", () => {
  it("resolves a model-level alias to the base variant", () => {
    expect(resolve("claude-opus-5-20260115")).toMatchObject({
      resolved: true,
      model_id: "anthropic/claude-opus-5",
      variant: BASE_VARIANT,
      matched_on: "alias",
    });
  });

  it("resolves a variant alias to that variant", () => {
    expect(resolve("Claude Opus 5 (high)")).toMatchObject({
      resolved: true,
      model_id: "anthropic/claude-opus-5",
      variant: "high",
      matched_on: "alias",
    });
  });
});

describe("rule 3 — normalised alias", () => {
  it("ignores case and punctuation differences", () => {
    expect(resolve("CLAUDE_OPUS_5")).toMatchObject({
      resolved: true,
      model_id: "anthropic/claude-opus-5",
      variant: BASE_VARIANT,
      matched_on: "normalised-alias",
    });
  });

  it("normalises a variant alias to its own variant, not to base", () => {
    expect(resolve("claude opus 5 high")).toMatchObject({
      variant: "high",
      matched_on: "normalised-alias",
    });
  });

  it("collapses punctuation to a separator rather than deleting it", () => {
    expect(normaliseName("Claude-Opus_5")).toBe("claude opus 5");
    expect(normaliseName("anthropic/claude-opus-5")).toBe("anthropic claude opus 5");
  });
});

describe("rule 4 — nothing else resolves", () => {
  it("keeps a base model and its effort variant apart", () => {
    const base = resolve("Claude Opus 5");
    const high = resolve("Claude Opus 5 (high)");
    expect(base).toMatchObject({ resolved: true, variant: "base" });
    expect(high).toMatchObject({ resolved: true, variant: "high" });
    expect(base).not.toEqual(high);
  });

  it("refuses a near miss rather than guessing", () => {
    // One character away from a real alias. Edit distance would resolve this; we must not.
    expect(resolve("claude-opus-6")).toEqual({ resolved: false, name: "claude-opus-6" });
  });

  it("refuses a substring of a real alias", () => {
    expect(resolve("Claude Opus")).toEqual({ resolved: false, name: "Claude Opus" });
  });

  it("refuses a superstring of a real alias", () => {
    expect(resolve("Claude Opus 5 Turbo")).toMatchObject({ resolved: false });
  });

  it("refuses an unknown creator's model", () => {
    expect(resolve("gpt-5")).toEqual({ resolved: false, name: "gpt-5" });
  });

  it("refuses an empty or whitespace name", () => {
    expect(resolve("   ")).toMatchObject({ resolved: false });
  });

  it("does not confuse two models from the same creator", () => {
    expect(resolve("Claude Sonnet 5")).toMatchObject({
      model_id: "anthropic/claude-sonnet-5",
    });
  });
});

describe("ambiguity fails loudly at index time", () => {
  it("rejects one alias claimed by two models", () => {
    const clash: RegistryModel = { ...SONNET, aliases: ["claude-opus-5"] };
    expect(() => buildRegistryIndex([OPUS, clash])).toThrow(RegistryConflictError);
  });

  it("rejects two aliases that normalise to the same string", () => {
    const clash: RegistryModel = { ...SONNET, aliases: ["Claude Opus-5"] };
    expect(() => buildRegistryIndex([OPUS, clash])).toThrow(/normalised alias/);
  });

  it("rejects a duplicate model_id", () => {
    expect(() => buildRegistryIndex([OPUS, { ...OPUS, aliases: [] }])).toThrow(
      /duplicate model_id/,
    );
  });

  it("rejects a model with no base variant", () => {
    const noBase: RegistryModel = {
      ...SONNET,
      variants: [{ variant: "high", aliases: ["Claude Sonnet 5 (high)"] }],
    };
    expect(() => buildRegistryIndex([noBase])).toThrow(/base/);
  });
});
