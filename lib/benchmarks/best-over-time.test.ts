import { describe, expect, it } from "vitest";
import { bestOverTime } from "@/lib/benchmarks/best-over-time";

const at = (
  date: string,
  value: number,
  model_id = "m",
  harness: string | null = null,
) => ({
  model_id,
  value,
  measured_at: date,
  harness,
});

describe("bestOverTime", () => {
  it("keeps only the scores that beat everything measured before them", () => {
    const result = bestOverTime([
      at("2025-01-01", 40, "a"),
      at("2025-03-01", 35, "b"),
      at("2025-02-01", 55, "c"),
      at("2025-04-01", 55, "d"),
      at("2025-05-01", 70, "e"),
    ]);
    expect(result.records.map((record) => record.model_id)).toEqual(["a", "c", "e"]);
    expect(result.points).toHaveLength(5);
    expect(result.noLine).toBeNull();
  });

  it("draws no line across different harnesses, but keeps every point", () => {
    const result = bestOverTime([
      at("2025-01-01", 40, "a", "openhands"),
      at("2025-02-01", 60, "b", "terminus"),
    ]);
    expect(result.records).toEqual([]);
    expect(result.points).toHaveLength(2);
    expect(result.noLine).toBe("harnesses");
  });

  it("leaves out undated scores rather than guessing when they were measured", () => {
    const result = bestOverTime([
      at("2025-01-01", 40),
      { ...at("", 99), measured_at: null },
    ]);
    expect(result.points).toHaveLength(1);
    expect(result.noLine).toBe("too-few");
  });
});
