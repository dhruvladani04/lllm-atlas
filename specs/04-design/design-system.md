# Design system

## Brief

The subject is measurement and its trustworthiness. The audience is engineers who read
tables for a living. The job is to let someone scan a lot of numbers quickly and
immediately see which ones to distrust.

That gives one governing idea, and everything below follows from it:

> **Data colour encodes facts. Interface colour encodes interaction. Nothing else is
> coloured.**

Three things carry colour or weight on this site, and each has exactly one job:

1. **The data palette** means benchmark status, contamination risk, provenance and
   staleness, and is never spent on decoration.
2. **One accent hue** marks what a reader can act on: a link, a focus ring, a checked
   control, the row being hovered.
3. **Vendor marks** identify who made a model. They are drawn in the current text colour,
   never in the vendor's brand colour, so they add recognition without adding a hue.

The site is **dark by default**, with a light scheme one click away. Both schemes are the
same design: the same tokens re-pointed, held to the same contrast floor, audited by the
same tests. Dark is the default because the audience reads dense tables for long stretches
and the comparable sites they arrive from are dark; it is not a mood.

This replaces two earlier paragraphs. The chrome was strictly achromatic through Milestone
7, then gained the accent, then gained marks and a dark default. Rather than keep a rule
with exceptions bolted on, the rule above is what is true now, and the test for any new
pixel is unchanged: does it tell the reader a fact, or something they can do.

**Still ruled out**, so that this document keeps constraining something:

- Gradient washes, glows and tinted hero sections.
- A second accent hue, including a vendor's brand colour on its mark, its name or its row.
- A coloured button for an action that is not the page's one interactive control.
- Colouring a number to say it is good. Rank is position; colour on a score means a
  health fact about its benchmark and nothing else.
- A card that shows a score without the status and flags its row carries.
- Elevation on the leaderboard or benchmark-matrix body, which stay flat so density reads
  as density. Shadow is for interactive or floating chrome and for the named card
  surfaces: the header, a hovered row, the home worked example, the summary cards.
- Following the operating system's scheme silently. The scheme is the reader's explicit
  choice and is remembered; it does not change because the room got dark.

## What to avoid

These are the current defaults of generated design and will make the site look like every
other AI-adjacent page:

- Cream background near `#F4F1EA` with a serif display face and a terracotta accent
- Near-black background with one acid-green or vermilion accent. The dark scheme here is
  a blue-grey `#101317` with a muted blue accent, and the accent is never decoration
- Identical rounded cards with the same soft grey shadow under each, used everywhere rather
  than on the specific interactive/elevated surfaces named below
- Tracked-out all-caps eyebrow labels above every heading
- Meta strings joined with middle dots
- A `→` appended to link text
- Fade-and-slide-up entrance animations on each section
- A second accent hue anywhere, "just for this one badge"

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

The block above is the light scheme. The dark scheme, which is the default, inverts it:
`--paper #101317`, `--surface #171B20`, `--ink #E8E9E4`,
`--ink-mute #9BA0A8`, `--rule #262B31`, `--rule-strong #3A4149`.

Data palette — used *only* for the meanings listed:

```
--status-active       #1C6F55   benchmark still discriminates
--status-nearing      #8B5D09   nearing saturation
--status-saturated    #646760   saturated (deliberately grey: it means "stop reading this")
--status-deprecated   #9B3232   deprecated
--risk-high           #9B3232   high contamination
--risk-medium         #8B5D09   medium contamination
--provenance-vendor   #6B4E9B   vendor-reported
--stale               #8B5D09   source older than 7 days
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

### Interface accent and elevation

One accent hue, spent only on interaction: link hover/focus, the focus ring, a checked
toggle, a hovered table row. It never appears on static text, headings or borders that
carry no interactive meaning, and it never appears alongside a second accent.

One named, singular exception: the small square mark beside the wordmark in the site
header. It is brand identity, not a status or an action, appears exactly once per page,
and is not a licence to reuse the accent decoratively anywhere else.

```
--accent-light         #1D4ED8   light-scheme accent — links, focus, checked controls
--accent-strong-light  #1741B0   hover/active state of the accent
--accent-dark          #93C5FD   dark-scheme accent
--accent-strong-dark   #BFD7FF   hover/active state, dark scheme
```

`--accent` is held to the same 4.5:1 text-contrast floor as `--ink`, because it renders as
link text, not just as a border — checked by the same unit test as the data palette.

Elevation tokens, for the interactive/floating surfaces named per-component below —
never for the leaderboard or benchmark-matrix body, which stay flat:

```
--shadow-sm   a 1px hairline shadow — a sticky header, a hovered row
--shadow-md   a soft, wider shadow — the home page's worked-example panel
--radius-sm   6px  — pill badges, inputs, small controls
--radius-md   10px — elevated panels
```

**Status, health-flag and provenance badges render as tinted pills**, not bare coloured
text: a small rounded background at low opacity of the badge's own colour, using
`color-mix(in srgb, currentColor 12%, transparent)` so the tint is always derived from the
one colour that already carries the fact, never a second hand-picked value. This is
elevation in service of the data palette, not a departure from it — the colour still means
only what it always meant.

**The tint is part of the contrast floor.** A pill's background is not paper; it is paper
mixed with the label's own colour, which costs roughly 0.7 of contrast ratio. The light
amber and the saturated grey both passed against paper and failed against their own tint
(4.11 and 4.01), and an axe audit caught them in production while the unit test was still
green, because the test only knew about paper and surface. Both were darkened, and the
test now checks every data colour against its tinted ground in both schemes. Changing the
tint opacity means re-running that check, not eyeballing it.

### Scheme

Dark is what the server renders. A reader who chooses light has `data-theme="light"` set
on `<html>` by an inline script while the document is still being parsed, so the page never
paints in the wrong scheme first. The choice is stored in `localStorage` under
`llm-atlas-theme`; if storage is blocked the toggle still works for the visit.

The script compares the stored value against a literal and writes nothing from storage into
the page. The toggle's label is read through `useSyncExternalStore` with a server snapshot
of "dark", so a reader in light gets a label swap after hydration, not a hydration error.

`.scheme-light` and `.scheme-dark` remain as classes so the token reference page can show
both schemes side by side.

### Vendor marks

A creator's mark sits beside its name wherever a creator is named in a table, a card or a
model page. Rules:

- **Committed, not hot-linked.** The files live in `public/logos/`, taken from simple-icons
  (CC0-1.0) at a pinned version. The CSP allows images from this origin only.
- **Monochrome.** Drawn as a mask filled with the current text colour. A brand colour would
  be a second accent hue.
- **Decorative.** The creator's name is always present as text; the mark is hidden from
  assistive technology and nothing depends on it loading.
- **Exact names only.** A table maps creator strings to marks. "Google DeepMind" is not
  "Google". A creator string naming several organisations is a joint release and gets no
  single organisation's mark.
- **Monogram fallback.** A creator with no committed mark gets its first letter in a small
  bordered square, so a newly approved creator never renders a broken image.
- **Stated.** `/methodology` says the marks are trademarks used for identification and
  imply no endorsement.

A unit test holds the table and the directory together: every mapped mark has a file, no
file is orphaned, every mapped name is a creator the registry uses, and every file is a
single path with nothing executable in it.

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
  numeric columns, sticky header (`--shadow-sm` once it's pinned), hairline row rules, a
  subtle hover tint per row, no shadow on the table body itself. Rows are never cards. A
  row of summary cards sits above the tabs; see `SummaryCard` below.
- **Benchmarks** — the capability × status grid. Fixed row labels, scrollable columns on
  narrow viewports.
- **Evals** — single narrow reading column, generous leading, a quiet sidebar for
  contents.

Density is a virtue in the first two and a vice in the third.

**Two page widths, and only two.** They are theme tokens, not per-page values:

```
--container-reading   45rem   prose: home, evals index and guides, methodology, error pages
--container-data      80rem   anything tabular: leaderboard, benchmarks, compare, model and
                              benchmark detail, and the site header
```

There were three (768, 896 and 1400px), chosen page by page, and nothing lined up between
them. A page that needs a width between these two does not need a third token; it needs a
measure on its paragraphs, which is what `max-w-[66ch]` is for.

`scrollbar-gutter: stable` is set on the root, so the header does not move sideways between
a page that scrolls and one that does not.

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
- **`SummaryCard`** — one real row from a ranking, with the rule that picked it as its
  heading. It carries the row's benchmark, status chip, health flags and provenance badge.
  A card with no benchmark health record behind it, the arena card, says so in words. No
  entrance animation, no colour beyond the data palette, `--shadow-sm` and `--radius-md`.
  The rules for which cards exist are in `03-sections/leaderboard.md`.
- **`CreatorLogo`** — the vendor mark or its monogram fallback, as above.
- **`ThemeToggle`** — a text button in the header that names its effect, "Switch to light"
  or "Switch to dark".
- **`SiteNav`** — the main navigation. The link for the current section carries
  `aria-current="page"` and is set in ink with a heavier underline; a model page counts as
  the leaderboard section. Below 640px the links sit behind a "Menu" button with
  `aria-expanded`, which closes on navigation and on Escape. Where scripting is unavailable
  the button is hidden and the links stay visible, so it is never the only way to a section.
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
| Home | The demonstration row: the caveat comes up from dimmed a beat after the score, so the reader sees the number first and the caveat second. That sequence is the argument. It is a CSS animation from 40% opacity, never from hidden: the caveat is in the server HTML and readable with no script at all. | A hero scene, a scroll narrative, an animated backdrop, or any motion on the summary cards. The home page is not a marketing page. |
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
| Motion (`motion/react`) | Layout and presence transitions inside explanatory scenes | Evals guides. The home sequence is plain CSS, so the home page ships no animation library |
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
at least 4.5:1 for text, in both schemes; the axe audit runs every audited route twice, once
per scheme. **The status colours are held to the text floor too**, not to
3:1: every one of them is rendered as a chip label, a flag or a badge, so every one of them
is text. An axe audit caught the saturated grey at 3.75:1 inside a 13px label, and it was
darkened until it passed. A unit test holds all of them at 4.5:1 in both schemes. The site
must be readable and correct with CSS disabled.

## Changelog

- Initial version.
- Status colours are held to the 4.5:1 text floor rather than 3:1, since all of them
  render as text; the saturated grey was darkened to pass. Milestone 7.
- Motion section rewritten: achromatic explanatory 3D and scroll-driven scenes are
  permitted in the evals section and on benchmark detail pages, with an approved
  library list, a static fallback requirement and a performance floor. Data surfaces
  and the home page are unchanged.
- Added the dark-scheme data palette and `--rule-strong` for dark, which the light
  values could not satisfy at the stated contrast floor. Milestone 0.
- `FreshnessStamp` computes relative time at render, not at build.
- Added `PriceCell`, which labels a vendor list price against an OpenRouter routed
  price. Milestone 3.
- Loosened the strictly achromatic chrome: added one interface accent (link/focus/checked
  states only, held to the 4.5:1 text floor), elevation tokens for interactive/floating
  surfaces, and tinted-pill badges derived from each status colour via `color-mix`. The
  data palette's meaning and the flat, shadow-free density of the leaderboard and
  benchmark-matrix bodies are unchanged. Post-launch polish.
- Brief rewritten instead of amended a third time: dark is the default scheme with an
  explicit, remembered toggle that does not follow the operating system; vendor marks are
  permitted in the text colour only; summary cards are a named elevated surface. Added the
  Scheme and Vendor marks sections, three components, and an explicit list of what is still
  ruled out. The data palette and both contrast floors are unchanged.
- Two page widths as theme tokens, replacing three per-page values; `scrollbar-gutter:
  stable`; a navigation that marks the current section and collapses behind a menu button
  on phones; the home worked example is readable on first paint and animates from dimmed,
  not from hidden. UX refresh, P0.
