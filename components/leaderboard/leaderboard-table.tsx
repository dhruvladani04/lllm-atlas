"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import Link from "next/link";
import type { UnrankedRow } from "@/lib/leaderboard/rows";
import type { HealthFlag } from "@/lib/schemas/score";
import type {
  TableData,
  TableModel,
  TableRow,
  TableUnranked,
} from "@/lib/leaderboard/view";
import {
  bestConfigurationPerModel,
  particularFlags,
  uniformColumns,
  type CollapsedRow,
  type UniformColumns,
} from "@/lib/leaderboard/view";
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
import { CreatorLogo } from "@/components/ui/creator-logo";
import { primaryCreator } from "@/lib/format/display-name";
import { Legend, MODEL_TABLE_MARKS } from "@/components/data/legend";
import { LazyPriceScoreChart } from "@/components/leaderboard/lazy-price-score-chart";
import {
  STACKED_BADGES,
  STACKED_CELL,
  STACKED_META,
  STACKED_ROW,
} from "@/components/data/stacked-row";

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
      It is not the healthiest benchmark here, and it is the basis anyway because it is
      the most measured:{" "}
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
      . Read the ranking as &ldquo;best on {reference.name}&rdquo;, not
      &ldquo;best&rdquo;.{" "}
    </>
  );
}

const PROVENANCE_SENTENCE: Record<TableRow["provenance"], string> = {
  independent:
    "Every number in this view was measured independently of the model's maker.",
  "vendor-reported":
    "Every number in this view was reported by the model's own maker, with no independent measurement to check it against.",
  mixed: "Every model in this view has both independent and vendor-reported numbers.",
};

/**
 * A collapsed column's fact, stated once, *above* the rows it applies to.
 *
 * Placement is the whole point. This section's governing rule is that a score never appears
 * without its provenance, and a footer legend technically satisfies that while letting a
 * reader meet forty-nine bare numbers first. Stated here, the caveat arrives before the
 * data — which is the same order the home page uses to make the argument.
 */
function CollapsedColumns({ uniform }: { uniform: UniformColumns }) {
  if (
    uniform.provenance === null &&
    uniform.health === null &&
    uniform.sharedHealth.length === 0
  ) {
    return null;
  }

  return (
    <>
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
      {uniform.health === null && uniform.sharedHealth.length > 0 ? (
        <>
          Every row carries <HealthFlags flags={uniform.sharedHealth} />; the Health
          column shows only what a row adds to that.{" "}
        </>
      ) : null}
      Shown once rather than repeated down a column that would read the same on every row.
    </>
  );
}

/**
 * A bar under a percentage, drawn from zero.
 *
 * From zero and never from the lowest score on screen: a bar that starts at the minimum
 * turns 93% against 96% into a bar a third the length of another, which is a bigger lie
 * than no bar. The cost is that close scores look close, which is the truth. Only for
 * percentages — an Elo or an index has no zero to draw from.
 */
function ScoreBar({ value }: { value: number }) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <span aria-hidden="true" className="mt-1 ml-auto block h-1 w-20 rounded-full bg-rule">
      <span
        className="block h-1 rounded-full"
        style={{
          width: `${width}%`,
          backgroundColor: "color-mix(in srgb, var(--ink) 55%, transparent)",
        }}
      />
    </span>
  );
}

const STATUS_TEXT: Record<TableRow["benchmark_status"], string> = {
  active: "● active",
  "nearing-saturation": "◐ nearing saturation",
  saturated: "○ saturated",
  deprecated: "× deprecated",
};

/** How many rows render before the reader asks for the rest. */
const PAGE_SIZE = 25;

const PROVENANCE_SHORT: Record<TableRow["provenance"], string> = {
  independent: "every number independently measured",
  "vendor-reported": "every number reported by the model's own maker",
  mixed: "every model has both independent and vendor-reported numbers",
};

/**
 * The ranking's caveats in one line, with the reasoning one click away.
 *
 * What stays visible is everything a reader needs in order to decide how far to trust the
 * table: which benchmark ranks it, that benchmark's status, any health flag or provenance
 * shared by every row, how much of the field the ranking covers, and how old the data is.
 * What moves behind "Why this ranking?" is only the explanation of why those things are
 * so. Hiding the facts and keeping the prose would have been the wrong way round.
 */
function RankingSummary({
  data,
  alternative,
  uniform,
  coverage,
  fetchedAt,
  chosen = null,
}: {
  /** The default basis's name, when the reader chose a different one. */
  chosen?: string | null;
  data: TableData;
  /** The benchmark the table would rank on if saturated ones were shown, when different. */
  alternative: string | null;
  uniform: UniformColumns;
  coverage: { scored: number; total: number };
  fetchedAt: string | null;
}) {
  const reference = data.reference;
  if (reference === null) return null;

  // The status chip already says saturated or deprecated.
  const shared = uniform.sharedHealth.filter(
    (flag) => flag !== "saturated" && flag !== "deprecated",
  );

  return (
    <div className="py-3 text-sm">
      <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-ink-mute">
        <span>
          Ranked on{" "}
          <Link
            href={`/benchmarks/${reference.slug}`}
            prefetch={false}
            className="font-medium text-ink underline-offset-2 hover:underline"
          >
            {reference.name}
          </Link>
        </span>
        <StatusChip status={reference.status} />
        {chosen !== null ? (
          <span className="text-xs">
            your choice; the default is {chosen}, the most measured
          </span>
        ) : null}
        {shared.length > 0 ? (
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <HealthFlags flags={shared} />
            <span className="text-xs">on every row</span>
          </span>
        ) : null}
        {uniform.provenance !== null ? (
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <ProvenanceBadge provenance={uniform.provenance} />
            <span className="text-xs">{PROVENANCE_SHORT[uniform.provenance]}</span>
          </span>
        ) : null}
        <span>
          {coverage.scored} of {coverage.total} benchmarks have scores
        </span>
        <FreshnessStamp fetchedAt={fetchedAt} />
      </p>

      <details className="mt-2">
        <summary className="w-fit cursor-pointer text-ink underline-offset-2 hover:text-accent hover:underline">
          Why this ranking?
        </summary>
        <div className="mt-2 max-w-[76ch] space-y-2 text-ink-mute">
          <p>
            {reference.name} is the benchmark most models here are measured on. Scores on
            different benchmarks are not comparable, so only models measured on this one
            are ranked.{" "}
            {alternative !== null ? (
              <>
                Showing saturated benchmarks would rank this table on{" "}
                <strong className="font-medium text-ink">{alternative}</strong>{" "}
                instead.{" "}
              </>
            ) : null}
            <ReferenceRationaleNote reference={reference} rationale={data.rationale} />
          </p>
          {/* The ranking's reach, said where the ranking is — not only at the bottom of
              /benchmarks. Without this the table reads as "the state of the field" when it
              is really "what the sources this site can legally redistribute have
              measured". */}
          <p>
            {coverage.scored} of the {coverage.total} benchmarks tracked here have any
            score at all, so this ranking describes the part of the field that Epoch and
            Arena have measured, not the whole of it.{" "}
            <Link href="/benchmarks" className="underline">
              The other {coverage.total - coverage.scored} are catalogued with their
              health
            </Link>
            .
          </p>
          {uniform.provenance !== null ||
          uniform.health !== null ||
          uniform.sharedHealth.length > 0 ? (
            <p>
              <CollapsedColumns uniform={uniform} />
            </p>
          ) : null}
        </div>
      </details>
    </div>
  );
}

/** A row's own flags; the ones every row shares are stated once above the table. */
function RowFlags({ flags }: { flags: readonly HealthFlag[] }) {
  if (flags.length === 0) {
    return (
      <span className="text-ink-mute" title="No flags beyond those on every row">
        <span aria-hidden="true">—</span>
        <span className="sr-only">no flags beyond those on every row</span>
      </span>
    );
  }
  return <HealthFlags flags={flags} />;
}

const UNRANKED_GROUPS: { reason: UnrankedRow["reason"]; label: string }[] = [
  { reason: "released_unranked", label: "Released, not yet scored" },
  { reason: "no-score-on-reference", label: "Scored on other benchmarks" },
  { reason: "only-saturated-scores", label: "Only on saturated benchmarks" },
  { reason: "announced", label: "Announced, not yet servable" },
];

/**
 * One reason's models, rendered only once opened.
 *
 * The four lists hold 170 to 330 models between them, and rendered closed they were 43% of
 * the leaderboard's DOM — every node of it hydrated on load for a list most readers never
 * open, on a page whose main-thread time was the one Lighthouse score below target. The
 * count in the summary is the information; the names arrive when asked for.
 */
function UnrankedGroup({
  label,
  entries,
  meta,
}: {
  label: string;
  entries: readonly TableUnranked[];
  meta: (model_id: string) => TableModel;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="py-2"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer text-sm hover:text-accent">
        {label} <span className="tabular text-ink-mute">({entries.length})</span>
      </summary>
      {open ? <UnrankedList entries={entries} meta={meta} /> : null}
    </details>
  );
}

function UnrankedList({
  entries,
  meta,
  showReason = false,
}: {
  entries: readonly TableUnranked[];
  meta: (model_id: string) => TableModel;
  /** A search mixes groups, so each line has to say which one it came from. */
  showReason?: boolean;
}) {
  if (entries.length === 0) {
    return (
      <p className="py-3 text-sm text-ink-mute">No model here matches that search.</p>
    );
  }
  return (
    <ul className="mt-2 divide-y divide-rule">
      {entries.map((entry) => {
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
            {showReason ? (
              <span className="text-ink-mute">— {UNRANKED_REASON[reason]}</span>
            ) : null}
            {scoreCount > 0 ? (
              <span className="text-ink-mute">
                ({scoreCount} score{scoreCount === 1 ? "" : "s"} on other benchmarks)
              </span>
            ) : null}
            {age !== null ? (
              <span className="tabular text-ink-mute">released {age} days ago</span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function daysSince(date: string | null): number | null {
  if (date === null) return null;
  const then = Date.parse(date);
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / 86_400_000);
}

export function LeaderboardTable({
  tab,
  shownReference,
  models,
  hidden,
  shown,
  fetchedAt,
  coverage,
  basis,
  onBasisChange,
}: {
  tab: "text" | "agentic";
  /** The benchmark the reader chose to rank on, from the URL; null for the default. */
  basis: string | null;
  onBasisChange: (slug: string | null) => void;
  /** The tab's data with saturated benchmarks excluded from reference selection. */
  models: Record<string, TableModel>;
  hidden: TableData;
  /**
   * The same tab with every benchmark eligible, or null when it is to be fetched: it is
   * nearly a copy of `hidden`, and shipping both doubled the page's largest payload for a
   * view most readers never switch to.
   */
  shown: TableData | null;
  /** The benchmark the saturated view would rank on, named without loading that view. */
  shownReference: string | null;
  fetchedAt: string | null;
  /** Benchmarks with any score on this site, against every benchmark tracked. */
  coverage: { scored: number; total: number };
}) {
  const [hideSaturated, setHideSaturated] = useState(true);
  const [sort, setSort] = useState<SortKey>("score");
  const [independentOnly, setIndependentOnly] = useState(false);
  const [openWeightsOnly, setOpenWeightsOnly] = useState(false);
  const [creator, setCreator] = useState<string>("all");
  const [everyConfig, setEveryConfig] = useState(false);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [unrankedQuery, setUnrankedQuery] = useState("");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [body] = useAutoAnimate<HTMLTableSectionElement>();

  const view = hideSaturated ? "hidden" : "shown";
  const [fetched, setFetched] = useState<Record<string, TableData>>({});
  const [failed, setFailed] = useState<string | null>(null);
  const shownData = shown ?? fetched[`${tab}/shown/default`] ?? null;
  // Until the saturated view has loaded, its options are not known; the default view's
  // stand in, and the rows are dimmed while it loads.
  const base = hideSaturated ? hidden : (shownData ?? hidden);

  // Another basis is honoured only if this view offers it: a saturated benchmark chosen
  // before "hide saturated" was switched back on falls back to the default, visibly.
  const wanted =
    basis !== null &&
    basis !== base.defaultSlug &&
    base.options.some((option) => option.slug === basis)
      ? basis
      : null;
  const key =
    wanted !== null
      ? `${tab}/${view}/${wanted}`
      : !hideSaturated && shown === null
        ? `${tab}/shown/default`
        : null;
  const loading = key !== null && fetched[key] === undefined && failed !== key;
  const data = key !== null ? (fetched[key] ?? base) : base;

  // The page ships only the default ranking. Any other is a static file written at build
  // time, fetched when asked for and kept for the visit.
  useEffect(() => {
    if (key === null || fetched[key] !== undefined) return;
    let cancelled = false;
    fetch(`/api/ranking/${key}`)
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<TableData>;
      })
      .then((result) => {
        if (!cancelled) setFetched((current) => ({ ...current, [key]: result }));
      })
      .catch(() => {
        if (!cancelled) setFailed(key);
      });
    return () => {
      cancelled = true;
    };
  }, [fetched, key]);

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
          // By primary creator: a joint release is listed under its first organisation
          // rather than as a 163-character option of its own.
          [...(shown?.rows ?? []), ...hidden.rows].map((row) =>
            primaryCreator(models[row.model_id]?.creator ?? ""),
          ),
        ),
      ]
        .filter((name) => name !== "")
        .sort(),
    [hidden.rows, models, shown?.rows],
  );

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const filtered = data.rows.filter((row) => {
      if (independentOnly && row.provenance === "vendor-reported") return false;
      if (openWeightsOnly && models[row.model_id]?.open_weights !== true) return false;
      if (
        creator !== "all" &&
        primaryCreator(models[row.model_id]?.creator ?? "") !== creator
      ) {
        return false;
      }
      if (needle !== "") {
        // The id is searchable as well as the name: it is what the URL shows and what
        // someone who already knows the model is most likely to type.
        const model = models[row.model_id];
        const haystack = [row.model_id, model?.display_name ?? "", model?.creator ?? ""]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
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

    // Collapse before sorting, so the sort orders models rather than configurations.
    const pool: CollapsedRow[] = everyConfig
      ? filtered.map((row) => ({ ...row, configurations: 1 }))
      : bestConfigurationPerModel(filtered);

    return pool.sort((a, b) =>
      sort === "model"
        ? meta(a.model_id).display_name.localeCompare(meta(b.model_id).display_name)
        : value(b) - value(a),
    );
  }, [
    creator,
    data.rows,
    everyConfig,
    independentOnly,
    meta,
    models,
    openWeightsOnly,
    query,
    sort,
  ]);

  // Uniformity is judged over every matching row, not only the ones on screen, so asking
  // for the rest can never contradict the sentence above the table.
  const uniform = useMemo(() => uniformColumns(rows), [rows]);
  const visible = showAll ? rows : rows.slice(0, PAGE_SIZE);

  // "Hide saturated" counts: it is on by default and it does remove rows.
  const activeFilters = [
    hideSaturated,
    everyConfig,
    independentOnly,
    openWeightsOnly,
    creator !== "all",
  ].filter(Boolean).length;

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
        <label className="flex items-center gap-2 max-md:min-w-0 max-md:flex-1">
          <span className="sr-only">Search models</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search models"
            className="w-44 rounded-sm border border-rule bg-surface px-2 py-1 max-md:w-full"
          />
        </label>

        {/* On a phone six controls wrapped over five lines above the table. They sit
            behind one button there, which says how many are switched on so a filtered
            table never looks like an unfiltered one. */}
        <button
          type="button"
          aria-expanded={filtersOpen}
          aria-controls="leaderboard-filters"
          onClick={() => setFiltersOpen((value) => !value)}
          className="rounded-sm border border-rule-strong px-2 py-1 hover:border-accent hover:text-accent md:hidden"
        >
          Filters{activeFilters > 0 ? ` (${activeFilters} on)` : ""}
        </button>

        <div
          id="leaderboard-filters"
          className={`basis-full flex-col gap-y-3 md:contents ${filtersOpen ? "flex" : "hidden"}`}
        >
          <label className="flex flex-wrap items-center gap-2 md:order-first">
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
              checked={everyConfig}
              onChange={(event) => setEveryConfig(event.target.checked)}
            />
            Show every configuration
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
              // A select sizes itself to its widest option, and one creator is a
              // 163-character list of six collaborating universities — honest data that
              // blew the filter bar to 1169px at a 360px viewport. The value stays whole;
              // only the control is bounded.
              className="max-w-[12rem] truncate rounded-sm border border-rule bg-surface px-2 py-1"
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

          {/* Rows on a phone are blocks, so density only exists from md up. */}
          <fieldset className="flex items-center gap-3 max-md:hidden">
            <legend className="sr-only">Row density</legend>
            {(["comfortable", "compact"] as const).map((value) => (
              <label key={value} className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="density"
                  value={value}
                  checked={density === value}
                  onChange={() => setDensity(value)}
                />
                {value === "comfortable" ? "Comfortable" : "Compact"}
              </label>
            ))}
          </fieldset>

          {/* The column headers are the sort control on a wide screen. A stacked row has
              no headers to press, so the same choice is offered here. */}
          <label className="flex items-center gap-2 md:hidden">
            Sort by
            <select
              className="rounded-sm border border-rule bg-surface px-2 py-1"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
            >
              {columns.map((column) => (
                <option key={column.key} value={column.key}>
                  {column.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {base.options.length > 1 ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-3 text-sm">
          <label className="flex max-w-full min-w-0 flex-wrap items-center gap-2">
            Rank on
            <select
              value={wanted ?? base.defaultSlug ?? ""}
              onChange={(event) =>
                onBasisChange(
                  event.target.value === base.defaultSlug ? null : event.target.value,
                )
              }
              // A select sizes itself to its longest option; bounded so a long benchmark name
              // and its status cannot push a phone screen sideways.
              className="w-full max-w-[24rem] min-w-0 truncate rounded-sm border border-rule bg-surface px-2 py-1 sm:w-auto"
            >
              {base.options.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.name} — {STATUS_TEXT[option.status]}, {option.coverage} rows
                  {option.slug === base.defaultSlug ? " (most measured)" : ""}
                </option>
              ))}
            </select>
          </label>
          {wanted !== null ? (
            <button
              type="button"
              onClick={() => onBasisChange(null)}
              className="text-ink-mute underline underline-offset-2 hover:text-accent"
            >
              Back to the default
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Fetching another ranking, or the saturated view, is the one wait on the site, so it
          says what it is waiting for. */}
      <p role="status" className="text-xs text-ink-mute empty:hidden">
        {loading
          ? wanted !== null
            ? `Loading the ranking on ${base.options.find((o) => o.slug === wanted)?.name}…`
            : "Loading the view with saturated benchmarks…"
          : failed !== null && failed === key
            ? "That view could not be loaded; showing the default ranking."
            : ""}
      </p>

      {data.reference === null ? (
        <p className="py-8 text-sm text-ink-mute">
          No benchmark in this tab has scores from more than one model, so there is
          nothing honest to rank on. Every model scored in this tab is listed below.
        </p>
      ) : (
        <RankingSummary
          data={data}
          alternative={
            hideSaturated &&
            shownReference !== null &&
            shownReference !== data.reference.name
              ? shownReference
              : null
          }
          uniform={uniform}
          coverage={coverage}
          fetchedAt={fetchedAt}
          chosen={
            wanted !== null && data !== base
              ? (base.options.find((option) => option.slug === base.defaultSlug)?.name ??
                null)
              : null
          }
        />
      )}

      {data.rows.length > 0 ? (
        <div aria-busy={loading} className={loading ? "opacity-50" : ""}>
          {/* No overflow wrapper. `overflow-x: auto` makes the wrapper a scroll container, and a
              sticky header then pins to the wrapper rather than the viewport — so it never
              stuck. Below 768px rows stack and need no sideways room; from 768px up the table
              fits, which the e2e suite measures at 768 and 1024px. */}
          <div className="pb-3">
            <Legend items={MODEL_TABLE_MARKS} />
          </div>
          <table
            role="table"
            data-density={density}
            className="w-full border-collapse text-sm"
          >
            {/* Read out but not drawn on a phone, where each cell carries its own label. */}
            <thead
              role="rowgroup"
              className="z-[5] bg-paper max-md:sr-only md:sticky md:top-0 md:shadow-sm"
            >
              <tr role="row" className="border-b border-rule-strong text-left">
                <th role="columnheader" scope="col" className="py-2 pr-3 font-medium">
                  #
                </th>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    role="columnheader"
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
                    {/* Plain text where the header is not drawn: a focusable button nobody
                        can see is a keyboard trap for sighted users. */}
                    <span className="md:hidden">{column.label}</span>
                    <button
                      type="button"
                      onClick={() => setSort(column.key)}
                      className="underline-offset-2 hover:text-accent hover:underline max-md:hidden"
                      aria-label={`Sort by ${column.label}`}
                    >
                      {column.label}
                      {sort === column.key ? " ▾" : ""}
                    </button>
                  </th>
                ))}
                {uniform.provenance === null ? (
                  <th role="columnheader" scope="col" className="py-2 pr-3 font-medium">
                    Provenance
                  </th>
                ) : null}
                {uniform.health === null ? (
                  <th role="columnheader" scope="col" className="py-2 font-medium">
                    Health
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody role="rowgroup" ref={body}>
              {visible.map((row, index) => {
                const model = meta(row.model_id);
                const age = daysSince(model.released_at);
                return (
                  <tr role="row" key={row.key} className={`row-hover ${STACKED_ROW}`}>
                    <td role="cell" className={`tabular text-ink-mute ${STACKED_CELL}`}>
                      {index + 1}
                    </td>
                    <td
                      role="cell"
                      className={`max-md:min-w-0 max-md:pb-1 ${STACKED_CELL}`}
                    >
                      <Link
                        href={`/models/${row.model_id}`}
                        prefetch={false}
                        className="underline-offset-2 hover:underline"
                      >
                        {model.display_name}
                      </Link>
                      {row.variant !== "base" ? (
                        <span
                          className="font-mono text-xs text-ink-mute"
                          title="The setting this score was measured at, such as reasoning effort"
                        >
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
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-mute">
                        <CreatorLogo creator={model.creator} />
                        {model.creator}
                        {/* Which configuration won, and how many it beat. A collapsed row
                            that hid this would be the silent merge the spec forbids. */}
                        {row.configurations > 1 ? (
                          <> · best of {row.configurations} configurations</>
                        ) : null}
                      </span>
                    </td>
                    <td
                      role="cell"
                      className={`text-right max-md:text-base ${STACKED_CELL}`}
                    >
                      <ScoreCell
                        value={row.value}
                        unit={row.unit}
                        confidenceInterval={row.confidence_interval}
                        flags={row.health_flags}
                      />
                      {row.unit === "percent" ? <ScoreBar value={row.value} /> : null}
                    </td>
                    <td
                      role="cell"
                      data-label="Epoch index"
                      className={`tabular text-right ${STACKED_CELL} ${STACKED_META}`}
                    >
                      {row.eci === null ? (
                        <MissingValue reason="Not covered by Epoch's capability index" />
                      ) : (
                        <span title="Epoch AI's Capability Index — a composite with no benchmark health record behind it">
                          {row.eci.toFixed(1)}
                        </span>
                      )}
                    </td>
                    <td
                      role="cell"
                      data-label="Context"
                      className={`text-right ${STACKED_CELL} ${STACKED_META}`}
                    >
                      <QuotedValue
                        quoted={model.context_window}
                        format={formatTokenCount}
                        missingReason="No context window published by the vendor or OpenRouter"
                      />
                    </td>
                    <td
                      role="cell"
                      data-label="Price in / out"
                      className={`text-right ${STACKED_CELL} ${STACKED_META}`}
                    >
                      <span>
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
                      </span>
                    </td>
                    <td
                      role="cell"
                      data-label="Released"
                      className={`tabular text-right whitespace-nowrap ${STACKED_CELL} ${STACKED_META}`}
                    >
                      {model.released_at === null ? (
                        <MissingValue reason="No confirmed release date" />
                      ) : (
                        <span>
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
                        </span>
                      )}
                    </td>
                    {uniform.provenance === null ? (
                      <td role="cell" className={`${STACKED_CELL} ${STACKED_BADGES}`}>
                        <ProvenanceBadge provenance={row.provenance} />
                      </td>
                    ) : null}
                    {uniform.health === null ? (
                      <td role="cell" className={`py-2 max-md:p-0 ${STACKED_BADGES}`}>
                        <RowFlags
                          flags={particularFlags(row.health_flags, uniform.sharedHealth)}
                        />
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
            <>
              {/* Twenty-five rows answer "who is ahead"; the other hundreds are one press
                  away and say so. Nothing is dropped — the count is always stated. */}
              {rows.length > PAGE_SIZE ? (
                <p className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4 text-sm text-ink-mute">
                  <span>
                    Showing {visible.length} of {rows.length} ranked rows.
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAll((value) => !value)}
                    className="rounded-sm border border-rule-strong px-2 py-1 text-ink hover:border-accent hover:text-accent"
                  >
                    {showAll ? `Show the top ${PAGE_SIZE}` : `Show all ${rows.length}`}
                  </button>
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {data.reference !== null && rows.length > 0 ? (
        <LazyPriceScoreChart
          rows={rows}
          models={models}
          benchmarkName={data.reference.name}
        />
      ) : null}

      {data.unranked.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-lg font-medium">Not ranked here</h2>
          <p className="mt-1 max-w-[66ch] text-sm text-ink-mute">
            {data.unranked.length} models are on the site but cannot be placed in the
            ranking above. That is information rather than an omission: a model released
            days ago with no independent scores yet is worth seeing.
          </p>

          <label className="mt-3 flex items-center gap-2 text-sm">
            <span className="sr-only">Search models not ranked here</span>
            <input
              type="search"
              value={unrankedQuery}
              onChange={(event) => setUnrankedQuery(event.target.value)}
              placeholder="Search these models"
              className="w-60 rounded-sm border border-rule bg-surface px-2 py-1 max-md:w-full"
            />
          </label>

          {/* Collapsed by default, by reason. The list ran to 170 lines and made the page
              15,000px taller on a phone; the counts carry the information and the names are
              one press away. A search shows every match at once, whatever its group. */}
          {unrankedQuery.trim() === "" ? (
            <div className="mt-3 divide-y divide-rule border-y border-rule">
              {UNRANKED_GROUPS.map(({ reason, label }) => {
                const entries = data.unranked.filter((entry) => entry.reason === reason);
                if (entries.length === 0) return null;
                return (
                  <UnrankedGroup
                    key={reason}
                    label={label}
                    entries={entries}
                    meta={meta}
                  />
                );
              })}
            </div>
          ) : (
            <UnrankedList
              entries={data.unranked.filter((entry) => {
                const model = meta(entry.model_id);
                return [entry.model_id, model.display_name, model.creator]
                  .join(" ")
                  .toLowerCase()
                  .includes(unrankedQuery.trim().toLowerCase());
              })}
              meta={meta}
              showReason
            />
          )}
        </section>
      ) : null}
    </div>
  );
}
