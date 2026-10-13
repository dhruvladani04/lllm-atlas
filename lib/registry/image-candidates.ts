import type { RegistryModel } from "@/lib/schemas/model";
import type { Candidate, Confidence } from "@/lib/schemas/candidate";
import { BASE_VARIANT, buildRegistryIndex, normaliseName } from "@/lib/registry/resolve";
import { slugify, stripTier } from "@/lib/registry/candidates";

/**
 * Proposes image-model registry entries from Arena's text-to-image board.
 *
 * Separate from the Epoch generator because the evidence is a different shape: Arena gives
 * a vendor slug and the model's licence but no release date, where Epoch gives an
 * organization and a date but nothing about weights. The licence is what makes
 * `open_weights` derivable here at all.
 */

export interface ArenaEvidenceRow {
  model: string;
  vendor: string | null;
  license: string | null;
  votes: number | null;
}

/**
 * Arena's vendor slugs, written out as the creator names the registry already uses. A
 * table and not a title-casing rule: `bfl` is Black Forest Labs and `xai` is xAI, and no
 * rule produces either. A slug missing from here is not guessed at — the candidate keeps
 * the raw slug and is held out of the high tier.
 */
export const ARENA_VENDORS: Record<string, string> = {
  openai: "OpenAI",
  xai: "xAI",
  "microsoft-ai": "Microsoft",
  google: "Google",
  reve: "Reve",
  meta: "Meta",
  bytedance: "ByteDance",
  alibaba: "Alibaba",
  ideogram: "Ideogram",
  "luma-ai": "Luma AI",
  recraft: "Recraft",
  nvidia: "NVIDIA",
  bfl: "Black Forest Labs",
  tencent: "Tencent",
  krea: "Krea",
  hidream: "HiDream",
  runway: "Runway",
  "leonardo-ai": "Leonardo AI",
  zai: "Z.ai (Zhipu AI)",
};

/**
 * `Proprietary` means no weights. Any other named licence is a licence on released
 * weights — non-commercial and community licences restrict use, not availability — so the
 * weights are open even where the terms are not permissive. No licence stated stays null.
 */
export function openWeightsFromLicence(licence: string | null): boolean | null {
  if (licence === null || licence.trim() === "") return null;
  return licence.trim().toLowerCase() !== "proprietary";
}

/** "gpt-image-2 (medium)" is a tier; "(nano-banana-2)" and "(canvas)" are part of the name. */
function split(name: string): { stem: string; variant: string } {
  const stem = stripTier(name).trim();
  if (stem === name.trim()) return { stem, variant: BASE_VARIANT };
  const tier = /\(([^)]*)\)\s*$/.exec(name)?.[1]?.trim().toLowerCase() ?? BASE_VARIANT;
  return { stem, variant: tier };
}

export function buildImageCandidates(input: {
  rows: readonly ArenaEvidenceRow[];
  registry: readonly RegistryModel[];
  /** Model ids other candidates in this run already produced. */
  takenIds?: ReadonlySet<string>;
}): Candidate[] {
  const index = buildRegistryIndex(input.registry);
  const resolves = (name: string) =>
    index.models.has(name) ||
    index.exact.has(name) ||
    index.normalised.has(normaliseName(name));

  const groups = new Map<
    string,
    { rows: ArenaEvidenceRow[]; variants: Map<string, string[]> }
  >();
  for (const row of input.rows) {
    if (resolves(row.model)) continue;
    const { stem, variant } = split(row.model);
    const group = groups.get(stem) ?? { rows: [], variants: new Map<string, string[]>() };
    group.rows.push(row);
    group.variants.set(variant, [...(group.variants.get(variant) ?? []), row.model]);
    groups.set(stem, group);
  }

  const claimed = new Map<string, string>();
  const ids = new Set(input.takenIds ?? []);
  const candidates: Candidate[] = [];

  for (const [stem, group] of [...groups].sort((a, b) => a[0].localeCompare(b[0]))) {
    const vendors = [
      ...new Set(group.rows.map((row) => row.vendor ?? "").filter((v) => v !== "")),
    ];
    const vendor = vendors.length === 1 ? (vendors[0] ?? "") : "";
    const creator = ARENA_VENDORS[vendor] ?? vendor;
    const licences = [
      ...new Set(group.rows.map((row) => row.license ?? "").filter((l) => l !== "")),
    ];
    const votes = group.rows.reduce((sum, row) => sum + (row.votes ?? 0), 0);
    const model_id = `${slugify(creator || "unknown")}/${slugify(stem)}`;

    const reasons: string[] = [];
    let confidence: Confidence;
    if (vendor === "") {
      confidence = "low";
      reasons.push("Arena names no vendor for this model.");
    } else if (ARENA_VENDORS[vendor] === undefined) {
      confidence = "medium";
      reasons.push(
        `Vendor slug "${vendor}" is not in the vendor table, so the creator name is the raw slug.`,
      );
    } else if (votes < 1000) {
      confidence = "medium";
      reasons.push(`Only ${votes} votes behind its Elo so far.`);
    } else {
      confidence = "high";
      reasons.push(
        `On Arena's text-to-image board with ${votes.toLocaleString("en")} votes.`,
      );
    }
    reasons.push(
      licences.length === 1
        ? `Licence as Arena records it: ${licences[0]}.`
        : "Arena states no single licence, so weight availability is left unknown.",
    );
    reasons.push("Arena publishes no release date.");

    const dropped: Candidate["evidence"]["dropped_aliases"] = [];
    const keep = (alias: string, owner: string): boolean => {
      const existing =
        index.exact.get(alias) ?? index.normalised.get(normaliseName(alias));
      const here = claimed.get(normaliseName(alias));
      const taken = existing
        ? `${existing.model_id}#${existing.variant}`
        : here !== undefined && here !== owner
          ? here
          : null;
      if (taken !== null) {
        dropped.push({ alias, claimed_by: taken });
        return false;
      }
      claimed.set(normaliseName(alias), owner);
      return true;
    };

    const baseOwner = `${model_id}#${BASE_VARIANT}`;
    const aliases = [...new Set([stem, model_id])].filter((alias) =>
      keep(alias, baseOwner),
    );
    const variants = [...group.variants.entries()]
      .filter(([variant]) => variant !== BASE_VARIANT)
      .map(([variant, names]) => ({
        variant,
        aliases: [...new Set(names)].filter((alias) =>
          keep(alias, `${model_id}#${variant}`),
        ),
      }))
      .filter((entry) => entry.aliases.length > 0);

    if (ids.has(model_id) || aliases.length === 0) {
      confidence = "conflict";
      reasons.push(
        "Its id or every name it is known by is already claimed; this is a merge decision.",
      );
    }
    ids.add(model_id);

    candidates.push({
      proposed: {
        model_id,
        display_name: stem,
        creator: creator || "Unknown",
        modality: "image",
        released_at: null,
        open_weights:
          licences.length === 1 ? openWeightsFromLicence(licences[0] ?? null) : null,
        aliases,
        variants: [{ variant: BASE_VARIANT, aliases: [...aliases] }, ...variants],
      },
      confidence,
      evidence: {
        stem,
        sources: ["arena-mirror"],
        organizations: creator ? [creator] : [],
        release_dates: [],
        benchmarks: [{ benchmark: "Arena text-to-image", rows: group.rows.length }],
        benchmarks_resolvable: 1,
        total_occurrences: group.rows.length,
        raw_model_versions: group.rows.map((row) => row.model).sort(),
        raw_display_names: [],
        openrouter: null,
        dropped_aliases: dropped,
        reasons,
      },
    });
  }

  return candidates;
}
