import { afterEach, describe, expect, it } from "vitest";
import { benchwikiMode, benchwikiUrl } from "@/lib/config";

/**
 * `BENCHWIKI_MODE` is a one-variable kill switch. The thing that must not break when it is
 * flipped is the leaderboard: the join reads the last committed snapshot regardless of
 * display mode, so flipping the variable removes the mirrored pages, not the core feature.
 */

const original = process.env.BENCHWIKI_MODE;

afterEach(() => {
  if (original === undefined) delete process.env.BENCHWIKI_MODE;
  else process.env.BENCHWIKI_MODE = original;
});

describe("benchwikiMode", () => {
  it("mirrors by default", () => {
    delete process.env.BENCHWIKI_MODE;
    expect(benchwikiMode()).toBe("mirror");
  });

  it("switches to link only on the exact value", () => {
    process.env.BENCHWIKI_MODE = "link";
    expect(benchwikiMode()).toBe("link");
  });

  it("treats anything unrecognised as mirror rather than guessing", () => {
    process.env.BENCHWIKI_MODE = "LINK ";
    expect(benchwikiMode()).toBe("mirror");
  });
});

describe("benchwikiUrl", () => {
  it("points at the record, not the homepage, when given a slug", () => {
    expect(benchwikiUrl("gpqa")).toBe("https://benchwiki.vercel.app/benchmarks/gpqa");
  });

  it("falls back to the site for the general attribution", () => {
    expect(benchwikiUrl()).toBe("https://benchwiki.vercel.app");
  });
});
