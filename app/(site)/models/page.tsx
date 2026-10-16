import type { Metadata } from "next";
import { Suspense } from "react";
import {
  loadCapabilityIndex,
  loadFreshness,
  loadImageLeaderboard,
} from "@/lib/data/derived";
import { rank, rankingInputs } from "@/lib/leaderboard/ranking-inputs";
import { shareMetadata } from "@/lib/og/metadata";
import { toTableData, toTableModels } from "@/lib/leaderboard/view";
import { toImageBoard } from "@/lib/leaderboard/image-board";
import { buildSummaryCards } from "@/lib/leaderboard/cards";
import { Leaderboard } from "@/components/leaderboard/leaderboard";
import { SummaryCards } from "@/components/leaderboard/summary-cards";

/**
 * specs/03-sections/leaderboard.md — `/models`, with `?tab=text|agentic|image`.
 *
 * Prerendered in full. The tab lives in the URL but is read on the client, so the route
 * stays static: specs/01-architecture/stack-and-structure.md requires everything to render
 * from JSON read at build time, with no work happening on a user request.
 */

export const dynamic = "force-static";

const DESCRIPTION =
  "Model scores shown with the health of the benchmark that produced them and the provenance of the number.";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: DESCRIPTION,
  ...shareMetadata({
    title: "Leaderboard — LLM Atlas",
    description: DESCRIPTION,
    path: "/models",
    image: "/og/leaderboard",
    alt: "The current leader on LLM Atlas, with the health of the benchmark it leads on.",
  }),
};

export default function ModelsPage() {
  // The same inputs the static ranking files use, so the default ranking here and a
  // reader-chosen one fetched later cannot disagree about what a ranking contains.
  const inputs = rankingInputs();
  const { scores, models } = inputs;
  const freshness = loadFreshness();
  const indexFile = loadCapabilityIndex();
  const image = loadImageLeaderboard();

  // How much of the benchmark universe the ranking can actually speak to. Saying this on
  // the leaderboard rather than only at the bottom of /benchmarks matters: without it the
  // table reads as "the state of the field" instead of "what one source has measured".
  const coverage = {
    scored: new Set(scores.map((score) => score.benchmark_slug)).size,
    total: inputs.benchmarkNames.size,
  };

  // Both views of every tab are built here, so toggling "hide saturated benchmarks"
  // reorders prerendered rows on the client rather than asking the server for anything.
  //
  // When hiding saturated benchmarks changes nothing — which happens whenever the
  // most-measured benchmark is healthy — the two views are the same object, and the RSC
  // payload carries it once instead of twice.
  //
  // When they differ, the saturated view is not shipped at all: it is a static file the
  // table fetches the first time "hide saturated benchmarks" is switched off. It was nearly
  // a copy of the default and the largest thing on the page. Its reference benchmark's name
  // travels on its own, so the table can still say what the other setting would rank on.
  const pair = (
    hidden: ReturnType<typeof toTableData>,
    shown: ReturnType<typeof toTableData>,
  ) =>
    JSON.stringify(hidden) === JSON.stringify(shown)
      ? { hidden, shown: hidden, shownReference: shown.reference?.name ?? null }
      : { hidden, shown: null, shownReference: shown.reference?.name ?? null };

  const text = rank(inputs, "text", "hidden");
  const agentic = rank(inputs, "agentic", "hidden");

  // The cards are lifted from the default view of each tab, so a card can never name a
  // model the table below it ranks differently.
  const cards = buildSummaryCards({ text, agentic, image: image?.scores ?? [], models });

  const tabs = {
    text: pair(toTableData(text), toTableData(rank(inputs, "text", "shown"))),
    agentic: pair(toTableData(agentic), toTableData(rank(inputs, "agentic", "shown"))),
  };

  return (
    <Suspense fallback={null}>
      <Leaderboard
        tabs={tabs}
        cards={<SummaryCards cards={cards} heading="At a glance" />}
        tableModels={toTableModels(models)}
        coverage={coverage}
        image={toImageBoard(image)}
        freshness={freshness}
        capabilityIndexNote={indexFile?.note ?? null}
      />
    </Suspense>
  );
}
