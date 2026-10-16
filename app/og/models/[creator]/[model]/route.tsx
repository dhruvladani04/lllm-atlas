import { ImageResponse } from "next/og";
import { OG_COLOURS, OG_SIZE, OgCard, StatusPill, flagSentence } from "@/lib/og/card";
import { loadJoinedScores, loadModels } from "@/lib/data/derived";
import { quotableScore } from "@/lib/og/metadata";
import { formatScore } from "@/components/data/primitives";

/**
 * A model's link preview. Its headline number is its best *independent* score on a
 * benchmark that still discriminates — the number this site would let you quote — shown
 * with that benchmark's status. A model with no such score says so rather than reaching
 * for a saturated or vendor-reported one.
 */

/**
 * Read once per build worker, not once per image: there are 460 of these, and each read
 * parses and validates every joined score.
 */
let cached: {
  models: ReturnType<typeof loadModels>;
  scores: ReturnType<typeof loadJoinedScores>;
} | null = null;
function data() {
  cached ??= { models: loadModels(), scores: loadJoinedScores() };
  return cached;
}

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  // Every model id is "<creator>/<model>"; a unit test in lib/og holds that true.
  return data().models.map((model) => {
    const [creator = "", name = ""] = model.model_id.split("/");
    return { creator, model: name };
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ creator: string; model: string }> },
): Promise<Response> {
  const { creator, model: name } = await params;
  const model_id = `${decodeURIComponent(creator)}/${decodeURIComponent(name)}`;
  const model = data().models.find((entry) => entry.model_id === model_id);
  const scores = data().scores.filter((score) => score.model_id === model_id);
  const quotable = quotableScore(scores);

  return new ImageResponse(
    <OgCard
      eyebrow={model?.creator ?? "Model"}
      title={model?.display_name ?? model_id}
      footer={`${scores.length} score${scores.length === 1 ? "" : "s"} on this site, each shown with its benchmark's health and who measured it.`}
    >
      {quotable !== undefined ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <div style={{ display: "flex", fontSize: 88, fontWeight: 600 }}>
              {formatScore(quotable.value, quotable.unit)}
            </div>
            <StatusPill status={quotable.benchmark.status} />
          </div>
          <div style={{ display: "flex", fontSize: 30, color: OG_COLOURS.MUTE }}>
            {`on ${quotable.benchmark.name}${quotable.variant !== "base" ? ` at ${quotable.variant}` : ""}, independently measured. ${flagSentence(quotable.health_flags) ?? ""}`}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", fontSize: 32, color: OG_COLOURS.MUTE }}>
          No independent score on a benchmark that still discriminates.
        </div>
      )}
    </OgCard>,
    OG_SIZE,
  );
}
