/**
 * specs/04-design/design-system.md — vendor marks.
 *
 * Which creators have a committed mark in `public/logos/`. The files are the single-path
 * glyphs from simple-icons 16.35.0 (CC0-1.0); the marks themselves remain each vendor's
 * trademark, used here only to identify the vendor. They are committed and not hot-linked
 * because the CSP allows images from this origin only.
 *
 * A table and not a slugging rule, for the same reason the registry has no fuzzy matching:
 * "Google DeepMind" is not "Google", and a wrong mark is a wrong attribution. A creator
 * string naming several organisations is a joint release and gets no single vendor's mark.
 */
export const CREATOR_LOGOS: Record<string, string> = {
  OpenAI: "openai",
  Anthropic: "anthropic",
  Google: "google",
  "Google Research": "google",
  "Google DeepMind": "deepmind",
  DeepMind: "deepmind",
  Meta: "meta",
  "Meta AI": "meta",
  "Mistral AI": "mistralai",
  DeepSeek: "deepseek",
  Microsoft: "microsoft",
  "Microsoft Research": "microsoft",
  ByteDance: "bytedance",
  Alibaba: "alibabacloud",
  NVIDIA: "nvidia",
  Amazon: "amazon",
  Databricks: "databricks",
  Salesforce: "salesforce",
  MiniMax: "minimax",
  Cursor: "cursor",
};

export function logoFor(creator: string): string | null {
  return CREATOR_LOGOS[creator] ?? null;
}

/** The fallback for a creator with no committed mark: its first letter or digit. */
export function monogram(creator: string): string {
  return (/[\p{L}\p{N}]/u.exec(creator)?.[0] ?? "?").toUpperCase();
}
