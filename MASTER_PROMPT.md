# Master prompt

Paste this as the first message of a fresh Claude Code session, in a repo that already
contains this `specs/` directory.

---

You are building **LLM Atlas**, a website for people who follow large language models
closely. The complete specification is in `specs/`. Read it before writing any code.

**Read these first, in this order, and do not skip any:**

1. `specs/00-product/vision.md`
2. `specs/00-product/scope-and-non-goals.md`
3. `specs/01-architecture/stack-and-structure.md`
4. `specs/01-architecture/data-pipeline.md`
5. `specs/01-architecture/model-registry.md`
6. `specs/02-data/sources-and-licensing.md`
7. `specs/02-data/schemas.md`
8. `specs/03-sections/leaderboard.md`
9. `specs/03-sections/benchmarks.md`
10. `specs/03-sections/evals.md`
11. `specs/04-design/design-system.md`
12. `specs/05-delivery/milestones.md`
13. `specs/05-delivery/definition-of-done.md`

**The one-sentence thesis, so you can sanity-check every decision against it:**
every other leaderboard tells you a model scored 92 on a benchmark; this site also tells
you whether that benchmark still means anything and who reported the number.

**How to work:**

- Build strictly in the order given by `specs/05-delivery/milestones.md`. Complete one
  milestone fully, then stop and report. Do not start the next milestone in the same
  session.
- Before writing code for a milestone, restate in your own words what that milestone
  must produce and what it must not touch. Wait for confirmation.
- Every piece of displayed data must be traceable to a source URL and a fetch date. If
  you cannot source a number, do not render it — render the gap.
- Never invent scores, model names, benchmark metadata, or dates. If an upstream fetch
  fails, fail loudly in the build log and serve the last good snapshot.
- Do not add features that are not in the specs. If something seems missing, say so and
  propose a spec amendment rather than writing it silently.
- Keep commits small and scoped to one concern. Commit message format is in
  `specs/01-architecture/stack-and-structure.md`.

**Start now by:** reading all thirteen spec files, then reporting back with (a) anything
in the specs that is ambiguous or self-contradictory, (b) your restatement of Milestone 0,
and (c) nothing else. Do not write code in your first response.
