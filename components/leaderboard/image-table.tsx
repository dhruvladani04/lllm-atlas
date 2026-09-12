import Link from "next/link";
import type { Model } from "@/lib/schemas/model";
import type { Score } from "@/lib/schemas/score";
import type { SourceMeta } from "@/lib/schemas/common";
import { FreshnessStamp } from "@/components/data/freshness-stamp";
import { MissingValue } from "@/components/data/primitives";

/**
 * specs/03-sections/leaderboard.md — the image tab.
 *
 * Elo, confidence interval, arena appearance count, source. No capability index, because
 * there isn't an honest one for image generation. These rows carry no health flags: no
 * benchmark health record exists for an arena board upstream, and the tab says so rather
 * than letting the reader assume the flags were checked and came back clean.
 *
 * If the mirror is unavailable the tab renders its empty state. It never falls back to a
 * ranking borrowed from another modality.
 */

export function ImageTable({
  leaderboard,
  models,
  fetchedAt,
}: {
  leaderboard: { note: string; source: SourceMeta; scores: Score[] } | null;
  models: readonly Model[];
  fetchedAt: string | null;
}) {
  if (leaderboard === null || leaderboard.scores.length === 0) {
    return (
      <div className="py-8">
        <p className="max-w-[66ch] text-sm">
          Image rankings unavailable.{" "}
          <FreshnessStamp fetchedAt={fetchedAt} failed={fetchedAt !== null} /> The arena
          mirror is an unofficial community project and is treated as best-effort. The job
          retries daily at 06:00 UTC.
        </p>
        <p className="mt-2 max-w-[66ch] text-sm text-ink-mute">
          Nothing is shown in place of these rankings. A ranking borrowed from another
          modality would be worse than an empty table.
        </p>
      </div>
    );
  }

  const byId = new Map(models.map((model) => [model.model_id, model]));
  const rows = [...leaderboard.scores].sort((a, b) => b.value - a.value);

  return (
    <div>
      <p className="py-3 max-w-[76ch] text-sm text-ink-mute">
        Arena Elo from public pairwise votes — a preference ranking, not a benchmark
        score. No benchmark health record exists for an arena board, so these rows carry
        no health flags: there is nothing to check them against.{" "}
        <FreshnessStamp fetchedAt={fetchedAt} />
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-rule-strong text-left">
              <th scope="col" className="py-2 pr-3 font-medium">
                #
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Model
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">
                Elo
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">
                Interval
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">
                Votes
              </th>
              <th scope="col" className="py-2 font-medium">
                Source
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((score, index) => {
              const model = byId.get(score.model_id);
              return (
                <tr
                  key={`${score.model_id}#${score.variant}`}
                  className="border-b border-rule"
                >
                  <td className="tabular py-2 pr-3 text-ink-mute">{index + 1}</td>
                  <td className="py-2 pr-3">
                    <Link
                      href={`/models/${encodeURIComponent(score.model_id)}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {model?.display_name ?? score.model_id}
                    </Link>
                    <span className="block text-xs text-ink-mute">
                      {model?.creator ?? ""}
                    </span>
                  </td>
                  <td className="tabular py-2 pr-3 text-right">
                    {Math.round(score.value)}
                  </td>
                  <td className="tabular py-2 pr-3 text-right">
                    {score.confidence_interval === null ? (
                      <MissingValue reason="The mirror reported no confidence interval" />
                    ) : (
                      `±${score.confidence_interval}`
                    )}
                  </td>
                  <td className="tabular py-2 pr-3 text-right">
                    {score.sample_size === null ? (
                      <MissingValue reason="The mirror reported no vote count" />
                    ) : (
                      score.sample_size.toLocaleString("en")
                    )}
                  </td>
                  <td className="py-2 text-xs text-ink-mute">
                    <a className="underline" href={score.source.source_url}>
                      LMArena via mirror
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
