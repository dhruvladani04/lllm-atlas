# Schemas

Every file in `data/` conforms to a Zod schema in `lib/schemas/`. The schemas below are
normative; the TypeScript is generated from them via `z.infer`.

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

const SourceMeta = z.object({
  source_id: z.string(),
  source_url: z.string().url(),
  fetched_at: z.string().datetime(),
  licence: z.string(),
  attribution: z.string(),
});
```

## Model

```ts
const Model = z.object({
  model_id: z.string(),               // "anthropic/claude-opus-5"
  display_name: z.string(),
  creator: z.string(),
  released_at: z.string().nullable(),
  open_weights: z.boolean().nullable(),
  state: ModelState,
  context_window: z.number().int().nullable(),
  price_input_per_mtok: z.number().nullable(),
  price_output_per_mtok: z.number().nullable(),
  aliases: z.array(z.string()),
  variants: z.array(z.object({
    variant: z.string(),
    aliases: z.array(z.string()),
  })),
});
```

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
argument with real examples rather than as an abstract caveat.

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

Rules enforced in code, not just documented:
- Two scores differing only in `harness` are two rows. Never averaged.
- Two scores differing only in `provenance` are two rows. Never averaged.
- A score with `unit: "elo"` is never compared against one with `unit: "percent"`.

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
| `vendor-reported-only` | no `independent` score exists for this model+benchmark |
| `superseded` | `benchmark.successor` is non-null |
| `stale-source` | `source.fetched_at` older than 7 days |

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
