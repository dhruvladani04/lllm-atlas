"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Model } from "@/lib/schemas/model";
import type { Score } from "@/lib/schemas/score";
import type { SourceMeta } from "@/lib/schemas/common";
import type { Tab } from "@/lib/leaderboard/rows";
import {
  LeaderboardTable,
  type TabData,
} from "@/components/leaderboard/leaderboard-table";
import { ImageTable } from "@/components/leaderboard/image-table";

/**
 * The tab shell. The tab is read from the URL on the client so the route can stay static;
 * every tab's rows were built at build time and shipped with the page.
 */

const TAB_LABEL: Record<Tab, string> = {
  text: "Text",
  agentic: "Agentic",
  image: "Image generation",
};

export function Leaderboard({
  tabs,
  image,
  models,
  freshness,
  capabilityIndexNote,
}: {
  tabs: Record<"text" | "agentic", { hidden: TabData; shown: TabData }>;
  image: { note: string; source: SourceMeta; scores: Score[] } | null;
  models: Model[];
  freshness: Record<string, string | null>;
  capabilityIndexNote: string | null;
}) {
  const params = useSearchParams();
  const requested = params.get("tab");
  const tab: Tab =
    requested === "agentic" || requested === "image" || requested === "text"
      ? requested
      : "text";

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-10">
      <h1 className="text-xl font-medium">Leaderboard</h1>
      <p className="mt-2 max-w-[66ch] text-sm text-ink-mute">
        Every score here carries the health of the benchmark that produced it and who
        reported the number. A high score on a saturated benchmark is still a high score —
        it just tells you less than it appears to.
      </p>

      <nav className="mt-6 flex gap-4 border-b border-rule text-sm" aria-label="Modality">
        {(["text", "agentic", "image"] as const).map((name) => (
          <Link
            key={name}
            href={`/models?tab=${name}`}
            aria-current={tab === name ? "page" : undefined}
            className={`-mb-px border-b-2 px-1 pb-2 ${
              tab === name ? "border-ink text-ink" : "border-transparent text-ink-mute"
            }`}
          >
            {TAB_LABEL[name]}
          </Link>
        ))}
      </nav>

      <div className="mt-4">
        {tab === "image" ? (
          <ImageTable
            leaderboard={image}
            models={models}
            fetchedAt={freshness["arena-mirror"] ?? null}
          />
        ) : (
          <>
            {tab === "agentic" ? (
              <p className="mb-4 border-l-2 border-rule-strong pl-3 text-sm text-ink-mute">
                An agentic score is a system score, not a model score. It measures the
                model and its harness together, and changing the harness changes the
                number. Two rows for the same model under different scaffolds is correct,
                not a duplicate.
              </p>
            ) : null}
            <LeaderboardTable
              key={tab}
              hidden={tabs[tab].hidden}
              shown={tabs[tab].shown}
              fetchedAt={freshness["epoch"] ?? null}
            />
          </>
        )}
      </div>

      <footer className="mt-12 border-t border-rule pt-4 text-xs text-ink-mute">
        <p>
          Benchmark metadata from{" "}
          <a className="underline" href="https://benchwiki.vercel.app/">
            benchwiki
          </a>
          . Scores from Epoch AI, CC BY 4.0. Pricing from vendor pages where readable, and
          from OpenRouter (CC BY 4.0) otherwise. Arena Elo from LMArena via a community
          mirror.
        </p>
        {capabilityIndexNote !== null ? (
          <p className="mt-1">{capabilityIndexNote}</p>
        ) : null}
      </footer>
    </main>
  );
}
