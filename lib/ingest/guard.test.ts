import { describe, expect, it } from "vitest";
import { checkTruncation } from "@/lib/ingest/guard";

describe("checkTruncation", () => {
  it("passes a run with no previous snapshot to compare against", () => {
    expect(checkTruncation(72, null).truncated).toBe(false);
  });

  it("passes an unchanged record count", () => {
    expect(checkTruncation(72, 72).truncated).toBe(false);
  });

  it("passes a run that grew", () => {
    expect(checkTruncation(90, 72).truncated).toBe(false);
  });

  it("passes exactly half, since the floor is below 50 per cent", () => {
    expect(checkTruncation(36, 72).truncated).toBe(false);
  });

  it("fails a run below half and says what it saw", () => {
    const verdict = checkTruncation(35, 72);
    expect(verdict.truncated).toBe(true);
    expect(verdict.message).toContain("35 records");
    expect(verdict.message).toContain("previous 72");
  });

  it("fails an empty response against a healthy previous run", () => {
    expect(checkTruncation(0, 72).truncated).toBe(true);
  });

  it("does not divide by a previous count of zero", () => {
    expect(checkTruncation(0, 0).truncated).toBe(false);
  });
});
