# Section 1 — Leaderboard

Route: `/models`, with `?tab=text|agentic|image`. Model detail at `/models/[...slug]`.

A catch-all segment rather than `[slug]`, because a `model_id` contains a slash:
`/models/anthropic/claude-opus-5` is the id itself, which a reader can recognise, where
an encoded single segment would not be. `/models` reads its tab from the URL on the
client so the route stays static.

## The rule that governs this section

A score never appears without its benchmark's health and the number's provenance. If you
find yourself rendering a bare number anywhere in this section, that is a bug.

**Where that fact lives is allowed to vary; whether it is present is not.** Per-row is the
default. Where every visible row agrees, the fact may instead be stated once, in prose,
*above* the table — never below it, because a footer legend satisfies the letter of the
rule while letting a reader meet forty-nine bare numbers first. The e2e smoke test asserts
one of the two forms is present and fails if neither is.

## How the table ranks

Models are measured on different benchmarks, and a score on one is not comparable to a
score on another. The table therefore ranks on a single **reference benchmark** per tab:

1. The reference is the benchmark the most model-variants in that tab are measured on.
2. Ties are broken on benchmark health, then on total score count, then on slug. Health
   comes first deliberately. ARC-AGI and ARC-AGI-2 currently cover the same 49
   model-variants and differ by one score, so a count-only rule would hand the ranking to
   whichever gained a row overnight — half the time the saturated one.
3. Its name is the column header, so the reader always knows what they are looking at.
4. Only models measured on it are ranked. Everything else goes to the block below, with
   the reason stated.
5. **A reference that is not `active` states why it was chosen anyway.** Coverage beating
   health is the right rule — ranking on a pristine benchmark two models share tells a
   reader less than ranking on a tired one forty-nine of them share — but applied silently
   it reads as the site contradicting its own home page, which says not to quote exactly
   this kind of number. So the header names the healthier benchmark that lost and what it
   lost on ("its successor ARC-AGI-3 has no scores here yet, so ranking on it would rank
   nothing"), and tells the reader to read the table as "best on ARC-AGI-2", not "best".
   A trade-off the reader cannot see is not one they can disagree with.

**"Hide saturated benchmarks" removes saturated and deprecated benchmarks from the tab
entirely** — not merely from reference eligibility. Their scores do not appear, a model
whose only measurements sit on them drops out of the ranking, and the reference is chosen
from what remains. The control states how much it is excluding ("hiding 61 scores on 6
benchmarks") so it is informative even when the ranking happens not to move, and when the
reference would differ the table says which benchmark the other setting would rank on.

Whether the ranking reorders is a property of the data, not of the control. It reorders
when the most-covered benchmark is saturated. Today it does not, because ARC-AGI-2 —
nearing saturation, not saturated — is the most-measured benchmark on the text tab.

## Index page

A dense, sortable table. Not cards. The reader is scanning and comparing, and cards
destroy column alignment.

### Columns — text tab

| Column | Notes |
|---|---|
| Rank | Position within current sort. Not a stored property. |
| Model | Name plus creator. Links to detail. Open-weights models carry a small marker. |
| Variant | Effort or reasoning tier — `base`, `high`, `xhigh`. Shown always, including for `base`. |
| Capability | The reference benchmark's score, its name in the header. Independent is preferred where both exist; never an unlabelled composite |
| Epoch index | Epoch AI's Capability Index, labelled as a third-party composite. Sortable, but never the rank: it has no benchmark health record behind it, so it carries no flags |
| Health | Compact strip of health flags for the benchmarks behind that score |
| Provenance | `independent` / `vendor-reported` / `mixed` |
| Context | Context window |
| Price | Input / output per million tokens, each labelled vendor list price or OpenRouter routed price |
| Adoption | OpenRouter usage rank, visually separated from capability columns |
| Released | Date, with "new" marker under 14 days |

**The row key is model + variant, and by default only the best variant per model is
shown.** `Claude Opus 5` and `Claude Opus 5 (high)` remain two distinct rows in the data —
merging them silently produces a wrong number with no error anywhere, the same argument
`01-architecture/model-registry.md` makes for the score tuple. But showing every
configuration by default answers "who is ahead" badly: 49 rows describe 19 models, and one
model held ranks 1–4 because it was measured at six effort levels.

So the table shows one row per model, carrying its best-scoring configuration, and says
which one it was and how many it beat — "best of 6 configurations". Nothing is averaged and
no number changes; the collapse is named on the row rather than implied. **"Show every
configuration"** expands back to variant rows. A collapsed row that hid which variant
produced its number would be the silent merge this rule forbids.

**The ranking states its own reach.** A line above the table says how many of the tracked
benchmarks have any score at all — 11 of 80 today. Without it the table reads as the state
of the field rather than as what the sources this site can legally redistribute have
measured.

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
isn't an honest one. These rows are not part of the benchmark join and carry no health
flags, because no benchmark health record exists for an arena board upstream. The tab
says so rather than leaving the reader to assume the flags were checked and came back
clean: a preference ranking is a different kind of claim from a benchmark score. If the arena mirror is unavailable, render the empty state described
below, not a fallback ranking from another modality.

### Columns that say the same thing on every row

A column identical in all forty-nine rows is not information. It is a fact about the whole
view wearing a column's clothing, and it costs horizontal space on a table built for
scanning. Provenance and Health both do this routinely: rank on an independently-measured
benchmark with a successor and every row reads `ind.` and `→ superseded`.

So when a column is uniform across the visible rows it collapses into one sentence above
the table — "Every number in this view was measured independently of the model's maker" —
and the column is dropped. When a filter or a tab makes it vary again, the column returns.
Both directions are unit-tested, because with current data only the collapsing direction
is reachable through the UI.

### Abbreviations are written out, not hovered

`ind.` and the `~` that marks an OpenRouter routed price were explained only by `title`
attributes. Tooltips do not exist on touch and are announced inconsistently by screen
readers, so on a phone the two marks carrying this site's entire honesty claim were
unexplained. Both are spelled out in a legend below the table. A `title` may repeat an
explanation; it may never be the only place one exists.

### Interactions

- Sort by any numeric column. Client-side over prerendered data. The sorted column carries
  `aria-sort`, so the sort is audible and not only visible in the `▾`.
- Filters: creator, open-weights, released-within, minimum provenance (`independent only`).
- **"Hide saturated benchmarks" toggle.** On by default. This is the section's signature
  control — it visibly changes the ranking, which is the entire argument of the site made
  interactive. Rows animate to their new positions rather than jumping, because watching
  the ranking rearrange is what makes the argument land. Position only, under 300ms,
  disabled under `prefers-reduced-motion`. Sorting and filtering animate the same way.
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

## Compare view

Route: `/compare`. Selection lives in component state, not the URL — the route is static,
and reading a search parameter during render is what caused the hydration mismatch the tabs
had to be rewritten to avoid.

The view exists to answer the question a leaderboard raises and does not settle: how do
these two actually differ. Its one non-obvious rule is the reason it is worth building at
all:

**Two models are only comparable on a benchmark both were measured on.** A side-by-side
table that shows a number against a blank invites the reader to read the blank as a loss,
when it means nobody ran the test. So the comparison is split into "measured on the same
benchmark" and "measured on only some of them", and the second group is stated as an
absence of measurement rather than rendered as an empty cell.

Every compared score keeps its health flags and provenance. Two models can be compared
perfectly fairly on a benchmark that no longer separates anyone, and the result still means
little — the flags are what stop the comparison from overstating itself.

## Search

A text filter on each catalogue, client-side over prerendered data: models by name, creator
or id; benchmarks by name, slug, description or capability. Matching stops there
deliberately — searching the status evidence and contamination prose would match a common
word against almost every record and make the search feel broken.

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
- Added the ranking rule, the Epoch index column, and the catch-all detail route.
  Milestone 4.
- Image tab states that arena rows carry no health flags, and why. Milestone 3.
- Row reordering animates on toggle, sort and filter.
- Leaderboard rows keyed by model + variant, with a visible variant column.
- Price column labels vendor list price against OpenRouter routed price. Milestone 3.
- A non-active reference benchmark now defends its own selection in the header, and the
  model detail page renders each score's variant so reasoning-effort configs stop reading
  as one benchmark scored six unexplained ways. Post-launch audit.
- Uniform columns collapse into a sentence, abbreviations moved out of `title` attributes
  into a visible legend, `aria-sort` added, and the model page now links benchmarks
  internally rather than straight out to benchwiki. Post-launch audit.
- One row per model by default, carrying its best configuration and saying how many it
  beat; a toggle expands every variant. The ranking states how much of the benchmark
  universe it can speak to. Post-launch audit.
- Added the compare view and catalogue search; recorded that comparability requires a
  benchmark both models were measured on. Post-launch.
