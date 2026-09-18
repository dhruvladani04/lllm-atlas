"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Benchmark } from "@/lib/schemas/benchmark";
import {
  DEFAULT_FILTERS,
  STATUS_ORDER,
  applyFilters,
  buildMatrix,
  languages,
  refreshCycles,
  type MatrixFilters,
} from "@/lib/benchmarks/matrix";
import { StatusChip } from "@/components/data/primitives";

/**
 * specs/03-sections/benchmarks.md — the index.
 *
 * Rows are capabilities, columns are status. Not redesigned into cards or a list: the grid
 * is the information, and it is what shows a reader that a whole capability area has gone
 * saturated.
 */

const RISKS = ["any", "low", "medium", "high", "unknown"] as const;

export function MatrixView({
  benchmarks,
  scoredSlugs,
}: {
  benchmarks: Benchmark[];
  scoredSlugs: string[];
}) {
  const [filters, setFilters] = useState<MatrixFilters>(DEFAULT_FILTERS);
  const scored = useMemo(() => new Set(scoredSlugs), [scoredSlugs]);

  const filtered = useMemo(
    () => applyFilters(benchmarks, filters, scored),
    [benchmarks, filters, scored],
  );
  const matrix = useMemo(() => buildMatrix(filtered), [filtered]);
  const cycles = useMemo(() => refreshCycles(benchmarks), [benchmarks]);
  const langs = useMemo(() => languages(benchmarks), [benchmarks]);

  const set = <K extends keyof MatrixFilters>(key: K, value: MatrixFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-rule py-3 text-sm">
        <label className="flex items-center gap-2">
          <span className="sr-only">Search benchmarks</span>
          <input
            type="search"
            value={filters.query}
            onChange={(event) => set("query", event.target.value)}
            placeholder="Search benchmarks"
            className="w-52 rounded-sm border border-rule bg-surface px-2 py-1"
          />
        </label>

        <label className="flex items-center gap-2">
          Contamination risk
          <select
            className="border border-rule bg-surface px-2 py-1"
            value={filters.contaminationRisk}
            onChange={(event) =>
              set(
                "contaminationRisk",
                event.target.value as MatrixFilters["contaminationRisk"],
              )
            }
          >
            {RISKS.map((risk) => (
              <option key={risk} value={risk}>
                {risk}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          Refresh cycle
          <select
            className="border border-rule bg-surface px-2 py-1"
            value={filters.refreshCycle}
            onChange={(event) => set("refreshCycle", event.target.value)}
          >
            <option value="any">any</option>
            {cycles.map((cycle) => (
              <option key={cycle} value={cycle}>
                {cycle}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          Language
          <select
            className="border border-rule bg-surface px-2 py-1"
            value={filters.language}
            onChange={(event) => set("language", event.target.value)}
          >
            <option value="any">any</option>
            {langs.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.hasScoresHere}
            onChange={(event) => set("hasScoresHere", event.target.checked)}
          />
          Has scores from models on this site
          <span className="text-xs text-ink-mute">({scoredSlugs.length})</span>
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-sm text-ink-mute">
          No benchmark matches these filters. The narrowest one is usually the language
          filter — most records list only the languages they were built for.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="mt-4 w-full border-collapse text-sm">
            <caption className="sr-only">
              Benchmarks by capability and status. Rows are capabilities, columns are how
              much the benchmark still discriminates between models.
            </caption>
            <thead>
              <tr className="border-b border-rule-strong text-left">
                <th scope="col" className="w-40 py-2 pr-4 font-medium">
                  Capability
                </th>
                {STATUS_ORDER.map((status) => (
                  <th key={status} scope="col" className="py-2 pr-4 font-medium">
                    <StatusChip status={status} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row) => (
                <tr key={row.capability} className="border-b border-rule align-top">
                  <th scope="row" className="py-3 pr-4 text-left font-medium">
                    {row.capability}
                    <span className="block text-xs font-normal text-ink-mute">
                      {row.total} benchmark{row.total === 1 ? "" : "s"}
                    </span>
                    {row.allRetired ? (
                      <span
                        className="block text-xs font-normal"
                        style={{ color: "var(--status-deprecated)" }}
                      >
                        nothing here still discriminates
                      </span>
                    ) : null}
                  </th>
                  {row.cells.map((cell) => (
                    <td key={cell.status} className="py-3 pr-4">
                      {cell.benchmarks.length === 0 ? (
                        <span className="text-ink-mute" aria-label="none">
                          ·
                        </span>
                      ) : (
                        <ul className="space-y-1">
                          {cell.benchmarks.map((benchmark) => (
                            <li key={benchmark.slug}>
                              <Link
                                href={`/benchmarks/${benchmark.slug}`}
                                className="underline-offset-2 hover:underline"
                                style={{
                                  color:
                                    cell.status === "saturated" ||
                                    cell.status === "deprecated"
                                      ? "var(--ink-mute)"
                                      : "var(--ink)",
                                }}
                              >
                                {benchmark.name}
                              </Link>
                              {benchmark.contamination.risk === "high" ? (
                                <span
                                  title="High contamination risk"
                                  style={{ color: "var(--risk-high)" }}
                                >
                                  {" "}
                                  !
                                </span>
                              ) : null}
                              {scored.has(benchmark.slug) ? (
                                <span
                                  className="text-xs text-ink-mute"
                                  title="Models on this site have scores on this benchmark"
                                >
                                  {" "}
                                  ◇
                                </span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-ink-mute">
        <span aria-hidden="true">! </span>high contamination risk ·{" "}
        <span aria-hidden="true">◇ </span>has scores from models on this site
      </p>
    </div>
  );
}
