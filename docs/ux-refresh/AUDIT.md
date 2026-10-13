# UX refresh — audit

Audited 2026-10-13 against a local production build of `main` at `7583feb`. Eleven routes,
three widths (390, 768, 1440px), both colour schemes. The 66 screenshots are in
[`before/`](before/), named `<route>-<width>-<scheme>.png`.

Measurements below were read from the rendered pages with a script, not estimated from the
screenshots.

## Confirmed

| #   | Issue                                                 | Evidence                                                                                                                                                                                            |
| --- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The leaderboard is not usable on a phone              | `/models` is 37,289px tall at 390px. The table scrolls sideways inside its container, the six filter controls wrap over five lines, and the nav wraps to two lines with the theme button on a third |
| 2   | "not reported" is noise                               | The words appear 598 times on the text tab                                                                                                                                                          |
| 3   | Three container widths, not two                       | 768px (home, evals, guides, methodology), 896px (model, compare, benchmark detail), 1400px (leaderboard, benchmarks)                                                                                |
| 4   | No active section in the nav                          | No `aria-current` anywhere in the header, and no visual state                                                                                                                                       |
| 5   | Switching tab resets scroll                           | Scrolled to 900px on `/models`, clicked "Agentic", landed at 0                                                                                                                                      |
| 6   | The worked example is invisible until JavaScript runs | The server HTML ships both halves of it at `opacity:0`                                                                                                                                              |
| 7   | Two long paragraphs sit above the table               | The ranking rationale and the coverage note together run to about 110 words before the first row                                                                                                    |
| 8   | The Arena source link is a raw API URL                | `datasets-server.huggingface.co/rows?dataset=…`                                                                                                                                                     |
| 9   | Capability labels are raw slugs                       | `agentic-tool-use`, `instruction-following`, `long-context`, `safety-alignment` on `/benchmarks`                                                                                                    |
| 10  | Compare uses native selects                           | Three selects of 377 options each, nothing in the URL after choosing, no suggested pairs                                                                                                            |
| 11  | Guides have no contents list or reading time          | The design spec already asks for "a quiet sidebar for contents"                                                                                                                                     |
| 12  | Model page                                            | No "Compare with…" action. Each configuration of a benchmark is its own row                                                                                                                         |
| 13  | Some display names are raw slugs                      | `gemini-3-8-flash`, `gpt-5.5-pre-release`                                                                                                                                                           |
| 14  | Creator strings can name six organisations            | The longest is 163 characters and appears whole in the creator filter                                                                                                                               |
| 15  | No Open Graph image                                   | Only `og:title`, `og:description`, `og:type` and `og:url` are set                                                                                                                                   |

## Refuted, or already done

| Claim                                               | Finding                                                                                                                                                |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Horizontal page scroll on mobile                    | None. Document overflow is 0px on all eleven routes at 390px                                                                                           |
| A health flag repeats on every row                  | Already handled: a column that says the same thing on every row collapses into a sentence above the table                                              |
| The tab is not in the URL                           | It is (`?tab=agentic`). Switching does not refetch data; every tab is prerendered into the page                                                        |
| Compare does not separate full from partial overlap | It does: "measured on all" comes first                                                                                                                 |
| Benchmark pages have no score-over-time chart       | A trajectory component exists. It needs checking against the brief, not building twice                                                                 |
| No legend for `ind.` and `~`                        | A written legend sits under the table. It is below 210 rows, which is the real problem                                                                 |
| The header shifts between short and long pages      | Not reproducible in headless Chromium, which draws overlay scrollbars. Unverified on Windows Chrome; `scrollbar-gutter: stable` is harmless either way |

## Found while auditing

- **The sticky table header probably does not stick.** It sits inside an
  `overflow-x: auto` wrapper, which makes that wrapper the scroll container, so
  `position: sticky` pins to the wrapper and not the viewport.
- **The model page already renders "—" for a missing harness**, while the leaderboard
  spells out "not reported". The site is inconsistent with its own rule today.
- **Lighthouse has not been measured since the registry grew from 30 to 460 models.** The
  `/models` document is 864KB uncompressed. The performance target is unconfirmed.
- **Evals index sets its intro in the serif; guides set their metadata line in sans.**
  Intentional per the design spec, and left alone.

## Decisions taken with the owner

| Question              | Decision                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------------- |
| Scheme on first visit | Follow the operating system, then an explicit choice wins and is remembered                   |
| Missing values        | "—" with a tooltip and a visible legend entry; the spec is amended                            |
| Ranking basis         | A selector, default unchanged, other benchmarks loaded on demand                              |
| Raw model names       | Fixed in the registry's `display_name` from names Epoch publishes, not by a title-casing rule |
| Home page             | Two plain buttons and clickable section cards; no hero, no arrows                             |
| Typeface              | Serif stays on long-form guides only                                                          |
