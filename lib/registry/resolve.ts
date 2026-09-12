import type { RegistryModel } from "@/lib/schemas/model";

/**
 * specs/01-architecture/model-registry.md — model identity.
 *
 * Resolution rules, in order:
 *   1. Exact match on `model_id` wins.
 *   2. Exact match on an alias wins.
 *   3. Case-insensitive and punctuation-normalised alias match wins.
 *   4. Nothing else resolves.
 *
 * There is no fuzzy matching here, and there must never be one. A wrong match is
 * invisible; a missing match is visible. The visible failure is the one we want.
 */

export const BASE_VARIANT = "base";

export type ResolutionMatch = "model_id" | "alias" | "normalised-alias";

export type Resolution =
  | { resolved: true; model_id: string; variant: string; matched_on: ResolutionMatch }
  | { resolved: false; name: string };

interface Target {
  model_id: string;
  variant: string;
}

export interface RegistryIndex {
  readonly models: ReadonlyMap<string, RegistryModel>;
  readonly exact: ReadonlyMap<string, Target>;
  readonly normalised: ReadonlyMap<string, Target>;
}

export class RegistryConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegistryConflictError";
  }
}

/**
 * Lowercase, and collapse runs of punctuation into a single space, except `+`, which is
 * expanded to the word rather than dropped. Deliberately conservative: `claude-opus-5` and
 * `Claude Opus 5` normalise together, but `claudeopus5` does not join them. Removing
 * separators entirely would merge `gpt-4.1` with `gpt-41`, and a silent merge is the
 * failure mode this whole file exists to prevent.
 */
export function normaliseName(name: string): string {
  return (
    name
      .toLowerCase()
      // "+" is semantic in this domain, not punctuation: HumanEval+ is a different
      // benchmark from HumanEval, and collapsing it would merge the two silently.
      .replace(/\+/g, " plus ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
  );
}

function sameTarget(a: Target, b: Target): boolean {
  return a.model_id === b.model_id && a.variant === b.variant;
}

function describe(target: Target): string {
  return `${target.model_id}#${target.variant}`;
}

function claim(
  map: Map<string, Target>,
  key: string,
  target: Target,
  kind: "alias" | "normalised alias",
): void {
  const existing = map.get(key);
  if (existing && !sameTarget(existing, target)) {
    throw new RegistryConflictError(
      `${kind} "${key}" is claimed by both ${describe(existing)} and ${describe(target)}. ` +
        `Resolve it in data/registry/models.json — an ambiguous alias cannot be matched safely.`,
    );
  }
  map.set(key, target);
}

/**
 * Builds the lookup index, failing loudly on any ambiguity. A registry that cannot be
 * indexed is a registry that would silently mis-resolve, so this throws rather than
 * picking a winner.
 */
export function buildRegistryIndex(models: readonly RegistryModel[]): RegistryIndex {
  const byModelId = new Map<string, RegistryModel>();
  const exact = new Map<string, Target>();
  const normalised = new Map<string, Target>();

  for (const model of models) {
    if (byModelId.has(model.model_id)) {
      throw new RegistryConflictError(`duplicate model_id "${model.model_id}"`);
    }
    byModelId.set(model.model_id, model);

    const variantNames = new Set<string>();
    for (const variant of model.variants) {
      if (variantNames.has(variant.variant)) {
        throw new RegistryConflictError(
          `model "${model.model_id}" declares variant "${variant.variant}" twice`,
        );
      }
      variantNames.add(variant.variant);
    }
    if (!variantNames.has(BASE_VARIANT)) {
      throw new RegistryConflictError(
        `model "${model.model_id}" has no "${BASE_VARIANT}" variant. Every model needs one: ` +
          `it is what a source reporting no variant resolves to.`,
      );
    }

    // Model-level aliases name the model without naming a tier, so they mean `base`.
    const baseTarget: Target = { model_id: model.model_id, variant: BASE_VARIANT };
    for (const alias of model.aliases) {
      claim(exact, alias, baseTarget, "alias");
      claim(normalised, normaliseName(alias), baseTarget, "normalised alias");
    }

    for (const variant of model.variants) {
      const target: Target = { model_id: model.model_id, variant: variant.variant };
      for (const alias of variant.aliases) {
        claim(exact, alias, target, "alias");
        claim(normalised, normaliseName(alias), target, "normalised alias");
      }
    }
  }

  for (const model_id of byModelId.keys()) {
    const claimed = exact.get(model_id);
    if (claimed && claimed.model_id !== model_id) {
      throw new RegistryConflictError(
        `model_id "${model_id}" is also an alias of ${describe(claimed)}`,
      );
    }
  }

  return { models: byModelId, exact, normalised };
}

export function resolveModelName(index: RegistryIndex, rawName: string): Resolution {
  const name = rawName.trim();
  if (name === "") return { resolved: false, name: rawName };

  if (index.models.has(name)) {
    return {
      resolved: true,
      model_id: name,
      variant: BASE_VARIANT,
      matched_on: "model_id",
    };
  }

  const exact = index.exact.get(name);
  if (exact) {
    return {
      resolved: true,
      model_id: exact.model_id,
      variant: exact.variant,
      matched_on: "alias",
    };
  }

  const normalised = index.normalised.get(normaliseName(name));
  if (normalised) {
    return {
      resolved: true,
      model_id: normalised.model_id,
      variant: normalised.variant,
      matched_on: "normalised-alias",
    };
  }

  return { resolved: false, name };
}
