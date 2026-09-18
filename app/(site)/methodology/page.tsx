import type { Metadata } from "next";
import Link from "next/link";
import {
  loadBenchmarks,
  loadFreshness,
  loadJoinedScores,
  loadModels,
} from "@/lib/data/derived";
import { FreshnessStamp } from "@/components/data/freshness-stamp";

/**
 * specs/00-product/methodology.md — how the site decides what to show.
 *
 * Every rule here is already enforced somewhere in `lib/`. This page exists because a rule
 * a reader cannot find is a rule they have to take on trust, and this site's entire pitch
 * is that they should not have to. The numbers on it are counted from the committed data at
 * build time rather than written by hand, so the page cannot quietly drift out of date the
 * way a hand-maintained "about" page does.
 */

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How LLM Atlas picks a ranking basis, what it refuses to merge, when it drops a row, and how often the data refreshes.",
};

function Rule({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-medium">{heading}</h2>
      <div className="mt-2 max-w-[68ch] space-y-3 text-sm">{children}</div>
    </section>
  );
}

export default function MethodologyPage() {
  const scores = loadJoinedScores();
  const benchmarks = loadBenchmarks();
  const models = loadModels();
  const freshness = loadFreshness();

  const scoredBenchmarks = new Set(scores.map((score) => score.benchmark_slug)).size;
  const disputed = scores.filter((score) =>
    score.health_flags.includes("disputed"),
  ).length;
  const vendorOnly = scores.filter((score) =>
    score.health_flags.includes("vendor-reported-only"),
  ).length;
  const textModels = models.filter((model) => model.modality === "text").length;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-xl font-medium">Methodology</h1>
      <p className="mt-3 max-w-[68ch] text-base">
        This site claims that most leaderboards tell you less than they appear to. That is
        only worth anything if you can check how this one decides what to show. Every rule
        below is enforced in code and covered by a test; the counts are read from the
        committed data when the page is built.
      </p>

      <Rule heading="What the ranking actually ranks">
        <p>
          Models are measured on different benchmarks, and a score on one is not
          comparable to a score on another. Averaging them would produce a single
          confident number with no meaning, so the table instead picks one{" "}
          <strong className="font-medium">reference benchmark</strong> per tab — the one
          the most models in that tab have been measured on — names it in the column
          header, and ranks only the models that have a score on it. Everything else is
          listed below the table with the reason stated.
        </p>
        <p>
          Coverage beats health when picking that benchmark. Ranking on a pristine
          benchmark two models share tells you less than ranking on a tired one that
          forty-nine share. Where the chosen benchmark is anything less than{" "}
          <em>active</em>, the header says so and names the healthier benchmark it beat,
          so you can disagree with the trade-off rather than be subjected to it.
        </p>
        <p>
          Read a ranking here as &ldquo;best on this benchmark&rdquo;, never as
          &ldquo;best&rdquo;.
        </p>
      </Rule>

      <Rule heading="What is never merged">
        <p>
          A vendor-reported number and an independent measurement are two different claims
          about the world, and this site never averages them into one. Where both exist,
          the independent number is shown and the row says both exist. Where only the
          vendor has reported, the row says that too.{" "}
          {vendorOnly === 0 ? (
            <>
              No score currently carries that flag, which is a fact about today&rsquo;s
              corpus rather than a claim that it never happens.
            </>
          ) : (
            <>
              <strong className="font-medium">{vendorOnly}</strong>{" "}
              {vendorOnly === 1 ? "score" : "scores"} currently carry it.
            </>
          )}
        </p>
        <p>
          The same applies to a model&rsquo;s configurations. A model run at high
          reasoning effort and the same model run at low effort are two measurements, kept
          apart in the data. The leaderboard shows one row per model by default, carrying
          its best configuration, and says which one and how many it beat — a collapse
          that names itself rather than a merge that hides.
        </p>
        <p>
          An agentic score is a system score. The harness is half of what was measured, so
          two rows for one model under different scaffolds is correct, not a duplicate.
        </p>
      </Rule>

      <Rule heading="When a row is dropped, and when it is kept and flagged">
        <p>
          A name that does not resolve to the registry is never guessed at. It is written
          to a review queue with its source and excluded until a human matches it. A
          near-miss that resolved silently would credit the wrong model with someone
          else&rsquo;s score, and nothing downstream would ever catch it.
        </p>
        <p>
          A row whose source contradicts itself is dropped and recorded — Epoch ships rows
          naming one model in the machine-readable column and a different one in the
          display column, and there is no rule for deciding which half is right.
        </p>
        <p>
          A measurement the source reports two different values for is <em>not</em>{" "}
          dropped. Both values are shown, both flagged{" "}
          <span className="font-mono text-xs">disputed</span>, because picking one would
          be a coin toss presented as a fact. That currently affects{" "}
          <strong className="font-medium">{disputed}</strong>{" "}
          {disputed === 1 ? "score" : "scores"}.
        </p>
      </Rule>

      <Rule heading="How much of the field this covers">
        <p>
          <strong className="font-medium">{scoredBenchmarks}</strong> of the{" "}
          <strong className="font-medium">{benchmarks.length}</strong> benchmarks
          catalogued here have any score at all, across{" "}
          <strong className="font-medium">{textModels}</strong> text models and{" "}
          <strong className="font-medium">{models.length - textModels}</strong> image
          models. The gap is a licensing constraint more than a technical one: the most
          complete commercial source for every modality does not permit redistribution, so
          it is excluded entirely rather than used quietly.
        </p>
        <p>
          <Link href="/benchmarks" className="underline underline-offset-2">
            The benchmarks section
          </Link>{" "}
          catalogues all {benchmarks.length} with their health, including the ones nothing
          here has a score on.
        </p>
      </Rule>

      <Rule heading="Where the numbers come from, and how fresh they are">
        <p>
          There is no database and nothing is fetched while you read this page. A
          scheduled job runs daily at 06:00 UTC, validates each source against a schema,
          writes a dated snapshot into the repository and commits it. The commit is what
          deploys the site, so every number on it is reproducible from a specific commit,
          and an upstream change is visible as a diff rather than a silent edit.
        </p>
        <p>
          A source that fails keeps its last good snapshot and goes visibly stale rather
          than blanking. A source returning less than half its previous record count is
          treated as broken rather than believed.
        </p>
        <ul className="mt-2 divide-y divide-rule border-y border-rule">
          {Object.entries(freshness).map(([source, fetchedAt]) => (
            <li key={source} className="flex flex-wrap gap-x-3 py-2">
              <span className="font-mono text-xs">{source}</span>
              <span className="text-xs text-ink-mute">
                <FreshnessStamp fetchedAt={fetchedAt} />
              </span>
            </li>
          ))}
        </ul>
      </Rule>

      <Rule heading="What this site will not do">
        <p>
          It will not show a number without a source and a date. It will not present a
          routed price as a vendor&rsquo;s list price. It will not render a missing value
          as a dash or a zero, because both read as data. It will not ingest a source
          whose licence does not permit redistribution, however much better that would
          make the coverage look.
        </p>
        <p>
          Where those rules cost something — a thinner ranking, a visible gap, a benchmark
          with no scores — the cost is shown rather than hidden.
        </p>
      </Rule>

      <section className="mt-10 border-t border-rule pt-4 text-sm text-ink-mute">
        <p className="max-w-[68ch]">
          The rules above are written down in full, with their reasoning and the arguments
          against them, in the specifications this site is built from. Where an
          implementation and a spec disagree, the spec is the one that was decided
          deliberately.
        </p>
      </section>
    </main>
  );
}
