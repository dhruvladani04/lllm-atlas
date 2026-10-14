import Link from "next/link";
import {
  loadFreshness,
  loadImageLeaderboard,
  loadJoinedScores,
  loadModels,
} from "@/lib/data/derived";
import { buildRows } from "@/lib/leaderboard/rows";
import { buildSummaryCards } from "@/lib/leaderboard/cards";
import { SummaryCards } from "@/components/leaderboard/summary-cards";
import { selectDemonstration } from "@/lib/home/demonstration";
import { DemonstrationRow } from "@/components/home/demonstration-row";
import { FreshnessStamp } from "@/components/data/freshness-stamp";

/**
 * specs/03-sections/leaderboard.md — the home page.
 *
 * Not a marketing page. It is a demonstration of the thesis: one real row where a model
 * shows a high score and a saturation flag on the benchmark producing it, then the current
 * leaders as cards that carry the same caveats, then the three sections with one line
 * each. No hero, no big number on a gradient, no three-word tagline.
 */

export const dynamic = "force-static";

const SECTIONS = [
  {
    href: "/models",
    title: "Leaderboard",
    line: "Who is ahead right now, on a named benchmark, with that benchmark's health and every number's provenance beside it.",
  },
  {
    href: "/benchmarks",
    title: "Benchmarks",
    line: "Whether the test a model is ahead on still measures anything: saturation, contamination, deprecation.",
  },
  {
    href: "/evals",
    title: "Evals",
    line: "How to measure your own application, which is a different discipline from ranking foundation models.",
  },
] as const;

export default function HomePage() {
  const scores = loadJoinedScores();
  const models = loadModels();
  const demonstration = selectDemonstration(scores, models);

  // The same default views /models ranks on, so a card here and the table there agree.
  const ranked = (tab: "text" | "agentic") =>
    buildRows({ scores, models, capabilityIndex: new Map(), tab, hideSaturated: true });
  const cards = buildSummaryCards({
    text: ranked("text"),
    agentic: ranked("agentic"),
    image: loadImageLeaderboard()?.scores ?? [],
    models,
  });
  const freshness = loadFreshness();

  return (
    <main className="mx-auto max-w-reading px-6 py-12">
      <h1 className="text-xl font-medium">LLM Atlas</h1>
      <p className="mt-3 max-w-[66ch] text-base">
        Every other leaderboard tells you a model scored 92 on a benchmark. This one also
        tells you whether that benchmark still means anything, and who reported the
        number.
      </p>

      {/* Two plain actions, not a hero. The first is the one filled button on the page, which
          is the design system's allowance for a page's single primary action. */}
      <p className="mt-6 flex flex-wrap gap-3 text-sm">
        <Link
          href="/models"
          className="rounded-sm bg-accent px-4 py-2 font-medium text-paper hover:bg-accent-strong hover:text-paper"
        >
          Open the leaderboard
        </Link>
        <Link
          href="/methodology"
          className="rounded-sm border border-rule-strong px-4 py-2 hover:border-accent"
        >
          How we judge benchmarks
        </Link>
      </p>

      {demonstration === null ? (
        <p className="mt-8 max-w-[66ch] text-sm text-ink-mute">
          No scored model currently sits on a saturated benchmark, so there is no example
          to show here. That is unusual, and it is better to say so than to construct one.
        </p>
      ) : (
        <>
          <p className="mt-8 max-w-[66ch] text-sm text-ink-mute">
            Here is a real row from the leaderboard, exactly as the data has it.
          </p>
          <DemonstrationRow demonstration={demonstration} />
        </>
      )}

      {/* One per tab — text, agentic, image. The open-weights and price cards live on the
          leaderboard, beside the table they are lifted from. */}
      <SummaryCards
        cards={cards.filter((card) =>
          ["top-text", "top-agentic", "top-image"].includes(card.kind),
        )}
        heading="Who is ahead, and on what"
        more={{ href: "/models", label: "Open weights, price and the full ranking" }}
      />

      <nav className="mt-12" aria-label="Sections">
        {/* Each section is one link the size of its card, so the whole block is the target
            and the hover state says so. No arrows: the design spec rules them out. */}
        <ul className="grid gap-3 sm:grid-cols-3">
          {SECTIONS.map((section) => (
            <li key={section.href}>
              <Link
                href={section.href}
                className="group block h-full rounded-md border border-rule bg-surface p-4 shadow-sm transition-colors hover:border-accent"
              >
                <span className="text-base font-medium underline-offset-2 group-hover:underline">
                  {section.title}
                </span>
                <span className="mt-1 block text-sm text-ink-mute">{section.line}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <p className="mt-10 max-w-[66ch] text-xs text-ink-mute">
        Benchmark metadata from{" "}
        <a className="underline" href="https://benchwiki.vercel.app/">
          benchwiki
        </a>
        . Scores from Epoch AI (CC BY 4.0). Pricing from vendor pages where readable, and
        from OpenRouter (CC BY 4.0) otherwise. Arena Elo from Arena (CC BY 4.0). Benchmark
        data <FreshnessStamp fetchedAt={freshness["benchwiki"] ?? null} />.
      </p>
    </main>
  );
}
