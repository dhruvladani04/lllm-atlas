import type { Metadata } from "next";
import { Suspense } from "react";
import {
  loadCapabilityIndex,
  loadFreshness,
  loadImageLeaderboard,
  loadJoinedScores,
  loadModels,
} from "@/lib/data/derived";
import { buildRows, type CapabilityIndexEntry } from "@/lib/leaderboard/rows";
import { Leaderboard } from "@/components/leaderboard/leaderboard";

/**
 * specs/03-sections/leaderboard.md — `/models`, with `?tab=text|agentic|image`.
 *
 * Prerendered in full. The tab lives in the URL but is read on the client, so the route
 * stays static: specs/01-architecture/stack-and-structure.md requires everything to render
 * from JSON read at build time, with no work happening on a user request.
 */

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Leaderboard — LLM Atlas",
  description:
    "Model scores shown with the health of the benchmark that produced them and the provenance of the number.",
};

export default function ModelsPage() {
  const scores = loadJoinedScores();
  const models = loadModels();
  const freshness = loadFreshness();
  const indexFile = loadCapabilityIndex();
  const image = loadImageLeaderboard();

  const capabilityIndex = new Map<string, CapabilityIndexEntry>(
    (indexFile?.rows ?? []).map((row) => [
      row.model_id,
      { eci: row.eci, ci_low: row.eci_ci_low, ci_high: row.eci_ci_high },
    ]),
  );

  // Both views of every tab are built here, so toggling "hide saturated benchmarks"
  // reorders prerendered rows on the client rather than asking the server for anything.
  const tabs = {
    text: {
      hidden: buildRows({
        scores,
        models,
        capabilityIndex,
        tab: "text",
        hideSaturated: true,
      }),
      shown: buildRows({
        scores,
        models,
        capabilityIndex,
        tab: "text",
        hideSaturated: false,
      }),
    },
    agentic: {
      hidden: buildRows({
        scores,
        models,
        capabilityIndex,
        tab: "agentic",
        hideSaturated: true,
      }),
      shown: buildRows({
        scores,
        models,
        capabilityIndex,
        tab: "agentic",
        hideSaturated: false,
      }),
    },
  };

  return (
    <Suspense fallback={null}>
      <Leaderboard
        tabs={tabs}
        image={image}
        models={models}
        freshness={freshness}
        capabilityIndexNote={indexFile?.note ?? null}
      />
    </Suspense>
  );
}
