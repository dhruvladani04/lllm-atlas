import { describe, expect, it } from "vitest";
import { uniformColumns } from "@/lib/leaderboard/view";
import type { TableRow } from "@/lib/leaderboard/view";

/**
 * The collapse rule decides whether a column is information or repetition. Getting it
 * wrong in the "uniform" direction hides a column that varies; getting it wrong the other
 * way puts the same word in forty-nine rows. Both directions are tested, because with
 * today's data only one of them is reachable through the UI.
 */

function row(over: Partial<TableRow> = {}): TableRow {
  return {
    key: "m#base",
    model_id: "m",
    variant: "base",
    value: 90,
    unit: "percent",
    confidence_interval: null,
    provenance: "independent",
    health_flags: [],
    benchmark_status: "active",
    eci: null,
    ...over,
  };
}

describe("uniformColumns", () => {
  it("collapses a provenance column every row agrees on", () => {
    const result = uniformColumns([row(), row(), row()]);
    expect(result.provenance).toBe("independent");
  });

  it("keeps the provenance column when a single row differs", () => {
    const result = uniformColumns([row(), row({ provenance: "vendor-reported" })]);
    expect(result.provenance).toBeNull();
  });

  it("collapses health when every row carries the same flags", () => {
    const result = uniformColumns([
      row({ health_flags: ["superseded"] }),
      row({ health_flags: ["superseded"] }),
    ]);
    expect(result.health).toEqual(["superseded"]);
  });

  it("treats flag order as irrelevant", () => {
    const result = uniformColumns([
      row({ health_flags: ["superseded", "high-contamination"] }),
      row({ health_flags: ["high-contamination", "superseded"] }),
    ]);
    expect(result.health).not.toBeNull();
  });

  it("keeps the health column when one row carries an extra flag", () => {
    const result = uniformColumns([
      row({ health_flags: ["superseded"] }),
      row({ health_flags: ["superseded", "high-contamination"] }),
    ]);
    expect(result.health).toBeNull();
  });

  it("collapses an all-clear health column, which is itself worth saying once", () => {
    expect(uniformColumns([row(), row()]).health).toEqual([]);
  });

  it("collapses nothing for an empty table", () => {
    expect(uniformColumns([])).toEqual({ provenance: null, health: null });
  });
});
