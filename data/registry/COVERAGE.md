# Registry coverage

What this file is: an honest account of what `models.json` does not contain. The site's
whole argument is that a visible gap beats an invented value, and that applies to the
registry itself.

Last reviewed: 2026-09-12.

## What is here

30 models. Seeded at 19 in Milestone 1, then grown in Milestone 4 by working the
`unresolved.json` queue — the workflow this file describes, applied for the first time.

The 11 models added there were reviewed by hand and their identity fields come from Epoch's
own data rather than from memory: creator from its `Organization` column, release date from
its `Release date` column. Effort variants (`low`, `high`, `xhigh`, `max`) were added to
existing models the same way, which is why the leaderboard now shows several rows per
model.

Two rules were applied while doing it, both learned the hard way:

- **Identity is decided by a human; only aliases come from the data.** A first attempt
  derived models from Epoch's `model_version` strings and split one model into seven
  (`gpt-6-astra`, `gpt-6-astra-max`, `gpt-6-astra-high`, …). Names in the data are aliases,
  not identities.
- **Where `display_name` and `model_version` disagree about the tier, the row is skipped.**
  Epoch sometimes labels a row `Claude Opus 5` while its version string says
  `claude-opus-5_max`. 28 rows were skipped on that basis rather than guessed at. The
  registry's own ambiguity guard caught this: it refused to index an alias claimed by two
  variants at once.
Agentic is not a separate set of models — the same models are scored under a harness, and
the harness belongs to the score key, not to the model.

## What is missing, and why

**Models released after May 2026.** The seed entries were written from knowledge that ends
in May 2026, and were not filled in by guesswork for the months after it. Any model
released since then is absent. It will appear in `unresolved.json` the first time a source
reports it, which is the intended path: an unresolved name is loud, and a guessed one is
silent.

**Release dates that could not be stated confidently** are `null`, not approximated. A
`null` release date renders as a gap, never as an estimate, and never as a "new" marker.

**Effort and reasoning variants.** Every model here carries only a `base` variant. Tiers
like `high` or `xhigh` are added once a source is actually observed reporting them, rather
than assumed per creator. An invented variant is as damaging as an invented score: it
creates a row nothing can ever resolve to, and it splits a model's scores across a
distinction the vendor may not make.

**Prices and context windows are not here at all.** The registry holds identity only; those
are ingested — see `specs/02-data/sources-and-licensing.md` source 5.

## Benchmark aliases

`benchmark-aliases.json` maps an upstream benchmark name to a benchwiki slug. Three
entries, each checked against the benchwiki record rather than against the name:

- `GPQA diamond` -> `gpqa`, because benchwiki's own record states it is "reported on its
  198-question Diamond subset" and its metric is accuracy on GPQA Diamond.
- `BBH` -> `big-bench-hard` and `HLE` -> `humanitys-last-exam`, both standard
  abbreviations of the benchmark benchwiki records.

Things that look aliasable and are not, with the reason, so nobody adds them later:

- `MATH level 5` is not `math`. Benchwiki's MATH record is evaluated on the MATH-500
  subset; level 5 is a difficulty split. Different test, different numbers.
- `SimpleQA Verified` is not `simpleqa`. Benchwiki's record scores all 4,326 questions;
  Verified is a revised 1,000-question subset.
- The four private `FrontierMath-*` tiers are not `frontiermath`. Tier 4 and Tiers 1-3 are
  far apart in difficulty, and averaging them under one name would be meaningless.
- `ARC AI2` is not `arc-agi`. AI2's ARC and ARC-AGI are unrelated benchmarks that happen to
  share three letters.

Everything else in `unresolved-benchmarks.json` has no benchwiki record at all. Those
scores are excluded from the join, because a score with no benchmark health record is
exactly what section 1 refuses to render.

## Adding a model

1. Read `unresolved.json`. It is the queue.
2. Add the model, or add the alias to an existing model, in `models.json`.
3. For a variant, add it to that model's `variants` array with the aliases the source
   actually used.
4. The next ingestion run picks it up and drops the name from the unresolved list.

This is deliberately manual. Automating it means automating the wrong-merge risk, which is
the one failure mode nothing downstream can detect.
