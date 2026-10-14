# UX refresh — plan

Presentation only. The data model, ranking logic, health flags and provenance semantics do
not change. Where a change touches a rule in `specs/`, the spec is amended in the same
commit.

Findings are in [AUDIT.md](AUDIT.md). Work proceeds P0, then a check-in, then P1, then P2.

## P0 — foundations and the mobile leaderboard

| Change                                                                                        | Files                                                                                           | Done when                                                                                                                                   |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Two container widths: `reading` (45rem) and `data` (80rem), as theme tokens                   | `app/globals.css`, every `page.tsx`, `app/layout.tsx`, `components/leaderboard/leaderboard.tsx` | Every `<main>` uses one of the two; no other page width exists                                                                              |
| `scrollbar-gutter: stable`                                                                    | `app/globals.css`                                                                               | The header cannot shift between a short page and a long one                                                                                 |
| Nav shows the current section and sets `aria-current="page"`; below 640px it is a menu button | `components/ui/site-nav.tsx` (new), `app/layout.tsx`                                            | The header is one line at 390px; the current section is announced and visible                                                               |
| Worked example is readable on first paint                                                     | `components/home/demonstration-row.tsx`, `app/globals.css`                                      | The server HTML contains no `opacity:0`; the caveat still arrives a beat after the score                                                    |
| One-line ranking summary with a "Why this ranking?" disclosure                                | `components/leaderboard/leaderboard-table.tsx`                                                  | Reference benchmark, its status, any flag or provenance shared by every row, coverage and fetch time are visible without expanding anything |
| Leaderboard rows stack as cards below 768px                                                   | `components/leaderboard/leaderboard-table.tsx`, `image-table.tsx`                               | At 390px each row shows rank, model, creator, score, price and health with no sideways scroll, and stays a table to a screen reader         |
| Filters collapse behind a "Filters" button below 768px; search stays visible                  | `components/leaderboard/leaderboard-table.tsx`                                                  | The control bar is two lines at 390px; the button says how many filters are on                                                              |
| Top 25 rows by default, "Show all N"                                                          | `components/leaderboard/leaderboard-table.tsx`                                                  | Pulled forward from P1: without it the mobile page is still 30,000px tall                                                                   |

Provenance guard: the summary line keeps the shared provenance and health facts visible.
Only the explanation of _why_ moves into the disclosure.

## P1 — scannable leaderboard, visual data, other pages

| Change                                                                                                                                      | Files                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Ranking-basis selector, default unchanged, other benchmarks fetched on demand, synced to the URL                                            | `lib/leaderboard/`, `app/api/`, `leaderboard-table.tsx`, `specs/03-sections/leaderboard.md` |
| "—" for missing values, with tooltip and legend entry                                                                                       | `components/data/primitives.tsx`, `specs/04-design/design-system.md`                        |
| Always-visible compact legend above the table                                                                                               | `leaderboard-table.tsx`                                                                     |
| Inline score bars                                                                                                                           | `components/data/primitives.tsx`                                                            |
| Density toggle; fix the sticky header                                                                                                       | `leaderboard-table.tsx`                                                                     |
| Display names corrected in the registry from Epoch's names; duplicate names disambiguated by release date; a primary creator for the filter | `data/registry/models.json`, `lib/creators/`                                                |
| One neutral monogram style                                                                                                                  | `components/ui/creator-logo.tsx`                                                            |
| Price against score scatter, hand-rolled SVG, log price axis                                                                                | `components/leaderboard/price-score-chart.tsx` (new)                                        |
| Check the benchmark trajectory against the brief                                                                                            | `components/benchmarks/trajectory.tsx`                                                      |
| Tab switch keeps scroll position                                                                                                            | `components/leaderboard/leaderboard.tsx`                                                    |
| "Not ranked here" grouped by reason, collapsed, with counts and search                                                                      | `leaderboard-table.tsx`                                                                     |
| Home: two buttons, clickable section cards, three cards and a link to the rest                                                              | `app/(site)/page.tsx`                                                                       |
| Compare: searchable combobox, shareable URL, three suggested pairs                                                                          | `components/leaderboard/compare-view.tsx`                                                   |
| Benchmarks: readable capability labels, legend at the top                                                                                   | `app/(site)/benchmarks/`, `components/benchmarks/matrix-view.tsx`                           |
| Model page: configurations grouped under their best value, one shared table, "Compare with…"                                                | `app/(site)/models/[...slug]/page.tsx`                                                      |
| Guides: contents list and reading time                                                                                                      | `app/(site)/evals/[...slug]/page.tsx`                                                       |
| Arena link points at a readable page                                                                                                        | `lib/ingest/arena.ts`                                                                       |

No charting dependency is added. Both charts are SVG drawn from data already on the page.

## P2 — polish

| Change                                                                                   | Files                                                                 |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Scheme follows the operating system on first visit; icon button with an accessible label | `app/layout.tsx`, `components/ui/theme-toggle.tsx`, `app/globals.css` |
| Open Graph image; per-page metadata on leaderboard, model and compare pages              | `app/opengraph-image.tsx` (new), page `metadata`                      |
| "Last updated" pill in the header from the existing fetch timestamp                      | `app/layout.tsx`                                                      |
| Hover and focus states on cards and section rows                                         | `app/globals.css`                                                     |

Loading skeletons are needed only for the on-demand ranking basis in P1, which is the one
place the site fetches after load.

## Acceptance criteria

- Lighthouse accessibility at least 95 and performance at least 90, mobile, on home,
  leaderboard and a model page. Performance on the leaderboard is a target, not a given;
  it has not been measured at the current registry size.
- No horizontal page scroll at 390px on any route.
- A first-time visitor can say who leads on a benchmark and whether to trust it without
  reading a paragraph.
- Every symbol has a visible legend entry or a tooltip.
- Before and after screenshots for every route at 390, 768 and 1440px in both schemes.

## Not doing

- Title-casing model names by rule. It produces names no vendor uses.
- A hero section or arrows on links. Both are ruled out in the design spec.
- One typeface everywhere. The serif on guides is deliberate.

## P0 result

Measured 2026-10-13 on a local production build. Screenshots are in
[`after-p0/`](after-p0/), same naming as `before/`.

| Check                                     | Before               | After                       |
| ----------------------------------------- | -------------------- | --------------------------- |
| Page widths in use                        | 3 (768, 896, 1400px) | 2 (720, 1280px)             |
| `/models` height at 390px                 | 37,289px             | 21,875px                    |
| Rows rendered on first load               | 210                  | 25, with the total stated   |
| "not reported" on the text tab            | 598                  | 48                          |
| `/models` document, uncompressed          | 864KB                | 667KB (53KB gzipped)        |
| Routes scrolling sideways at 390px        | 0 of 11              | 0 of 11, now held by a test |
| Nav marks the current section             | no                   | yes                         |
| Worked example in the HTML at `opacity:0` | yes                  | no                          |

Lighthouse, mobile preset, one run each against `localhost`:

| Page        | Performance | Accessibility |
| ----------- | ----------- | ------------- |
| Home        | 81          | 100           |
| Leaderboard | 80          | 100           |
| Model page  | 90          | 100           |

Accessibility meets the target on all three. Performance does not on two of them. These
are single runs on a development machine and will differ on Vercel, but the direction is
clear: total blocking time is the weak number (420–480ms), not layout shift (0).

Still open after P0, and where it is planned:

- `/models` is still 21,875px tall on a phone. The table is about 4,500px of that; the
  rest is the "Not ranked here" list, which P1 collapses.
- The health column still repeats `superseded` on every row whenever one row also carries
  `disputed`, because the column only collapses when every row is identical. P1 shows only
  what differs.
- The sticky table header still does not pin. P1.

## Rest of P0, and P1 result

Measured 2026-10-14 on a local production build. Screenshots are in
[`after-p1/`](after-p1/), same naming as `before/`, plus five `x-*` views that only exist
below the fold or after an interaction.

Finished from P0: the shared health flag is stated once and each row's Health cell shows
only what it adds; "Not ranked here" is grouped by reason, collapsed, with counts and a
search; the table header sticks, now that the overflow wrapper that pinned it to itself is
gone.

| Check                                           | After P0 | After P1                                     |
| ----------------------------------------------- | -------- | -------------------------------------------- |
| `/models` DOM nodes on load                     | 1,614    | 933 (before the chart, which adds about 150) |
| `/models?tab=agentic` DOM nodes on load         | 2,251    | 906                                          |
| `/models` document, uncompressed                | 667KB    | 558KB, including every ranking-basis option  |
| Fonts preloaded per page                        | 4        | 1                                            |
| e2e tests                                       | 55       | 88                                           |
| Routes scrolling sideways at 390, 768 or 1024px | 0        | 0, all three widths now tested               |

Lighthouse could not be re-measured reliably. Identical runs on this machine moved by 15
points between consecutive attempts (home scored 76 and then 90 on the same build), and the
keyless PageSpeed Insights quota was exhausted. The changes aimed at it — one preloaded
font, a smaller client payload, half the hydrated DOM — measurably reduce the work, but the
score itself should be taken from PageSpeed Insights against the deployed site.

Not done, and why:

- **Raw names on image models** stay as Arena writes them. No source publishes another name
  for them, and inventing one is the thing this site does not do.
- **Duplicate registry entries.** `meta-ai/llama-4-maverick-17b-128e-instruct` and
  `meta/llama-4-maverick` are the same model registered twice, as are the two Llama 4
  Scout entries. Merging them is a registry decision and is left for the owner; the lists
  now tell them apart by id rather than showing two identical names.
