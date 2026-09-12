# Data pipeline

## Shape

```
upstream sources  →  scheduled ingestion  →  dated snapshot  →  derived build inputs  →  static pages
                     (GitHub Actions)        (committed)        (committed)              (Vercel)
```

Data lives as JSON in the repository. A GitHub Actions job fetches, validates, writes a
dated snapshot, regenerates derived files, and commits. The commit triggers a Vercel
deploy. There is no runtime database and no runtime fetch.

This is deliberate. It gives free version history, makes every deploy reproducible, makes
a bad upstream change visible as a diff in a pull request, and costs nothing to run.

## Schedule

- Daily at 06:00 UTC.
- Manual trigger via `workflow_dispatch`.

## Job steps

1. **Fetch** each source in `02-data/sources-and-licensing.md`, independently. One source
   failing must not abort the others.
2. **Validate** each payload with its Zod schema. A schema failure is a hard failure *for
   that source only*, recorded in the ingestion log, with the previous snapshot retained.
3. **Write** `data/snapshots/YYYY-MM-DD/<source>.json`, including a `_meta` block with
   `fetched_at`, `source_url`, `record_count`, and `status`.
4. **Resolve** every model reference through the registry (`model-registry.md`). Anything
   unresolved goes to `data/registry/unresolved.json` — never dropped, never guessed.
5. **Derive** the build inputs in `data/derived/`.
6. **Log** the run to `data/meta/ingestion-log.json`.
7. **Commit** only if something changed.

## Failure behaviour

| Situation | Behaviour |
|---|---|
| Source unreachable | Keep last good snapshot. Log it. Site shows that source's freshness stamp going stale. |
| Schema mismatch | Same as unreachable. Do not partially ingest. |
| Source returns fewer than 50% of the previous record count | Treat as failure and keep the previous snapshot. Guards against upstream truncation being silently mirrored. |
| Vendor pricing page unparseable | Treat as a schema error for that vendor only. Keep the last good price, log it, fall back to the OpenRouter price at render time with its label. |
| Unresolved model name | Write to `unresolved.json`, exclude from derived output, surface the count in the ingestion log. |
| Three consecutive failures for one source | Fail the Actions job so a notification fires. |

The site must never render a number without a fetch date, and never render a stale number
without saying it is stale. Anything older than 7 days renders with a visible staleness
marker.

## Snapshot retention

Keep every snapshot. They are small JSON files and they are the only score history the
site has. Do not prune.

After 90 days, snapshots may be consolidated into monthly directories if repository size
becomes a problem — but only with a spec amendment.

## Derived build inputs

Written to `data/derived/`, regenerated wholesale on each run:

| File | Contents |
|---|---|
| `leaderboard-text.json` | Ranked rows for the text tab |
| `leaderboard-agentic.json` | Ranked rows for the agentic tab, keyed by model+harness |
| `leaderboard-image.json` | Ranked rows for the image tab |
| `model-benchmark-join.json` | Every score joined to its benchmark health record — the core artefact |
| `benchmark-models.json` | Reverse index: benchmark to models with scores |
| `freshness.json` | Per-source last-success timestamp, read by the freshness stamp |
| `models.json` | Registry identity joined to ingested price, context window and state |

## Changelog

- Initial version.
- Added `models.json` to the derived build inputs and a failure row for vendor pricing
  scrapers. Milestone 3.
