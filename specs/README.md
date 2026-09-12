# LLM Atlas — specification directory

Working name: **LLM Atlas**. Rename in `00-product/vision.md` only; every other file
refers to "the site".

This directory is the source of truth for the project. Code is downstream of these
documents. If an implementation detail contradicts a spec, the spec wins — or the spec
gets amended first, in the same commit.

## How to use this with Claude Code

1. Read `MASTER_PROMPT.md`. Paste it as the opening message of a fresh Claude Code
   session in an empty repo with this `specs/` directory already committed.
2. Work milestone by milestone from `05-delivery/milestones.md`. One milestone per
   session. Do not let a session span two milestones.
3. Before closing a milestone, run it against `05-delivery/definition-of-done.md`.

## Reading order

| Order | File | Answers |
|---|---|---|
| 1 | `00-product/vision.md` | Why this exists and what makes it different |
| 2 | `00-product/scope-and-non-goals.md` | What v1 is and is explicitly not |
| 3 | `01-architecture/stack-and-structure.md` | Stack, repo layout, conventions |
| 4 | `01-architecture/data-pipeline.md` | How data gets in and stays fresh |
| 5 | `01-architecture/model-registry.md` | Model identity — the hardest problem here |
| 6 | `02-data/sources-and-licensing.md` | Every upstream source and its terms |
| 7 | `02-data/schemas.md` | Canonical types for everything on disk |
| 8 | `03-sections/leaderboard.md` | Section 1 |
| 9 | `03-sections/benchmarks.md` | Section 2 |
| 10 | `03-sections/evals.md` | Section 3 |
| 11 | `04-design/design-system.md` | Visual direction and tokens |
| 12 | `05-delivery/milestones.md` | Build order |
| 13 | `05-delivery/definition-of-done.md` | Gate for every milestone |

## Amending a spec

Specs change. When they do:
- Edit the spec file and the code in the same commit.
- Add a line to the `## Changelog` section at the bottom of the edited file.
- Never leave a spec describing behaviour the code no longer has.
