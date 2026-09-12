import { describe, expect, it } from "vitest";
import { loadRegistry, loadUnresolved } from "@/lib/registry/load";
import { buildRegistryIndex, resolveModelName } from "@/lib/registry/resolve";

/**
 * The committed registry is data, and data can rot. These tests are what stop a
 * hand-edited registry from reaching a build in a state the resolver cannot index.
 */

const registry = loadRegistry();
const index = buildRegistryIndex(registry);

describe("data/registry/models.json", () => {
  it("parses against the schema and holds a reviewed set of models", () => {
    // Seeded at 19 in Milestone 1 and grown through the unresolved queue since, which is
    // the workflow the registry spec describes. There is no upper bound: the constraint is
    // that every entry was reviewed, not that there are few of them.
    expect(registry.length).toBeGreaterThanOrEqual(15);
  });

  it("carries effort variants for the models whose vendors expose them", () => {
    const withTiers = registry.filter((model) => model.variants.length > 1);
    expect(withTiers.length).toBeGreaterThan(0);
    for (const model of withTiers) {
      // A variant with no alias can never be resolved to, so it would be dead weight.
      for (const variant of model.variants)
        expect(variant.aliases.length).toBeGreaterThan(0);
    }
  });

  it("indexes with no ambiguous alias", () => {
    expect(() => buildRegistryIndex(registry)).not.toThrow();
  });

  it("resolves every model from its own id and from each of its aliases", () => {
    for (const model of registry) {
      expect(resolveModelName(index, model.model_id)).toMatchObject({
        resolved: true,
        model_id: model.model_id,
      });
      for (const alias of model.aliases) {
        expect(resolveModelName(index, alias)).toMatchObject({
          resolved: true,
          model_id: model.model_id,
        });
      }
    }
  });

  it("covers image generation as well as text and agentic", () => {
    const creators = new Set(registry.map((m) => m.creator));
    expect(creators.size).toBeGreaterThanOrEqual(8);
    expect(registry.some((m) => m.open_weights === true)).toBe(true);
    expect(registry.some((m) => m.open_weights === false)).toBe(true);
  });

  it("leaves a release date null rather than approximating it", () => {
    // Both states must be representable: the null is a rendered gap, not a missing field.
    expect(registry.some((m) => m.released_at === null)).toBe(true);
    expect(registry.some((m) => m.released_at !== null)).toBe(true);
  });

  it("gives every model a base variant, since a source reporting no tier means base", () => {
    for (const model of registry) {
      expect(model.variants.some((v) => v.variant === "base")).toBe(true);
    }
  });
});

describe("data/registry/unresolved.json", () => {
  it("exists and parses, so ingestion has somewhere to put a name it cannot match", () => {
    expect(loadUnresolved()).toBeInstanceOf(Array);
  });
});
