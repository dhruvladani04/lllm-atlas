import { mkdtempSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { benchwikiRecord, jsonResponse, timelinePoint } from "@/lib/ingest/fixtures";
import { ingestBenchwiki } from "@/lib/ingest/run";
import { snapshotPath } from "@/lib/ingest/snapshot";
import { buildRegistryIndex } from "@/lib/registry/resolve";
import { loadRegistry } from "@/lib/registry/load";

/**
 * specs/05-delivery/milestones.md, Milestone 2: "a simulated upstream failure leaves the
 * previous snapshot intact with a logged error". That is what most of this file asserts.
 */

const registry = buildRegistryIndex(loadRegistry());
const MONDAY = "2026-09-10";
const TUESDAY = "2026-09-11";
const NOW = "2026-09-11T06:00:00.000Z";

let root: string;

const healthy = (count: number) =>
  Array.from({ length: count }, (_, i) =>
    benchwikiRecord({ slug: `examplebench-${i}`, name: `ExampleBench ${i}` }),
  );

async function seedGoodDay(records = healthy(72)) {
  return ingestBenchwiki({
    date: MONDAY,
    now: "2026-09-10T06:00:00.000Z",
    registry,
    snapshotRoot: root,
    fetcher: async () => jsonResponse(records),
  });
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "llm-atlas-snapshots-"));
});

describe("a healthy run", () => {
  it("writes a dated snapshot with its _meta block", async () => {
    const outcome = await seedGoodDay();
    expect(outcome.result.status).toBe("ok");

    const snapshot = JSON.parse(
      readFileSync(snapshotPath(MONDAY, "benchwiki", root), "utf8"),
    ) as { _meta: Record<string, unknown>; records: unknown[] };

    expect(snapshot._meta).toMatchObject({
      source_id: "benchwiki",
      source_url: "https://benchwiki.vercel.app/api/benchmarks.json",
      record_count: 72,
      status: "ok",
    });
    expect(snapshot.records).toHaveLength(72);
  });

  it("reports unresolved model names without dropping the record", async () => {
    const outcome = await ingestBenchwiki({
      date: MONDAY,
      now: NOW,
      registry,
      snapshotRoot: root,
      fetcher: async () =>
        jsonResponse([
          benchwikiRecord({
            performance_timeline: [
              timelinePoint({ model: "Claude Opus 5" }),
              timelinePoint({ model: "Some Unreleased Model 9" }),
            ],
          }),
        ]),
    });

    expect(outcome.result.unresolved_models).toEqual(["Some Unreleased Model 9"]);
    expect(outcome.benchmarks[0]?.performance_timeline).toHaveLength(2);
  });
});

describe("an unreachable source", () => {
  it("keeps the previous snapshot, logs the error, and writes no snapshot for today", async () => {
    await seedGoodDay();

    const outcome = await ingestBenchwiki({
      date: TUESDAY,
      now: NOW,
      registry,
      snapshotRoot: root,
      fetcher: async () => {
        throw new Error("getaddrinfo ENOTFOUND benchwiki.vercel.app");
      },
    });

    expect(outcome.result.status).toBe("unreachable");
    expect(outcome.result.message).toContain("ENOTFOUND");
    expect(existsSync(snapshotPath(TUESDAY, "benchwiki", root))).toBe(false);
    expect(readdirSync(root)).toEqual([MONDAY]);
  });

  it("keeps serving the last good data, stamped with when it was actually fetched", async () => {
    await seedGoodDay();

    const outcome = await ingestBenchwiki({
      date: TUESDAY,
      now: NOW,
      registry,
      snapshotRoot: root,
      fetcher: async () => {
        throw new Error("connection reset");
      },
    });

    expect(outcome.benchmarks).toHaveLength(72);
    // Not today's timestamp: the freshness stamp must go stale rather than lie.
    expect(outcome.served_from).toBe("2026-09-10T06:00:00.000Z");
  });

  it("serves nothing rather than something invented when there is no previous snapshot", async () => {
    const outcome = await ingestBenchwiki({
      date: TUESDAY,
      now: NOW,
      registry,
      snapshotRoot: root,
      fetcher: async () => {
        throw new Error("connection reset");
      },
    });

    expect(outcome.benchmarks).toEqual([]);
    expect(outcome.served_from).toBeNull();
    expect(outcome.result.record_count).toBe(0);
  });

  it("treats a non-200 response as unreachable", async () => {
    const outcome = await ingestBenchwiki({
      date: TUESDAY,
      now: NOW,
      registry,
      snapshotRoot: root,
      fetcher: async () => new Response("gateway timeout", { status: 504 }),
    });

    expect(outcome.result.status).toBe("unreachable");
    expect(outcome.result.message).toContain("504");
  });
});

describe("a schema mismatch", () => {
  it("does not partially ingest, and says which field moved", async () => {
    await seedGoodDay();

    const outcome = await ingestBenchwiki({
      date: TUESDAY,
      now: NOW,
      registry,
      snapshotRoot: root,
      // Upstream renames `status` and the run must stop, not guess.
      fetcher: async () =>
        jsonResponse([{ ...benchwikiRecord(), status: undefined, state: "active" }]),
    });

    expect(outcome.result.status).toBe("schema-error");
    expect(outcome.result.message).toContain("status");
    expect(existsSync(snapshotPath(TUESDAY, "benchwiki", root))).toBe(false);
    expect(outcome.benchmarks).toHaveLength(72);
  });
});

describe("upstream truncation", () => {
  it("refuses a response below half the previous record count", async () => {
    await seedGoodDay();

    const outcome = await ingestBenchwiki({
      date: TUESDAY,
      now: NOW,
      registry,
      snapshotRoot: root,
      fetcher: async () => jsonResponse(healthy(35)),
    });

    expect(outcome.result.status).toBe("truncated");
    expect(outcome.result.message).toContain("35 records");
    expect(existsSync(snapshotPath(TUESDAY, "benchwiki", root))).toBe(false);
    expect(outcome.benchmarks).toHaveLength(72);
  });

  it("accepts a shrinking but plausible response", async () => {
    await seedGoodDay();

    const outcome = await ingestBenchwiki({
      date: TUESDAY,
      now: NOW,
      registry,
      snapshotRoot: root,
      fetcher: async () => jsonResponse(healthy(60)),
    });

    expect(outcome.result.status).toBe("ok");
    expect(existsSync(snapshotPath(TUESDAY, "benchwiki", root))).toBe(true);
  });

  it("compares against the last good snapshot, not the last attempt", async () => {
    await seedGoodDay();
    // A failed Tuesday leaves no snapshot, so Wednesday still measures against Monday.
    await ingestBenchwiki({
      date: TUESDAY,
      now: NOW,
      registry,
      snapshotRoot: root,
      fetcher: async () => {
        throw new Error("down");
      },
    });

    const outcome = await ingestBenchwiki({
      date: "2026-09-12",
      now: "2026-09-12T06:00:00.000Z",
      registry,
      snapshotRoot: root,
      fetcher: async () => jsonResponse(healthy(30)),
    });

    expect(outcome.result.previous_record_count).toBe(72);
    expect(outcome.result.status).toBe("truncated");
  });
});
