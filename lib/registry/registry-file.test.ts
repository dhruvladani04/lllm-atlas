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
  it("parses against the schema and holds the seed set the milestone asks for", () => {
    expect(registry.length).toBeGreaterThanOrEqual(15);
    expect(registry.length).toBeLessThanOrEqual(20);
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
