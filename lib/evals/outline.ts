/**
 * specs/03-sections/evals.md — a guide's contents and its reading time.
 *
 * Both are read from the MDX source rather than written into frontmatter, so they cannot
 * drift from the guide they describe. Headings inside fenced code are not headings.
 */

export interface OutlineEntry {
  id: string;
  text: string;
}

/** The anchor id for a heading; the MDX `h2` renders the same id from the same text. */
export function headingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`*_]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function withoutCode(body: string): string {
  return body.replace(/^```[\s\S]*?^```/gm, "");
}

export function outline(body: string): OutlineEntry[] {
  return [...withoutCode(body).matchAll(/^## +(.+?)\s*$/gm)].map((match) => {
    const text = (match[1] ?? "").replace(/[`*_]/g, "");
    return { id: headingId(text), text };
  });
}

/**
 * Minutes at 230 words a minute, rounded up. Code is excluded — it is read differently,
 * and counting it would make a guide with long examples look longer to read than it is —
 * and so are JSX tags, which are not prose.
 */
export function readingMinutes(body: string): number {
  const prose = withoutCode(body).replace(/<[^>]+>/g, " ");
  const words = prose.split(/\s+/).filter((word) => /[A-Za-z0-9]/.test(word)).length;
  return Math.max(1, Math.ceil(words / 230));
}
