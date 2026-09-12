# LLM Atlas

Every other leaderboard tells you a model scored 92 on a benchmark. This site also tells
you whether that benchmark still means anything and who reported the number.

Three sections, in a deliberate progression: **Leaderboard** (who is ahead right now),
**Benchmarks** (whether the test they are ahead on still measures anything), and **Evals**
(how to measure your own application, which is a different discipline entirely).

`specs/` is the source of truth. Code is downstream of it; if an implementation detail
contradicts a spec, the spec wins — or the spec is amended first, in the same commit.
Start at [specs/README.md](specs/README.md).

## Status

Milestone 0 of 7 — skeleton only. No data is ingested and nothing is published yet.
Build order is in [specs/05-delivery/milestones.md](specs/05-delivery/milestones.md).

## Running it

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

| Script           | Does                                       |
| ---------------- | ------------------------------------------ |
| `pnpm dev`       | Development server                         |
| `pnpm build`     | Production build — every route prerendered |
| `pnpm lint`      | ESLint                                     |
| `pnpm typecheck` | `tsc --noEmit`, strict                     |
| `pnpm test`      | Vitest                                     |
| `pnpm format`    | Prettier                                   |

Copy `.env.example` to `.env.local`. No variable is required for a local build.

`/tokens` is a development reference page showing every design token in both colour
schemes side by side. It is `noindex` and is not linked from the site.

## How data will work

There is no database and no runtime fetching. A scheduled GitHub Actions job fetches each
upstream source, validates it with Zod, writes a dated snapshot into `data/snapshots/`,
regenerates `data/derived/`, and commits. The commit triggers a deploy, so every
deployment is reproducible and every upstream change is visible as a diff. Details in
[specs/01-architecture/data-pipeline.md](specs/01-architecture/data-pipeline.md).

Three rules hold everywhere, and the definition of done checks them:

- Every displayed number traces to a source URL and a fetch date.
- Every score carries a vendor-reported or independent label. The two are never averaged.
- A missing value renders as an explained gap, never as a dash, a zero, or a blank.

## Licensing

Benchmark metadata comes from benchwiki, usage data from OpenRouter (CC BY 4.0), and
benchmark results from Epoch AI (CC BY). Attribution requirements per source are in
[specs/02-data/sources-and-licensing.md](specs/02-data/sources-and-licensing.md) and are
not optional.
