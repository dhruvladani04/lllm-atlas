import Link from "next/link";
import { loadFreshness, loadJoinedScores, loadModels } from "@/lib/data/derived";
import { selectDemonstration } from "@/lib/home/demonstration";
import { DemonstrationRow } from "@/components/home/demonstration-row";
import { FreshnessStamp } from "@/components/data/freshness-stamp";

/**
 * specs/03-sections/leaderboard.md — the home page.
 *
 * Not a marketing page. It is a demonstration of the thesis: one real row where a model
 * shows a high score and a saturation flag on the benchmark producing it, then the three
 * sections with one line each. No hero, no big number on a gradient, no three-word tagline.
 */

export const dynamic = "force-static";

export default function HomePage() {
  const scores = loadJoinedScores();
  const demonstration = selectDemonstration(scores, loadModels());
  const freshness = loadFreshness();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-xl font-medium">LLM Atlas</h1>
      <p className="mt-3 max-w-[66ch] text-base">
        Every other leaderboard tells you a model scored 92 on a benchmark. This one also
        tells you whether that benchmark still means anything, and who reported the
        number.
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

      <nav className="mt-12" aria-label="Sections">
        <ul className="divide-y divide-rule border-y border-rule">
          <li className="py-4">
            <Link href="/models" className="text-base underline-offset-2 hover:underline">
              Leaderboard
            </Link>
            <p className="mt-1 max-w-[66ch] text-sm text-ink-mute">
              Who is ahead right now, on a named benchmark, with the health of that
              benchmark and the provenance of every number beside it.
            </p>
          </li>
          <li className="py-4">
            <Link
              href="/benchmarks"
              className="text-base underline-offset-2 hover:underline"
            >
              Benchmarks
            </Link>
            <p className="mt-1 max-w-[66ch] text-sm text-ink-mute">
              Whether the test a model is ahead on still measures anything — saturation,
              contamination, deprecation, and which models were scored on it.
            </p>
          </li>
          <li className="py-4">
            <Link href="/evals" className="text-base underline-offset-2 hover:underline">
              Evals
            </Link>
            <p className="mt-1 max-w-[66ch] text-sm text-ink-mute">
              How to measure your own application, which is a different discipline from
              ranking foundation models and is where most teams need the help.
            </p>
          </li>
        </ul>
      </nav>

      <p className="mt-10 max-w-[66ch] text-xs text-ink-mute">
        Benchmark metadata from{" "}
        <a className="underline" href="https://benchwiki.vercel.app/">
          benchwiki
        </a>
        . Scores from Epoch AI (CC BY 4.0). Pricing from vendor pages where readable, and
        from OpenRouter (CC BY 4.0) otherwise. Arena Elo from LMArena via a community
        mirror. Benchmark data{" "}
        <FreshnessStamp fetchedAt={freshness["benchwiki"] ?? null} />.
      </p>
    </main>
  );
}
