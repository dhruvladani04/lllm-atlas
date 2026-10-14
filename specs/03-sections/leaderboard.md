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

Elo, confidence interval, vote count. The source is the same on every row, so it is stated
once above the table and linked to Arena's own board, with the dataset page linked in the
attribution below it; the JSON endpoint the pipeline reads stays recorded in the snapshot
as the provenance of record, and is not a page to send a reader to. No capability index —
there isn't an honest one. These rows are not part of the benchmark join and carry no health
flags, because no benchmark health record exists for an arena board upstream. The tab
says so rather than leaving the reader to assume the flags were checked and came back
clean: a preference ranking is a different kind of claim from a benchmark score. If the arena mirror is unavailable, render the empty state described
below, not a fallback ranking from another modality.

### Columns that say the same thing on every row

A column identical in all forty-nine rows is not information. It is a fact about the whole
view wearing a column's clothing, and it costs horizontal space on a table built for
scanning. Provenance and Health both do this routinely: rank on an independently-measured
benchmark with a successor and every row reads `ind.` and `→ superseded`.

So when a column is uniform across every matching row it collapses into the summary line
above the table — the `ind.` badge with "every number independently measured" — and the
column is dropped. Uniformity is judged over every row that matches the filters, not only
the twenty-five on screen, so asking for the rest can never contradict the line above them. When a filter or a tab makes it vary again, the column returns.
Both directions are unit-tested, because with current data only the collapsing direction
is reachable through the UI.

**A flag shared by every row is stated once even when the rows differ in others.** Ranking
on a superseded benchmark put `→ superseded` on all 210 rows, because three of them also
carried `disputed` and the column could only collapse when every row was identical. The
shared flags now go in the summary line ("→ superseded on every row") whether or not the
column stays, and a row's Health cell shows only what it adds: `≠ disputed` on the three,
"—" on the rest, read out as "no flags beyond those on every row".

### The summary line, and what may sit behind a disclosure

Two paragraphs, about 110 words, used to stand between the reader and the first row. They
are now one line and a disclosure, and the split between them is a rule, not a matter of
taste:

- **Visible, always:** the benchmark the table ranks on, linked to its page; that
  benchmark's status chip; any health flag shared by every row; the provenance shared by
  every row; how many of the tracked benchmarks have scores; when the data was fetched.
- **Behind "Why this ranking?":** why that benchmark is the basis, what a different toggle
  state would rank on, the coverage caveat in full, and the long form of the shared
  provenance sentence.

The facts a reader needs in order to judge the table stay on the page. Only the reasoning
for them is folded away. Folding the facts and keeping the prose would break the rule at
the top of this section, and an e2e test asserts the provenance statement is *visible*,
not merely present in the document.

The disclosure is a native `<details>`, so it opens without a script.

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
- **Twenty-five rows first.** The table renders its top 25 and states the total
  ("Showing 25 of 210 ranked rows") beside a "Show all" button. This replaces "no
  pagination, virtualise past 200": the registry grew from 30 models to 460, the phone
  layout was 37,000px tall, and the rows nobody had asked for were most of the page weight.
  Rank numbers do not change, nothing is dropped, and the count is always stated.

### Below 768px

The leaderboard is the page most likely to be opened from a link on a phone, and it was the
least usable there: a sideways-scrolling table under six wrapped controls.

- **Rows stack.** Rank, model and score on the first line; Epoch index, context, price and
  release date as labelled lines beneath; provenance and health badges last. It is the
  same table restyled, with explicit ARIA roles, so the DOM is not doubled and it is still
  rows and cells to a screen reader. The header row is not drawn but stays in the
  accessibility tree.
- **Filters sit behind one button**, which says how many are on. "Hide saturated
  benchmarks" counts, because it is on by default and it does remove rows; a filtered table
  must never look unfiltered. Search stays outside the button.
- **Sorting moves into the filter panel**, since there are no column headers to press.
- The image tab stacks the same way.

### Not ranked here

Grouped by reason — released and not yet scored, scored on other benchmarks, only on
saturated benchmarks, announced — each a collapsed disclosure with its count. The flat list
ran to 170 lines and made the phone page 15,000px taller. A search box above the groups
shows every match at once, with the reason written on each line because a search mixes
groups.

### The sticky header

The column headers pin to the top of the viewport from 768px up. They never did before:
the table sat inside an `overflow-x: auto` wrapper, which made the wrapper the scroll
container, so the header pinned to the wrapper and scrolled away with the page. The wrapper
is gone. From 768px up the table fits without it, and the e2e suite measures every route
at 768 and 1024px to keep it that way.

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

## Summary cards

A row of cards sits above the tabs on `/models` and below the worked example on the home
page. They exist so a reader arriving with "who is ahead" gets an answer in the first
screen, and they are held to the same rule as every other score here: a card is a row, and
it carries what the row carries.

Each card is one real row from the default view of a ranking, with the rule that picked it
as its heading:

| Card | Rule |
|---|---|
| Highest on the text reference | First row of the text tab, saturated benchmarks hidden |
| Highest with open weights | First row of the same ranking whose model is recorded as open. Unrecorded is not counted either way, and the card says how many rows that is |
| Lowest price near the top | Cheapest by input plus output price among rows scoring at least 90% of the leader's. Percent-unit references only: a fraction of an Elo or an index means nothing. Unpriced models are not counted, and the card says so |
| Highest on the agentic reference | First row of the agentic tab, labelled as a system score |
| Highest Arena Elo, text to image | Top of the image board, with its interval, labelled as a preference ranking |

Binding rules:

- **A card names its benchmark.** The heading is "Highest on X", never "Best".
- **A card carries its caveats.** Status chip, health flags and provenance badge, exactly as
  the row has them. The arena card has no health record to show and says that in words.
- **A card is never invented.** If a rule matches no row, the card is absent. No fallback
  to the nearest thing.
- **Cards and table agree.** Both are built from the same call, so a card cannot name a
  model the table below ranks differently.
- **No "biggest mover".** It needs a score history per model that no ingested source
  provides; computing it from our own snapshot dates would report when we fetched a number,
  not when a model improved.

## Home page

The home page is not a marketing page. It is a demonstration of the thesis.

Lead with a single real leaderboard row in which a model shows a high score *and* a
saturation flag on the benchmark producing it — the argument shown, not stated. Below it,
the summary cards, which are the same argument applied to the current leaders: each one a
score with its benchmark's health attached. Then the three section entries with one line
each. The cards come second on purpose; the caveat is taught before the rankings are shown.

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
- Added summary cards above the tabs and on the home page, each a real row carrying its
  health flags, with the rule that picked it as its heading. Creator names carry a vendor
  mark. "Biggest mover" was considered and left out for want of a real history.
- The two paragraphs above the table became one summary line and a "Why this ranking?"
  disclosure, with a rule for which facts must stay visible. Rows stack below 768px, filters
  collapse behind a counting button there, and the table shows its top 25 first. UX
  refresh, P0.
- Shared health flags are stated once in the summary line and dropped from each row's
  Health cell; "Not ranked here" is grouped by reason, collapsed, with counts and a search;
  the overflow wrapper that stopped the header sticking is removed. UX refresh, rest of P0.
