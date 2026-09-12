import type { Metadata } from "next";
import Link from "next/link";
import { loadFrameworks, loadGuides } from "@/lib/evals/load";
import { UNIT_LABEL } from "@/lib/evals/frontmatter";
import { VerifiedStamp } from "@/components/evals/verified-stamp";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Evals — LLM Atlas",
  description:
    "Evaluating your own GenAI application: what to score per archetype, and what each measure misses.",
};

export default function EvalsIndexPage() {
  const guides = loadGuides();
  const frameworks = loadFrameworks();

  const foundations = guides.filter(
    (guide) => guide.frontmatter.archetype === "foundations",
  );
  const rest = guides.filter((guide) => guide.frontmatter.archetype !== "foundations");

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-serif text-2xl font-semibold">Evals</h1>

      <p className="mt-4 font-serif text-base leading-7">
        Sections 1 and 2 of this site are about <strong>model evaluation</strong>: ranking
        foundation models against shared benchmarks. This section is about{" "}
        <strong>application evaluation</strong>: whether <em>your</em> system works. RAGAS
        and DeepEval will not tell you whether Claude beats Gemini. They tell you whether
        your pipeline hallucinates. If you arrived here from the leaderboard expecting
        more rankings, this is a different discipline — and the more useful one once you
        have chosen a model.
      </p>

      <p className="mt-4 font-serif text-base leading-7">
        The spine of everything below is the <strong>unit of evaluation</strong>. Most
        eval tooling assumes one input, one output, one score. Real applications are not
        that shape: a RAG answer is a response plus its retrieved context, and an agent
        run is a whole trajectory. Score the wrong unit and your numbers are confidently
        meaningless.
      </p>

      {foundations.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-lg font-medium">Start here</h2>
          <GuideList guides={foundations} />
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="text-lg font-medium">Guides</h2>
        <GuideList guides={rest} />
      </section>

      <section className="mt-10 border-t border-rule pt-4">
        <h2 className="text-lg font-medium">Still to be written</h2>
        <p className="mt-2 text-sm text-ink-mute">
          One guide per archetype is the plan: multi-turn assistants, structured
          extraction, code generation, multimodal and document systems, and voice
          pipelines. They are not here yet. Listing them as missing is more useful than a
          page that pretends the set is complete.
        </p>
      </section>

      {frameworks !== null ? (
        <p className="mt-10 text-xs text-ink-mute">
          Framework claims on this site are dated.{" "}
          <VerifiedStamp verifiedOn={frameworks.verified_on} />
        </p>
      ) : null}
    </main>
  );
}

function GuideList({ guides }: { guides: ReturnType<typeof loadGuides> }) {
  return (
    <ul className="mt-3 divide-y divide-rule border-y border-rule">
      {guides.map(({ frontmatter }) => (
        <li key={frontmatter.slug} className="py-3">
          <Link
            href={`/evals/${frontmatter.slug}`}
            className="text-base underline-offset-2 hover:underline"
          >
            {frontmatter.title}
          </Link>
          <p className="mt-1 text-sm text-ink-mute">{frontmatter.summary}</p>
          <p className="mt-1 text-xs text-ink-mute">
            Unit of evaluation: {UNIT_LABEL[frontmatter.unit_of_evaluation]} ·{" "}
            {frontmatter.level} · <VerifiedStamp verifiedOn={frontmatter.verified_on} />
          </p>
        </li>
      ))}
    </ul>
  );
}
