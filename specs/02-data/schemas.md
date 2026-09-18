# Schemas

Every file in `data/` conforms to a Zod schema in `lib/schemas/`. The schemas below are
normative; the TypeScript is generated from them via `z.infer`.

They are written against Zod 4, where `z.url()` and `z.iso.datetime()` replace the Zod 3
spellings `z.string().url()` and `z.string().datetime()`. The shapes are what is normative,
not the spelling.

Nothing is `optional` when it could instead be `nullable`. A missing value must be
representable and renderable, never absent.

## Common

```ts
const Provenance = z.enum(["vendor-reported", "independent"]);

const BenchmarkStatus = z.enum([
  "active",
  "nearing-saturation",
  "saturated",
  "deprecated",
]);

const ContaminationRisk = z.enum(["low", "medium", "high", "unknown"]);

const ModelState = z.enum(["ranked", "released_unranked", "announced"]);

const PriceQuotedBy = z.enum(["vendor", "openrouter"]);

// A number that knows where it came from and when. Used for prices and context window,
// which — unlike scores — have two possible sources making two different claims.
const QuotedNumber = z.object({
  value: z.number(),
  quoted_by: PriceQuotedBy,
  source_url: z.string().url(),       // the specific pricing page, not a homepage
  fetched_at: z.string().datetime(),
});

const SourceMeta = z.object({
  source_id: z.string(),
  source_url: z.string().url(),
  fetched_at: z.string().datetime(),
  licence: z.string(),
  attribution: z.string(),
});
```

## Registry model

`data/registry/models.json` is identity only, hand-maintained, and the one file in `data/`
a human may edit. It carries no score, no price and no state, because those change without
anyone editing anything.

```ts
const ModelVariant = z.object({
  variant: z.string(),                 // "base", "high", "xhigh"
  aliases: z.array(z.string()),
});

const RegistryModel = z.object({
  model_id: z.string(),
  display_name: z.string(),
  creator: z.string(),
  released_at: z.iso.date().nullable(),
  open_weights: z.boolean().nullable(),
  aliases: z.array(z.string()),
  variants: z.array(ModelVariant).min(1),   // one of them must be "base"
});
```

Every model declares a `base` variant. It is what a source reporting no tier resolves to,
and a registry entry without one is rejected at index time rather than at render time.

## Unresolved names

`data/registry/unresolved.json` — the queue a human works through. A name here is one no
rule matched, kept with its source so the trail back to the upstream record survives.

```ts
const UnresolvedName = z.object({
  name: z.string(),
  source_id: z.string(),
  first_seen_at: z.iso.date(),
  last_seen_at: z.iso.date(),
  occurrences: z.number().int().positive(),
});
```

A name is recorded per source, so the same unmatched string arriving from two sources is
two entries. That is deliberate: it shows whether one upstream renamed something or the
model is genuinely unknown to the registry.

## Model

```ts
const Model = z.object({
  model_id: z.string(),               // "anthropic/claude-opus-5"
  display_name: z.string(),
  creator: z.string(),
  released_at: z.string().nullable(),
  open_weights: z.boolean().nullable(),
  state: ModelState,
  context_window: QuotedNumber.nullable(),        // .value is an integer
  price_input_per_mtok: QuotedNumber.nullable(),
  price_output_per_mtok: QuotedNumber.nullable(),
  aliases: z.array(z.string()),
  variants: z.array(z.object({
    variant: z.string(),
    aliases: z.array(z.string()),
  })),
});
```

`Model` is not the registry file. `data/registry/models.json` holds identity only —
ids, names, creator, release date, aliases and variants, hand-maintained. Price and
context window are ingested (source 5, with OpenRouter as fallback) and land in
`data/derived/models.json`, which is what the UI reads. Nothing in `data/derived/` is
ever hand-edited.

## Benchmark

Mirrors the benchwiki record, trimmed to fields the site uses.

```ts
const Benchmark = z.object({
  slug: z.string(),
  name: z.string(),
  capability: z.string(),
  secondary_capabilities: z.array(z.string()),
  short_description: z.string(),
  status: BenchmarkStatus,
  status_evidence: z.string().nullable(),
  saturated_date: z.string().nullable(),
  successor: z.string().nullable(),
  contamination: z.object({
    risk: ContaminationRisk,
    refresh_cycle: z.string().nullable(),
    test_set_public: z.boolean().nullable(),
  }),
  human_baseline: z.object({
    score: z.number().nullable(),
    note: z.string().nullable(),
  }),
  statistical_note: z.string().nullable(),
  metric_primary: z.string().nullable(),
  judge_model: z.string().nullable(),
  last_updated: z.string(),
  source_url: z.string().url(),        // canonical benchwiki page
});
```

`judge_model` is carried deliberately: it is used in section 3 to make the LLM-as-judge
argument with real examples rather than as an abstract caveat. It arrives nested as
`metric.judge_model` and is lifted here, as is `metric.primary`.

The record also carries `launch_date`, `languages`, `contamination.mitigation`,
`leaderboards` and `performance_timeline`, all of which sections 1 and 2 render and all
of which the upstream payload supplies. A timeline point is:

```ts
const TimelinePoint = z.object({
  model: z.string(),                 // the name upstream reported, kept verbatim
  model_id: z.string().nullable(),   // null when the registry could not resolve it
  vendor: z.string().nullable(),
  measured_at: z.iso.date(),
  score: z.number(),
  provenance: Provenance,
  source_url: z.url(),
});
```

`source_url` on a benchmark is derived from the slug, not supplied by the payload.

## Score

The central record. Note the composite key.

```ts
const Score = z.object({
  model_id: z.string(),
  variant: z.string(),                 // "base" when unspecified
  benchmark_slug: z.string(),
  harness: z.string().nullable(),      // null for non-agentic
  value: z.number(),
  unit: z.enum(["percent", "elo", "index", "count", "usd", "seconds"]),
  provenance: Provenance,
  measured_at: z.string().nullable(),
  source: SourceMeta,
  notes: z.string().nullable(),
});
```

`confidence_interval` and `sample_size` are carried because the image tab needs them:
an Elo without its interval is not comparable, and an Elo on 40 votes is not an Elo on
40,000. Both are nullable, because most benchmark scores report neither.

Rules enforced in code, not just documented:
- Two scores differing only in `harness` are two rows. Never averaged.
- Two scores differing only in `provenance` are two rows. Never averaged.
- A score with `unit: "elo"` is never compared against one with `unit: "percent"`.
- `percent` means a 0-100 scale everywhere. A source reporting 0-1 fractions is scaled
  once, at ingest. This is a unit conversion, not rounding: no value is ever rounded
  before render.
- Provenance is read from the source, never defaulted. Where a source states it only
  indirectly — Epoch cites where each number came from — the rule used to decide the
  label is applied consistently and recorded in `notes`, so a reader can audit the
  label rather than trust it. Where it cannot be established at all, the row is
  `vendor-reported`, the weaker of the two claims.

## Joined row — the core artefact

What `data/derived/model-benchmark-join.json` contains and what the UI renders.

```ts
const JoinedScore = Score.extend({
  benchmark: Benchmark,
  health_flags: z.array(z.enum([
    "saturated",
    "deprecated",
    "high-contamination",
    "vendor-reported-only",
    "superseded",
    "disputed",
    "stale-source",
  ])),
});
```

`health_flags` is computed at build time, not at render time, so the flag logic lives in
one place and is testable.

### Flag derivation

| Flag | Condition |
|---|---|
| `saturated` | `benchmark.status` is `saturated` |
| `deprecated` | `benchmark.status` is `deprecated` |
| `high-contamination` | `benchmark.contamination.risk` is `high` |
| `vendor-reported-only` | no `independent` score exists for this (model, variant, benchmark, harness) |
| `superseded` | `benchmark.successor` is non-null |
| `disputed` | the source reports more than one value for one measurement — two scores equal on (model_id, variant, benchmark_slug, harness, provenance, measured_at) and unequal in value |
| `stale-source` | `source.fetched_at` older than 7 days **at build time** |

A build-time `stale-source` flag is a floor, not the whole story: the pipeline commits
only when data changes, so a dead source produces no rebuild and a flag computed at
build time would freeze. Staleness is therefore also computed at render time in the
browser from `fetched_at`, by `FreshnessStamp`. The flag marks data that was already
stale when the build ran; the stamp is always current.

## Ingestion log

```ts
const IngestionRun = z.object({
  run_at: z.string().datetime(),
  results: z.array(z.object({
    source_id: z.string(),
    status: z.enum(["ok", "unreachable", "schema-error", "truncated"]),
    record_count: z.number().int(),
    previous_record_count: z.number().int().nullable(),
    unresolved_models: z.array(z.string()),
    message: z.string().nullable(),
  })),
});
```

## Changelog

- Initial version.
- `Score` gained `confidence_interval` and `sample_size`; percent scale and provenance
  derivation stated. Milestone 3.
- `Benchmark` extended to the payload's real shape, and `TimelinePoint` added.
  Milestone 2.
- Added `RegistryModel` and `UnresolvedName`, separating hand-maintained identity from
  the derived `Model` record. Milestone 1.
- Prices and context window became `QuotedNumber`, carrying their own source and fetch
  date, so a vendor list price is never presented as an OpenRouter routed price.
  Milestone 3.
- `vendor-reported-only` keyed on the full score tuple, not model+benchmark.
- `disputed` exists because the identity tuple above is not unique in real upstream data.
  Epoch reports two Humanity's Last Exam scores for one model on one day, and HLE's own
  statistical note says tool-augmented and no-tools runs differ by tens of points — a
  configuration it does not record per score. Showing both silently makes the table look
  broken; showing one would be a coin toss presented as a fact. Both are shown, both
  flagged. Values are compared rounded to six decimal places, so float noise is not
  mistaken for disagreement.
- `stale-source` clarified as a build-time floor, with render-time staleness in
  `FreshnessStamp`.
- Added the `disputed` flag: the declared identity tuple is not unique upstream, and two
  values for one measurement are shown and flagged rather than silently picked between.
  Post-launch audit.
