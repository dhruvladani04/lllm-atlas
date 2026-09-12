"use client";

import { useMemo, useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import Link from "next/link";
import type { Benchmark } from "@/lib/schemas/benchmark";
import type { LeaderboardRow, UnrankedRow } from "@/lib/leaderboard/rows";
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

export interface TabData {
  reference: Benchmark | null;
  rows: LeaderboardRow[];
  unranked: UnrankedRow[];
  excluded: { benchmarks: number; scores: number };
}

type SortKey = "score" | "eci" | "price" | "context" | "released" | "model";

const UNRANKED_REASON: Record<UnrankedRow["reason"], string> = {
  "no-score-on-reference": "scored, but not on this benchmark",
  "only-saturated-scores": "scored only on benchmarks that no longer discriminate",
  released_unranked: "released, not yet independently scored",
  announced: "announced, not yet servable",
};

function daysSince(date: string | null): number | null {
  if (date === null) return null;
  const then = Date.parse(date);
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / 86_400_000);
}

export function LeaderboardTable({
  hidden,
  shown,
  fetchedAt,
}: {
  /** The tab's data with saturated benchmarks excluded from reference selection. */
  hidden: TabData;
  /** The same tab with every benchmark eligible. */
  shown: TabData;
  fetchedAt: string | null;
}) {
  const [hideSaturated, setHideSaturated] = useState(true);
  const [sort, setSort] = useState<SortKey>("score");
  const [independentOnly, setIndependentOnly] = useState(false);
  const [openWeightsOnly, setOpenWeightsOnly] = useState(false);
  const [creator, setCreator] = useState<string>("all");
  const [body] = useAutoAnimate<HTMLTableSectionElement>();

  const data = hideSaturated ? hidden : shown;

  const creators = useMemo(
    () =>
      [
        ...new Set([...shown.rows, ...hidden.rows].map((row) => row.model.creator)),
      ].sort(),
    [hidden.rows, shown.rows],
  );

  const rows = useMemo(() => {
    const filtered = data.rows.filter((row) => {
      if (independentOnly && row.provenance === "vendor-reported") return false;
      if (openWeightsOnly && row.model.open_weights !== true) return false;
      if (creator !== "all" && row.model.creator !== creator) return false;
      return true;
    });

    const value = (row: LeaderboardRow): number => {
      switch (sort) {
        case "eci":
          return row.capabilityIndex?.eci ?? Number.NEGATIVE_INFINITY;
        case "price":
          return -(row.model.price_input_per_mtok?.value ?? Number.POSITIVE_INFINITY);
        case "context":
          return row.model.context_window?.value ?? Number.NEGATIVE_INFINITY;
        case "released":
          return Date.parse(row.model.released_at ?? "") || Number.NEGATIVE_INFINITY;
        default:
          return row.score.value;
      }
    };

    return [...filtered].sort((a, b) =>
      sort === "model"
        ? a.model.display_name.localeCompare(b.model.display_name)
        : value(b) - value(a),
    );
  }, [creator, data.rows, independentOnly, openWeightsOnly, sort]);

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
            className="border border-rule bg-surface px-2 py-1"
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
          <FreshnessStamp fetchedAt={fetchedAt} />
        </p>
      )}

      {data.rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-rule-strong text-left">
                <th scope="col" className="py-2 pr-3 font-medium">
                  #
                </th>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={`py-2 pr-3 font-medium ${column.numeric ? "text-right" : ""}`}
                  >
                    <button
                      type="button"
                      onClick={() => setSort(column.key)}
                      className="underline-offset-2 hover:underline"
                      aria-label={`Sort by ${column.label}`}
                    >
                      {column.label}
                      {sort === column.key ? " ▾" : ""}
                    </button>
                  </th>
                ))}
                <th scope="col" className="py-2 pr-3 font-medium">
                  Provenance
                </th>
                <th scope="col" className="py-2 font-medium">
                  Health
                </th>
              </tr>
            </thead>
            <tbody ref={body}>
              {rows.map((row, index) => {
                const age = daysSince(row.model.released_at);
                return (
                  <tr
                    key={`${row.model.model_id}#${row.variant}`}
                    className="border-b border-rule"
                  >
                    <td className="tabular py-2 pr-3 text-ink-mute">{index + 1}</td>
                    <td className="py-2 pr-3">
                      <Link
                        href={`/models/${encodeURIComponent(row.model.model_id)}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {row.model.display_name}
                      </Link>
                      {row.variant !== "base" ? (
                        <span className="font-mono text-xs text-ink-mute">
                          {" "}
                          ({row.variant})
                        </span>
                      ) : null}
                      {row.model.open_weights === true ? (
                        <span className="text-xs text-ink-mute" title="Open weights">
                          {" "}
                          ◇
                        </span>
                      ) : null}
                      <span className="block text-xs text-ink-mute">
                        {row.model.creator}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <ScoreCell score={row.score} />
                    </td>
                    <td className="tabular py-2 pr-3 text-right">
                      {row.capabilityIndex === null ? (
                        <MissingValue reason="Not covered by Epoch's capability index" />
                      ) : (
                        <span title="Epoch AI's Capability Index — a composite with no benchmark health record behind it">
                          {row.capabilityIndex.eci.toFixed(1)}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <QuotedValue
                        quoted={row.model.context_window}
                        format={(value) => `${Math.round(value / 1000)}k`}
                        missingReason="No context window published by the vendor or OpenRouter"
                      />
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <QuotedValue
                        quoted={row.model.price_input_per_mtok}
                        format={(value) => `$${value.toFixed(2)}`}
                        missingReason="No price published by the vendor or OpenRouter"
                      />
                      <span className="text-ink-mute"> / </span>
                      <QuotedValue
                        quoted={row.model.price_output_per_mtok}
                        format={(value) => `$${value.toFixed(2)}`}
                        missingReason="No price published by the vendor or OpenRouter"
                      />
                    </td>
                    <td className="tabular py-2 pr-3 text-right whitespace-nowrap">
                      {row.model.released_at === null ? (
                        <MissingValue reason="No confirmed release date" />
                      ) : (
                        <>
                          {row.model.released_at}
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
                    <td className="py-2 pr-3">
                      <ProvenanceBadge provenance={row.provenance} />
                    </td>
                    <td className="py-2">
                      <HealthFlags flags={row.score.health_flags} />
                    </td>
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
          ) : null}
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
            {data.unranked.map(({ model, reason, scoreCount }) => {
              const age = daysSince(model.released_at);
              return (
                <li key={model.model_id} className="flex flex-wrap gap-x-3 py-2 text-sm">
                  <Link
                    href={`/models/${encodeURIComponent(model.model_id)}`}
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
