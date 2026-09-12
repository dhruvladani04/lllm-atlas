# Registry coverage

What this file is: an honest account of what `models.json` does not contain. The site's
whole argument is that a visible gap beats an invented value, and that applies to the
registry itself.

Last reviewed: 2026-09-12.

## What is here

19 models: 13 text and agentic, 6 image generation, a mix of open and closed weights.
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

## Adding a model

1. Read `unresolved.json`. It is the queue.
2. Add the model, or add the alias to an existing model, in `models.json`.
3. For a variant, add it to that model's `variants` array with the aliases the source
   actually used.
4. The next ingestion run picks it up and drops the name from the unresolved list.

This is deliberately manual. Automating it means automating the wrong-merge risk, which is
the one failure mode nothing downstream can detect.
