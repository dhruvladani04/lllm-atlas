"use client";

import { useCallback, useMemo, useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import Link from "next/link";
import type { UnrankedRow } from "@/lib/leaderboard/rows";
import type { HealthFlag } from "@/lib/schemas/score";
import type { TableData, TableModel, TableRow } from "@/lib/leaderboard/view";
import { uniformColumns, type UniformColumns } from "@/lib/leaderboard/view";
import { formatTokenCount } from "@/lib/format/number";
import {
  HealthFlags,
  MissingValue,
  ProvenanceBadge,
  QuotedValue,
  ScoreCell,
  StatusChip,
} from "@/components/data/primitives";
import { FreshnessStamp } from "@/components/data/freshness-stamp";

/**
 * specs/03-sections/leaderboard.md — the index table.
 *
 * A score never appears without its benchmark's health and the number's provenance. If a
 * bare number ever renders in this file, that is a bug.
 *
 * Sorting and filtering are client-side over data prerendered at build time; nothing here
 * fetches anything.
 */

type SortKey = "score" | "eci" | "price" | "context" | "released" | "model";

const UNRANKED_REASON: Record<UnrankedRow["reason"], string> = {
  "no-score-on-reference": "scored, but not on this benchmark",
  "only-saturated-scores": "scored only on benchmarks that no longer discriminate",
  released_unranked: "released, not yet independently scored",
  announced: "announced, not yet servable",
};

/**
 * The ranking basis defending itself.
 *
 * Coverage beats health when picking a reference benchmark, which is the right rule and an
 * uncomfortable-looking one: this table currently ranks on a benchmark flagged "nearing
 * saturation" and "superseded". Stating the trade-off is the difference between a site that
 * contradicts its own thesis and one that applies it to itself.
 */
function ReferenceRationaleNote({
  reference,
  rationale,
}: {
  reference: NonNullable<TableData["reference"]>;
  rationale: TableData["rationale"];
}) {
  if (rationale === null) return null;

  const successorUnscored =
    rationale.successor !== null && rationale.successor.coverage === 0;
  const healthierThinner =
    rationale.healthier !== null && rationale.healthier.coverage < rationale.coverage;

  if (!successorUnscored && !healthierThinner) return null;

  return (
    <>
      It is not the healthiest benchmark here, and it is the basis anyway because it is the
      most measured:{" "}
      {successorUnscored ? (
        <>
          its successor{" "}
          <Link
            href={`/benchmarks/${rationale.successor?.slug}`}
            className="underline-offset-2 hover:underline"
          >
            {rationale.successor?.name}
          </Link>{" "}
          has no scores on this site yet, so ranking on it would rank nothing
        </>
      ) : (
        <>
          <Link
            href={`/benchmarks/${rationale.healthier?.slug}`}
            className="underline-offset-2 hover:underline"
          >
            {rationale.healthier?.name}
          </Link>{" "}
          is healthier but covers {rationale.healthier?.coverage} of the{" "}
          {rationale.coverage} model-variants {reference.name} does
        </>
      )}
      . Read the ranking as &ldquo;best on {reference.name}&rdquo;, not &ldquo;best&rdquo;.{" "}
    </>
  );
}

const PROVENANCE_SENTENCE: Record<TableRow["provenance"], string> = {
  independent: "Every number in this view was measured independently of the model's maker.",
  "vendor-reported":
    "Every number in this view was reported by the model's own maker, with no independent measurement to check it against.",
  mixed: "Every model in this view has both independent and vendor-reported numbers.",
};

/**
 * What the table means, said in text rather than in `title` attributes.
 *
 * `ind.` and the `~` after a price were explained only by tooltips, which do not exist on
 * touch and are announced inconsistently by screen readers — so on a phone the two marks
 * that carry the site's entire honesty claim were simply unexplained. They are written out
 * here instead, next to the statements for any column that collapsed because every row
 * agreed.
 */
/**
 * A collapsed column's fact, stated once, *above* the rows it applies to.
 *
 * Placement is the whole point. This section's governing rule is that a score never appears
 * without its provenance, and a footer legend technically satisfies that while letting a
 * reader meet forty-nine bare numbers first. Stated here, the caveat arrives before the
 * data — which is the same order the home page uses to make the argument.
 */
function CollapsedColumns({ uniform }: { uniform: UniformColumns }) {
  if (uniform.provenance === null && uniform.health === null) return null;

  return (
    <p className="max-w-[92ch] pb-3 text-sm text-ink-mute">
      {uniform.provenance !== null ? (
        <>{PROVENANCE_SENTENCE[uniform.provenance]} </>
      ) : null}
      {uniform.health !== null && uniform.health.length > 0 ? (
        <>
          Every benchmark behind these numbers carries the same warning,{" "}
          <HealthFlags flags={uniform.health} />.{" "}
        </>
      ) : null}
      {uniform.health !== null && uniform.health.length === 0 ? (
        <>No benchmark behind these numbers carries a health warning. </>
      ) : null}
      <span className="text-ink-mute">
        Shown once rather than repeated down a column that would read the same on every row.
      </span>
    </p>
  );
}

/**
 * The abbreviations, written out rather than hidden in `title` attributes.
 *
 * Tooltips do not exist on touch and are announced inconsistently by screen readers, so on
 * a phone the two marks carrying this site's honesty claim — `ind.` and the `~` on a routed
 * price — were simply unexplained. A `title` may repeat an explanation; it may never be the
 * only place one exists.
 */
function Legend({ uniform }: { uniform: UniformColumns }) {
  return (
    <div className="mt-3 space-y-1 border-t border-rule pt-3 text-xs text-ink-mute">
      {uniform.provenance === null ? (
        <p>
          <strong className="font-medium text-ink">Provenance:</strong>{" "}
          <span className="font-mono">ind.</span> means independently measured;{" "}
          <span className="font-mono">vendor</span> means reported by the model&rsquo;s own
          maker. The two are never averaged.
        </p>
      ) : null}

      <p>
        <strong className="font-medium text-ink">Prices:</strong> a{" "}
        <span className="font-mono">~</span> marks OpenRouter&rsquo;s routed price, used
        where the vendor&rsquo;s own page could not be read. It is not a list price.
      </p>
    </div>
  );
}

function daysSince(date: string | null): number | null {
  if (date === null) return null;
  const then = Date.parse(date);
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / 86_400_000);
}

export function LeaderboardTable({
  models,
  hidden,
  shown,
  fetchedAt,
}: {
  /** The tab's data with saturated benchmarks excluded from reference selection. */
  models: Record<string, TableModel>;
  hidden: TableData;
  /** The same tab with every benchmark eligible. */
  shown: TableData;
  fetchedAt: string | null;
}) {
  const [hideSaturated, setHideSaturated] = useState(true);
  const [sort, setSort] = useState<SortKey>("score");
  const [independentOnly, setIndependentOnly] = useState(false);
  const [openWeightsOnly, setOpenWeightsOnly] = useState(false);
  const [creator, setCreator] = useState<string>("all");
  const [body] = useAutoAnimate<HTMLTableSectionElement>();

  const data = hideSaturated ? hidden : shown;

  const meta = useCallback(
    (model_id: string): TableModel =>
      models[model_id] ?? {
        // A row whose model is missing from the lookup should still render its number
        // rather than disappear; the id is the most honest stand-in for a name.
        display_name: model_id,
        creator: "",
        open_weights: null,
        released_at: null,
        context_window: null,
        price_input: null,
        price_output: null,
      },
    [models],
  );

  const creators = useMemo(
    () =>
      [
        ...new Set(
          [...shown.rows, ...hidden.rows].map(
            (row) => models[row.model_id]?.creator ?? "",
          ),
        ),
      ]
        .filter((name) => name !== "")
        .sort(),
    [hidden.rows, models, shown.rows],
  );

  const rows = useMemo(() => {
    const filtered = data.rows.filter((row) => {
      if (independentOnly && row.provenance === "vendor-reported") return false;
      if (openWeightsOnly && models[row.model_id]?.open_weights !== true) return false;
      if (creator !== "all" && models[row.model_id]?.creator !== creator) return false;
      return true;
    });

    const value = (row: TableRow): number => {
      switch (sort) {
        case "eci":
          return row.eci ?? Number.NEGATIVE_INFINITY;
        case "price":
          return -(models[row.model_id]?.price_input?.value ?? Number.POSITIVE_INFINITY);
        case "context":
          return models[row.model_id]?.context_window?.value ?? Number.NEGATIVE_INFINITY;
        case "released":
          return (
            Date.parse(models[row.model_id]?.released_at ?? "") ||
            Number.NEGATIVE_INFINITY
          );
        default:
          return row.value;
      }
    };

    return [...filtered].sort((a, b) =>
      sort === "model"
        ? meta(a.model_id).display_name.localeCompare(meta(b.model_id).display_name)
        : value(b) - value(a),
    );
  }, [creator, data.rows, independentOnly, meta, models, openWeightsOnly, sort]);

  const uniform = useMemo(() => uniformColumns(rows), [rows]);

  const columns: { key: SortKey; label: string; numeric: boolean }[] = [
    { key: "model", label: "Model", numeric: false },
    {
      key: "score",
      label: data.reference === null ? "Capability" : data.reference.name,
      numeric: true,
    },
    { key: "eci", label: "Epoch index", numeric: true },
    { key: "context", label: "Context", numeric: true },
    { key: "price", label: "Price in / out", numeric: true },
    { key: "released", label: "Released", numeric: true },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-rule py-3 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={hideSaturated}
            onChange={(event) => setHideSaturated(event.target.checked)}
          />
          Hide saturated benchmarks
          {hideSaturated && data.excluded.benchmarks > 0 ? (
            <span className="text-xs text-ink-mute">
              (hiding {data.excluded.scores} score
              {data.excluded.scores === 1 ? "" : "s"} on {data.excluded.benchmarks}{" "}
              benchmark
              {data.excluded.benchmarks === 1 ? "" : "s"})
            </span>
          ) : null}
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={independentOnly}
            onChange={(event) => setIndependentOnly(event.target.checked)}
          />
          Independent measurements only
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={openWeightsOnly}
            onChange={(event) => setOpenWeightsOnly(event.target.checked)}
          />
          Open weights only
        </label>

        <label className="flex items-center gap-2">
          Creator
          <select
            className="rounded-sm border border-rule bg-surface px-2 py-1"
            value={creator}
            onChange={(event) => setCreator(event.target.value)}
          >
            <option value="all">all</option>
            {creators.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {data.reference === null ? (
        <p className="py-8 text-sm text-ink-mute">
          No benchmark in this tab has scores from more than one model, so there is
          nothing honest to rank on. Every model scored in this tab is listed below.
        </p>
      ) : (
        <p className="py-3 text-sm text-ink-mute">
          Ranked on{" "}
          <strong className="font-medium text-ink">{data.reference.name}</strong>{" "}
          <StatusChip status={data.reference.status} /> — the benchmark most models here
          are measured on. Scores on different benchmarks are not comparable, so only
          models measured on this one are ranked.{" "}
          {hideSaturated &&
          shown.reference !== null &&
          shown.reference.slug !== data.reference.slug ? (
            <>
              Showing saturated benchmarks would rank this table on{" "}
              <strong className="font-medium text-ink">{shown.reference.name}</strong>{" "}
              instead.{" "}
            </>
          ) : null}
          <ReferenceRationaleNote
            reference={data.reference}
            rationale={data.rationale}
          />
          <FreshnessStamp fetchedAt={fetchedAt} />
        </p>
      )}

      {data.rows.length > 0 ? (
        <div className="overflow-x-auto">
          <CollapsedColumns uniform={uniform} />
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-[5] bg-paper shadow-sm">
              <tr className="border-b border-rule-strong text-left">
                <th scope="col" className="py-2 pr-3 font-medium">
                  #
                </th>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    // Sorting is always high-to-low, so the active column is descending and
                    // every other one is unsorted. Without this a screen reader gets a
                    // button called "Sort by Price" and no way to hear that it is in effect.
                    aria-sort={
                      sort === column.key
                        ? column.key === "model"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                    className={`py-2 pr-3 font-medium ${column.numeric ? "text-right" : ""}`}
                  >
                    <button
                      type="button"
                      onClick={() => setSort(column.key)}
                      className="underline-offset-2 hover:text-accent hover:underline"
                      aria-label={`Sort by ${column.label}`}
                    >
                      {column.label}
                      {sort === column.key ? " ▾" : ""}
                    </button>
                  </th>
                ))}
                {uniform.provenance === null ? (
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Provenance
                  </th>
                ) : null}
                {uniform.health === null ? (
                  <th scope="col" className="py-2 font-medium">
                    Health
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody ref={body}>
              {rows.map((row, index) => {
                const model = meta(row.model_id);
                const age = daysSince(model.released_at);
                return (
                  <tr key={row.key} className="row-hover border-b border-rule">
                    <td className="tabular py-2 pr-3 text-ink-mute">{index + 1}</td>
                    <td className="py-2 pr-3">
                      <Link
                        href={`/models/${row.model_id}`}
                        prefetch={false}
                        className="underline-offset-2 hover:underline"
                      >
                        {model.display_name}
                      </Link>
                      {row.variant !== "base" ? (
                        <span className="font-mono text-xs text-ink-mute">
                          {" "}
                          ({row.variant})
                        </span>
                      ) : null}
                      {model.open_weights === true ? (
                        <span className="text-xs text-ink-mute" title="Open weights">
                          {" "}
                          ◇
                        </span>
                      ) : null}
                      <span className="block text-xs text-ink-mute">{model.creator}</span>
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <ScoreCell
                        value={row.value}
                        unit={row.unit}
                        confidenceInterval={row.confidence_interval}
                        flags={row.health_flags}
                      />
                    </td>
                    <td className="tabular py-2 pr-3 text-right">
                      {row.eci === null ? (
                        <MissingValue reason="Not covered by Epoch's capability index" />
                      ) : (
                        <span title="Epoch AI's Capability Index — a composite with no benchmark health record behind it">
                          {row.eci.toFixed(1)}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <QuotedValue
                        quoted={model.context_window}
                        format={formatTokenCount}
                        missingReason="No context window published by the vendor or OpenRouter"
                      />
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <QuotedValue
                        quoted={model.price_input}
                        format={(value) => `$${value.toFixed(2)}`}
                        missingReason="No price published by the vendor or OpenRouter"
                      />
                      <span className="text-ink-mute"> / </span>
                      <QuotedValue
                        quoted={model.price_output}
                        format={(value) => `$${value.toFixed(2)}`}
                        missingReason="No price published by the vendor or OpenRouter"
                      />
                    </td>
                    <td className="tabular py-2 pr-3 text-right whitespace-nowrap">
                      {model.released_at === null ? (
                        <MissingValue reason="No confirmed release date" />
                      ) : (
                        <>
                          {model.released_at}
                          {age !== null && age < 14 ? (
                            <span
                              className="text-xs"
                              style={{ color: "var(--status-active)" }}
                            >
                              {" "}
                              new
                            </span>
                          ) : null}
                        </>
                      )}
                    </td>
                    {uniform.provenance === null ? (
                      <td className="py-2 pr-3">
                        <ProvenanceBadge provenance={row.provenance} />
                      </td>
                    ) : null}
                    {uniform.health === null ? (
                      <td className="py-2">
                        <HealthFlags flags={row.health_flags} />
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="py-6 text-sm text-ink-mute">
              No model matches these filters. Clearing &ldquo;independent measurements
              only&rdquo; usually brings rows back.
            </p>
          ) : (
            <Legend uniform={uniform} />
          )}
        </div>
      ) : null}

      {data.unranked.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-lg font-medium">Not ranked here</h2>
          <p className="mt-1 max-w-[66ch] text-sm text-ink-mute">
            These models are on the site but cannot be placed in the ranking above. That
            is information rather than an omission: a model released days ago with no
            independent scores yet is worth seeing.
          </p>
          <ul className="mt-3 divide-y divide-rule border-y border-rule">
            {data.unranked.map((entry) => {
              const model = meta(entry.model_id);
              const age = daysSince(model.released_at);
              const { reason, scoreCount } = entry;
              return (
                <li key={entry.model_id} className="flex flex-wrap gap-x-3 py-2 text-sm">
                  <Link
                    href={`/models/${entry.model_id}`}
                    prefetch={false}
                    className="underline-offset-2 hover:underline"
                  >
                    {model.display_name}
                  </Link>
                  <span className="text-ink-mute">{model.creator}</span>
                  <span className="text-ink-mute">— {UNRANKED_REASON[reason]}</span>
                  {scoreCount > 0 ? (
                    <span className="text-ink-mute">
                      ({scoreCount} score{scoreCount === 1 ? "" : "s"} on other
                      benchmarks)
                    </span>
                  ) : null}
                  {age !== null ? (
                    <span className="tabular text-ink-mute">released {age} days ago</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
