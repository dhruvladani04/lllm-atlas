import { ModelRegistry, type RegistryModel } from "@/lib/schemas/model";
import type { Candidate } from "@/lib/schemas/candidate";
import { buildRegistryIndex } from "@/lib/registry/resolve";

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

    additions.push(candidate.proposed);
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
  };
}
