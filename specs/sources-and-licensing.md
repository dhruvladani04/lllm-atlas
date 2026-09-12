# Sources and licensing

Licensing is a build constraint here, not paperwork. Two of the most useful sources in
this category forbid exactly what this site does. Read this file before adding any source.

## Approved for v1

### 1. benchwiki — benchmark health metadata

- Endpoint: `https://benchwiki.vercel.app/api/benchmarks.json`
- Site: `https://benchwiki.vercel.app/`
- Shape: a flat array of benchmark records. Fields used:
  `name`, `slug`, `capability`, `secondary_capabilities`, `status`, `status_evidence`,
  `saturated_date`, `successor`, `lineage`, `contamination.risk`,
  `contamination.refresh_cycle`, `human_baseline`, `statistical_note`, `metric`,
  `leaderboards`, `performance_timeline`, `last_updated`.
- Cadence: daily.
- **Licensing status: no published licence.** The endpoint is public; the terms are not
  stated. Treat this as permission-not-granted rather than permission-denied.

**Required handling:**
- Prominent, persistent attribution on every page in section 2 and on every benchmark chip
  elsewhere: "Benchmark metadata from benchwiki", linking to the corresponding benchwiki
  page, not just the homepage.
- `rel="canonical"` on mirrored benchmark detail pages pointing at the benchwiki original.
- Fetch once daily, server-side, cached. Never proxy user requests to their endpoint.
- Honour `BENCHWIKI_MODE=link` as a one-variable kill switch — see
  `01-architecture/stack-and-structure.md`.
- Do not present benchwiki's editorial prose as the site's own writing. Quote briefly and
  link, or paraphrase and attribute.

### 2. OpenRouter — real-world usage

- Rankings page: `https://openrouter.ai/rankings`
- Data API: returns top models per day by token usage; requires an OpenRouter API key.
- **Licence: CC BY 4.0.** Redistribution is permitted with attribution. This is the
  safest source in the set.
- Use for: an "adoption" column and a usage tab. Never blended into a capability ranking.
- Attribution string: "Usage data from OpenRouter, CC BY 4.0."

### 3. Epoch AI — benchmark results and capability index

- Hub: `https://epoch.ai/benchmarks`
- Bulk data: benchmark results ZIP and ECI CSVs, refreshed frequently.
- **Licence: CC BY.** Redistribution permitted with attribution. Note that some
  third-party data in the hub carries its own licence (Aider Polyglot and Terminal-Bench
  data are Apache 2.0) — preserve those notices.
- Use for: the primary independent score source for text and agentic tabs.

### 4. Arena leaderboard mirror — image generation and preference Elo

- LMArena / Arena.ai publishes no official API.
- A community project publishes daily auto-updated JSON snapshots of every arena
  leaderboard, including `text-to-image`, served without authentication.
- **Status: unofficial.** Treat as best-effort. The image tab must degrade to an empty
  state with an explanation if this source fails, and must never be the site's only
  claim about a model.
- Attribute to LMArena as the originator and to the mirror as the transport.

## Explicitly excluded from v1

### Artificial Analysis

The most complete single source for every modality, with a free API key covering LLM,
text-to-image, image-editing, TTS, text-to-video and image-to-video.

**Do not use it in v1.** The free tier is internal-use / exploration only and does not
grant redistribution rights; a public site re-displaying their Elo scores is the case
their terms exclude. Using it would put the project one email away from having to rebuild
section 1.

Revisit only if a commercial licence is obtained. If that happens, it is a spec amendment
and a new source module — not a quiet addition.

### Derived aggregators

llm-stats, benchlm, whatllm, modelgrep, skiln and similar sites re-aggregate the sources
above under their own weightings. Do not ingest them. They are useful for cross-checking
during development; they are not sources of truth.

## Adding a source later

A new source requires, in this order: a stated licence permitting redistribution, an
attribution string, a Zod schema, an ingest module, a fallback behaviour, and an entry in
this file. No source ships without all six.

## Changelog

- Initial version.
