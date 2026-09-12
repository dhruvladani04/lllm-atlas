# Section 1 — Leaderboard

Route: `/models`, with `?tab=text|agentic|image`. Model detail at `/models/[slug]`.

## The rule that governs this section

A score never appears without its benchmark's health and the number's provenance. If you
find yourself rendering a bare number anywhere in this section, that is a bug.

## Index page

A dense, sortable table. Not cards. The reader is scanning and comparing, and cards
destroy column alignment.

### Columns — text tab

| Column | Notes |
|---|---|
| Rank | Position within current sort. Not a stored property. |
| Model | Name plus creator. Links to detail. Open-weights models carry a small marker. |
| Variant | Effort or reasoning tier — `base`, `high`, `xhigh`. Shown always, including for `base`. |
| Capability | Primary independent score, with its benchmark named inline — never an unlabelled composite |
| Health | Compact strip of health flags for the benchmarks behind that score |
| Provenance | `independent` / `vendor-reported` / `mixed` |
| Context | Context window |
| Price | Input / output per million tokens, each labelled vendor list price or OpenRouter routed price |
| Adoption | OpenRouter usage rank, visually separated from capability columns |
| Released | Date, with "new" marker under 14 days |

**The row key is model + variant.** `Claude Opus 5` and `Claude Opus 5 (high)` are two
rows, not one, because they score differently and merging them silently produces a wrong
number with no error anywhere — the same argument `01-architecture/model-registry.md`
makes for the score tuple. Sorting and filtering operate over variant rows.

Where no vendor price is available, the OpenRouter price renders with a small marker and
a tooltip: a routed price is not a list price. Where neither exists, the cell renders
through `MissingValue`.

### Columns — agentic tab

Same, with two changes that matter:

- The row key is **model + variant + harness**, and the harness is a visible column. Two rows for
  the same model under different scaffolds is correct, not a duplicate.
- A persistent note above the table: agentic scores are system scores, not model scores.
  Changing the harness changes the number.

### Columns — image tab

Elo, confidence interval, arena appearance count, source. No capability index — there
isn't an honest one. If the arena mirror is unavailable, render the empty state described
below, not a fallback ranking from another modality.

### Interactions

- Sort by any numeric column. Client-side over prerendered data.
- Filters: creator, open-weights, released-within, minimum provenance (`independent only`).
- **"Hide saturated benchmarks" toggle.** On by default. This is the section's signature
  control — it visibly changes the ranking, which is the entire argument of the site made
  interactive.
- No pagination. Virtualise if rows exceed 200.

### Empty and degraded states

Every state gets copy that says what happened and when it will resolve. Never a spinner
that never ends, never a blank table.

- Source unavailable: "Image rankings unavailable — last successful fetch 3 days ago."
- Model ranked but no independent scores: the row renders with the provenance column
  reading `vendor-reported` and the capability cell visibly marked, not hidden.
- Model in `released_unranked`: appears in a separate block below the table headed
  "Released, not yet independently scored", ordered by release date, showing days elapsed.
  This block is a feature. Do not merge it into the main table and do not omit it.

## Model detail page

Sections in this order:

1. **Identity** — name, creator, release date, weights availability, context, pricing,
   with a freshness stamp for each fetched field.
2. **Scores** — grouped by capability. Each row: benchmark name, score, unit, provenance
   badge, measured date, source link, and the benchmark's status chip. Saturated and
   deprecated benchmarks render in a visually recessed group headed "Scores on benchmarks
   that no longer discriminate", not removed — the reader should see what the marketing
   numbers are based on.
3. **Health summary** — one honest paragraph generated from flags: how many of this
   model's scores sit on active benchmarks, how many are vendor-reported only.
4. **Timeline** — where benchwiki provides a `performance_timeline`, plot this model's
   points against the benchmark's trajectory. Mark vendor-reported and independent points
   differently. Never connect points from different harnesses or different exam years with
   a single line.
5. **Unresolved** — if the model appears in `unresolved.json` under an alias, say so.

## Home page

The home page is not a marketing page. It is a demonstration of the thesis.

Lead with a single real leaderboard row in which a model shows a high score *and* a
saturation flag on the benchmark producing it — the argument shown, not stated. Below it,
the three section entries with one line each.

Do not write a hero with a big number and a gradient. Do not write "Track. Compare.
Decide." Copy guidance is in `04-design/design-system.md`.

## Changelog

- Initial version.
- Leaderboard rows keyed by model + variant, with a visible variant column.
- Price column labels vendor list price against OpenRouter routed price. Milestone 3.
