import { isValidElement, type ComponentPropsWithoutRef } from "react";
import type { MDXRemoteProps } from "next-mdx-remote/rsc";
import Link from "next/link";
import { CodeBlock } from "@/components/evals/code-block";
import { Callout } from "@/components/evals/callout";
import { MetricCard } from "@/components/evals/metric-card";
import { FrameworkTable } from "@/components/evals/framework-table";
import { BenchmarkRef } from "@/components/evals/benchmark-ref";
import { Scene } from "@/components/evals/scene";

/**
 * The components available inside a guide — specs/03-sections/evals.md.
 *
 * Guides are read, not scanned, so the prose here uses the serif face and a 66-72 character
 * measure. Density is a virtue on the leaderboard and a vice in this section.
 */
export const mdxComponents: MDXRemoteProps["components"] = {
  CodeBlock,
  Callout,
  MetricCard,
  FrameworkTable,
  BenchmarkRef,
  Scene,
  h2: (props: ComponentPropsWithoutRef<"h2">) => (
    <h2 className="mt-10 text-xl font-medium" {...props} />
  ),
  h3: (props: ComponentPropsWithoutRef<"h3">) => (
    <h3 className="mt-8 text-lg font-medium" {...props} />
  ),
  h4: (props: ComponentPropsWithoutRef<"h4">) => (
    <h4 className="mt-6 text-base font-medium" {...props} />
  ),
  p: (props: ComponentPropsWithoutRef<"p">) => (
    <p className="mt-4 text-base leading-7" {...props} />
  ),
  ul: (props: ComponentPropsWithoutRef<"ul">) => (
    <ul className="mt-4 list-disc space-y-1 pl-5 text-base leading-7" {...props} />
  ),
  ol: (props: ComponentPropsWithoutRef<"ol">) => (
    <ol className="mt-4 list-decimal space-y-1 pl-5 text-base leading-7" {...props} />
  ),
  li: (props: ComponentPropsWithoutRef<"li">) => <li {...props} />,
  strong: (props: ComponentPropsWithoutRef<"strong">) => (
    <strong className="font-semibold" {...props} />
  ),
  blockquote: (props: ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote
      className="mt-4 border-l-2 border-rule-strong pl-4 text-ink-mute"
      {...props}
    />
  ),
  // A fenced block arrives as <pre><code class="language-x">…</code></pre>. Unwrap it and
  // hand the source to CodeBlock, so guides can use ordinary fences rather than a bespoke
  // component invocation that is easy to get subtly wrong.
  pre: (props: ComponentPropsWithoutRef<"pre">) => {
    const child = props.children;
    if (!isValidElement<{ className?: string; children?: string }>(child)) {
      return <pre {...props} />;
    }
    const className = child.props.className ?? "";
    const language = /language-([\w-]+)/.exec(className)?.[1] ?? "text";
    return <CodeBlock language={language} code={String(child.props.children ?? "")} />;
  },
  code: (props: ComponentPropsWithoutRef<"code">) => (
    <code className="font-mono text-[0.9em]" {...props} />
  ),
  table: (props: ComponentPropsWithoutRef<"table">) => (
    <div className="my-6 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: (props: ComponentPropsWithoutRef<"th">) => (
    <th
      scope="col"
      className="border-b border-rule-strong py-2 pr-3 text-left font-medium"
      {...props}
    />
  ),
  td: (props: ComponentPropsWithoutRef<"td">) => (
    <td className="border-b border-rule py-2 pr-3 align-top" {...props} />
  ),
  a: ({ href = "", ...props }: ComponentPropsWithoutRef<"a">) =>
    href.startsWith("/") ? (
      <Link href={href as never} className="underline underline-offset-2" {...props} />
    ) : (
      <a href={href} className="underline underline-offset-2" {...props} />
    ),
};
