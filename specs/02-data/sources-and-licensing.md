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

**Normalised on ingest:** language values arrive spelled inconsistently — `cpp` and
`c-plus-plus` are one language filtered as two. True synonyms are merged behind a small
alias map. `code`, `multilingual` and `language-neutral` are *not* merged into anything:
they look like noise beside `python` and `french` but are the honest answer for a benchmark
spanning many languages or none, and folding them into a specific language would invent a
fact rather than tidy one.

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

### 4. Arena leaderboard dataset — image generation and preference Elo

- Dataset: `lmarena-ai/leaderboard-dataset` on HuggingFace, published by Arena themselves.
- Read through the datasets-server rows API rather than the parquet files:
  `https://datasets-server.huggingface.co/rows?dataset=lmarena-ai/leaderboard-dataset&config=text_to_image&split=latest`.
  The dataset is 124MB across every arena; this pipeline wants one board as JSON.
- Each row carries `model_name`, `organization`, the *model's* licence, `rating` with
  explicit `rating_lower`/`rating_upper` bounds, `variance`, `vote_count`, `rank`,
  `category` and `leaderboard_publish_date`.
- The `latest` split holds every arena's most recent board, so `category === "overall"`
  selects text-to-image's own ranking from its sub-boards (`3d_modeling`, and others).
- **Licence: CC BY 4.0.** Redistribution is permitted with attribution.
- Attribution string: "Arena leaderboard data from Arena (lmarena-ai/leaderboard-dataset)
  on HuggingFace, CC BY 4.0."
- The image tab must still degrade to an empty state with an explanation if this source
  fails, and must never be the site's only claim about a model. A board that comes back
  with no rows in the category is a failure, not an empty leaderboard — Arena has never
  published one.

**This replaced an unofficial community mirror, and the reason is worth recording.**
Until October 2026 this read `oolong-tea-2026/arena-ai-leaderboards`, a third-party scrape
with no published licence, carried on the same permission-not-granted terms as benchwiki.
It published a partial board on 2026-10-07 (20 models against the previous 81) and then
stopped publishing entirely; the 50%-truncation guard caught the partial one and the
site served its last good snapshot for a week while the scheduled job failed nightly.

The guard behaved correctly and the staleness was shown honestly, but a source that has
stopped publishing needs a decision rather than another retry. Arena's own dataset is
better on every axis that matters here: it is the originator rather than a scrape, it is
the first version of this data that may legally be redistributed, and it carries
confidence bounds and vote counts the mirror only partly had. It also opens `image_edit`,
`text_to_video`, `image_to_video` and `video_edit`, which the post-v1 list wants.

One honest caveat: the newest board Arena has published is dated 2026-10-07, the same date
the mirror went quiet. Switching sources did not make the data fresher — the board itself
has not moved. It made it licensed, richer, and first-party.

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

## Bulk export

`/api/scores` (JSON) and `/api/scores.csv` publish the joined corpus, including benchmark
health records derived from benchwiki.

**This is a deliberate decision with a known risk, not an oversight.** Epoch's scores are
CC BY 4.0 and redistributing them with attribution is exactly what that licence is for.
benchwiki's health records are the harder case: no licence is published, and this file
treats that as permission-not-granted, which binds a bulk download more tightly than a
rendered page — a page is a citation, a download is a copy.

The mitigations are part of the payload rather than a footnote:

- Every export carries a per-source block naming the licence, the attribution string, the
  canonical site, and — for benchwiki — a plain statement that no licence is published,
  that permission has been neither granted nor refused, and that anyone redistributing
  further inherits that uncertainty.
- The CSV repeats it in header comments, so the file stays self-describing once detached
  from this site.
- Every row keeps its own `source_id`, `source_url` and `fetched_at`.

**If benchwiki objects, the health records come out of the export.** That is the response,
not a negotiation: the site's position throughout is that an unlicensed source is a guest.
Revisiting this belongs in this file, with a changelog entry, the same as adding a source.

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
- Source 4 moved from an unlicensed community mirror to Arena's own CC BY 4.0 dataset on
  HuggingFace, after the mirror stopped publishing. The first image data on this site that
  may legally be redistributed.
- Mirrored benchmark pages are kept out of the sitemap, so the canonical to benchwiki is
  not contradicted by this site's own crawl signals. Post-launch audit.
- Language values are normalised on ingest for true synonyms only. Post-launch audit.
- Added the bulk export section: the decision to include benchwiki health records, its
  risk, the in-payload mitigations, and the response if benchwiki objects. Post-launch.
