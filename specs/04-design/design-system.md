# Design system

## Brief

The subject is measurement and its trustworthiness. The audience is engineers who read
tables for a living. The job is to let someone scan a lot of numbers quickly and
immediately see which ones to distrust.

That gives one governing idea, and everything below follows from it:

> **The interface is achromatic. Colour belongs to the data.**

Chrome, navigation, headings, borders and backgrounds are paper and ink. Colour appears
only where it encodes a fact: benchmark status, contamination risk, provenance, staleness.
A reader who learns the colour vocabulary once can scan a 200-row table and find the
untrustworthy cells without reading a word.

This rules out decorative accent colours, gradient washes, tinted hero sections and
coloured buttons. If a colour is not carrying information, remove it.

## What to avoid

These are the current defaults of generated design and will make the site look like every
other AI-adjacent page:

- Cream background near `#F4F1EA` with a serif display face and a terracotta accent
- Near-black background with one acid-green or vermilion accent
- Identical rounded cards with the same soft grey shadow under each
- Tracked-out all-caps eyebrow labels above every heading
- Meta strings joined with middle dots
- A `→` appended to link text
- Fade-and-slide-up entrance animations on each section

## Colour

Neutral base — used for everything that is not data:

```
--paper        #FAFAF8   page
--surface      #FFFFFF   table, panels
--ink          #14171C   primary text
--ink-mute     #5F646D   secondary text
--rule         #E2E3DE   hairlines, table borders
--rule-strong  #C6C8C1   emphasised borders
```

Dark mode inverts: `--paper #101317`, `--surface #171B20`, `--ink #E8E9E4`,
`--ink-mute #9BA0A8`, `--rule #262B31`.

Data palette — used *only* for the meanings listed:

```
--status-active       #1C6F55   benchmark still discriminates
--status-nearing      #97650A   nearing saturation
--status-saturated    #7E8279   saturated (deliberately grey: it means "stop reading this")
--status-deprecated   #9B3232   deprecated
--risk-high           #9B3232   high contamination
--risk-medium         #97650A   medium contamination
--provenance-vendor   #6B4E9B   vendor-reported
--stale               #97650A   source older than 7 days
```

Saturated status is grey on purpose. Greying a score is a stronger signal than colouring
it, and it keeps the table calm when many benchmarks are saturated at once.

Colour is never the only carrier. Every status also has a text label or a glyph, for
colour-blind readers and for print.

## Type

Two families, clearly distinct roles.

| Role | Family | Why |
|---|---|---|
| Interface, tables, numbers | IBM Plex Sans | True tabular figures, engineering vernacular, not the default Inter |
| Long-form evals guides | Source Serif 4 | Comfortable at length, visibly different from the UI |
| Model IDs, slugs, code | IBM Plex Mono | Monospace only for things that are literally identifiers or code |

Monospace for small decorative labels is a generated-design tell. Monospace here is
reserved for strings the reader might copy.

Scale: 13 / 14 / 16 / 20 / 26 / 34 px. Weights: 400 and 500 only in the UI; the serif may
use 600 for guide headings. Sentence case everywhere.

**Tabular figures are mandatory** on every numeric column: `font-variant-numeric:
tabular-nums`. Misaligned digits in a comparison table is a correctness problem, not a
taste problem.

Body measure in the evals section: 66–72 characters.

## Layout

Three layout modes, one per section. The structure itself tells the reader which mode
they are in.

- **Leaderboard** — full-bleed data table, left-aligned text columns, right-aligned
  numeric columns, sticky header, hairline row rules, no card containers, no shadows.
- **Benchmarks** — the capability × status grid. Fixed row labels, scrollable columns on
  narrow viewports.
- **Evals** — single narrow reading column, generous leading, a quiet sidebar for
  contents.

Density is a virtue in the first two and a vice in the third.

## Components with fixed behaviour

- **`ScoreCell`** — number, unit, provenance badge, and health flags. Saturated benchmarks
  render the number in `--ink-mute` with a strikethrough-adjacent treatment (not an actual
  strikethrough, which implies wrong rather than stale).
- **`ProvenanceBadge`** — `ind.` or `vendor`, always present, never inferred.
- **`StatusChip`** — benchmark status, colour plus label.
- **`FreshnessStamp`** — "fetched 4 hours ago" / "last successful fetch 3 days ago",
  appearing on every data surface. Goes amber past 7 days.
- **`MissingValue`** — an explicit component. Renders "not reported" with a tooltip giving
  the reason. Never an em dash, never a zero, never a blank cell.

## Motion

One orchestrated moment only: the home page's demonstration row, which reveals its health
flags a beat after the score so the reader sees the score first and the caveat second.
That sequence is the argument.

Everything else: state-change transitions under 150ms, and nothing on scroll. Respect
`prefers-reduced-motion`.

## Copy

- Errors say what happened and what to do. "Image rankings unavailable — last successful
  fetch 9 Sept. Retrying daily at 06:00 UTC."
- Empty states invite action or explain the wait.
- Buttons name their effect. "Hide saturated benchmarks", not "Filter".
- No exclamation marks. No "Powered by AI". No taglines built from three one-word
  sentences.

## Quality floor

Responsive to 360px. Visible keyboard focus. Table headers are real `<th scope>`. Contrast
at least 4.5:1 for text and 3:1 for the status colours against their background. The site
must be readable and correct with CSS disabled.

## Changelog

- Initial version.
