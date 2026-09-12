# Scope and non-goals

## v1 scope

### Section 1 — Leaderboard

Three modality tabs, and only three:

- **Text** — general language model capability
- **Agentic** — tool use, terminal, browser, long-horizon tasks
- **Image generation** — text-to-image, the single media modality in v1

Per model: a detail page with benchmark scores, each annotated with benchmark health and
score provenance, plus pricing and context window where available.

Per benchmark result: the score, the source, the date, and whether it was vendor-reported
or independently measured.

### Section 2 — Benchmarks

A mirror of the benchwiki dataset with an enhanced interface, plus the reverse lookup that
benchwiki does not offer: benchmark to models scored on it to whether those scores are
current.

### Section 3 — Evals

Long-form guides on evaluating GenAI applications, covering every application archetype
rather than RAG alone. Content, not data. Authored in MDX.

## Explicit non-goals for v1

Do not build these. If they seem necessary, propose a spec amendment first.

| Non-goal | Why |
|---|---|
| User accounts, auth, login | No feature in v1 needs identity |
| Voting, comments, user-submitted scores | Turns a reference site into a moderation problem |
| Video, audio, TTS, STT, embedding leaderboards | Three more ingestion paths, none benefiting from the core join |
| A composite "LLM Atlas Score" | Every aggregator has one; ours would be another opaque weighting |
| Real-time / websocket updates | The underlying data changes daily at best; polling is honest |
| A public API | Ship the site first; an API is a support commitment |
| Newsletter, notifications, alerts | Post-launch, if people ask |
| i18n | English only |
| A model playground or inference proxy | A different product entirely |

## What "real-time" means here, precisely

The requirement is "updated daily, or as soon as a new model comes out". That is
achievable for release detection and usage data. It is not achievable for human-preference
Elo, which requires vote accumulation — Artificial Analysis, for example, will not rank a
media model until it has a minimum number of arena appearances.

The site must therefore model three distinct states per model and render them differently:

- **`ranked`** — has scores from at least one tracked source
- **`released_unranked`** — detected as released, no scores yet, showing time since release
- **`announced`** — announced but not yet servable

`released_unranked` is a feature, not an empty state. A new model appearing within hours
with an honest "no independent scores yet, released 3 days ago" is more useful than a
competitor's placeholder ranking.

## Changelog

- Initial version.
