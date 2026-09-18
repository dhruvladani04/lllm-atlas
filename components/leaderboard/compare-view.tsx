"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { compareModels } from "@/lib/leaderboard/compare";
import type { JoinedScore } from "@/lib/schemas/score";
import type { Model } from "@/lib/schemas/model";
import { formatTokenCount } from "@/lib/format/number";
import {
  HealthFlags,
  MissingValue,
  ProvenanceBadge,
  QuotedValue,
  ScoreCell,
  StatusChip,
} from "@/components/data/primitives";

/**
 * specs/03-sections/leaderboard.md — the comparison view.
 *
 * Selection lives in component state rather than the URL. The route is static, and reading
 * a search parameter during render is what forced the hydration mismatch the leaderboard
 * tabs had to be rewritten to avoid; a comparison is also a thing you assemble rather than
 * a thing you link to.
 */

const SLOTS = 3;

function Picker({
  models,
  value,
  onChange,
  label,
}: {
  models: readonly Model[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs text-ink-mute">{label}</span>
      <select
        className="rounded-sm border border-rule bg-surface px-2 py-1"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">none</option>
        {models.map((model) => (
          <option key={model.model_id} value={model.model_id}>
            {model.display_name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CompareView({
  models,
  scores,
}: {
  models: Model[];
  scores: JoinedScore[];
}) {
  const [selected, setSelected] = useState<string[]>(["", "", ""]);

  const chosen = useMemo(
    () =>
      selected
        .filter((id) => id !== "")
        .map((id) => models.find((model) => model.model_id === id))
        .filter((model): model is Model => model !== undefined),
    [models, selected],
  );

  const result = useMemo(
    () =>
      compareModels(
        scores,
        chosen.map((model) => model.model_id),
      ),
    [chosen, scores],
  );

  const set = (index: number, value: string) =>
    setSelected((current) => current.map((id, i) => (i === index ? value : id)));

  return (
    <div>
      <div className="flex flex-wrap items-end gap-4 border-y border-rule py-3">
        {Array.from({ length: SLOTS }, (_, index) => (
          <Picker
            key={index}
            label={`Model ${index + 1}`}
            models={models}
            value={selected[index] ?? ""}
            onChange={(value) => set(index, value)}
          />
        ))}
      </div>

      {chosen.length < 2 ? (
        <p className="mt-6 max-w-[66ch] text-sm text-ink-mute">
          Pick at least two models. Comparison here means a benchmark both were measured
          on — without that there is nothing honest to put side by side.
        </p>
      ) : (
        <>
          <section className="mt-8">
            <h2 className="text-lg font-medium">Identity</h2>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-rule-strong text-left">
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Field
                    </th>
                    {chosen.map((model) => (
                      <th
                        key={model.model_id}
                        scope="col"
                        className="py-2 pr-3 font-medium"
                      >
                        <Link
                          href={`/models/${model.model_id}`}
                          className="underline-offset-2 hover:underline"
                        >
                          {model.display_name}
                        </Link>
                        <span className="block text-xs font-normal text-ink-mute">
                          {model.creator}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="row-hover border-b border-rule">
                    <th scope="row" className="py-2 pr-3 text-left font-normal">
                      Released
                    </th>
                    {chosen.map((model) => (
                      <td key={model.model_id} className="tabular py-2 pr-3">
                        {model.released_at ?? (
                          <MissingValue reason="No confirmed release date" />
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className="row-hover border-b border-rule">
                    <th scope="row" className="py-2 pr-3 text-left font-normal">
                      Context
                    </th>
                    {chosen.map((model) => (
                      <td key={model.model_id} className="py-2 pr-3">
                        <QuotedValue
                          quoted={model.context_window}
                          format={formatTokenCount}
                          missingReason="No context window published by the vendor or OpenRouter"
                        />
                      </td>
                    ))}
                  </tr>
                  <tr className="row-hover border-b border-rule">
                    <th scope="row" className="py-2 pr-3 text-left font-normal">
                      Price in / out
                    </th>
                    {chosen.map((model) => (
                      <td key={model.model_id} className="py-2 pr-3">
                        <QuotedValue
                          quoted={model.price_input_per_mtok}
                          format={(value) => `$${value.toFixed(2)}`}
                          missingReason="No price published"
                        />
                        <span className="text-ink-mute"> / </span>
                        <QuotedValue
                          quoted={model.price_output_per_mtok}
                          format={(value) => `$${value.toFixed(2)}`}
                          missingReason="No price published"
                        />
                      </td>
                    ))}
                  </tr>
                  <tr className="row-hover border-b border-rule">
                    <th scope="row" className="py-2 pr-3 text-left font-normal">
                      Weights
                    </th>
                    {chosen.map((model) => (
                      <td key={model.model_id} className="py-2 pr-3">
                        {model.open_weights === null ? (
                          <MissingValue reason="Weight availability not recorded" />
                        ) : model.open_weights ? (
                          "open"
                        ) : (
                          "closed"
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-medium">Measured on the same benchmark</h2>
            <p className="mt-1 max-w-[66ch] text-sm text-ink-mute">
              The only rows where these numbers can be read against each other. Each still
              carries the health of the benchmark behind it — two models can be compared
              fairly on a test that no longer separates anyone, and the result still means
              little.
            </p>

            {result.comparable.length === 0 ? (
              <p className="mt-3 max-w-[66ch] text-sm text-ink-mute">
                No benchmark has a score for all of these models. That is a fact about
                what has been measured, not about the models.
              </p>
            ) : (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-rule-strong text-left">
                      <th scope="col" className="py-2 pr-3 font-medium">
                        Benchmark
                      </th>
                      {chosen.map((model) => (
                        <th
                          key={model.model_id}
                          scope="col"
                          className="py-2 pr-3 text-right font-medium"
                        >
                          {model.display_name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.comparable.map((row) => {
                      const best = Math.max(
                        ...row.cells.map((cell) => cell.score?.value ?? -Infinity),
                      );
                      return (
                        <tr
                          key={row.benchmark_slug}
                          className="row-hover border-b border-rule"
                        >
                          <th scope="row" className="py-2 pr-3 text-left font-normal">
                            <Link
                              href={`/benchmarks/${row.benchmark_slug}`}
                              className="underline-offset-2 hover:underline"
                            >
                              {row.benchmark_name}
                            </Link>
                            <span className="block">
                              <StatusChip status={row.status} />
                            </span>
                          </th>
                          {row.cells.map((cell) => (
                            <td
                              key={cell.model_id}
                              className="py-2 pr-3 text-right align-top"
                            >
                              {cell.score === null ? null : (
                                <>
                                  <span
                                    className={
                                      cell.score.value === best ? "font-medium" : ""
                                    }
                                  >
                                    <ScoreCell score={cell.score} />
                                  </span>
                                  <span className="mt-1 flex flex-wrap justify-end gap-2">
                                    <ProvenanceBadge provenance={cell.score.provenance} />
                                    <HealthFlags flags={cell.score.health_flags} />
                                  </span>
                                </>
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {result.incomplete.length > 0 ? (
            <section className="mt-8 border-l-2 border-rule pl-4">
              <h2 className="text-lg font-medium text-ink-mute">
                Measured on only some of them
              </h2>
              <p className="mt-1 max-w-[66ch] text-sm text-ink-mute">
                Shown so the absence is visible rather than implied. A blank here means
                nobody ran that benchmark on that model — it is not a low score, and
                reading it as one is the mistake this section exists to prevent.
              </p>
              <ul className="mt-3 divide-y divide-rule border-y border-rule text-sm">
                {result.incomplete.map((row) => (
                  <li key={row.benchmark_slug} className="py-2">
                    <Link
                      href={`/benchmarks/${row.benchmark_slug}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {row.benchmark_name}
                    </Link>
                    <span className="block text-xs text-ink-mute">
                      measured on{" "}
                      {row.cells
                        .filter((cell) => cell.score !== null)
                        .map(
                          (cell) =>
                            chosen.find((model) => model.model_id === cell.model_id)
                              ?.display_name ?? cell.model_id,
                        )
                        .join(", ")}{" "}
                      only
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
