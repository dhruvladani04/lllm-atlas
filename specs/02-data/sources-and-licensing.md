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
- Canonical record page: `https://benchwiki.vercel.app/benchmarks/<slug>` — verified
  against the live site, and the target of `rel="canonical"` on mirrored pages. The
  payload does not carry this URL; it is derived from the slug.
- The payload nests more than the list above suggests: `metric` is an object whose
  `primary` and `judge_model` the site lifts to the top level, `contamination` carries a
  `mitigation` string section 2 renders, and records also carry `launch_date` and
  `languages`. Dates arrive as midnight-UTC datetimes and are trimmed to calendar dates
  on the way in.
- Cadence: daily.
- **Licensing status: no published licence.** The endpoint is public; the terms are not
  stated. Treat this as permission-not-granted rather than permission-denied.

**Required handling:**
- Prominent, persistent attribution on every page in section 2 and on every benchmark chip
  elsewhere: "Benchmark metadata from benchwiki", linking to the corresponding benchwiki
  page, not just the homepage.
- `rel="canonical"` on mirrored benchmark detail pages pointing at the benchwiki original.
  Those pages are also kept out of `sitemap.xml`: listing a URL while canonicalling it to
  another domain asks a crawler to do two contradictory things, and the canonical is the
  half that reflects who owns the record. The consequence is accepted knowingly — this
  site's own contribution on those pages, the reverse lookup, cannot rank while it lives
  at a mirrored URL. Giving it a separate indexable home is the fix, and it is a feature,
  not a metadata tweak.
- Fetch once daily, server-side, cached. Never proxy user requests to their endpoint.
- Honour `BENCHWIKI_MODE=link` as a one-variable kill switch — see
  `01-architecture/stack-and-structure.md`.
- Do not present benchwiki's editorial prose as the site's own writing. Quote briefly and
  link, or paraphrase and attribute.

### 2. OpenRouter — real-world usage

- Rankings page: `https://openrouter.ai/rankings`
- Model list: `https://openrouter.ai/api/v1/models` — public, no key, verified. Carries
  `context_length` and per-token prices as decimal strings, which is where the price
  fallback comes from.
- Usage API: top models per day by token usage; **requires an OpenRouter API key**. With
  no key configured the adoption column has no data, and says so rather than showing a
  blank or a zero.
- **Licence: CC BY 4.0.** Redistribution is permitted with attribution. This is the
  safest source in the set.
- Use for: an "adoption" column and a usage tab. Never blended into a capability ranking.
  Also the fallback source for pricing and context window — see source 5.
- Attribution string: "Usage data from OpenRouter, CC BY 4.0."

### 3. Epoch AI — benchmark results and capability index

- Hub: `https://epoch.ai/benchmarks`
- Bulk data: `https://epoch.ai/data/benchmark_data.zip` — a ZIP of CSVs, verified. It
  contains `benchmark_metadata.csv`, which names each benchmark and says which column
  of which file holds its score, one file per benchmark, and an
  `epoch_capabilities_index/` directory. The bundle's own README states the licence
  and the citation string reproduced below.
- **Licence: CC BY.** Redistribution permitted with attribution. Note that some
  third-party data in the hub carries its own licence (Aider Polyglot and Terminal-Bench
  data are Apache 2.0) — preserve those notices.
- Use for: the primary independent score source for text and agentic tabs.

### 4. Arena leaderboard mirror — image generation and preference Elo

- LMArena / Arena.ai publishes no official API.
- The mirror used is `oolong-tea-2026/arena-ai-leaderboards` on GitHub, verified: dated
  directories of JSON, one file per board, served raw without authentication. v1 reads
  `text-to-image.json` only. Each row carries rank, model, vendor, licence, Elo, a
  confidence interval and a vote count.
- Today's directory may not exist when the job runs, so the fetch walks back up to seven
  days and records which date it actually served.
- **Status: unofficial.** Treat as best-effort. The image tab must degrade to an empty
  state with an explanation if this source fails, and must never be the site's only
  claim about a model.
- Attribute to LMArena as the originator and to the mirror as the transport.

### 5. Vendor pricing pages — list prices and context windows

- Endpoints: each model creator's own published pricing page, one scraper per creator,
  covering the creators behind the models in `data/registry/models.json`.
- Shape: HTML. Each scraper extracts, per model, `price_input_per_mtok`,
  `price_output_per_mtok` and `context_window`, and nothing else.
- Cadence: daily, inside the Actions job only. Never from a user request.
- **Licensing status: facts, not expression.** A price is a fact and is not copyrightable;
  the page it appears on is. Extract the numbers, link to the page, reproduce no prose,
  no styling and no page text.

**Required handling:**
- Honour `robots.txt` for every vendor domain. A disallowed path is not scraped, and the
  vendor is recorded as unavailable rather than worked around.
- Identify the scraper honestly in the `User-Agent`, with a contact URL.
- One request per vendor per day. No parallel hammering, no retries beyond one.
- Each price carries its own `source_url` — the specific pricing page — and `fetched_at`.
- A scraper that cannot find its expected anchors is a **schema error for that vendor**,
  handled exactly like any other source failure: keep the last good value, log it, let the
  freshness stamp go stale. Never emit a guessed or partial price.

**Which vendors are scraped.** A creator is listed only where its page states prices in
a form that can be read without assuming anything. Anthropic's page names a model and
then states `Input $X / MTok Output $Y / MTok`, which is unambiguous. DeepSeek's table
splits peak from off-peak and cache-hit from cache-miss, so picking one of the four to
call "the" price would be a guess, and it is absent. OpenAI's pricing page returns 403
to automated requests, which is a refusal and is honoured as one.

**Fallback to OpenRouter.** Where no vendor price is available — no scraper, scraper
failed, or the model is absent from the vendor's page — the OpenRouter price is used
instead and is **labelled at the point of display**. These are different claims:
OpenRouter publishes the routed price it charges, the vendor publishes its list price.
Presenting one as the other would fail the honesty check in
`05-delivery/definition-of-done.md`. Where neither exists, the cell renders through
`MissingValue`.

**Expect this source to break.** Every other source is JSON from an endpoint; this one is
HTML that changes for cosmetic reasons. It is specified to fail loudly and fall back,
because the alternative — a stale or misparsed price shown as current — is worse than a
visible gap.

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

**A link is not data.** benchwiki's records list, per benchmark, the leaderboards where
results are tracked, and for four benchmarks one of those is Artificial Analysis. Those
links are rendered as links. No number on this site comes from them, and none ever may
without the licence above. The exclusion is on their data, not on acknowledging that they
exist.

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
- Recorded the verified Epoch, OpenRouter and arena-mirror endpoints, and which vendors
  are scraped. Milestone 3.
- Recorded the verified canonical URL pattern and the payload's real nesting.
  Milestone 2.
- Added source 5, vendor pricing pages, with OpenRouter as the labelled fallback for price
  and context window. Milestone 3.
- Mirrored benchmark pages are kept out of the sitemap, so the canonical to benchwiki is
  not contradicted by this site's own crawl signals. Post-launch audit.
