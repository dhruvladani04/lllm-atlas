import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REGISTRY_PATH, UNRESOLVED_PATH, loadRegistry, loadUnresolved } from "@/lib/registry/load";
import { mergeApproved } from "@/lib/registry/approve";
import { CandidateFile, ApprovalFile } from "@/lib/schemas/candidate";
import { normaliseName } from "@/lib/registry/resolve";

/**
 * Merges approved candidates into the registry — `pnpm registry:approve`.
 *
 * This is the only writer of `data/registry/models.json` besides a human with an editor.
 * Deliberately a script and not a request handler: the review UI decides *what* to approve,
 * a command decides *when* the registry changes, and the diff is reviewed in git like every
 * other change to this repository.
 */

const CANDIDATES_PATH = join("data", "registry", "candidates.json");
const APPROVALS_PATH = join("data", "registry", "approvals.json");

/** Writes through a temp file, so an interrupted run cannot leave a half-written registry. */
function writeAtomic(path: string, contents: string): void {
  const temp = `${path}.tmp`;
  writeFileSync(temp, contents, "utf8");
  renameSync(temp, path);
}

function main(): void {
  if (!existsSync(APPROVALS_PATH)) {
    console.error(
      `[approve] no ${APPROVALS_PATH}. Run pnpm dev, review at /review, and submit your decisions first.`,
    );
    process.exitCode = 1;
    return;
  }

  const candidates = CandidateFile.parse(
    JSON.parse(readFileSync(CANDIDATES_PATH, "utf8")) as unknown,
  );
  const approvals = ApprovalFile.parse(
    JSON.parse(readFileSync(APPROVALS_PATH, "utf8")) as unknown,
  );

  if (approvals.approved.length === 0) {
    console.log("[approve] nothing approved; the registry is unchanged.");
    return;
  }

  const registry = loadRegistry();
  const { registry: merged, added } = mergeApproved(
    registry,
    candidates.candidates,
    approvals.approved,
  );

  writeAtomic(REGISTRY_PATH, `${JSON.stringify(merged, null, 2)}\n`);

  // Names the registry can now resolve are no longer unresolved. Left behind they would
  // keep reappearing in the review queue and overstate how much is still unmatched.
  const claimed = new Set<string>();
  for (const id of added) {
    const model = merged.find((entry) => entry.model_id === id);
    if (model === undefined) continue;
    for (const alias of [model.model_id, ...model.aliases]) claimed.add(normaliseName(alias));
    for (const variant of model.variants) {
      for (const alias of variant.aliases) claimed.add(normaliseName(alias));
    }
  }

  const unresolved = loadUnresolved();
  const remaining = unresolved.filter((entry) => !claimed.has(normaliseName(entry.name)));
  writeAtomic(UNRESOLVED_PATH, `${JSON.stringify(remaining, null, 2)}\n`);

  console.log(
    `[approve] added ${added.length} model${added.length === 1 ? "" : "s"}; ` +
      `registry is now ${merged.length}.`,
  );
  console.log(
    `[approve] unresolved queue ${unresolved.length} -> ${remaining.length}. ` +
      `Run pnpm ingest to pick up their scores, then review the diff.`,
  );
}

main();
