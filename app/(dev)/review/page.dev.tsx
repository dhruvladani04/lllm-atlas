import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CandidateFile } from "@/lib/schemas/candidate";
import { loadRegistry } from "@/lib/registry/load";
import { buildRegistryIndex, normaliseName } from "@/lib/registry/resolve";
import { ReviewList } from "@/components/registry/review-list";

/**
 * Bulk review for generated registry candidates. **Development only.**
 *
 * `specs/01-architecture/model-registry.md` says registry growth is manual because
 * automating it automates the wrong-merge risk. That still holds — nothing reaches the
 * registry without someone approving it here. What changed is that "manual" had quietly
 * come to mean "not at all": 1,351 unresolved names is not a queue anybody works by hand,
 * so the site discarded scores for hundreds of models it already legally ingests. This page
 * removes the transcription, not the judgement.
 *
 * The route group `app/(dev)/` does **not** exclude a page from production builds — `/tokens`
 * ships today. So this gates explicitly.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Registry review",
  robots: { index: false, follow: false },
};

const CANDIDATES = join("data", "registry", "candidates.json");

export default function ReviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  if (!existsSync(CANDIDATES)) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-xl font-medium">Registry review</h1>
        <p className="mt-3 max-w-[66ch] text-sm text-ink-mute">
          No candidates file yet. Run{" "}
          <code className="font-mono">pnpm generate-candidates</code> to propose entries
          from the newest snapshot.
        </p>
      </main>
    );
  }

  const file = CandidateFile.parse(
    JSON.parse(readFileSync(CANDIDATES, "utf8")) as unknown,
  );

  // The candidates file is a snapshot of what was unresolved when it was generated, so
  // everything approved since is still sitting in it. Filtering against the live registry
  // here means the page tells the truth without anyone having to remember to regenerate —
  // a review queue that re-offers what you already accepted trains you to stop reading it.
  const registry = loadRegistry();
  const index = buildRegistryIndex(registry);
  const inRegistry = new Set(registry.map((model) => model.model_id));

  const pending = file.candidates.filter((candidate) => {
    if (inRegistry.has(candidate.proposed.model_id)) return false;
    const stem = candidate.evidence.stem;
    return !(
      index.models.has(stem) ||
      index.exact.has(stem) ||
      index.normalised.has(normaliseName(stem))
    );
  });
  const settled = file.candidates.length - pending.length;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-xl font-medium">Registry review</h1>
      <p className="mt-3 max-w-[76ch] text-sm">
        {pending.length} still to decide, from the {file.snapshot_date} snapshot.
        {settled > 0 ? (
          <>
            {" "}
            {settled} {settled === 1 ? "is" : "are"} already in the registry and no longer
            shown.
          </>
        ) : null}{" "}
        Approving writes a decisions file;{" "}
        <code className="font-mono">pnpm registry:approve</code> merges it into the
        registry, and <code className="font-mono">pnpm ingest</code> then picks up their
        scores. Nothing here writes to the registry directly.
      </p>
      <p className="mt-2 max-w-[76ch] text-sm text-ink-mute">
        Every proposal is already schema-valid and checked not to collide with an existing
        alias — what is left for you is the judgement a rule cannot make: whether this is
        really a distinct model, and whether its name means what the generator assumed.
      </p>

      {pending.length === 0 ? (
        <p className="mt-8 max-w-[66ch] text-sm text-ink-mute">
          Nothing left to decide from this snapshot. Run{" "}
          <code className="font-mono">pnpm generate-candidates</code> after the next
          ingest to look for newly-seen models.
        </p>
      ) : (
        <ReviewList candidates={pending} />
      )}
    </main>
  );
}
