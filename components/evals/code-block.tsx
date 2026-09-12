import { codeToHtml } from "shiki";
import { CopyButton } from "@/components/evals/copy-button";

function flatten(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flatten).join("");
  return "";
}

/**
 * specs/03-sections/evals.md — `<CodeBlock>`: syntax highlighted, copy button, language
 * label. Highlighting happens at build time, so no highlighter ships to the reader.
 *
 * Both themes are generated and swapped by CSS, because the page follows the reader's
 * system setting and a code block that ignores it is the most jarring thing on a page.
 */
export async function CodeBlock({
  children,
  code: codeProp,
  language = "python",
  filename,
}: {
  children?: React.ReactNode;
  code?: string;
  language?: string;
  filename?: string;
}) {
  // MDX may hand children over as a string, or as an array of them. Flatten rather than
  // assume: a guide failing to build because of how its author spaced a code fence would be
  // an absurd way to lose a page.
  const code = (codeProp ?? flatten(children)).trim();
  if (code === "") {
    throw new Error(
      `<CodeBlock${filename === undefined ? "" : ` filename="${filename}"`}> received no code`,
    );
  }
  const html = await codeToHtml(code, {
    lang: language,
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
  });

  return (
    <figure className="my-6 border border-rule">
      <figcaption className="flex items-center justify-between border-b border-rule bg-surface px-3 py-1.5 text-xs text-ink-mute">
        <span className="font-mono">{filename ?? language}</span>
        <CopyButton code={code} />
      </figcaption>
      <div
        className="shiki-block overflow-x-auto p-3 text-xs"
        // Highlighted at build time from content committed to this repository.
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </figure>
  );
}
