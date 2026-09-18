import type { Metadata } from "next";
import { loadJoinedScores, loadModels } from "@/lib/data/derived";
import { CompareView } from "@/components/leaderboard/compare-view";

/**
 * specs/03-sections/leaderboard.md — side-by-side comparison.
 *
 * Static like everything else: every model and score is shipped with the page and the
 * comparison is computed in the browser. The corpus is small enough (30 models, ~170
 * scores) that this costs less than a round trip would.
 */

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Compare models",
  description:
    "Compare models on the benchmarks all of them were actually measured on, with the health of each benchmark and the provenance of each number.",
};

export default function ComparePage() {
  const models = loadModels()
    .filter((model) => model.modality === "text")
    .sort((a, b) => a.display_name.localeCompare(b.display_name));

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-xl font-medium">Compare models</h1>
      <p className="mt-3 max-w-[66ch] text-base">
        Most comparison tables put two numbers beside each other and let you assume they
        mean the same thing. This one separates the benchmarks every selected model was
        measured on from the ones only some of them were, because only the first group can
        be read as a comparison at all.
      </p>

      <CompareView models={models} scores={loadJoinedScores()} />
    </main>
  );
}
