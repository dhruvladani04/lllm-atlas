# Vision

## What this is

A reference site for people who follow LLMs closely — practising AI engineers, people
learning the field, and the broader community of enthusiasts who read model releases the
way others read sports results.

Three sections, in a deliberate progression:

1. **Leaderboard** — who is ahead right now
2. **Benchmarks** — whether the test they are ahead on still measures anything
3. **Evals** — how to measure your own application, which is a different discipline entirely

## The thesis

Model leaderboards are abundant and nearly identical. They compete on coverage and
freshness, and they all present a score as a bare fact.

They are missing context that is already public and already structured. A benchmark can
be saturated, contaminated, deprecated, or superseded. A score can be vendor-reported
rather than independently verified. A model's agentic score is a property of the model
*and* its harness, not of the model alone.

This site's single differentiator is that it joins those two bodies of information:

> Every score is displayed alongside the health of the benchmark that produced it and the
> provenance of the number.

Nothing else on the site matters as much as that join working correctly.

## Who it is for

**Primary:** working AI engineers choosing a model, defending a choice to a team, or
trying to work out whether a headline number is real.

**Secondary:** people learning to build GenAI applications who need to evaluate their own
systems and currently find only RAG-shaped tutorials.

**Not for:** executives wanting a single "best model" answer. The site should make the
question harder in a useful way, not easier in a misleading way.

## Editorial principles

These are product requirements, not aspirations. They appear again in the definition of
done.

1. **Provenance is never optional.** Every number carries a source, a fetch date, and a
   vendor-reported / independent label.
2. **Silence over invention.** A missing value renders as a visible gap with an
   explanation, never as a dash that could be mistaken for zero, never as an estimate.
3. **Date everything.** Comparison tables, framework write-ups and guides all carry a
   "last verified" date. This field is what makes the site trustworthy in a category full
   of stale content.
4. **Name the caveat where the number is,** not in a footer. A saturated benchmark's score
   is marked at the point of display.
5. **Adoption is not quality.** Usage rankings and benchmark rankings are different claims
   and are never blended into one composite score.

## Changelog

- Initial version.
