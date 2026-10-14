import { describe, expect, it } from "vitest";
import { headingId, outline, readingMinutes } from "@/lib/evals/outline";
import { guideSlugs, loadGuide } from "@/lib/evals/load";

const BODY = [
  "Intro paragraph.",
  "",
  "## The run that passes and should not",
  "",
  "```md",
  "## not a heading",
  "```",
  "",
  "## Scoring the `trajectory`",
].join("\n");

describe("outline", () => {
  it("lists second-level headings and ignores ones inside code", () => {
    expect(outline(BODY)).toEqual([
      {
        id: "the-run-that-passes-and-should-not",
        text: "The run that passes and should not",
      },
      { id: "scoring-the-trajectory", text: "Scoring the trajectory" },
    ]);
  });

  it("gives every real guide a contents list with unique anchors", () => {
    for (const slug of guideSlugs()) {
      const entries = outline(loadGuide(slug)!.body);
      expect(entries.length).toBeGreaterThan(0);
      expect(new Set(entries.map((entry) => entry.id)).size).toBe(entries.length);
    }
  });
});

describe("readingMinutes", () => {
  it("counts prose at 230 words a minute, rounding up, and never says zero", () => {
    expect(readingMinutes("word ".repeat(231))).toBe(2);
    expect(readingMinutes("")).toBe(1);
  });

  it("does not count code", () => {
    const code = "```\n" + "token ".repeat(5000) + "\n```";
    expect(readingMinutes(`short prose\n${code}`)).toBe(1);
  });

  it("matches the anchor the heading renders with", () => {
    expect(headingId("Scoring the trajectory")).toBe("scoring-the-trajectory");
  });
});
