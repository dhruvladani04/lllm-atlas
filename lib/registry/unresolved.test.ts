import { describe, expect, it } from "vitest";
import { mergeUnresolved } from "@/lib/registry/unresolved";
import type { UnresolvedNames } from "@/lib/schemas/model";

describe("mergeUnresolved", () => {
  const existing: UnresolvedNames = [
    {
      name: "Gemini 4 Ultra",
      source_id: "epoch",
      first_seen_at: "2026-09-01",
      last_seen_at: "2026-09-10",
      occurrences: 4,
    },
  ];

  it("records a name the registry could not match", () => {
    const merged = mergeUnresolved(
      [],
      [{ name: "gpt-6", source_id: "epoch" }],
      "2026-09-12",
    );
    expect(merged).toEqual([
      {
        name: "gpt-6",
        source_id: "epoch",
        first_seen_at: "2026-09-12",
        last_seen_at: "2026-09-12",
        occurrences: 1,
      },
    ]);
  });

  it("counts a repeat sighting without losing when it was first seen", () => {
    const merged = mergeUnresolved(
      existing,
      [{ name: "Gemini 4 Ultra", source_id: "epoch" }],
      "2026-09-12",
    );
    expect(merged[0]).toMatchObject({
      first_seen_at: "2026-09-01",
      last_seen_at: "2026-09-12",
      occurrences: 5,
    });
  });

  it("keeps the same name from two sources apart", () => {
    const merged = mergeUnresolved(
      existing,
      [{ name: "Gemini 4 Ultra", source_id: "openrouter" }],
      "2026-09-12",
    );
    expect(merged).toHaveLength(2);
  });

  it("never drops a name it was not told about", () => {
    const merged = mergeUnresolved(existing, [], "2026-09-12");
    expect(merged).toEqual(existing);
  });
});
