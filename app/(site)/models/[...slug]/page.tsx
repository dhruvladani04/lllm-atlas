import type { Metadata } from "next";
import Link from "next/link";
import { capabilityLabel } from "@/lib/format/labels";
import { groupScores } from "@/lib/models/score-groups";
import { ScoreTable, type ScoreSection } from "@/components/models/score-table";
import { CreatorLogo } from "@/components/ui/creator-logo";
import { notFound } from "next/navigation";
import {
  loadCapabilityIndex,
  loadFreshness,
  loadImageLeaderboard,
  loadJoinedScores,
  loadModels,
} from "@/lib/data/derived";
import type { JoinedScore } from "@/lib/schemas/score";
import { formatTokenCount } from "@/lib/format/number";
import {
  MissingValue,
  ProvenanceBadge,
  QuotedValue,
} from "@/components/data/primitives";
import { FreshnessStamp } from "@/components/data/freshness-stamp";
import { isDiscriminating } from "@/lib/leaderboard/rows";

/**
 * specs/03-sections/leaderboard.md — the model detail page.
 *
 * A catch-all segment rather than `[slug]`, because a model_id contains a slash
 * (`anthropic/claude-opus-5`) and the URL should be the id rather than an encoded
 * substitute the reader cannot recognise.
 *
 * Saturated and deprecated benchmarks are recessed rather than removed: the reader should
 * be able to see what the marketing numbers are based on.
 */

export function generateStaticParams() {
  return loadModels().map((model) => ({ slug: model.model_id.split("/") }));
}

function findModel(slug: string[]) {
  const model_id = slug.map((part) => decodeURIComponent(part)).join("/");
  return loadModels().find((entry) => entry.model_id === model_id) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const model = findModel(slug);
  return {
    title: model === null ? "Model" : `${model.display_name}`,
  };
}

function healthSummary(scores: readonly JoinedScore[]): string {
  if (scores.length === 0) {
    return "No benchmark scores have been ingested for this model yet, so there is nothing to summarise. That is a gap in the data, not a judgement about the model.";
  }

  const onActive = scores.filter((score) => isDiscriminating(score.benchmark)).length;
  const vendorOnly = scores.filter((score) =>
    score.health_flags.includes("vendor-reported-only"),
  ).length;
  const contaminated = scores.filter((score) =>
    score.health_flags.includes("high-contamination"),
  ).length;

  const parts = [
    `${onActive} of ${scores.length} score${scores.length === 1 ? "" : "s"} sit on benchmarks that still discriminate.`,
  ];
  parts.push(
    vendorOnly === 0
      ? "Every number here has been measured independently."
      : `${vendorOnly} ${vendorOnly === 1 ? "is" : "are"} vendor-reported with no independent measurement to check ${vendorOnly === 1 ? "it" : "them"} against.`,
  );
  if (contaminated > 0) {
    parts.push(
      `${contaminated} sit${contaminated === 1 ? "s" : ""} on benchmarks with a high risk of test-set contamination.`,
    );
  }
  return parts.join(" ");
}

export default async function ModelPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const model = findModel(slug);
  if (model === null) notFound();

  const scores = loadJoinedScores().filter((score) => score.model_id === model.model_id);
  const freshness = loadFreshness();
  const eci = loadCapabilityIndex();
  const indexRow = eci?.rows.find((row) => row.model_id === model.model_id) ?? null;
  const arena =
    loadImageLeaderboard()?.scores.filter((score) => score.model_id === model.model_id) ??
    [];

  const discriminating = scores.filter((score) => isDiscriminating(score.benchmark));
  const recessed = scores.filter((score) => !isDiscriminating(score.benchmark));

  const byCapability = new Map<string, JoinedScore[]>();
  for (const score of discriminating) {
    byCapability.set(score.benchmark.capability, [
      ...(byCapability.get(score.benchmark.capability) ?? []),
      score,
    ]);
  }

  const sections: ScoreSection[] = [
    ...[...byCapability.entries()].map(([capability, group]) => ({
      heading: capabilityLabel(capability),
      recessed: false,
      groups: groupScores(group),
    })),
    ...(recessed.length > 0
      ? [
          {
            heading: "On benchmarks that no longer discriminate",
            recessed: true,
            groups: groupScores(recessed),
          },
        ]
      : []),
  ];

  return (
    <main className="mx-auto max-w-data px-6 py-10">
      <p className="text-sm text-ink-mute">
        <Link href="/models" className="underline-offset-2 hover:underline">
          Leaderboard
        </Link>
      </p>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="text-xl font-medium">{model.display_name}</h1>
          <p className="font-mono text-xs text-ink-mute">{model.model_id}</p>
        </div>
        {/* The page's one primary action. Compare reads the model from the URL and waits
            for a second one; a comparison of one is not a comparison. */}
        {model.modality === "text" ? (
          <Link
            href={`/compare?models=${model.model_id}`}
            className="rounded-sm bg-accent px-4 py-2 text-sm font-medium text-paper hover:bg-accent-strong hover:text-paper"
          >
            Compare with…
          </Link>
        ) : null}
      </div>

      <section className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 border-y border-rule py-4 text-sm sm:grid-cols-3">
        <div>
          <div className="text-xs text-ink-mute">Creator</div>
          <span className="flex items-center gap-1.5">
            <CreatorLogo creator={model.creator} />
            {model.creator}
          </span>
        </div>
        <div>
          <div className="text-xs text-ink-mute">Released</div>
          {model.released_at ?? (
            <MissingValue reason="No release date could be confirmed from a source" />
          )}
        </div>
        <div>
          <div className="text-xs text-ink-mute">Weights</div>
          {model.open_weights === null ? (
            <MissingValue reason="Weight availability not recorded" />
          ) : model.open_weights ? (
            "open"
          ) : (
            "closed"
          )}
        </div>
        <div>
          <div className="text-xs text-ink-mute">Context</div>
          <QuotedValue
            quoted={model.context_window}
            format={(value) => `${formatTokenCount(value)} tokens`}
            missingReason="No context window published by the vendor or OpenRouter"
          />
        </div>
        <div>
          <div className="text-xs text-ink-mute">Price in / out per Mtok</div>
          <QuotedValue
            quoted={model.price_input_per_mtok}
            format={(value) => `$${value.toFixed(2)}`}
            missingReason="No price published by the vendor or OpenRouter"
          />
          <span className="text-ink-mute"> / </span>
          <QuotedValue
            quoted={model.price_output_per_mtok}
            format={(value) => `$${value.toFixed(2)}`}
            missingReason="No price published by the vendor or OpenRouter"
          />
          {model.price_input_per_mtok !== null ? (
            <div className="text-xs text-ink-mute">
              {model.price_input_per_mtok.quoted_by === "vendor"
                ? "vendor list price"
                : "OpenRouter routed price — not the vendor's list price"}
              , <FreshnessStamp fetchedAt={model.price_input_per_mtok.fetched_at} />
            </div>
          ) : null}
        </div>
        <div>
          <div className="text-xs text-ink-mute">State</div>
          {model.state.replace("_", " ")}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium">Health summary</h2>
        <p className="mt-2 max-w-[66ch] text-sm">{healthSummary(scores)}</p>
      </section>

      {indexRow !== null ? (
        <section className="mt-8">
          <h2 className="text-lg font-medium">Epoch Capability Index</h2>
          <p className="mt-2 max-w-[66ch] text-sm">
            <span className="tabular text-base">{indexRow.eci.toFixed(1)}</span>
            {indexRow.eci_ci_low !== null && indexRow.eci_ci_high !== null ? (
              <span className="tabular text-ink-mute">
                {" "}
                ({indexRow.eci_ci_low.toFixed(1)}–{indexRow.eci_ci_high.toFixed(1)})
              </span>
            ) : null}
          </p>
          <p className="mt-2 max-w-[66ch] text-xs text-ink-mute">
            {eci?.note} Published by{" "}
            <a className="underline" href="https://epoch.ai/benchmarks">
              Epoch AI
            </a>{" "}
            under CC BY 4.0. <FreshnessStamp fetchedAt={freshness["epoch-eci"] ?? null} />
          </p>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-lg font-medium">Scores</h2>
        {scores.length === 0 && arena.length === 0 ? (
          <p className="mt-2 max-w-[66ch] text-sm text-ink-mute">
            No scores have been ingested for this model. It is in the registry, so any
            score that appears upstream will be picked up by the next daily run.
          </p>
        ) : null}

        {sections.length > 0 ? <ScoreTable sections={sections} /> : null}

        {arena.length > 0 ? (
          <div className="mt-5">
            <h3 className="text-sm font-medium">Image generation preference</h3>
            <p className="mt-1 max-w-[66ch] text-xs text-ink-mute">
              Arena Elo from public pairwise votes. No benchmark health record exists for
              an arena board, so there are no flags to show.
            </p>
            <ul className="mt-2 divide-y divide-rule border-y border-rule text-sm">
              {arena.map((score, index) => (
                <li
                  key={`${score.model_id}#${score.variant}#${score.benchmark_slug}#${score.measured_at ?? "none"}#${index}`}
                  className="flex gap-4 py-2"
                >
                  <span className="tabular">{Math.round(score.value)} Elo</span>
                  {score.confidence_interval !== null ? (
                    <span className="tabular text-ink-mute">
                      ±{score.confidence_interval.toFixed(1)}
                    </span>
                  ) : null}
                  {score.sample_size !== null ? (
                    <span className="tabular text-ink-mute">
                      {score.sample_size.toLocaleString("en")} votes
                    </span>
                  ) : null}
                  <ProvenanceBadge provenance={score.provenance} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </main>
  );
}
