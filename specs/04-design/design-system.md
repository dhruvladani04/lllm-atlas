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
`--ink-mute #9BA0A8`, `--rule #262B31`, `--rule-strong #3A4149`.

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

The data palette above is the light-scheme set. Dark backgrounds need lighter hues to
hold their contrast floor, so each has a dark-scheme counterpart carrying the same
meaning:

```
--status-active       #5CBF98
--status-nearing      #D9A441
--status-saturated    #9AA096   still the grey one, still meaning "stop reading this"
--status-deprecated   #F08A86
--risk-high           #F08A86
--risk-medium         #D9A441
--provenance-vendor   #B49AE0
--stale               #D9A441
```

Both sets are checked against both grounds by a unit test rather than by eye, since the
contrast floor below is a measurable claim.

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
  appearing on every data surface. Goes amber past 7 days. The relative time is computed
  in the browser from the `fetched_at` the page was built with, not baked in at build
  time — a build-time string freezes whenever the pipeline has nothing to commit. Render
  the absolute date server-side and swap to relative after mount, so there is no
  hydration mismatch and the page is correct with JavaScript disabled.
- **`PriceCell`** — price plus a marker naming its source. A vendor list price renders
  plain; an OpenRouter routed price renders with the marker and a tooltip saying which
  claim it is. The two are different facts and are never shown as one.
- **`MissingValue`** — an explicit component. Renders "not reported" with a tooltip giving
  the reason. Never an em dash, never a zero, never a blank cell.

## Motion

Motion here has one job: to show a mechanism the reader would otherwise have to imagine.
A number changing rank, a trajectory bending, an agent taking a wrong branch and
recovering — these are processes, and a still image of a process is a worse explanation
than a moving one. Motion that is not explaining something is decoration, and decoration
is still out.

Three rules govern everything below.

1. **Motion carries information or it does not ship.** Entrance animations, hover
   flourishes and parallax carry none.
2. **Motion is achromatic like the rest of the interface.** Scenes and diagrams render in
   the neutral tokens — `--ink`, `--ink-mute`, `--rule`, `--paper`. Colour enters a scene
   only where it encodes the same facts it encodes in a table: status, contamination,
   provenance, staleness. A glowing gradient scene would break the colour vocabulary the
   whole site depends on.
3. **Density surfaces stay calm.** The leaderboard and the benchmark matrix are for
   scanning. They get functional motion only.

### Per surface

| Surface | What moves | What must not |
|---|---|---|
| Home | The demonstration row: health flags resolve a beat after the score, so the reader sees the number first and the caveat second. That sequence is the argument. | A hero scene, a scroll narrative, an animated backdrop. The home page is not a marketing page. |
| Leaderboard | Row reordering when "hide saturated benchmarks", a filter or a sort changes the ranking — the signature control, and seeing rows *move* is the point. Under 300ms, position only. | Anything on scroll. Anything 3D. Any per-row entrance animation. |
| Benchmark matrix | Cell and filter state changes under 150ms. | Scroll effects, scene work. |
| Benchmark detail | The trajectory: points may draw in along the time axis once, on first view, so the shape of saturation is legible. Never connect points across harnesses, exam years or protocol changes — animating a line the data does not support is a stronger lie than drawing one. | Camera moves, 3D framing of 2D data. |
| Evals guides | Scroll-driven explanatory scenes: trajectory branching, modality ablation, retriever-versus-generator failure. This is the one place a scene may own the viewport, because the surrounding text is already asking the reader to follow a process. | Scene work that decorates a paragraph rather than explaining it. |

### 3D and scroll-driven scenes

Permitted in the evals section, and on a benchmark detail page where a trajectory genuinely
needs a third axis. Conditions, all of them binding:

- **Client-only and lazily loaded.** `next/dynamic` with `ssr: false`, mounted behind an
  intersection observer, never in the initial bundle of a data route. No 3D runtime is
  loaded on `/models` or `/benchmarks`.
- **A static fallback that says the same thing.** Every scene ships a still diagram
  carrying the same information, rendered when the scene is not loaded, when WebGL is
  unavailable, and whenever `prefers-reduced-motion: reduce` is set. The fallback is the
  accessible version of the argument, not an apology for a missing one.
- **Smooth scrolling is opt-in per route.** Lenis may be mounted on an evals guide, never
  globally, never on a data route, and never under reduced motion. A reader must always be
  able to reach the end of a page with a keyboard and a normal scroll wheel.
- **The performance floor holds.** Lighthouse performance and accessibility above 90 on
  `/models` is a definition-of-done item and is not negotiable for a scene elsewhere.

### Approved libraries

| Library | Used for | Where |
|---|---|---|
| Motion (`motion/react`) | The home demonstration sequence; layout and presence transitions | Everywhere motion is permitted |
| Auto-Animate | Leaderboard reordering on toggle, filter and sort | Leaderboard |
| GSAP + ScrollTrigger | Scroll-driven scene choreography | Evals guides only |
| Lenis | Scroll inertia under a scroll-driven guide | Evals guides only, opt-in |
| React Three Fiber + Drei | Achromatic explanatory 3D scenes | Evals guides; benchmark detail where a third axis is real |
| Theatre.js | Authoring scene timelines; its editor is a build-time tool | Development only, never shipped to the client |
| Spline | An embedded scene where hand-building it would be disproportionate | Evals guides only, and only if the embed respects the fallback and colour rules |

**Not adopted: Aceternity UI and Magic UI.** Their components are built around glows,
gradients and tinted cards, which is precisely the colour vocabulary this site reserves
for data. Borrowing a technique from them is fine; installing them as component libraries
would contradict the brief at the top of this file.

### Reduced motion

`prefers-reduced-motion: reduce` disables scroll-driven scenes, the trajectory draw-in and
the home sequence — the home row renders with its score and its health flags already
resolved, which is the same argument delivered at once instead of in two beats. Functional
transitions drop to zero duration. No content is unreachable in reduced-motion mode.

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
- Motion section rewritten: achromatic explanatory 3D and scroll-driven scenes are
  permitted in the evals section and on benchmark detail pages, with an approved
  library list, a static fallback requirement and a performance floor. Data surfaces
  and the home page are unchanged.
- Added the dark-scheme data palette and `--rule-strong` for dark, which the light
  values could not satisfy at the stated contrast floor. Milestone 0.
- `FreshnessStamp` computes relative time at render, not at build.
- Added `PriceCell`, which labels a vendor list price against an OpenRouter routed
  price. Milestone 3.
