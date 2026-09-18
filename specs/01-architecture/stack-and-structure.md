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
| Motion | Motion (`motion/react`), Auto-Animate | Approved uses in `04-design/design-system.md` |
| Scenes | GSAP + ScrollTrigger, React Three Fiber + Drei, Lenis | Evals guides and benchmark detail only; never in a data route's bundle |
| Tests | Vitest, plus Playwright for two smoke paths | |
| Scheduling | GitHub Actions cron | Not Vercel Cron — the job commits to the repo |
| Hosting | Vercel | |

### Rules

- No client-side fetching of leaderboard or benchmark data. Everything renders from JSON
  read at build time.
- No runtime calls to upstream APIs from a user request. Ever. The only network access to
  upstream sources happens inside scheduled ingestion jobs.
- No database in v1. If a feature seems to need one, it is out of scope.
- No scene or scroll library appears in the bundle for `/models` or `/benchmarks`.
  Scenes load through `next/dynamic` with `ssr: false`, behind an intersection
  observer, on the routes that use them.

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

## Security headers

Set in `next.config.ts` for every route, because a static site still has an origin.

| Header | Value | Why |
|---|---|---|
| `Content-Security-Policy` | see below | No foreign script origin executes; nothing frames the site |
| `X-Content-Type-Options` | `nosniff` | |
| `X-Frame-Options` | `DENY` | Legacy equivalent of `frame-ancestors 'none'` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | |
| `Permissions-Policy` | camera, microphone, geolocation, payment all `()` | The site needs none of them |

`script-src` includes `'unsafe-inline'`, and that is a decision rather than an oversight.
The App Router emits the RSC payload as inline `<script>` tags; the alternative is
per-request nonces via middleware, which forces every route to render dynamically and
trades the entire static-first architecture for one header. The reason it is an acceptable
trade here specifically: the site renders no user input anywhere. Every page is built from
JSON committed to the repo, and the single URL parameter it reads (`?tab=`) is matched
against a fixed list rather than printed. If that ever stops being true — a search box, a
comment, anything reflected — this trade has to be revisited before the feature ships.

`frame-src` allows exactly one origin, `https://www.youtube-nocookie.com`, for the CampusX
playlist embedded on the foundations guide.

## Environment variables

| Var | Values | Purpose |
|---|---|---|
| `BENCHWIKI_MODE` | `mirror` \| `link` | `mirror` renders section 2 in-app; `link` renders a short landing page that links to benchwiki. Default `mirror`. Switching to `link` must not break any route. |
| `OPENROUTER_API_KEY` | string | Ingestion only. Never referenced in `app/`. |
| `SITE_URL` | string | Canonical URL for metadata |

## Changelog

- Initial version.
- Added the approved motion and scene libraries, and the rule keeping them out of data
  route bundles.
- Added the security-header block, and recorded why `script-src 'unsafe-inline'` is an
  accepted trade for a site that renders no user input. Post-launch audit.
