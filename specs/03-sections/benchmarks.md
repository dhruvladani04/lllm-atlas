# Section 2 — Benchmarks

Route: `/benchmarks`, detail at `/benchmarks/[slug]`.

Behaviour depends on `BENCHWIKI_MODE`.

## `BENCHWIKI_MODE=mirror` (default)

### Index

A capability × status matrix, the same primitive benchwiki uses, because it is the right
primitive. Rows are capabilities, columns are `active` / `nearing saturation` /
`saturated` / `deprecated`.

Do not redesign this into cards or a list. The grid *is* the information: it shows at a
glance that a whole capability area has gone saturated.

Filters: contamination risk, refresh cycle, language, and — this is the addition —
**"has scores from models on this site"**, which no upstream view offers.

Attribution is persistent and above the fold, not in the footer.

### Detail page

Mirror the benchwiki record, plus the reverse lookup that is this site's contribution:

1. **Header** — name, capability, status chip, contamination risk, launch date, successor
   link where one exists.
2. **What it measures** — short description, primary metric, judge model where the
   benchmark uses one, human baseline with its note.
3. **Health** — status evidence, saturation date, contamination mitigation, refresh cycle.
   Render `statistical_note` prominently. These notes are the most useful and most ignored
   field in the whole dataset.
4. **Models scored on this benchmark** — the reverse index. Table of every model on the
   site with a score here, each with provenance, harness where relevant, date and source.
   Sortable. Vendor-reported and independent scores visually separated, never interleaved
   as if equivalent.
5. **Trajectory** — the `performance_timeline`, with vendor-reported and independent points
   distinguished. Respect the source's own warnings: do not connect points across exam
   years, harnesses or protocol changes with one line. Points may draw in along the time
   axis once on first view, so the shape of saturation is legible as a process; under
   `prefers-reduced-motion` the finished chart renders immediately. Animating a
   connection the data does not support is a stronger lie than drawing one.
6. **Source** — canonical link to the benchwiki page, its `last_updated` date, and this
   site's fetch date.

### Constraints

- `rel="canonical"` points at benchwiki for every mirrored detail page.
- Do not reproduce benchwiki's long editorial prose verbatim. Short quotes with
  attribution, or paraphrase and link.
- If a benchwiki record disappears upstream, keep the last snapshot and mark the page
  "no longer present upstream as of DATE". Do not 404 a URL that was live.

## `BENCHWIKI_MODE=link`

`/benchmarks` renders a single page: a short explanation of what benchmark health means,
why it matters for reading the leaderboard, and a prominent link to benchwiki. Detail
routes redirect to the corresponding benchwiki page.

Critically: **the leaderboard's health flags keep working in this mode.** The join uses
the last committed snapshot regardless of display mode. Flipping the variable removes the
mirrored pages, not the site's core feature.

## Changelog

- Initial version.
- Trajectory may draw in once on first view, with a static equivalent under reduced
  motion.
