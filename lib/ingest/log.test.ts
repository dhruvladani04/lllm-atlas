import { describe, expect, it } from "vitest";
import type { IngestionLog, IngestionResult } from "@/lib/schemas/ingestion";
import {
  CONSECUTIVE_FAILURE_LIMIT,
  consecutiveFailures,
  sourcesNeedingAlarm,
} from "@/lib/ingest/log";

function result(
  status: IngestionResult["status"],
  source_id = "benchwiki",
): IngestionResult {
  return {
    source_id,
    status,
    record_count: status === "ok" ? 72 : 0,
    previous_record_count: 72,
    unresolved_models: [],
    message: null,
  };
}

function log(...runs: IngestionResult[][]): IngestionLog {
  // Newest run first, matching the file on disk.
  return runs.map((results, i) => ({
    run_at: `2026-09-${String(12 - i).padStart(2, "0")}T06:00:00.000Z`,
    results,
  }));
}

describe("consecutiveFailures", () => {
  it("counts nothing for a healthy source", () => {
    expect(consecutiveFailures(log([result("ok")], [result("ok")]), "benchwiki")).toBe(0);
  });

  it("counts a run of failures from the newest run backwards", () => {
    const history = log(
      [result("unreachable")],
      [result("schema-error")],
      [result("ok")],
    );
    expect(consecutiveFailures(history, "benchwiki")).toBe(2);
  });

  it("resets once the source succeeds again", () => {
    const history = log([result("ok")], [result("unreachable")], [result("unreachable")]);
    expect(consecutiveFailures(history, "benchwiki")).toBe(0);
  });

  it("treats truncation as a failure, because it keeps the previous snapshot", () => {
    expect(consecutiveFailures(log([result("truncated")]), "benchwiki")).toBe(1);
  });

  it("ignores runs where the source was not attempted at all", () => {
    const history = log(
      [result("unreachable")],
      [result("ok", "epoch")],
      [result("unreachable")],
    );
    expect(consecutiveFailures(history, "benchwiki")).toBe(2);
  });
});

describe("sourcesNeedingAlarm", () => {
  it("stays quiet below the limit", () => {
    expect(
      sourcesNeedingAlarm(log([result("unreachable")], [result("unreachable")])),
    ).toEqual([]);
  });

  it("raises at three runs in a row, which is what fails the job", () => {
    const history = log(
      [result("unreachable")],
      [result("unreachable")],
      [result("schema-error")],
    );
    expect(sourcesNeedingAlarm(history)).toEqual([
      { source_id: "benchwiki", consecutive_failures: CONSECUTIVE_FAILURE_LIMIT },
    ]);
  });

  it("reports each failing source separately", () => {
    const history = log(
      [result("unreachable"), result("unreachable", "epoch")],
      [result("unreachable"), result("ok", "epoch")],
      [result("unreachable"), result("ok", "epoch")],
    );
    expect(sourcesNeedingAlarm(history).map((a) => a.source_id)).toEqual(["benchwiki"]);
  });
});
