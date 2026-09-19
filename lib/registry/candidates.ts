import type { RegistryModel } from "@/lib/schemas/model";
import type { Candidate, CandidateEvidence, Confidence } from "@/lib/schemas/candidate";
import {
  BASE_VARIANT,
  buildRegistryIndex,
  normaliseName,
  type RegistryIndex,
} from "@/lib/registry/resolve";

/**
 * Proposes registry entries from snapshot evidence — see `lib/schemas/candidate.ts` for why.
 *
 * Nothing here resolves a name. It groups rows the registry has *already failed* to resolve
 * and works out what a registry entry for them would have to say, so a human can accept or
 * reject it. The resolver's ban on fuzzy matching is untouched: every alias this produces is
 * a string a source literally published, and the only matching done is exact equality after
 * `normaliseName`, which is the resolver's own rule 3.
 */

/**
 * Epoch encodes the reasoning-effort tier as an underscore suffix on `model_version`. The
 * set is closed on purpose: treating the convention as total would read `gpt-5.6-sol_promax`
 * as a `promax` tier of `gpt-5.6-sol`, when it is far likelier to be the `max` tier of a
 * model named `gpt-5.6-sol-pro`. An unrecognised suffix means the whole string is the stem.
 */
const TIER_SUFFIXES = new Set([
  "high",
  "medium",
  "low",
  "xhigh",
  "max",
  "minimal",
  "thinking",
  // Both mean "the source reported no tier", which is what `base` is for. Already the
  // established convention: `claude-sonnet-5_unknown` is a base alias in the registry today.
  "none",
  "unknown",
]);

/**
 * A thinking or output budget — `claude-3-7-sonnet-20250219_16K`. This is an effort tier
 * expressed in tokens rather than words, so it is a *variant* of one model, not a model of
 * its own: without this rule Claude 3.7 Sonnet arrives as four separate models differing
 * only in how much room it was given to think.
 *
 * Deliberately `k` only. `8B` and `7b` are parameter counts, and an 8B model really is a
 * different model from a 70B one — folding those together would be the silent merge this
 * file exists to avoid.
 */
const BUDGET_SUFFIX = /^\d+k$/i;

/** Suffixes that look like a tier glued to part of the model's name. Never auto-approved. */
const SUSPICIOUS_SUFFIX =
  /^pro(high|medium|low|xhigh|max|minimal|none|unknown|thinking)$/;

export interface SplitName {
  stem: string;
  variant: string;
  /** True when the suffix parses as a tier but looks like it swallowed part of the name. */
  suspicious: boolean;
}

export function splitModelVersion(modelVersion: string): SplitName {
  const at = modelVersion.lastIndexOf("_");
  if (at <= 0) return { stem: modelVersion, variant: BASE_VARIANT, suspicious: false };

  const suffix = modelVersion.slice(at + 1).toLowerCase();
  if (SUSPICIOUS_SUFFIX.test(suffix)) {
    return { stem: modelVersion, variant: BASE_VARIANT, suspicious: true };
  }
  if (BUDGET_SUFFIX.test(suffix)) {
    return { stem: modelVersion.slice(0, at), variant: suffix, suspicious: false };
  }
  if (!TIER_SUFFIXES.has(suffix)) {
    return { stem: modelVersion, variant: BASE_VARIANT, suspicious: false };
  }

  const variant = suffix === "none" || suffix === "unknown" ? BASE_VARIANT : suffix;
  return { stem: modelVersion.slice(0, at), variant, suspicious: false };
}

/** Matches the ids already in the registry: `anthropic/claude-haiku-4.5`. Dots survive. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** "Claude Opus 5 (Max)" and "Claude 3.7 (16K)" both name the model; the rest is the variant. */
export function stripTier(displayName: string): string {
  return displayName.replace(/\s*\(([^)]*)\)\s*$/, (whole, inner: string) => {
    const marker = inner.trim().toLowerCase();
    return TIER_SUFFIXES.has(marker) || BUDGET_SUFFIX.test(marker) ? "" : whole;
  });
}

export interface SourceRow {
  model_version: string;
  display_name: string | null;
  organization: string | null;
  release_date: string | null;
  benchmark: string;
  source_id: string;
}

export interface OpenRouterRef {
  id: string;
  canonical_slug: string;
  name: string;
}

interface Group {
  stem: string;
  rows: SourceRow[];
  variants: Map<string, Set<string>>;
  suspicious: boolean;
}

function groupByStem(rows: readonly SourceRow[]): Map<string, Group> {
  const groups = new Map<string, Group>();

  for (const row of rows) {
    const { stem, variant, suspicious } = splitModelVersion(row.model_version);
    const group = groups.get(stem) ?? {
      stem,
      rows: [],
      variants: new Map<string, Set<string>>(),
      suspicious: false,
    };

    group.rows.push(row);
    group.suspicious = group.suspicious || suspicious;

    const aliases = group.variants.get(variant) ?? new Set<string>();
    // The raw `model_version` always names this exact tier — it is where the tier came from.
    aliases.add(row.model_version);

    // A display name only names a tier if it says so. "Claude Fable 5 (Max)" is an alias of
    // the max variant; plain "Claude Fable 5" names the model however it was run, so it
    // belongs to the model and means `base`. Attaching it to both is an ambiguous alias,
    // which `buildRegistryIndex` rightly refuses to index.
    const display = row.display_name?.trim() ?? "";
    if (display !== "" && stripTier(display) !== display) aliases.add(display);

    group.variants.set(variant, aliases);
    groups.set(stem, group);
  }

  return groups;
}

function uniqueSorted(values: readonly (string | null)[]): string[] {
  return [
    ...new Set(values.filter((v): v is string => v !== null && v.trim() !== "")),
  ].sort();
}

/** The display name most rows agree on, with any tier stripped. */
function pickDisplayName(rows: readonly SourceRow[]): string | null {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const name = stripTier(row.display_name ?? "").trim();
    if (name === "") continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  const ranked = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
  return ranked[0]?.[0] ?? null;
}

function tierFor(
  group: Group,
  organizations: readonly string[],
  releaseDates: readonly string[],
  benchmarkCount: number,
  usableBenchmarks: number,
  displayName: string | null,
  openrouter: OpenRouterRef | null,
  reasons: string[],
): Confidence {
  if (group.suspicious) {
    reasons.push(
      "The tier suffix looks like it swallowed part of the model's name, so the split into name and variant cannot be trusted.",
    );
    return "low";
  }
  if (organizations.length === 0) {
    reasons.push("No source states which organization made this model.");
    return "low";
  }
  if (organizations.length > 1) {
    reasons.push(`Sources disagree on the creator: ${organizations.join(", ")}.`);
    return "low";
  }

  const newest = releaseDates[releaseDates.length - 1] ?? null;
  if (newest === null) {
    reasons.push("No release date, so this cannot be placed in time.");
    return "low";
  }
  if (newest < "2024-01-01") {
    reasons.push(`Last released ${newest} — too old to be worth ranking.`);
    return "low";
  }

  if (usableBenchmarks === 0) {
    reasons.push(
      `Measured only on benchmarks with no health record here (${benchmarkCount} of them), so approving this would add no scores to the site.`,
    );
    return "low";
  }

  if (
    newest >= "2025-01-01" &&
    usableBenchmarks >= 2 &&
    (displayName !== null || openrouter)
  ) {
    reasons.push(
      `Single creator, released ${newest}, measured on ${usableBenchmarks} benchmarks this site can join` +
        (openrouter ? ", and currently served by OpenRouter." : "."),
    );
    return "high";
  }

  reasons.push(
    `Released ${newest}, measured on ${benchmarkCount} benchmark${benchmarkCount === 1 ? "" : "s"}` +
      (displayName === null ? ", and no source publishes a display name." : "."),
  );
  return "medium";
}

export interface BuildCandidatesInput {
  rows: readonly SourceRow[];
  registry: readonly RegistryModel[];
  openrouter?: readonly OpenRouterRef[];
  /** Image-modality stems, since Epoch publishes no image benchmarks to infer it from. */
  imageStems?: ReadonlySet<string>;
  /**
   * Benchmark names that resolve to a health record. A model measured only on benchmarks
   * this site cannot resolve adds no scores when approved — accurate, and useless. The
   * reviewer needs to know that before spending judgement on it.
   */
  resolvableBenchmarks?: ReadonlySet<string>;
}

export function buildCandidates(input: BuildCandidatesInput): Candidate[] {
  const index = buildRegistryIndex(input.registry);
  const openrouterByNormalised = new Map<string, OpenRouterRef>();
  for (const ref of input.openrouter ?? []) {
    for (const key of [ref.id, ref.canonical_slug, ref.name]) {
      openrouterByNormalised.set(normaliseName(key), ref);
    }
  }

  const candidates: Candidate[] = [];
  // Aliases claimed by candidates already produced in this run, so two candidates cannot
  // both claim a name — the same guarantee `buildRegistryIndex` gives within the registry.
  const claimedHere = new Map<string, string>();
  /** `model_id` to the stem that produced it, so two stems cannot collapse into one entry. */
  const claimedIds = new Map<string, string>();

  for (const group of [...groupByStem(input.rows).values()].sort((a, b) =>
    a.stem.localeCompare(b.stem),
  )) {
    // Already resolvable: the registry knows this model, so there is nothing to propose.
    if (resolvesAlready(index, group)) continue;

    const organizations = uniqueSorted(group.rows.map((row) => row.organization));
    const releaseDates = uniqueSorted(group.rows.map((row) => row.release_date));
    const displayName = pickDisplayName(group.rows);
    const openrouter =
      openrouterByNormalised.get(normaliseName(group.stem)) ??
      (displayName
        ? (openrouterByNormalised.get(normaliseName(displayName)) ?? null)
        : null);

    const benchmarks = [...countBy(group.rows.map((row) => row.benchmark))]
      .map(([benchmark, rows]) => ({ benchmark, rows }))
      .sort((a, b) => b.rows - a.rows || a.benchmark.localeCompare(b.benchmark));

    const usableBenchmarks =
      input.resolvableBenchmarks === undefined
        ? benchmarks.length
        : benchmarks.filter((entry) => input.resolvableBenchmarks?.has(entry.benchmark))
            .length;

    const reasons: string[] = [];
    let confidence = tierFor(
      group,
      organizations,
      releaseDates,
      benchmarks.length,
      usableBenchmarks,
      displayName,
      openrouter,
      reasons,
    );

    const creator = organizations[0] ?? "";
    const model_id = `${slugify(creator || "unknown")}/${slugify(group.stem)}`;

    const dropped: CandidateEvidence["dropped_aliases"] = [];
    const keep = (alias: string, owner: string): boolean => {
      const existing =
        index.exact.get(alias) ?? index.normalised.get(normaliseName(alias)) ?? null;
      if (existing !== null) {
        dropped.push({ alias, claimed_by: `${existing.model_id}#${existing.variant}` });
        return false;
      }
      const here = claimedHere.get(normaliseName(alias));
      if (here !== undefined && here !== owner) {
        dropped.push({ alias, claimed_by: here });
        return false;
      }
      return true;
    };

    const baseOwner = `${model_id}#${BASE_VARIANT}`;
    const modelAliases = uniqueSorted([group.stem, model_id, displayName]).filter(
      (alias) => keep(alias, baseOwner),
    );
    // Claimed before the variants are built, so a name already taken at model level cannot
    // be taken again by a tier of the same model. Order matters here.
    for (const alias of modelAliases) claimedHere.set(normaliseName(alias), baseOwner);

    const variants = [...group.variants.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([variant, aliases]) => {
        const owner = `${model_id}#${variant}`;
        const kept = uniqueSorted([...aliases]).filter((alias) => keep(alias, owner));
        for (const alias of kept) claimedHere.set(normaliseName(alias), owner);
        return { variant, aliases: kept };
      });

    // A variant nothing can resolve to is dead weight in the registry — either it was
    // never observed (a synthesised base) or every name it had was already claimed by
    // another model. Base is kept and seeded from the model's own aliases, which already
    // resolve to it; a tier with nothing left to match on is dropped entirely.
    const base = variants.find((entry) => entry.variant === BASE_VARIANT);
    if (base === undefined) {
      variants.unshift({ variant: BASE_VARIANT, aliases: [...modelAliases] });
    } else if (base.aliases.length === 0) {
      base.aliases = [...modelAliases];
    }

    const unreachable = variants
      .filter((entry) => entry.variant !== BASE_VARIANT && entry.aliases.length === 0)
      .map((entry) => entry.variant);
    if (unreachable.length > 0) {
      reasons.push(
        `Dropped the ${unreachable.join(", ")} variant${unreachable.length === 1 ? "" : "s"}: every name they were known by is already claimed, so nothing could ever resolve to them.`,
      );
    }
    const reachable = variants.filter(
      (entry) => entry.variant === BASE_VARIANT || entry.aliases.length > 0,
    );

    // Two stems slugifying to one id — "Qwen/Qwen3-235B-A22B" and "qwen3-235b-a22b" — are
    // almost certainly the same model written two ways. Almost certainly is not certainly,
    // and merging them here would be precisely the wrong-merge risk the registry spec
    // refuses to automate. Flag both and let a human decide.
    const idOwner = claimedIds.get(model_id);
    if (idOwner !== undefined) {
      confidence = "conflict";
      reasons.push(
        `Another candidate ("${idOwner}") produces the same model_id. They are probably the same model named two ways, but merging them is a judgement call, not a rule.`,
      );
    } else {
      claimedIds.set(model_id, group.stem);
    }

    // The stem itself being claimed means this is very likely the same model under another
    // name. That is a merge decision, and merges are exactly what a human must make.
    if (dropped.some((entry) => entry.alias === group.stem)) {
      confidence = "conflict";
      reasons.push(
        "The registry already claims this model's own name, so accepting it would either duplicate an existing model or silently merge two.",
      );
    }
    if (modelAliases.length === 0 && variants.every((v) => v.aliases.length === 0)) {
      confidence = "conflict";
      reasons.push("Every name this model is known by is already claimed.");
    }

    const proposed: RegistryModel = {
      model_id,
      display_name: displayName ?? group.stem,
      creator: creator || "Unknown",
      modality: input.imageStems?.has(group.stem) ? "image" : "text",
      released_at: releaseDates[0] ?? null,
      // Not derivable from any source we ingest. Inferring it from the creator would be a
      // guess, and a guess in the registry is invisible once it is in.
      open_weights: null,
      aliases: modelAliases,
      variants: reachable,
    };

    candidates.push({
      proposed,
      confidence,
      evidence: {
        stem: group.stem,
        sources: uniqueSorted(group.rows.map((row) => row.source_id)),
        organizations,
        release_dates: releaseDates,
        benchmarks,
        benchmarks_resolvable: usableBenchmarks,
        total_occurrences: group.rows.length,
        raw_model_versions: uniqueSorted(group.rows.map((row) => row.model_version)),
        raw_display_names: uniqueSorted(group.rows.map((row) => row.display_name)),
        openrouter: openrouter
          ? { id: openrouter.id, canonical_slug: openrouter.canonical_slug }
          : null,
        dropped_aliases: dropped,
        reasons,
      },
    });
  }

  return candidates;
}

function resolvesAlready(index: RegistryIndex, group: Group): boolean {
  if (index.models.has(group.stem)) return true;
  if (index.exact.has(group.stem)) return true;
  if (index.normalised.has(normaliseName(group.stem))) return true;
  return group.rows.some(
    (row) =>
      index.exact.has(row.model_version) ||
      index.normalised.has(normaliseName(row.model_version)),
  );
}

function countBy(values: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

/**
 * The guarantee the generator refuses to write without: registry plus every approved
 * candidate must still build a clean index. If it does not, something would mis-resolve.
 */
export function indexesCleanly(
  registry: readonly RegistryModel[],
  candidates: readonly RegistryModel[],
): { ok: true } | { ok: false; error: string } {
  try {
    buildRegistryIndex([...registry, ...candidates]);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
