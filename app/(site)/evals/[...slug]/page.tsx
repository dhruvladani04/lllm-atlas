import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { guideSlugs, loadGuide, loadGuides } from "@/lib/evals/load";
import { UNIT_LABEL } from "@/lib/evals/frontmatter";
import { mdxComponents } from "@/components/evals/mdx";
import { VerifiedStamp } from "@/components/evals/verified-stamp";

/**
 * specs/03-sections/evals.md — a guide.
 *
 * A single narrow reading column with generous leading: density is a virtue on the
 * leaderboard and a vice here. Every guide states its unit of evaluation in the opening,
 * because that is the decision the rest of the guide depends on.
 */

export function generateStaticParams() {
  return guideSlugs().map((slug) => ({ slug: [slug] }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = loadGuide(slug.join("/"));
  if (guide === null) return { title: "Guide — LLM Atlas" };
  return {
    title: `${guide.frontmatter.title} — LLM Atlas`,
    description: guide.frontmatter.summary,
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const guide = loadGuide(slug.join("/"));
  if (guide === null) notFound();

  const { frontmatter, body } = guide;
  const prerequisites = loadGuides().filter((other) =>
    frontmatter.prerequisites.includes(other.frontmatter.slug),
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <p className="text-sm text-ink-mute">
        <Link href="/evals" className="underline-offset-2 hover:underline">
          Evals
        </Link>
      </p>

      <h1 className="mt-2 font-serif text-2xl font-semibold">{frontmatter.title}</h1>

      <p className="mt-2 text-sm text-ink-mute">
        Unit of evaluation:{" "}
        <strong className="font-medium text-ink">
          {UNIT_LABEL[frontmatter.unit_of_evaluation]}
        </strong>{" "}
        · {frontmatter.level} · <VerifiedStamp verifiedOn={frontmatter.verified_on} />
      </p>

      {prerequisites.length > 0 ? (
        <p className="mt-2 text-sm text-ink-mute">
          Assumes you have read{" "}
          {prerequisites.map((other, index) => (
            <span key={other.frontmatter.slug}>
              {index > 0 ? ", " : ""}
              <Link href={`/evals/${other.frontmatter.slug}`} className="underline">
                {other.frontmatter.title}
              </Link>
            </span>
          ))}
          .
        </p>
      ) : null}

      <article className="font-serif">
        <MDXRemote source={body} components={mdxComponents} />
      </article>

      <footer className="mt-12 border-t border-rule pt-4 text-xs text-ink-mute">
        Published {frontmatter.published_on}.{" "}
        <VerifiedStamp verifiedOn={frontmatter.verified_on} /> Guides carry a verified
        date because eval tooling moves faster than writing about it does.
      </footer>
    </main>
  );
}
