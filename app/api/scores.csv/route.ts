import { loadJoinedScores, loadModels } from "@/lib/data/derived";

/**
 * The same corpus as `/api/scores`, flattened for a spreadsheet.
 *
 * A row here is one score with the context needed to read it honestly: the benchmark's
 * health and status, the provenance, the harness, the date and the source URL. A CSV that
 * dropped those would be exactly the bare-number artefact this site exists to argue
 * against — the columns are not optional garnish.
 *
 * Licensing is the same as the JSON route, and the header rows carry it so the file stays
 * self-describing once it leaves this site.
 */

export const dynamic = "force-static";

const COLUMNS = [
  "model_id",
  "display_name",
  "variant",
  "modality",
  "benchmark_slug",
  "benchmark_name",
  "benchmark_status",
  "contamination_risk",
  "harness",
  "value",
  "unit",
  "confidence_interval",
  "sample_size",
  "provenance",
  "health_flags",
  "measured_at",
  "source_id",
  "source_url",
  "fetched_at",
] as const;

/** RFC 4180: quote everything containing a comma, quote or newline, and double the quotes. */
function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function GET(): Response {
  const models = new Map(loadModels().map((model) => [model.model_id, model]));

  const lines = [
    "# LLM Atlas — every score with the health of the benchmark that produced it.",
    "# Scores: Epoch AI, CC BY 4.0. Benchmark health: benchwiki, no published licence,",
    "# mirrored with attribution — see https://benchwiki.vercel.app and /methodology.",
    "# A vendor-reported score and an independent one are different claims. Never average them.",
    COLUMNS.join(","),
  ];

  for (const score of loadJoinedScores()) {
    const model = models.get(score.model_id);
    lines.push(
      [
        score.model_id,
        model?.display_name ?? score.model_id,
        score.variant,
        model?.modality ?? "",
        score.benchmark_slug,
        score.benchmark.name,
        score.benchmark.status,
        score.benchmark.contamination.risk,
        score.harness,
        score.value,
        score.unit,
        score.confidence_interval,
        score.sample_size,
        score.provenance,
        score.health_flags.join(" "),
        score.measured_at,
        score.source.source_id,
        score.source.source_url,
        score.source.fetched_at,
      ]
        .map(cell)
        .join(","),
    );
  }

  return new Response(`${lines.join("\n")}\n`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="llm-atlas-scores.csv"',
      "cache-control": "public, max-age=3600",
    },
  });
}
