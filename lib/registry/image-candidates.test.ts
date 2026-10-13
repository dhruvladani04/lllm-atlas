import { describe, expect, it } from "vitest";
import {
  buildImageCandidates,
  openWeightsFromLicence,
} from "@/lib/registry/image-candidates";
import type { ArenaEvidenceRow } from "@/lib/registry/image-candidates";
import { indexesCleanly } from "@/lib/registry/candidates";
import type { RegistryModel } from "@/lib/schemas/model";

const registry: RegistryModel[] = [
  {
    model_id: "openai/gpt-image-1",
    display_name: "GPT Image 1",
    creator: "OpenAI",
    modality: "image",
    released_at: null,
    open_weights: false,
    aliases: ["GPT Image 1", "gpt-image-1"],
    variants: [{ variant: "base", aliases: ["gpt-image-1"] }],
  },
];

function row(over: Partial<ArenaEvidenceRow> = {}): ArenaEvidenceRow {
  return {
    model: "some-image-model",
    vendor: "openai",
    license: "Proprietary",
    votes: 5000,
    ...over,
  };
}

describe("openWeightsFromLicence", () => {
  it("reads Proprietary as closed weights", () => {
    expect(openWeightsFromLicence("Proprietary")).toBe(false);
  });

  it("reads any other named licence as released weights, permissive or not", () => {
    // A non-commercial licence restricts use, not availability.
    expect(openWeightsFromLicence("Apache 2.0")).toBe(true);
    expect(openWeightsFromLicence("flux-non-commercial-license")).toBe(true);
  });

  it("stays unknown when no licence is stated", () => {
    expect(openWeightsFromLicence(null)).toBeNull();
    expect(openWeightsFromLicence("")).toBeNull();
  });
});

describe("buildImageCandidates", () => {
  it("proposes an image model with the creator name the registry uses", () => {
    const [candidate] = buildImageCandidates({ rows: [row({ vendor: "bfl" })], registry });
    expect(candidate?.proposed).toMatchObject({
      model_id: "black-forest-labs/some-image-model",
      creator: "Black Forest Labs",
      modality: "image",
      open_weights: false,
    });
    expect(candidate?.confidence).toBe("high");
  });

  it("skips a model the registry already resolves", () => {
    expect(
      buildImageCandidates({ rows: [row({ model: "gpt-image-1" })], registry }),
    ).toHaveLength(0);
  });

  it("treats a recognised tier in parentheses as a variant of one model", () => {
    const candidates = buildImageCandidates({
      rows: [row({ model: "gpt-image-2 (medium)" })],
      registry,
    });
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.proposed.model_id).toBe("openai/gpt-image-2");
    expect(candidates[0]?.proposed.variants.map((v) => v.variant)).toEqual([
      "base",
      "medium",
    ]);
  });

  it("keeps a parenthetical that is part of the name", () => {
    // "(nano-banana-2)" is a codename, not a tier; splitting on it would merge models.
    const [candidate] = buildImageCandidates({
      rows: [row({ model: "gemini-flash-image (nano-banana-2)", vendor: "google" })],
      registry,
    });
    expect(candidate?.proposed.variants).toHaveLength(1);
    expect(candidate?.proposed.aliases).toContain("gemini-flash-image (nano-banana-2)");
  });

  it("holds a model with no vendor out of the approvable tiers", () => {
    const [candidate] = buildImageCandidates({ rows: [row({ vendor: "" })], registry });
    expect(candidate?.confidence).toBe("low");
    expect(candidate?.proposed.creator).toBe("Unknown");
  });

  it("does not guess a creator name for a vendor slug it has no entry for", () => {
    const [candidate] = buildImageCandidates({
      rows: [row({ vendor: "brand-new-lab" })],
      registry,
    });
    expect(candidate?.confidence).toBe("medium");
    expect(candidate?.proposed.creator).toBe("brand-new-lab");
  });

  it("flags an id another candidate in the same run already produced", () => {
    const [candidate] = buildImageCandidates({
      rows: [row()],
      registry,
      takenIds: new Set(["openai/some-image-model"]),
    });
    expect(candidate?.confidence).toBe("conflict");
  });

  it("produces entries that index cleanly, each variant carrying an alias", () => {
    const candidates = buildImageCandidates({
      rows: [row(), row({ model: "other-model", vendor: "reve" }), row({ model: "x (high)" })],
      registry,
    });
    const proposed = candidates.map((candidate) => candidate.proposed);
    expect(indexesCleanly(registry, proposed).ok).toBe(true);
    for (const model of proposed) {
      for (const variant of model.variants) expect(variant.aliases.length).toBeGreaterThan(0);
    }
  });
});
