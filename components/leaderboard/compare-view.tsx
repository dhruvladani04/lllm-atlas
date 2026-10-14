"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ModelCombobox } from "@/components/ui/model-combobox";
import { compareModels } from "@/lib/leaderboard/compare";
import type {
  CompareBenchmark,
  CompareScore,
  SuggestedPair,
} from "@/lib/leaderboard/compare";
import type { TableModel } from "@/lib/leaderboard/view";
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
 * The selection is in the URL (`?models=a,b`), so a comparison can be shared. The route is
 * static, so the first client render matches the server's empty selection and the URL is
 * read straight after hydration — the same trade the leaderboard tabs make, and for the
 * same reason: reading it during the first render is a hydration mismatch.
 */

const SLOTS = 3;

const subscribeToNothing = () => () => {};

function fromUrl(param: string | null, models: readonly PickableModel[]): string[] {
  const known = new Set(models.map((model) => model.model_id));
  const ids = (param ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => known.has(id))
    .slice(0, SLOTS);
  return Array.from({ length: SLOTS }, (_, index) => ids[index] ?? "");
}

/** `TableModel` keyed by id, which is what the picker and the identity table both need. */
export interface PickableModel extends TableModel {
  model_id: string;
}

export function CompareView({
  models,
  scores,
  benchmarks,
  suggestions,
}: {
  models: PickableModel[];
  scores: CompareScore[];
  benchmarks: Record<string, CompareBenchmark>;
  suggestions: SuggestedPair[];
}) {
  const params = useSearchParams();
  const hydrated = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
  // Null until the reader picks something: until then the URL is the selection.
  const [picked, setPicked] = useState<string[] | null>(null);
  const selected = picked ?? fromUrl(hydrated ? params.get("models") : null, models);

  const choose = (next: string[]) => {
    setPicked(next);
    const ids = next.filter((id) => id !== "");
    const url = ids.length === 0 ? "/compare" : `/compare?models=${ids.join(",")}`;
    // replaceState, not a navigation: the page is already here and has every model.
    window.history.replaceState(null, "", url);
  };

  const chosen = useMemo(
    () =>
      selected
        .filter((id) => id !== "")
        .map((id) => models.find((model) => model.model_id === id))
        .filter((model): model is PickableModel => model !== undefined),
    [models, selected],
  );

  const result = useMemo(
    () =>
      compareModels(
        scores,
        chosen.map((model) => model.model_id),
        benchmarks,
      ),
    [benchmarks, chosen, scores],
  );

  const set = (index: number, value: string) =>
    choose(selected.map((id, i) => (i === index ? value : id)));

  return (
    <div>
      <div className="flex flex-wrap items-end gap-4 border-y border-rule py-3">
        {Array.from({ length: SLOTS }, (_, index) => (
          <ModelCombobox
            key={index}
            label={`Model ${index + 1}`}
            models={models}
            value={selected[index] ?? ""}
            onChange={(value) => set(index, value)}
          />
        ))}
      </div>

      {chosen.length < 2 ? (
        <div className="mt-6">
          <p className="max-w-[66ch] text-sm text-ink-mute">
            Pick at least two models. Comparison here means a benchmark both were measured
            on — without that there is nothing honest to put side by side.
          </p>
          {suggestions.length > 0 ? (
            <div className="mt-4">
              <h2 className="text-sm font-medium">Or start from one of these</h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {suggestions.map((pair) => (
                  <li key={pair.label}>
                    <button
                      type="button"
                      onClick={() => choose([...pair.ids, ""])}
                      className="rounded-sm border border-rule-strong px-3 py-1.5 text-left text-sm hover:border-accent hover:text-accent"
                    >
                      {pair.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <>
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
                                    <ScoreCell
                                      value={cell.score.value}
                                      unit={cell.score.unit}
                                      confidenceInterval={cell.score.confidence_interval}
                                      flags={cell.score.health_flags}
                                    />
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

          {/* Identity last: the comparison is the point of the page, and the facts about each
              model are what a reader checks afterwards. */}
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
                          quoted={model.price_input}
                          format={(value) => `$${value.toFixed(2)}`}
                          missingReason="No price published"
                        />
                        <span className="text-ink-mute"> / </span>
                        <QuotedValue
                          quoted={model.price_output}
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
        </>
      )}
    </div>
  );
}
