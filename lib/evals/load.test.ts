import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  daysSinceVerified,
  isStale,
  loadFrameworks,
  loadGuide,
  loadGuides,
  parseGuide,
} from "@/lib/evals/load";
import { UNIT_LABEL } from "@/lib/evals/frontmatter";

const NOW = new Date("2026-09-12T00:00:00.000Z");

function guideSource(frontmatter: Record<string, string>): string {
  const lines = Object.entries(frontmatter).map(([key, value]) => `${key}: ${value}`);
  return `---\n${lines.join("\n")}\n---\n\nBody.\n`;
}

const VALID = {
  title: "Test guide",
  slug: "test-guide",
  archetype: "rag",
  unit_of_evaluation: "response-plus-context",
  summary: "A guide used only by the test suite.",
  level: "intro",
  frameworks: "[]",
  prerequisites: "[]",
  published_on: "2026-09-12",
  verified_on: "2026-09-12",
};

describe("frontmatter", () => {
  it("parses a valid guide", () => {
    const guide = parseGuide(guideSource(VALID), "test.mdx");
    expect(guide.frontmatter.slug).toBe("test-guide");
  });

  it("refuses a guide with no verified_on, rather than rendering an undated one", () => {
    const { verified_on: _omitted, ...rest } = VALID;
    expect(() => parseGuide(guideSource(rest), "test.mdx")).toThrow(/verified_on/);
  });

  it("refuses an unknown unit of evaluation", () => {
    expect(() =>
      parseGuide(guideSource({ ...VALID, unit_of_evaluation: "vibes" }), "test.mdx"),
    ).toThrow(/unit_of_evaluation/);
  });

  it("refuses a summary over 160 characters", () => {
    expect(() =>
      parseGuide(guideSource({ ...VALID, summary: "x".repeat(161) }), "test.mdx"),
    ).toThrow(/summary/);
  });

  it("accepts a date YAML parsed into a Date object", () => {
    // Unquoted `2026-09-12` in YAML is a Date, not a string. Both spellings must land in
    // the same place, because an author will write it unquoted.
    const guide = parseGuide(guideSource(VALID), "test.mdx");
    expect(guide.frontmatter.verified_on).toBe("2026-09-12");
  });
});

describe("the staleness marker", () => {
  it("does not fire inside 180 days", () => {
    expect(isStale("2026-05-01", NOW)).toBe(false);
  });

  it("fires on a back-dated guide", () => {
    // The milestone's own criterion: a guide verified long ago must say so.
    expect(isStale("2025-01-01", NOW)).toBe(true);
    expect(daysSinceVerified("2025-01-01", NOW)).toBeGreaterThan(180);
  });

  it("fires the day after the window closes, and not the day before", () => {
    const boundary = new Date("2026-09-12T00:00:00.000Z");
    expect(isStale("2026-03-16", boundary)).toBe(false);
    expect(isStale("2026-03-15", boundary)).toBe(true);
  });

  it("treats an unparseable date as stale rather than fresh", () => {
    expect(isStale("not a date", NOW)).toBe(true);
  });
});

describe("a back-dated guide on disk", () => {
  it("loads and is marked stale", () => {
    const root = mkdtempSync(join(tmpdir(), "llm-atlas-evals-"));
    writeFileSync(
      join(root, "back-dated.mdx"),
      guideSource({ ...VALID, slug: "back-dated", verified_on: "2024-01-01" }),
      "utf8",
    );

    const guide = loadGuide("back-dated", root);
    expect(guide).not.toBeNull();
    expect(isStale(guide!.frontmatter.verified_on, NOW)).toBe(true);
  });

  it("ignores files prefixed with an underscore", () => {
    const root = mkdtempSync(join(tmpdir(), "llm-atlas-evals-"));
    writeFileSync(join(root, "_draft.mdx"), guideSource(VALID), "utf8");
    expect(loadGuides(root)).toHaveLength(0);
  });
});

describe("the published guides", () => {
  const guides = loadGuides();

  it("ships the three the milestone asks for, plus foundations", () => {
    const slugs = guides.map((guide) => guide.frontmatter.slug);
    expect(slugs).toContain("agentic-systems");
    expect(slugs).toContain("rag");
    expect(slugs).toContain("framework-comparison");
    expect(slugs).toContain("foundations");
  });

  it("states a unit of evaluation for every guide", () => {
    for (const guide of guides) {
      expect(UNIT_LABEL[guide.frontmatter.unit_of_evaluation]).toBeTruthy();
    }
  });

  it("names its unit of evaluation in the opening of each archetype guide", () => {
    // specs/03-sections/evals.md: every guide states its unit in the frontmatter *and* in
    // the opening. The frontmatter is enforced by the schema; this is the prose half.
    for (const guide of guides.filter(
      (entry) => entry.frontmatter.archetype !== "reference",
    )) {
      const opening = guide.body.slice(0, 400).toLowerCase();
      if (guide.frontmatter.unit_of_evaluation === "not-applicable") continue;
      expect(opening).toContain("unit of evaluation");
    }
  });

  it("ships runnable code in the archetype guides", () => {
    for (const slug of ["agentic-systems", "rag"]) {
      const guide = guides.find((entry) => entry.frontmatter.slug === slug);
      expect(guide?.body).toMatch(/```python\n[\s\S]+?```/);
    }
  });

  it("is verified no earlier than it was published", () => {
    for (const guide of guides) {
      expect(guide.frontmatter.verified_on >= guide.frontmatter.published_on).toBe(true);
    }
  });
});

describe("the framework comparison data", () => {
  const file = loadFrameworks();

  it("exists and carries a verified date", () => {
    expect(file).not.toBeNull();
    expect(file?.verified_on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("says what every framework misses, not only what it is good at", () => {
    for (const entry of file?.frameworks ?? []) {
      expect(entry.watch_out.length).toBeGreaterThan(20);
      expect(entry.archetypes.length).toBeGreaterThan(0);
    }
  });

  it("covers the archetypes the guides are written about", () => {
    const served = new Set((file?.frameworks ?? []).flatMap((entry) => entry.archetypes));
    expect(served.has("rag")).toBe(true);
    expect(served.has("agentic")).toBe(true);
  });
});
