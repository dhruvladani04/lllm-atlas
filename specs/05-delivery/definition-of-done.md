# Definition of done

Run this before closing any milestone. A milestone with an unchecked box is not done.

## Data integrity

- [ ] Every rendered number traces to a `source_url` and a `fetched_at`
- [ ] Every score carries a provenance label; none is inferred or defaulted
- [ ] No score was produced by averaging across different harnesses
- [ ] No score was produced by averaging vendor-reported and independent numbers
- [ ] Elo and percentage values are never compared or combined
- [ ] Missing values render through `MissingValue`, never as a dash, zero, or blank
- [ ] Unresolved model names are in `unresolved.json`, not silently dropped or fuzzy-matched
- [ ] Nothing in `data/` was hand-edited outside the registry

## The core join

- [ ] Every score display includes its benchmark's status
- [ ] Saturated and deprecated benchmarks are visually distinguished at the point of display
- [ ] High-contamination benchmarks are flagged
- [ ] `superseded` flags link to the successor benchmark
- [ ] Agentic rows show their harness and carry the system-score caveat

## Freshness

- [ ] Every data surface shows a freshness stamp
- [ ] Data older than 7 days renders a visible staleness marker
- [ ] A failed source shows its last successful fetch date, not a blank
- [ ] Evals guides older than 180 days show a staleness marker

## Licensing and attribution

- [ ] benchwiki attribution appears above the fold on every mirrored page
- [ ] Mirrored benchmark pages carry `rel="canonical"` to benchwiki
- [ ] OpenRouter data carries its CC BY 4.0 attribution
- [ ] Epoch data carries its CC BY attribution, and third-party Apache-2.0 notices are preserved
- [ ] No Artificial Analysis data appears anywhere in the build
- [ ] `BENCHWIKI_MODE=link` builds cleanly and 404s nothing

## Design

- [ ] No colour appears in the interface that is not encoding data
- [ ] Every status colour is paired with a text label or glyph
- [ ] Numeric columns use tabular figures
- [ ] Both colour schemes checked on every route
- [ ] None of the avoided patterns in `04-design/design-system.md` appear

## Accessibility and quality

- [ ] Keyboard navigable end to end with visible focus
- [ ] Table headers use `<th scope>`
- [ ] Contrast at least 4.5:1 for text, 3:1 for status colours
- [ ] `prefers-reduced-motion` respected
- [ ] Readable and correct at 360px
- [ ] No console errors or hydration warnings
- [ ] Lighthouse performance and accessibility both above 90 on `/models`

## Code

- [ ] TypeScript strict passes with no `any` in `lib/` or `scripts/`
- [ ] Every ingested payload is Zod-parsed, never cast
- [ ] No runtime fetch to an upstream source from a user request
- [ ] Flag derivation logic exists in exactly one place and is unit tested
- [ ] Specs updated in the same commit as any behaviour they describe

## Honesty check

The last gate, and a human one. Open the site and ask:

- [ ] Could a reader mistake a vendor-reported number for an independent one?
- [ ] Could a reader mistake a saturated benchmark's score for a meaningful one?
- [ ] Does any page imply the site knows something it does not?

If any answer is yes, the milestone is not done regardless of the boxes above.

## Changelog

- Initial version.
