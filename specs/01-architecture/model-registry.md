# Model registry

This is the hardest problem in the project and the most expensive to retrofit. Build it
first, in Milestone 1, before any source beyond the first.

## The problem

The same model appears across sources as `claude-opus-5`, `Claude Opus 5`,
`anthropic/claude-opus-5`, `Claude Opus 5 (high)`, and `claude-opus-5-20260115`. Some of
those are the same thing. Some are not — an effort or reasoning-budget variant can score
very differently from its base model, and merging them silently produces a wrong number
with no error anywhere.

Agentic scores make this worse: the same model under two different harnesses is two
different results. Benchwiki's own records repeat this point — an agent score is a system
score, not a model score.

## Canonical identity

A score row is keyed by the tuple:

```
(model_id, variant, benchmark_id, harness, source_type, measured_at)
```

Not by model name. Not by model name plus benchmark.

- `model_id` — stable slug for the base model, e.g. `anthropic/claude-opus-5`
- `variant` — effort/reasoning tier or quantisation, e.g. `high`, `xhigh`, `max`,
  `base`. `base` when the source reports no variant.
- `harness` — the scaffold under which an agentic score was produced. `null` for
  non-agentic benchmarks. Two scores that differ only by harness are two rows.
- `source_type` — `vendor-reported` or `independent`. Never blend the two in one average.

## Registry file

`data/registry/models.json`, an array of:

```jsonc
{
  "model_id": "anthropic/claude-opus-5",
  "display_name": "Claude Opus 5",
  "creator": "Anthropic",
  "released_at": "2026-01-15",
  "open_weights": false,
  "status": "ranked",
  "aliases": [
    "claude-opus-5",
    "Claude Opus 5",
    "anthropic/claude-opus-5",
    "claude-opus-5-20260115"
  ],
  "variants": [
    { "variant": "base", "aliases": ["Claude Opus 5"] },
    { "variant": "high", "aliases": ["Claude Opus 5 (high)", "claude-opus-5-high"] }
  ]
}
```

## Resolution rules

1. Exact match on `model_id` wins.
2. Exact match on an alias wins.
3. Case-insensitive and punctuation-normalised alias match wins.
4. **Nothing else resolves.** No fuzzy matching, no edit distance, no substring matching.
   An unresolved name goes to `data/registry/unresolved.json` with its source and the
   date, and is excluded from derived output.

Fuzzy matching is forbidden because a wrong match is invisible and a missing match is
visible. Prefer the visible failure.

## Adding a model

Unresolved names accumulate in `unresolved.json`. A human reviews that file, adds the
alias to the registry, and the next ingestion run picks it up. The list of unresolved
names should be surfaced in the ingestion log so it does not silently grow.

This is intentionally manual in v1. Automating it means automating the wrong-merge risk.

## Changelog

- Initial version.
