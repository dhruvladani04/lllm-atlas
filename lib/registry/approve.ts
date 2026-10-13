import { ModelRegistry, type RegistryModel } from "@/lib/schemas/model";
import type { Candidate } from "@/lib/schemas/candidate";
import { BASE_VARIANT, buildRegistryIndex } from "@/lib/registry/resolve";

/**
 * Merges approved candidates into the registry — the only path by which a generated entry
 * becomes real.
 *
 * Everything here is a refusal to proceed on doubt. A candidate marked `conflict` cannot be
 * approved at all; a merged registry that will not index is not written; a merged registry
 * that does not parse is not written. The registry is the file every score on the site is
 * attributed through, so a bad write here is not a display bug, it is a wrong claim about
 * who built what.
 */

export class ApprovalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApprovalError";
  }
}

export interface MergeResult {
  registry: RegistryModel[];
  added: string[];
  /** Entries whose variants had to be repaired on the way in, and what was done. */
  repaired: string[];
}

/**
 * Enforces the one structural invariant a candidate can arrive without: every variant must
 * carry at least one alias, or nothing can ever resolve to it.
 *
 * This lives at the approve gate rather than only in the generator because the generator is
 * not the only way a candidate reaches here — `candidates.json` is a file on disk that can
 * be older than the code, and six entries generated before this rule existed were approved
 * from a stale one. The gate is the single place everything must pass through, so it is the
 * place the invariant has to hold.
 *
 * Both repairs are meaning-preserving. A base variant seeded from the model's own aliases
 * gains names that already resolved to base; a tier with no aliases left is one that nothing
 * could reach, so removing it changes no resolution that was ever possible.
 */
function repairVariants(model: RegistryModel): { model: RegistryModel; note: string | null } {
  const notes: string[] = [];

  const variants = model.variants.map((variant) => {
    if (variant.variant !== BASE_VARIANT || variant.aliases.length > 0) return variant;
    if (model.aliases.length === 0) return variant;
    notes.push("seeded base from the model's aliases");
    return { ...variant, aliases: [...model.aliases] };
  });

  const reachable = variants.filter(
    (variant) => variant.variant === BASE_VARIANT || variant.aliases.length > 0,
  );
  const dropped = variants.length - reachable.length;
  if (dropped > 0) notes.push(`dropped ${dropped} unreachable variant${dropped === 1 ? "" : "s"}`);

  return {
    model: notes.length === 0 ? model : { ...model, variants: reachable },
    note: notes.length === 0 ? null : `${model.model_id}: ${notes.join("; ")}`,
  };
}

export function mergeApproved(
  registry: readonly RegistryModel[],
  candidates: readonly Candidate[],
  approvedIds: readonly string[],
): MergeResult {
  const wanted = new Set(approvedIds);
  const byId = new Map(
    candidates.map((candidate) => [candidate.proposed.model_id, candidate]),
  );

  const unknown = [...wanted].filter((id) => !byId.has(id));
  if (unknown.length > 0) {
    throw new ApprovalError(
      `approved ids that are not candidates: ${unknown.join(", ")}. ` +
        `Regenerate candidates — the file has probably moved on since the review.`,
    );
  }

  const existing = new Set(registry.map((model) => model.model_id));
  const additions: RegistryModel[] = [];
  const repaired: string[] = [];

  for (const id of wanted) {
    const candidate = byId.get(id);
    if (candidate === undefined) continue;

    if (candidate.confidence === "conflict") {
      throw new ApprovalError(
        `"${id}" is marked conflict and cannot be approved as-is. ` +
          `Resolve it by hand in data/registry/models.json: ${candidate.evidence.reasons.join(" ")}`,
      );
    }
    if (existing.has(id)) {
      throw new ApprovalError(`"${id}" is already in the registry.`);
    }

    const { model, note } = repairVariants(candidate.proposed);
    if (note !== null) repaired.push(note);
    additions.push(model);
  }

  const merged = [...registry, ...additions].sort((a, b) =>
    a.model_id.localeCompare(b.model_id),
  );

  // Both checks matter and neither implies the other: parsing proves each entry is shaped
  // correctly, indexing proves they can coexist without an ambiguous alias.
  const parsed = ModelRegistry.safeParse(merged);
  if (!parsed.success) {
    throw new ApprovalError(`the merged registry is not valid: ${parsed.error.message}`);
  }
  buildRegistryIndex(parsed.data);

  return {
    registry: parsed.data,
    added: additions.map((model) => model.model_id).sort(),
    repaired,
  };
}
