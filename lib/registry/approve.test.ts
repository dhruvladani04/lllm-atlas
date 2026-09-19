import { describe, expect, it } from "vitest";
import { ApprovalError, mergeApproved } from "@/lib/registry/approve";
import type { Candidate } from "@/lib/schemas/candidate";
import type { RegistryModel } from "@/lib/schemas/model";

const registry: RegistryModel[] = [
  {
    model_id: "anthropic/claude-opus-5",
    display_name: "Claude Opus 5",
    creator: "Anthropic",
    modality: "text",
    released_at: "2026-07-24",
    open_weights: false,
    aliases: ["Claude Opus 5"],
    variants: [{ variant: "base", aliases: ["claude-opus-5"] }],
  },
];

function candidate(
  over: Partial<Candidate["proposed"]> = {},
  confidence = "high",
): Candidate {
  return {
    proposed: {
      model_id: "examplecorp/new-model",
      display_name: "New Model",
      creator: "ExampleCorp",
      modality: "text",
      released_at: "2026-01-01",
      open_weights: null,
      aliases: ["New Model"],
      variants: [{ variant: "base", aliases: ["new-model"] }],
      ...over,
    },
    confidence: confidence as Candidate["confidence"],
    evidence: {
      stem: "new-model",
      sources: ["epoch"],
      organizations: ["ExampleCorp"],
      release_dates: ["2026-01-01"],
      benchmarks: [{ benchmark: "GPQA", rows: 1 }],
      benchmarks_resolvable: 1,
      total_occurrences: 1,
      raw_model_versions: ["new-model"],
      raw_display_names: ["New Model"],
      openrouter: null,
      dropped_aliases: [],
      reasons: [],
    },
  };
}

describe("mergeApproved", () => {
  it("adds an approved candidate and keeps the registry sorted", () => {
    const result = mergeApproved(registry, [candidate()], ["examplecorp/new-model"]);
    expect(result.added).toEqual(["examplecorp/new-model"]);
    expect(result.registry).toHaveLength(2);
    expect(result.registry.map((m) => m.model_id)).toEqual([
      "anthropic/claude-opus-5",
      "examplecorp/new-model",
    ]);
  });

  it("adds nothing when nothing is approved", () => {
    expect(mergeApproved(registry, [candidate()], []).registry).toHaveLength(1);
  });

  it("refuses a candidate marked conflict", () => {
    // These are merge decisions; a merge made by a script is the wrong-merge risk the
    // registry spec refuses to automate.
    expect(() =>
      mergeApproved(registry, [candidate({}, "conflict")], ["examplecorp/new-model"]),
    ).toThrow(ApprovalError);
  });

  it("refuses an id that is not a candidate at all", () => {
    expect(() => mergeApproved(registry, [candidate()], ["nope/nope"])).toThrow(
      ApprovalError,
    );
  });

  it("refuses to add a model the registry already has", () => {
    expect(() =>
      mergeApproved(
        registry,
        [candidate({ model_id: "anthropic/claude-opus-5" })],
        ["anthropic/claude-opus-5"],
      ),
    ).toThrow(ApprovalError);
  });

  it("refuses a merge that would make an alias ambiguous", () => {
    // The registry must still index afterwards, or scores start resolving to the wrong model.
    expect(() =>
      mergeApproved(
        registry,
        [candidate({ aliases: ["Claude Opus 5"] })],
        ["examplecorp/new-model"],
      ),
    ).toThrow();
  });
});
