import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { GuideFrontmatter } from "@/lib/evals/frontmatter";

/**
 * Reads the MDX guides at build time. Frontmatter is parsed, never trusted: a guide whose
 * frontmatter does not validate fails the build rather than rendering without the dates
 * that make it trustworthy.
 */

export const CONTENT_ROOT = join(process.cwd(), "content", "evals");

/** specs/03-sections/evals.md: a guide older than 180 days shows a staleness marker. */
export const STALE_AFTER_DAYS = 180;

export interface Guide {
  frontmatter: GuideFrontmatter;
  body: string;
}

export function isStale(verified_on: string, now: Date): boolean {
  const verified = Date.parse(verified_on);
  if (Number.isNaN(verified)) return true;
  return now.getTime() - verified > STALE_AFTER_DAYS * 86_400_000;
}

export function daysSinceVerified(verified_on: string, now: Date): number {
  const verified = Date.parse(verified_on);
  if (Number.isNaN(verified)) return Number.POSITIVE_INFINITY;
  return Math.floor((now.getTime() - verified) / 86_400_000);
}

export function parseGuide(source: string, path: string): Guide {
  const { data, content } = matter(source);
  const result = GuideFrontmatter.safeParse(data);
  if (!result.success) {
    throw new Error(
      `${path}: frontmatter is invalid — ${result.error.issues
        .map((issue) => `${issue.path.join(".") || "(root)"} ${issue.message}`)
        .join("; ")}`,
    );
  }
  return { frontmatter: result.data, body: content };
}

export function guideSlugs(root: string = CONTENT_ROOT): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .filter((name) => name.endsWith(".mdx") && !name.startsWith("_"))
    .map((name) => name.replace(/\.mdx$/, ""))
    .sort();
}

export function loadGuide(slug: string, root: string = CONTENT_ROOT): Guide | null {
  const path = join(root, `${slug}.mdx`);
  if (!existsSync(path)) return null;
  return parseGuide(readFileSync(path, "utf8"), path);
}

export function loadGuides(root: string = CONTENT_ROOT): Guide[] {
  return guideSlugs(root)
    .map((slug) => loadGuide(slug, root))
    .filter((guide): guide is Guide => guide !== null);
}

/**
 * The framework comparison lives in one file so its `verified_on` is enforced in one
 * place, rather than scattered through prose where it would rot unnoticed.
 */
export const FrameworkEntry = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  archetypes: z.array(z.string()).min(1),
  strength: z.string().min(1),
  watch_out: z.string().min(1),
  licence: z.string().min(1),
  url: z.url(),
});
export type FrameworkEntry = z.infer<typeof FrameworkEntry>;

export const FrameworkFile = z.object({
  // Quoted in the YAML file, but accept a parsed Date for the same reason guides do.
  verified_on: z.preprocess(
    (value) => (value instanceof Date ? value.toISOString().slice(0, 10) : value),
    z.iso.date(),
  ),
  note: z.string().min(1),
  frameworks: z.array(FrameworkEntry).min(1),
});
export type FrameworkFile = z.infer<typeof FrameworkFile>;

export function loadFrameworks(root: string = CONTENT_ROOT): FrameworkFile | null {
  const path = join(root, "_frameworks.yaml");
  if (!existsSync(path)) return null;
  return FrameworkFile.parse(parseYaml(readFileSync(path, "utf8")));
}
