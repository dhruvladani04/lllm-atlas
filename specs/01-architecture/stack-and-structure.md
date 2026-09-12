# Stack and repository structure

## Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js (App Router) | Static-first; almost every page is prerendered |
| Language | TypeScript, `strict: true` | No `any` in `lib/` or `scripts/` |
| Styling | Tailwind CSS | Tokens defined in `04-design/design-system.md` |
| Content | MDX via Contentlayer or `next-mdx-remote` | Section 3 only |
| Data store | JSON files committed to the repo | See `data-pipeline.md` |
| Validation | Zod | Every ingested payload is parsed, never cast |
| Tables | TanStack Table (headless) | Sorting and filtering are client-side over prerendered data |
| Charts | Recharts or visx | Score timelines only; no chart library on the leaderboard route |
| Tests | Vitest, plus Playwright for two smoke paths | |
| Scheduling | GitHub Actions cron | Not Vercel Cron — the job commits to the repo |
| Hosting | Vercel | |

### Rules

- No client-side fetching of leaderboard or benchmark data. Everything renders from JSON
  read at build time.
- No runtime calls to upstream APIs from a user request. Ever. The only network access to
  upstream sources happens inside scheduled ingestion jobs.
- No database in v1. If a feature seems to need one, it is out of scope.

## Repository structure

```
/
├─ specs/                      this directory — committed, read by Claude Code
├─ app/
│  ├─ (site)/
│  │  ├─ page.tsx              home
│  │  ├─ models/
│  │  │  ├─ page.tsx           leaderboard, ?tab=text|agentic|image
│  │  │  └─ [slug]/page.tsx    model detail
│  │  ├─ benchmarks/
│  │  │  ├─ page.tsx           matrix
│  │  │  └─ [slug]/page.tsx    benchmark detail
│  │  └─ evals/
│  │     ├─ page.tsx           index
│  │     └─ [...slug]/page.tsx guide
│  └─ layout.tsx
├─ components/
│  ├─ data/                    ScoreCell, ProvenanceBadge, StatusChip, FreshnessStamp
│  ├─ leaderboard/
│  ├─ benchmarks/
│  └─ ui/                      primitives only
├─ content/evals/              MDX guides
├─ data/
│  ├─ registry/models.json     canonical model registry, hand-maintained + generated
│  ├─ snapshots/YYYY-MM-DD/    dated raw-ish snapshots per source
│  ├─ derived/                 build inputs: leaderboards, joins
│  └─ meta/ingestion-log.json  per-run status
├─ lib/
│  ├─ schemas/                 Zod schemas mirroring 02-data/schemas.md
│  ├─ ingest/                  one module per source
│  ├─ join/                    score × benchmark-health join
│  └─ format/                  numbers, dates, deltas
├─ scripts/ingest.ts           entry point for the cron job
└─ .github/workflows/ingest.yml
```

## Conventions

- **Naming:** files kebab-case, React components PascalCase, types PascalCase, constants
  SCREAMING_SNAKE.
- **Commits:** `type(scope): summary` — types `feat`, `fix`, `data`, `spec`, `chore`,
  `docs`. Ingestion job commits use `data(ingest): snapshot YYYY-MM-DD`.
- **No barrel files.** Import from the module directly.
- **Dates are ISO 8601 strings** everywhere on disk. `Date` objects only exist inside
  formatting helpers.
- **Numbers on disk are raw.** Rounding, percentage conversion and unit formatting happen
  at render time only.

## Environment variables

| Var | Values | Purpose |
|---|---|---|
| `BENCHWIKI_MODE` | `mirror` \| `link` | `mirror` renders section 2 in-app; `link` renders a short landing page that links to benchwiki. Default `mirror`. Switching to `link` must not break any route. |
| `OPENROUTER_API_KEY` | string | Ingestion only. Never referenced in `app/`. |
| `SITE_URL` | string | Canonical URL for metadata |

## Changelog

- Initial version.
