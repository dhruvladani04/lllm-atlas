import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * specs/04-design/design-system.md sets a contrast floor of 4.5:1 for text and 3:1 for
 * the status colours, in both schemes. That is a measurable claim, so it is measured
 * here rather than eyeballed.
 */

const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

function token(name: string): string {
  const match = new RegExp(`--${name}: *(#[0-9a-fA-F]{6});`).exec(css);
  if (!match?.[1]) throw new Error(`token --${name} is not defined in app/globals.css`);
  return match[1];
}

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
  const linear = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  const [r, g, b] = linear as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (hi + 0.05) / (lo + 0.05);
}

const SCHEMES = ["light", "dark"] as const;

const TEXT_TOKENS = ["ink", "ink-mute"] as const;

const DATA_TOKENS = [
  "status-active",
  "status-nearing",
  "status-saturated",
  "status-deprecated",
  "risk-high",
  "risk-medium",
  "provenance-vendor",
  "stale",
] as const;

describe.each(SCHEMES)("%s scheme", (scheme) => {
  const grounds = [token(`paper-${scheme}`), token(`surface-${scheme}`)];

  it.each(TEXT_TOKENS)("--%s reaches 4.5:1 against paper and surface", (name) => {
    for (const ground of grounds) {
      expect(contrast(token(`${name}-${scheme}`), ground)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(DATA_TOKENS)("--%s reaches 4.5:1 against paper and surface", (name) => {
    // The design system sets a 3:1 floor for status colours, but every one of them is
    // rendered as text — a chip label, a flag, a badge — so they are held to the text floor.
    // An axe audit caught the saturated grey at 3.75:1 sitting inside a 13px label.
    for (const ground of grounds) {
      expect(contrast(token(`${name}-${scheme}`), ground)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("defines every neutral and data token", () => {
    for (const name of [
      "paper",
      "surface",
      "rule",
      "rule-strong",
      ...TEXT_TOKENS,
      ...DATA_TOKENS,
    ]) {
      expect(() => token(`${name}-${scheme}`)).not.toThrow();
    }
  });
});
