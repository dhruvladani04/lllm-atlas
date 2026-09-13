import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  loadBenchmarkHistory,
  loadBenchmarks,
  loadFreshness,
  loadJoinedScores,
  loadModels,
} from "@/lib/data/derived";
import { benchwikiMode, benchwikiUrl } from "@/lib/config";
import type { JoinedScore } from "@/lib/schemas/score";
import {
  HealthFlags,
  MissingValue,
  ProvenanceBadge,
  ScoreCell,
  StatusChip,
} from "@/components/data/primitives";
import { FreshnessStamp } from "@/components/data/freshness-stamp";
import { BenchwikiAttribution } from "@/components/benchmarks/attribution";
import { Trajectory } from "@/components/benchmarks/trajectory";

/**
 * specs/03-sections/benchmarks.md — the mirrored detail page.
 *
 * `rel="canonical"` points at benchwiki, because this is their record. What this page adds
 * is the reverse lookup they do not offer: which models on this site have scores here, with
 * provenance, harness and date.
 */

export function generateStaticParams() {
  if (benchwikiMode() === "link") return [];
  return loadBenchmarks().map((benchmark) => ({ slug: benchmark.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const benchmark = loadBenchmarks().find((entry) => entry.slug === slug);
  if (benchmark === undefined) return { title: "Benchmark — LLM Atlas" };

  return {
    title: `${benchmark.name} — LLM Atlas`,
    description: benchmark.short_description,
    alternates: { canonical: benchwikiUrl(benchmark.slug) },
  };
}

export default async function BenchmarkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // In link mode the mirrored pages are not served; the reader is sent to the original
  // rather than shown a 404 for a URL that was live.
  if (benchwikiMode() === "link") redirect(benchwikiUrl(slug) as Route);

  const benchmark = loadBenchmarks().find((entry) => entry.slug === slug);
  if (benchmark === undefined) notFound();

  const freshness = loadFreshness();
  const models = new Map(loadModels().map((model) => [model.model_id, model]));
  const scores = loadJoinedScores()
    .filter((score) => score.benchmark_slug === slug)
    .sort((a, b) => b.value - a.value);

  const independent = scores.filter((score) => score.provenance === "independent");
  const vendor = scores.filter((score) => score.provenance === "vendor-reported");
  const successor = benchmark.successor;
  const history = loadBenchmarkHistory()[slug] ?? null;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <p className="text-sm text-ink-mute">
        <Link href="/benchmarks" className="underline-offset-2 hover:underline">
          Benchmarks
        </Link>
      </p>

      <h1 className="mt-2 text-xl font-medium">{benchmark.name}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <StatusChip status={benchmark.status} />
        <span className="text-ink-mute">{benchmark.capability}</span>
        <span className="text-ink-mute">
          contamination risk: {benchmark.contamination.risk}
        </span>
        {benchmark.launch_date !== null ? (
          <span className="tabular text-ink-mute">launched {benchmark.launch_date}</span>
        ) : null}
      </div>

      <BenchwikiAttribution slug={benchmark.slug} />

      {successor !== null ? (
        <p className="mt-4 text-sm">
          Superseded by{" "}
          <Link href={`/benchmarks/${successor}`} className="underline">
            {successor}
          </Link>
          .
        </p>
      ) : null}

      <section className="mt-8">
        <h2 className="text-lg font-medium">What it measures</h2>
        <p className="mt-2 max-w-[66ch] text-sm">{benchmark.short_description}</p>
        <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-ink-mute">Primary metric</dt>
            <dd>
              {benchmark.metric_primary ?? (
                <MissingValue reason="The record does not state a primary metric" />
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-mute">Judge model</dt>
            <dd>
              {benchmark.judge_model ?? (
                <span className="text-ink-mute">not judged by a model</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-mute">Human baseline</dt>
            <dd>
              {benchmark.human_baseline.score === null ? (
                <MissingValue reason="No protocol-comparable human baseline is published" />
              ) : (
                <span className="tabular">{benchmark.human_baseline.score}</span>
              )}
              {benchmark.human_baseline.note !== null ? (
                <span className="block text-xs text-ink-mute">
                  {benchmark.human_baseline.note}
                </span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-mute">Languages</dt>
            <dd>{benchmark.languages.join(", ") || "not stated"}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Health</h2>
        {benchmark.statistical_note !== null ? (
          <p className="mt-2 max-w-[66ch] border-l-2 border-rule-strong pl-3 text-sm">
            {benchmark.statistical_note}
          </p>
        ) : null}
        <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-ink-mute">Status evidence</dt>
            <dd>
              {benchmark.status_evidence ?? (
                <MissingValue reason="The record does not state evidence for this status" />
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-mute">Saturated since</dt>
            <dd className="tabular">
              {benchmark.saturated_date ?? (
                <span className="text-ink-mute">not saturated</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-mute">Refresh cycle</dt>
            <dd>
              {benchmark.contamination.refresh_cycle ?? (
                <MissingValue reason="The record does not state a refresh cycle" />
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-mute">Test set public</dt>
            <dd>
              {benchmark.contamination.test_set_public === null ? (
                <MissingValue reason="The record does not say whether the test set is public" />
              ) : benchmark.contamination.test_set_public ? (
                "yes"
              ) : (
                "no"
              )}
            </dd>
          </div>
        </dl>
        {benchmark.contamination.mitigation !== null ? (
          <p className="mt-3 max-w-[66ch] text-sm text-ink-mute">
            {benchmark.contamination.mitigation}
          </p>
        ) : null}
      </section>

      {history !== null && history.lineage.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-medium">History &amp; lineage</h2>
          <p className="mt-1 max-w-[66ch] text-sm text-ink-mute">
            Hand-maintained, not part of the benchwiki record above — each line cites the
            paper or leaderboard it comes from.
          </p>
          <ol className="mt-3 space-y-2 text-sm">
            {history.lineage.map((event) => (
              <li key={event.date} className="flex gap-4">
                <span className="tabular w-20 shrink-0 text-ink-mute">{event.date}</span>
                <span>{event.note}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {history !== null && history.further_reading.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-medium">Further reading</h2>
          <ul className="mt-2 divide-y divide-rule border-y border-rule text-sm">
            {history.further_reading.map((link) => (
              <li key={link.url} className="py-2">
                <a className="underline underline-offset-2" href={link.url}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-lg font-medium">Models scored on this benchmark</h2>
        <p className="mt-1 max-w-[66ch] text-sm text-ink-mute">
          The reverse lookup, which is this site&rsquo;s addition: every model here with a
          score on this benchmark. Independent measurements and vendor-reported numbers
          are kept apart rather than interleaved, because they are different claims.
        </p>

        {scores.length === 0 ? (
          <p className="mt-3 max-w-[66ch] text-sm text-ink-mute">
            No model on this site has a score on this benchmark yet. That usually means
            the models that were measured on it are not in the registry, rather than that
            nobody has run it.
          </p>
        ) : null}

        {independent.length > 0 ? (
          <ScoreTable
            heading="Independently measured"
            scores={independent}
            names={models}
          />
        ) : null}

        {vendor.length > 0 ? (
          <ScoreTable
            heading="Vendor-reported"
            note="Reported by the model's own maker. No independent measurement of these numbers is on this site."
            scores={vendor}
            names={models}
          />
        ) : null}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Trajectory</h2>
        <Trajectory benchmark={benchmark} />
      </section>

      {benchmark.leaderboards.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-medium">Where results are tracked</h2>
          <p className="mt-1 max-w-[66ch] text-sm text-ink-mute">
            Leaderboards benchwiki lists for this benchmark. These are links out, not
            sources this site ingests — no score below comes from any of them.
          </p>
          <ul className="mt-2 divide-y divide-rule border-y border-rule text-sm">
            {benchmark.leaderboards.map((board) => (
              <li key={board.url} className="flex flex-wrap gap-x-3 py-2">
                <a className="underline underline-offset-2" href={board.url}>
                  {board.name}
                </a>
                {board.type !== null ? (
                  <span className="text-xs text-ink-mute">{board.type}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8 border-t border-rule pt-4 text-sm">
        <h2 className="text-lg font-medium">Source</h2>
        <p className="mt-2 max-w-[66ch] text-ink-mute">
          This record is maintained by benchwiki and mirrored here.{" "}
          <a className="underline" href={benchwikiUrl(benchmark.slug)}>
            Read the original
          </a>
          . Upstream last updated {benchmark.last_updated};{" "}
          <FreshnessStamp fetchedAt={freshness["benchwiki"] ?? null} /> by this site.
        </p>
      </section>
    </main>
  );
}

function ScoreTable({
  heading,
  note,
  scores,
  names,
}: {
  heading: string;
  note?: string;
  scores: readonly JoinedScore[];
  names: ReadonlyMap<string, { display_name: string; creator: string }>;
}) {
  return (
    <div className="mt-5">
      <h3 className="text-sm font-medium">{heading}</h3>
      {note !== undefined ? <p className="mt-1 text-xs text-ink-mute">{note}</p> : null}
      <div className="overflow-x-auto">
        <table className="mt-2 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-rule text-left">
              <th scope="col" className="py-2 pr-3 font-medium">
                Model
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">
                Score
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Harness
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Measured
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Provenance
              </th>
              <th scope="col" className="py-2 font-medium">
                Health
              </th>
            </tr>
          </thead>
          <tbody>
            {scores.map((score) => {
              const model = names.get(score.model_id);
              return (
                <tr
                  key={`${score.model_id}#${score.variant}#${score.harness ?? "none"}`}
                  className="border-b border-rule"
                >
                  <td className="py-2 pr-3">
                    <Link
                      href={`/models/${score.model_id}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {model?.display_name ?? score.model_id}
                    </Link>
                    {score.variant !== "base" ? (
                      <span className="font-mono text-xs text-ink-mute">
                        {" "}
                        ({score.variant})
                      </span>
                    ) : null}
                    <span className="block text-xs text-ink-mute">
                      {model?.creator ?? ""}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-right">
                    <ScoreCell score={score} />
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs">
                    {score.harness ?? <span className="text-ink-mute">—</span>}
                  </td>
                  <td className="tabular py-2 pr-3 text-xs">
                    {score.measured_at ?? (
                      <MissingValue reason="The source did not state when this was measured" />
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    <ProvenanceBadge provenance={score.provenance} />
                  </td>
                  <td className="py-2">
                    <HealthFlags flags={score.health_flags} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
