import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CREATOR_LOGOS, logoFor, monogram } from "@/lib/creators/logo";
import { loadRegistry } from "@/lib/registry/load";

const DIR = join(process.cwd(), "public", "logos");
const files = readdirSync(DIR).filter((name) => name.endsWith(".svg"));

const SINGLE_PATH =
  /^<svg [^>]*viewBox="0 0 24 24"[^>]*><title>[^<]*<\/title><path d="[^"]+"\/><\/svg>\s*$/;

describe("creator logos", () => {
  it("has a committed file behind every mapped mark, and no orphaned files", () => {
    const committed = files.map((name) => name.replace(/\.svg$/, "")).sort();
    const mapped = [...new Set(Object.values(CREATOR_LOGOS))].sort();
    expect(mapped).toEqual(committed);
  });

  it("maps only creator names the registry actually uses", () => {
    // A typo here would silently fall back to a monogram and never be noticed.
    const creators = new Set(loadRegistry().map((model) => model.creator));
    for (const creator of Object.keys(CREATOR_LOGOS)) expect(creators).toContain(creator);
  });

  it.each(files)("%s is a single path with nothing executable in it", (name) => {
    expect(readFileSync(join(DIR, name), "utf8")).toMatch(SINGLE_PATH);
  });

  it("gives a joint release no single vendor's mark", () => {
    expect(logoFor("DeepSeek,Peking University")).toBeNull();
    expect(logoFor("Google DeepMind")).toBe("deepmind");
  });

  it("falls back to a monogram for any creator, including one starting with a digit", () => {
    expect(monogram("xAI")).toBe("X");
    expect(monogram("01.AI")).toBe("A");
    expect(monogram("")).toBe("?");
  });
});
