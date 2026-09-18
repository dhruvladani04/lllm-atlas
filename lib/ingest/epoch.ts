import { parse } from "csv-parse/sync";
import { unzipSync } from "fflate";
import type { SourceMeta } from "@/lib/schemas/common";
import {
  EpochBenchmarkMeta,
  EpochCapabilityIndexRow,
  type EpochResultRow,
} from "@/lib/schemas/epoch";
import type { Fetcher } from "@/lib/ingest/benchwiki";

/**
 * Epoch AI — specs/02-data/sources-and-licensing.md source 3. The primary independent
 * score source for the text and agentic tabs.
 *
 * CC BY 4.0, with third-party notices inside the bundle preserved: Aider Polyglot and
 * Terminal-Bench data are Apache 2.0.
 */

export const EPOCH_SOURCE_ID = "epoch";
export const EPOCH_ENDPOINT = "https://epoch.ai/data/benchmark_data.zip";
export const EPOCH_HUB = "https://epoch.ai/benchmarks";
export const EPOCH_LICENCE = "CC BY 4.0";
export const EPOCH_ATTRIBUTION =
  "Epoch AI, 'Capabilities & Benchmarking'. Published online at epoch.ai. " +
  "Retrieved from 'https://epoch.ai/benchmarks'. CC BY 4.0.";

/** Third-party data inside the bundle that carries its own licence, preserved on display. */
export const EPOCH_THIRD_PARTY_NOTICES: Record<string, string> = {
  aider_polyglot: "Aider Polyglot data, Apache 2.0",
  terminal_bench: "Terminal-Bench data, Apache 2.0",
};

export function epochSourceMeta(fetchedAt: string): SourceMeta {
  return {
    source_id: EPOCH_SOURCE_ID,
    source_url: EPOCH_ENDPOINT,
    fetched_at: fetchedAt,
    licence: EPOCH_LICENCE,
    attribution: EPOCH_ATTRIBUTION,
  };
}

type CsvRow = Record<string, string>;

export function parseCsv(text: string): CsvRow[] {
  return parse(text, { columns: true, skip_empty_lines: true, bom: true }) as CsvRow[];
}

function optional(row: CsvRow, ...names: string[]): string | null {
  for (const name of names) {
    const value = row[name];
    if (value !== undefined && value.trim() !== "") return value.trim();
  }
  return null;
}

function optionalNumber(row: CsvRow, name: string): number | null {
  const raw = optional(row, name);
  if (raw === null) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export interface EpochBundle {
  benchmarks: EpochBenchmarkMeta[];
  /** Benchmark name to its result rows. */
  results: Map<string, EpochResultRow[]>;
  capabilityIndex: EpochCapabilityIndexRow[];
}

function decode(files: Record<string, Uint8Array>, name: string): string | null {
  const entry = files[name];
  return entry === undefined ? null : new TextDecoder().decode(entry);
}

/**
 * Reads the bundle. A benchmark whose result file or score column is missing is skipped
 * with the reason recorded — one malformed benchmark must not cost us the other eighty.
 */
export function readEpochBundle(zip: Uint8Array): {
  bundle: EpochBundle;
  skipped: string[];
} {
  const files = unzipSync(zip);
  const metadataCsv = decode(files, "benchmark_metadata.csv");
  if (metadataCsv === null) {
    throw new Error("epoch bundle has no benchmark_metadata.csv");
  }

  const skipped: string[] = [];
  const benchmarks: EpochBenchmarkMeta[] = [];
  const results = new Map<string, EpochResultRow[]>();

  for (const row of parseCsv(metadataCsv)) {
    const name = (row["benchmark"] ?? "").trim();
    // Some metadata rows name a benchmark without pointing at a file or a column. They are
    // skipped with the reason recorded: one unusable row must not cost us the other eighty.
    if (name === "" || !optional(row, "source_file") || !optional(row, "score_column")) {
      skipped.push(
        `${name || "(unnamed row)"}: metadata has no source file or score column`,
      );
      continue;
    }

    const meta = EpochBenchmarkMeta.parse({
      benchmark: row["benchmark"] ?? "",
      in_eci: (row["in_eci"] ?? "").toLowerCase() === "true",
      source_file: row["source_file"] ?? "",
      score_column: row["score_column"] ?? "",
      scale: optionalNumber(row, "scale") ?? 1,
      random_baseline: optionalNumber(row, "random_baseline"),
      score_ceiling: optionalNumber(row, "score_ceiling"),
      release_date: optional(row, "release_date"),
      superseded_by: optional(row, "superseded_by"),
    });

    const csv = decode(files, meta.source_file);
    if (csv === null) {
      skipped.push(`${meta.benchmark}: no file ${meta.source_file} in the bundle`);
      continue;
    }

    const rows: EpochResultRow[] = [];
    for (const result of parseCsv(csv)) {
      const rawScore = result[meta.score_column];
      if (rawScore === undefined || rawScore.trim() === "") continue;
      const score = Number.parseFloat(rawScore);
      if (!Number.isFinite(score)) continue;

      const model_version = optional(result, "Model version", "Model");
      if (model_version === null) continue;

      rows.push({
        model_version,
        display_name: optional(result, "Name", "Display name"),
        score,
        release_date: optional(result, "Release date"),
        organization: optional(result, "Organization"),
        // Terminal-Bench names this column "Agent" ("Goose", "Codex CLI", …). Missing it
        // meant five distinct agent runs of one model arrived as five rows identical in
        // every field but their score — indistinguishable to a reader, and colliding on
        // the key the Score schema calls the row's identity. The harness is not a detail
        // on an agentic benchmark; it is half of what was measured.
        harness: optional(result, "Harness", "Scaffold", "Agent"),
        source_link: optional(result, "Source link", "Source"),
      });
    }

    if (rows.length === 0) {
      skipped.push(`${meta.benchmark}: no usable "${meta.score_column}" values`);
      continue;
    }

    benchmarks.push(meta);
    results.set(meta.benchmark, rows);
  }

  const eciCsv = decode(files, "epoch_capabilities_index/eci_scores.csv");
  const capabilityIndex =
    eciCsv === null
      ? []
      : parseCsv(eciCsv).map((row) =>
          EpochCapabilityIndexRow.parse({
            model: row["Model"] ?? "",
            display_name: row["Display name"] ?? row["Model"] ?? "",
            eci: Number.parseFloat(row["eci"] ?? "NaN"),
            eci_ci_low: optionalNumber(row, "eci_ci_low"),
            eci_ci_high: optionalNumber(row, "eci_ci_high"),
            date: optional(row, "date"),
            organization: optional(row, "Organization"),
          }),
        );

  return { bundle: { benchmarks, results, capabilityIndex }, skipped };
}

export async function fetchEpochBundle(
  fetcher: Fetcher = fetch,
): Promise<{ bundle: EpochBundle; skipped: string[]; bytes: number }> {
  const response = await fetcher(EPOCH_ENDPOINT);
  if (!response.ok) {
    throw new Error(`epoch responded ${response.status} ${response.statusText}`);
  }
  const buffer = new Uint8Array(await response.arrayBuffer());
  const { bundle, skipped } = readEpochBundle(buffer);
  return { bundle, skipped, bytes: buffer.byteLength };
}
