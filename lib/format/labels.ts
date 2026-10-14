/**
 * Readable labels for the slugs benchwiki uses as categories.
 *
 * These are category names, not model or benchmark names, so formatting them is not
 * inventing anything: `agentic-tool-use` is "Agentic tool use". A slug with no entry is
 * sentence-cased from its words, which is right for every capability benchwiki uses today.
 * The explicit entries are the ones a rule gets wrong — "C plus plus" is not a language.
 */

const CAPABILITY: Record<string, string> = {
  "safety-alignment": "Safety and alignment",
  maths: "Maths",
};

const LANGUAGE: Record<string, string> = {
  "c-plus-plus": "C++",
  "c-sharp": "C#",
  c: "C",
  sql: "SQL",
  php: "PHP",
  javascript: "JavaScript",
  typescript: "TypeScript",
  "language-neutral": "Language-neutral",
  "other-multilingual-video": "Other multilingual (video)",
};

function sentenceCase(slug: string): string {
  const words = slug.split("-").join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function capabilityLabel(slug: string): string {
  return CAPABILITY[slug] ?? sentenceCase(slug);
}

export function languageLabel(slug: string): string {
  return LANGUAGE[slug] ?? sentenceCase(slug);
}
