# Milestones

One milestone per Claude Code session. Complete it, run the definition of done, commit,
stop. Do not begin the next milestone in the same session.

Each milestone lists what it must produce and what it must not touch. The "must not touch"
list is as binding as the deliverables.

---

## Milestone 0 — Skeleton

**Produces:** Next.js App Router project, TypeScript strict, Tailwind configured with the
tokens from `04-design/design-system.md`, the directory structure from
`01-architecture/stack-and-structure.md`, ESLint and Prettier, Vitest wired up, a
deployable placeholder home page, README.

**Must not touch:** any data fetching, any route beyond home.

**Done when:** `pnpm build` succeeds, the design tokens exist as CSS variables and are
visible on a test page in both colour schemes.

---

## Milestone 1 — Model registry and schemas

**Produces:** every Zod schema in `lib/schemas/` matching `02-data/schemas.md`. The
registry file with 15–20 hand-entered current models covering all three modalities. The
resolver with its exact/alias/normalised rules and its hard refusal to fuzzy match. Unit
tests for the resolver, including a test asserting that a near-miss name does *not*
resolve.

**Must not touch:** any network call, any UI.

**Done when:** the resolver correctly separates `Claude Opus 5` from `Claude Opus 5 (high)`
as distinct variants, and routes an unknown name to `unresolved.json`.

Build this before any second source. Retrofitting it is the most expensive mistake
available in this project.

---

## Milestone 2 — Ingestion, one source

**Produces:** the benchwiki ingest module, the snapshot writer, the ingestion log, the
GitHub Actions workflow, and the failure behaviours in `01-architecture/data-pipeline.md`
including the 50%-record-count guard.

**Must not touch:** other sources, any UI.

**Done when:** the workflow runs on demand, writes a dated snapshot, commits it, and a
simulated upstream failure leaves the previous snapshot intact with a logged error.

---

## Milestone 3 — Remaining sources and the join

**Produces:** Epoch, OpenRouter and arena-mirror ingest modules. The join producing
`model-benchmark-join.json` with `health_flags` computed per the derivation table in
`02-data/schemas.md`. Unit tests for every flag condition.

**Must not touch:** UI.

**Done when:** a score on a saturated, high-contamination benchmark emerges from the join
carrying both flags, and a vendor-reported-only score is flagged as such.

---

## Milestone 4 — Leaderboard

**Produces:** `/models` with all three tabs, sorting, filters, the "hide saturated
benchmarks" toggle, `/models/[slug]` detail pages, and every degraded state including the
`released_unranked` block.

**Must not touch:** sections 2 and 3.

**Done when:** toggling "hide saturated benchmarks" visibly reorders the table, and a
model with only vendor-reported scores is unmistakably marked as such at a glance.

---

## Milestone 5 — Benchmarks

**Produces:** `/benchmarks` matrix, `/benchmarks/[slug]` detail with the reverse index,
attribution and canonical links, and a working `BENCHWIKI_MODE=link` path.

**Must not touch:** section 3.

**Done when:** flipping `BENCHWIKI_MODE` to `link` builds cleanly, no route 404s, and the
leaderboard's health flags still work.

---

## Milestone 6 — Evals

**Produces:** MDX pipeline, the components listed in `03-sections/evals.md`, the index
page with its positioning paragraph, the foundations page embedding the CampusX playlist
with credit, and **three complete guides**: RAG, agentic systems, and the framework
comparison. Agentic is the priority — it is the guide with no equivalent elsewhere.

**Must not touch:** data pipeline.

**Done when:** three guides are published with runnable code, `verified_on` renders, and
the staleness marker fires correctly on a back-dated test guide.

---

## Milestone 7 — Home, polish, launch

**Produces:** the demonstration home page, metadata and Open Graph, sitemap, 404 and 500,
the two Playwright smoke paths, an accessibility pass, and a Lighthouse run.

**Done when:** the definition of done passes on every route.

---

## After v1

In rough priority order, each requiring a spec amendment first: remaining archetype
guides; video and audio modalities; score history charts from the snapshot archive; an
Artificial Analysis integration if commercial terms are obtained; a public API.

## Changelog

- Initial version.
