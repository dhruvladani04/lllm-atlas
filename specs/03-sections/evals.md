# Section 3 — Evals

Route: `/evals`, guides at `/evals/[...slug]`. Content is MDX in `content/evals/`.

This section is content, not data. Its quality is the quality of the writing.

## Positioning — state this on the index page

Sections 1 and 2 are about **model evaluation**: ranking foundation models against shared
benchmarks. This section is about **application evaluation**: whether *your* system works.
RAGAS and DeepEval do not tell you whether Claude beats Gemini; they tell you whether your
pipeline hallucinates.

Say this in the first paragraph of the index. Readers arriving from the leaderboard will
otherwise expect more rankings and leave.

## The organising principle

The unit of evaluation changes per application archetype. This is the spine of the whole
section and the thing most eval content gets wrong by assuming one input, one output, one
score.

- Plain generation: the unit is **one response**
- RAG: the unit is **one response plus its retrieved context** — two components that fail
  independently
- Agentic: the unit is **the trajectory** — a correct answer reached through six wrong tool
  calls and a lucky recovery is a failing run, and response-level scoring cannot see it
- Multi-turn: the unit is **the session** — memory, contradiction, degradation over turns

Every guide states its unit of evaluation in the frontmatter and in the opening.

## Content plan

### Foundations (embed, do not rewrite)

CampusX's LLM Evaluation series covers the conceptual groundwork: why one eval pipeline
is not enough, LLM-as-judge, reference-based versus reference-free, offline versus online
evals, and the pivot from application evals to model evals. Embed the relevant episode on
the foundations page and link the series prominently with clear credit.

Every embedded or linked video must be verified to exist and to belong to CampusX before
it ships — the six currently linked were checked through YouTube's oEmbed endpoint, which
returns the channel name. No stable playlist id could be verified, so the series link
points at the channel's playlists page rather than at an invented `list=` parameter. A
broken or wrong credit is worse than a less convenient link.

Do not transcribe or republish the videos. Add the layer above them.

### Archetype guides — the core of the section

One guide per archetype. Each guide covers: the unit of evaluation, what actually breaks
in production, the measures that catch it, a worked example with runnable code, and how to
read the results.

| Guide | Unit | Failures to cover | Measures |
|---|---|---|---|
| Chat and generation | Response | Tone drift, verbosity, format breakage, ungrounded claims | Task rubrics, LLM-as-judge, format compliance |
| RAG and knowledge assistants | Response + context | Retrieval miss; model ignores context; model answers from parametric memory | Context precision/recall, faithfulness, answer relevancy — retriever and generator scored separately |
| Agentic systems | Trajectory | Wrong tool, right tool wrong args, loops, non-termination, accidental recovery | Tool-call correctness, argument correctness, trajectory match, task completion, steps and cost per task |
| Multi-turn assistants | Session | Context loss, self-contradiction, repeated questions | Knowledge retention, conversation completeness, role adherence |
| Structured extraction | Field | Schema violations, silent nulls, hallucinated fields | Per-field precision/recall, schema validity rate, parse rate |
| Code generation | Execution | Plausible-but-wrong code, tests passed by cheating, scope creep | Unit-test pass rate, execution success, diff scope |
| Multimodal and documents | Response + source region | Wrong region read, OCR failure masked as reasoning failure | Grounding accuracy, region attribution, modality ablation |
| Voice pipelines | Turn + audio | WER cascading into reasoning errors, latency, interruption handling | WER, end-to-end task success, turn latency |

Cross-cutting, referenced from every guide: safety and guardrails (jailbreak resistance,
PII leakage, prompt injection), cost and latency budgets, and regression tracking against
a golden set.

### Two deep guides that do not exist elsewhere

These are the section's reason to exist. Give them the most effort.

**Evaluating agentic systems properly.** Trajectory evaluation as distinct from output
evaluation. Exact match versus any-order versus superset trajectory matching, and when
each is right. Scoring tool selection separately from argument construction. And the
central point, which benchwiki's own records repeat: an agent score is a system score. Swap
the harness and the number moves. Use real examples from the benchmark data already in
`data/` rather than invented ones.

**Modality ablation as a debugging technique.** Run the same eval audio-only, visual-only,
and fused. If fused barely beats the best single modality, the system is not fusing. This
generalises directly to multimodal RAG: retrieve-text-only versus retrieve-image-only
versus both. Almost no eval tutorial covers it.

### Framework comparison

One page, organised by **which archetype each framework serves** — that is the actual
decision a reader is making — not one page per framework.

Cover at minimum: RAGAS (RAG-shaped by design), DeepEval (broadest metric library,
pytest-style workflow), the tracing-first platforms that matter once evals move online
(LangSmith, Langfuse, Arize Phoenix, Opik), the red-teaming and model-eval end (promptfoo,
Inspect), and the classic-ML-monitoring lineage (Evidently, MLflow).

**Mandatory:** every framework claim carries a `verified_on` date, and the page renders a
"last verified" stamp. Framework feature sets move fast; an undated comparison is wrong
within a quarter. This is the same discipline benchwiki applies to scores.

## MDX frontmatter

```yaml
title: Evaluating agentic systems
slug: agentic-systems
archetype: agentic
unit_of_evaluation: trajectory
summary: One sentence, under 160 characters.
level: intermediate          # intro | intermediate | advanced
frameworks: [deepeval, langsmith]
prerequisites: [foundations]
published_on: 2026-09-20
verified_on: 2026-09-20
```

`verified_on` drives a visible staleness marker on any guide older than 180 days.

## Components available inside MDX

- `<CodeBlock>` — syntax highlighted at build time, copy button, language label.
  Guides use ordinary fenced code blocks; the MDX `pre` mapping routes them here, which
  is less error-prone for an author than a component invocation wrapping a template
  literal. No highlighter ships to the reader.
- `<Callout type="warning|note|pitfall">` — `pitfall` is the common one here
- `<MetricCard>` — name, what it measures, what it misses, which frameworks implement it
- `<FrameworkTable>` — reads from a single `content/evals/_frameworks.yaml` so the
  comparison lives in one place and its `verified_on` is enforced
- `<BenchmarkRef slug="...">` — pulls live benchmark metadata from `data/`, linking the
  evals section back to sections 1 and 2. Use this for the judge-model argument.
- `<Scene id="..." fallback="...">` — a scroll-driven explanatory scene, achromatic,
  client-only and lazily loaded. Every scene declares a fallback diagram carrying the
  same information, which is what renders under `prefers-reduced-motion`, without WebGL,
  and before the scene loads. A scene that cannot be reduced to a still diagram is
  explaining nothing and does not belong in a guide.

The two deep guides are where scenes earn their place: trajectory branching — the same
task reached through six wrong tool calls and a lucky recovery — and modality ablation,
where audio-only, visual-only and fused runs are compared. Both are processes, and both
are what readers currently have to reconstruct from prose.

## Writing rules

- Runnable code over described code. Every archetype guide ships at least one complete,
  executable example, and the example is actually executed before it ships. Any output
  quoted in the prose must be the output the code really produces.
- Name what a metric *misses*, not only what it measures.
- No framework marketing language.
- Sentence case headings, plain verbs, active voice.

## Changelog

- Initial version.
- Fenced code blocks route through `CodeBlock`; embedded videos must be verified; quoted
  example output must be real. Milestone 6.
- Added the `<Scene>` component and its static-fallback requirement.
