import { ImageResponse } from "next/og";
import { OG_COLOURS, OG_SIZE, OgCard, StatusPill, flagSentence } from "@/lib/og/card";
import { rank, rankingInputs } from "@/lib/leaderboard/ranking-inputs";
import { formatScore } from "@/components/data/primitives";

/**
 * The leaderboard's link preview: the current leader, exactly as the table's first row has
 * it — the benchmark it leads on, that benchmark's status, and who measured the number.
 * Regenerated on every build, so it moves with the data.
 */

export const dynamic = "force-static";

export function GET(): Response {
  const result = rank(rankingInputs(), "text", "hidden");
  const top = result.rows[0];

  return new ImageResponse(
    top === undefined || result.reference === null ? (
      <OgCard
        eyebrow="Leaderboard"
        title="Who is ahead, on what, and whether to trust it."
        footer="No ranking is available in the current data."
      />
    ) : (
      <OgCard
        eyebrow="Leaderboard"
        title={`Highest on ${result.reference.name}: ${top.model.display_name}`}
        footer={`${top.model.creator}. ${
          top.provenance === "independent"
            ? "Independently measured."
            : top.provenance === "mixed"
              ? "Independent and vendor-reported numbers."
              : "Vendor-reported."
        } Ranked on the most-measured benchmark, not on "best".`}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div style={{ display: "flex", fontSize: 96, fontWeight: 600 }}>
            {formatScore(top.score.value, top.score.unit)}
          </div>
          <StatusPill status={result.reference.status} />
        </div>
        <div style={{ display: "flex", fontSize: 30, color: OG_COLOURS.MUTE }}>
          {`${top.variant !== "base" ? `Measured at ${top.variant}. ` : ""}${flagSentence(top.score.health_flags) ?? ""} ${result.rows.length} rows ranked.`}
        </div>
      </OgCard>
    ),
    OG_SIZE,
  );
}
