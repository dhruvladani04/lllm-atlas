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

The registry holds **identity only**. Price, context window and `state` are ingested or
derived and live in `data/derived/models.json`. Keeping mutable numbers out of the
hand-maintained file is what lets the definition of done forbid hand-editing everything
else in `data/`.

Note that `status` in the example above is spelled `state` in `02-data/schemas.md`, and
`state` is the correct name. It is derived from whether scores exist, never hand-set.

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

This is intentionally manual. Automating it means automating the wrong-merge risk, and a
wrong merge credits one model with another's score in a way nothing downstream can detect.

**What is generated, and what is still decided by a person.** "Manual" had quietly come to
mean "not at all": the queue reached 1,351 names against a registry of 30, which is not a
list anyone works through by hand, and the site was discarding scores for hundreds of models
it already legally ingests. So `scripts/generate-candidates.ts` now *proposes* entries from
snapshot evidence — creator from Epoch's `organization`, release date, variants from the
`model_version` suffix — and writes them to `data/registry/candidates.json` with the rows
that produced each one.

A proposal is not an entry. Nothing reaches `models.json` without a person approving it at
`/review` (development only) and running `pnpm registry:approve`, which re-checks the merge
and refuses to write a registry that will not index. What was automated is the
transcription; the judgement — is this really a distinct model, does its name mean what the
generator assumed — is exactly what the review step exists for, and candidates the generator
cannot be sure about are marked `conflict` and cannot be approved there at all.

Three rules the generator follows, each a case where guessing would be worse than stopping:

- **A tier suffix is read only from a closed set.** `gpt-5.6-sol_promax` is far likelier to
  be the `max` tier of `gpt-5.6-sol-pro` than a `promax` tier of `gpt-5.6-sol`, so an
  unrecognised suffix stays part of the name and the candidate is never auto-approvable.
- **A token budget is a variant; a parameter count is a model.** `_16K` is an effort tier
  expressed in tokens, so Claude 3.7 Sonnet is one model with nine budget variants rather
  than nine models. `_8B` is not: an 8B model really is a different model from a 70B one.
- **Two names that collapse to one id are flagged, never merged.** That is the wrong-merge
  risk in its purest form, and it is a judgement call by definition.

A candidate measured only on benchmarks with no health record here is demoted, because
approving it would add no scores — accurate, and useless.

**Image models are proposed from Arena's board, by different rules.** Epoch names no image
models at all, so `lib/registry/image-candidates.ts` reads the text-to-image board instead.
The evidence is a different shape — a vendor slug and the model's licence, but no release
date — and three things follow from that:

- **The creator comes from a table, not a rule.** Arena's slugs are `bfl` and `xai`; no
  capitalisation rule produces "Black Forest Labs" or "xAI". A slug missing from the table
  is kept raw and held out of the high tier rather than guessed at.
- **`open_weights` is derivable here, and only here.** `Proprietary` means no weights. Any
  other named licence is a licence on released weights — a non-commercial licence
  restricts use, not availability — so the weights are open. No licence stated stays null.
- **Parentheses are a tier only when they say so.** `gpt-image-2 (medium)` is one model
  with a `medium` variant; `(nano-banana-2)` and `(canvas)` are part of the name, and
  splitting on them would merge distinct models.

`released_at` is null for every image entry, because Arena publishes no release date and
nothing else here names these models.

## Changelog

- Initial version.
- Clarified that the registry holds identity only, and that `state` is derived rather
  than hand-set.
- Recorded what the candidate generator proposes and what a person still decides. Growth
  stays manual in the sense that matters: nothing enters the registry unapproved.

## Modality

Every registry entry declares a `modality` — `text` or `image` — meaning *what the model
produces*, not what it accepts. Most text models read images and that is irrelevant here.

The field exists because a ranking has to know which models it could ever include. An image
generator has no path to a score on a text benchmark, so listing one in the text tab's
"released, not yet independently scored" block promises a gap that will never close. Six of
the seven models in that block were image models before this field existed.
- Added `modality`, so a ranking only lists models it could ever include. Post-launch.
- Image models are proposed from Arena's board, with `open_weights` read from the licence
  Arena records. Registry expansion.
