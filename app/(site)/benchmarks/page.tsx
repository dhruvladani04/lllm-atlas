import type { Metadata } from "next";
import Link from "next/link";
import { loadBenchmarks, loadFreshness, loadJoinedScores } from "@/lib/data/derived";
import { benchwikiMode, benchwikiUrl } from "@/lib/config";
import { MatrixView } from "@/components/benchmarks/matrix-view";
import { FreshnessStamp } from "@/components/data/freshness-stamp";
import { BenchwikiAttribution } from "@/components/benchmarks/attribution";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Benchmarks — LLM Atlas",
  description:
    "Which benchmarks still discriminate between models, and which have been saturated, deprecated or contaminated.",
};

export default function BenchmarksPage() {
  const mode = benchwikiMode();
  const freshness = loadFreshness();

  if (mode === "link") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-xl font-medium">Benchmarks</h1>
        <p className="mt-4 max-w-[66ch] text-base">
          A benchmark is not a fixed yardstick. It can be <em>saturated</em>, meaning the
          best models score so highly that it no longer separates them;{" "}
          <em>contaminated</em>, meaning its questions have leaked into training data;{" "}
          <em>deprecated</em>, meaning nobody maintains it; or <em>superseded</em> by a
          harder successor. A score on a benchmark in any of those states still tells you
          something, but much less than it appears to.
        </p>
        <p className="mt-4 max-w-[66ch] text-base">
          That is why every score on this site&rsquo;s{" "}
          <Link href="/models" className="underline">
            leaderboard
          </Link>{" "}
          carries its benchmark&rsquo;s health beside it. The health records themselves
          are researched and maintained by benchwiki, and they are worth reading directly.
        </p>
        <p className="mt-6">
          <a className="underline" href={benchwikiUrl()}>
            Read the benchmark records at benchwiki
          </a>
        </p>
        <p className="mt-8 text-xs text-ink-mute">
          This site is in <code className="font-mono">BENCHWIKI_MODE=link</code>, so the
          mirrored benchmark pages are not served. The leaderboard&rsquo;s health flags
          are unaffected — they are computed from the last committed snapshot, not from
          these pages.
        </p>
      </main>
    );
  }

  const benchmarks = loadBenchmarks();
  const scoredSlugs = [
    ...new Set(loadJoinedScores().map((score) => score.benchmark_slug)),
  ].sort();

  const retired = benchmarks.filter(
    (benchmark) => benchmark.status === "saturated" || benchmark.status === "deprecated",
  ).length;

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-10">
      <BenchmarksHeader
        total={benchmarks.length}
        retired={retired}
        fetchedAt={freshness["benchwiki"] ?? null}
      />
      <MatrixView benchmarks={benchmarks} scoredSlugs={scoredSlugs} />
    </main>
  );
}

function BenchmarksHeader({
  total,
  retired,
  fetchedAt,
}: {
  total: number;
  retired: number;
  fetchedAt: string | null;
}) {
  return (
    <>
      <h1 className="text-xl font-medium">Benchmarks</h1>
      <p className="mt-2 max-w-[76ch] text-sm text-ink-mute">
        {retired} of {total} benchmarks here are saturated or deprecated — they no longer
        separate strong models from weak ones, yet scores on them are still quoted. Rows
        are capabilities, columns are how much a benchmark still discriminates.{" "}
        <FreshnessStamp fetchedAt={fetchedAt} />
      </p>
      <BenchwikiAttribution />
    </>
  );
}
