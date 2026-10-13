import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  REGISTRY_PATH,
  UNRESOLVED_PATH,
  loadRegistry,
  loadUnresolved,
} from "@/lib/registry/load";
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

/** Matches the formatting the rest of `data/` is written in: 2-space, trailing newline. */
function withTrailingNewline(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}
`;
}

function main(): void {
  if (!existsSync(APPROVALS_PATH)) {
    console.error(
      `[approve] no ${APPROVALS_PATH}. Run pnpm review, decide at /review, and submit first.`,
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
  const { registry: merged, added, repaired } = mergeApproved(
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
    for (const alias of [model.model_id, ...model.aliases])
      claimed.add(normaliseName(alias));
    for (const variant of model.variants) {
      for (const alias of variant.aliases) claimed.add(normaliseName(alias));
    }
  }

  const unresolved = loadUnresolved();
  const remaining = unresolved.filter((entry) => !claimed.has(normaliseName(entry.name)));
  writeAtomic(UNRESOLVED_PATH, `${JSON.stringify(remaining, null, 2)}\n`);

  // Prune what was just accepted out of the candidates file. `/review` also filters against
  // the live registry, so a stale file is not a correctness problem — but leaving approved
  // entries in it means the next reader is shown a queue longer than it really is.
  const stillOpen = candidates.candidates.filter(
    (candidate) => !added.includes(candidate.proposed.model_id),
  );
  writeAtomic(
    CANDIDATES_PATH,
    withTrailingNewline({ ...candidates, candidates: stillOpen }),
  );

  console.log(
    `[approve] added ${added.length} model${added.length === 1 ? "" : "s"}; ` +
      `registry is now ${merged.length}.`,
  );
  console.log(
    `[approve] unresolved queue ${unresolved.length} -> ${remaining.length}; ` +
      `${stillOpen.length} candidates still open.`,
  );
  for (const note of repaired) console.log(`[approve] repaired ${note}`);
  console.log("[approve] run pnpm ingest to pick up their scores, then review the diff.");
}

main();
