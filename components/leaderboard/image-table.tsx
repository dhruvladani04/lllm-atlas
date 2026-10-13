import Link from "next/link";
import type { TableModel } from "@/lib/leaderboard/view";
import type { Score } from "@/lib/schemas/score";
import type { SourceMeta } from "@/lib/schemas/common";
import { FreshnessStamp } from "@/components/data/freshness-stamp";
import { MissingValue } from "@/components/data/primitives";
import { CreatorLogo } from "@/components/ui/creator-logo";
import { STACKED_CELL, STACKED_META, STACKED_ROW } from "@/components/data/stacked-row";

/**
 * specs/03-sections/leaderboard.md — the image tab.
 *
 * Elo, confidence interval, arena appearance count, source. No capability index, because
 * there isn't an honest one for image generation. These rows carry no health flags: no
 * benchmark health record exists for an arena board upstream, and the tab says so rather
 * than letting the reader assume the flags were checked and came back clean.
 *
 * If the source is unavailable the tab renders its empty state. It never falls back to a
 * ranking borrowed from another modality.
 */

export function ImageTable({
  leaderboard,
  models,
  fetchedAt,
}: {
  leaderboard: { note: string; source: SourceMeta; scores: Score[] } | null;
  /** The compact lookup the text tabs already ship; this tab needs only a name and a creator. */
  models: Record<string, TableModel>;
  fetchedAt: string | null;
}) {
  if (leaderboard === null || leaderboard.scores.length === 0) {
    return (
      <div className="py-8">
        <p className="max-w-[66ch] text-sm">
          Image rankings unavailable.{" "}
          <FreshnessStamp fetchedAt={fetchedAt} failed={fetchedAt !== null} /> Arena
          publish these boards themselves, and this tab shows nothing rather than a stale
          ranking presented as current. The job retries daily at 06:00 UTC.
        </p>
        <p className="mt-2 max-w-[66ch] text-sm text-ink-mute">
          Nothing is shown in place of these rankings. A ranking borrowed from another
          modality would be worse than an empty table.
        </p>
      </div>
    );
  }

  const rows = [...leaderboard.scores].sort((a, b) => b.value - a.value);

  return (
    <div>
      <p className="py-3 max-w-[76ch] text-sm text-ink-mute">
        Arena Elo from public pairwise votes — a preference ranking, not a benchmark
        score. No benchmark health record exists for an arena board, so these rows carry
        no health flags: there is nothing to check them against.{" "}
        <FreshnessStamp fetchedAt={fetchedAt} />
      </p>

      <div className="md:overflow-x-auto">
        <table role="table" className="w-full border-collapse text-sm">
          <thead role="rowgroup" className="max-md:sr-only">
            <tr role="row" className="border-b border-rule-strong text-left">
              <th role="columnheader" scope="col" className="py-2 pr-3 font-medium">
                #
              </th>
              <th role="columnheader" scope="col" className="py-2 pr-3 font-medium">
                Model
              </th>
              <th
                role="columnheader"
                scope="col"
                className="py-2 pr-3 text-right font-medium"
              >
                Elo
              </th>
              <th
                role="columnheader"
                scope="col"
                className="py-2 pr-3 text-right font-medium"
              >
                Interval
              </th>
              <th
                role="columnheader"
                scope="col"
                className="py-2 pr-3 text-right font-medium"
              >
                Votes
              </th>
              <th role="columnheader" scope="col" className="py-2 font-medium">
                Source
              </th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            {rows.map((score, index) => {
              const model = models[score.model_id];
              return (
                <tr
                  role="row"
                  key={`${score.model_id}#${score.variant}`}
                  className={STACKED_ROW}
                >
                  <td role="cell" className={`tabular text-ink-mute ${STACKED_CELL}`}>
                    {index + 1}
                  </td>
                  <td
                    role="cell"
                    className={`max-md:min-w-0 max-md:pb-1 ${STACKED_CELL}`}
                  >
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
                    {model !== undefined ? (
                      <span className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-mute">
                        <CreatorLogo creator={model.creator} />
                        {model.creator}
                      </span>
                    ) : null}
                  </td>
                  <td
                    role="cell"
                    className={`tabular text-right max-md:text-base ${STACKED_CELL}`}
                  >
                    {Math.round(score.value)}
                  </td>
                  <td
                    role="cell"
                    data-label="Interval"
                    className={`tabular text-right ${STACKED_CELL} ${STACKED_META}`}
                  >
                    {score.confidence_interval === null ? (
                      <MissingValue reason="Arena published no confidence interval for this model" />
                    ) : (
                      `±${score.confidence_interval.toFixed(1)}`
                    )}
                  </td>
                  <td
                    role="cell"
                    data-label="Votes"
                    className={`tabular text-right ${STACKED_CELL} ${STACKED_META}`}
                  >
                    {score.sample_size === null ? (
                      <MissingValue reason="Arena published no vote count for this model" />
                    ) : (
                      score.sample_size.toLocaleString("en")
                    )}
                  </td>
                  <td
                    role="cell"
                    data-label="Source"
                    className={`py-2 text-xs text-ink-mute max-md:p-0 ${STACKED_META}`}
                  >
                    <a className="underline" href={score.source.source_url}>
                      Arena
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-ink-mute">{leaderboard.source.attribution}</p>
    </div>
  );
}
