import { existsSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { benchwikiRecord, jsonResponse } from "@/lib/ingest/fixtures";
import { runSource } from "@/lib/ingest/run";
import { benchwikiSource } from "@/lib/ingest/sources";
import { snapshotPath } from "@/lib/ingest/snapshot";

/**
 * specs/05-delivery/milestones.md, Milestone 2: "a simulated upstream failure leaves the
 * previous snapshot intact with a logged error". The runner is shared by all four sources,
 * so proving it once proves it for every source.
 */

const MONDAY = "2026-09-10";
const TUESDAY = "2026-09-11";
const NOW = "2026-09-11T06:00:00.000Z";

let root: string;

const healthy = (count: number) =>
  Array.from({ length: count }, (_, i) =>
    benchwikiRecord({ slug: `examplebench-${i}`, name: `ExampleBench ${i}` }),
  );

async function seedGoodDay(records = healthy(72)) {
  return runSource(benchwikiSource, {
    date: MONDAY,
    now: "2026-09-10T06:00:00.000Z",
    snapshotRoot: root,
    fetcher: async () => jsonResponse(records),
  });
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "llm-atlas-snapshots-"));
});

describe("a healthy run", () => {
  it("writes a dated snapshot with its _meta block", async () => {
    const run = await seedGoodDay();
    expect(run.result.status).toBe("ok");

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
    expect(run.served_from).toBe("2026-09-10T06:00:00.000Z");
  });
});

describe("an unreachable source", () => {
  it("keeps the previous snapshot, logs the error, and writes no snapshot for today", async () => {
    await seedGoodDay();

    const run = await runSource(benchwikiSource, {
      date: TUESDAY,
      now: NOW,
      snapshotRoot: root,
      fetcher: async () => {
        throw new Error("getaddrinfo ENOTFOUND benchwiki.vercel.app");
      },
    });

    expect(run.result.status).toBe("unreachable");
    expect(run.result.message).toContain("ENOTFOUND");
    expect(existsSync(snapshotPath(TUESDAY, "benchwiki", root))).toBe(false);
    expect(readdirSync(root)).toEqual([MONDAY]);
  });

  it("keeps serving the last good data, stamped with when it was actually fetched", async () => {
    await seedGoodDay();

    const run = await runSource(benchwikiSource, {
      date: TUESDAY,
      now: NOW,
      snapshotRoot: root,
      fetcher: async () => {
        throw new Error("connection reset");
      },
    });

    expect(run.records).toHaveLength(72);
    // Not today's timestamp: the freshness stamp must go stale rather than lie, and the
    // source meta handed downstream carries the older date too.
    expect(run.served_from).toBe("2026-09-10T06:00:00.000Z");
    expect(run.source.fetched_at).toBe("2026-09-10T06:00:00.000Z");
  });

  it("serves nothing rather than something invented when there is no previous snapshot", async () => {
    const run = await runSource(benchwikiSource, {
      date: TUESDAY,
      now: NOW,
      snapshotRoot: root,
      fetcher: async () => {
        throw new Error("connection reset");
      },
    });

    expect(run.records).toEqual([]);
    expect(run.served_from).toBeNull();
    expect(run.result.record_count).toBe(0);
  });

  it("treats a non-200 response as unreachable", async () => {
    const run = await runSource(benchwikiSource, {
      date: TUESDAY,
      now: NOW,
      snapshotRoot: root,
      fetcher: async () => new Response("gateway timeout", { status: 504 }),
    });

    expect(run.result.status).toBe("unreachable");
    expect(run.result.message).toContain("504");
  });
});

describe("a schema mismatch", () => {
  it("does not partially ingest, and says which field moved", async () => {
    await seedGoodDay();

    const run = await runSource(benchwikiSource, {
      date: TUESDAY,
      now: NOW,
      snapshotRoot: root,
      // Upstream renames `status` and the run must stop, not guess.
      fetcher: async () =>
        jsonResponse([{ ...benchwikiRecord(), status: undefined, state: "active" }]),
    });

    expect(run.result.status).toBe("schema-error");
    expect(run.result.message).toContain("status");
    expect(existsSync(snapshotPath(TUESDAY, "benchwiki", root))).toBe(false);
    expect(run.records).toHaveLength(72);
  });
});

describe("upstream truncation", () => {
  it("refuses a response below half the previous record count", async () => {
    await seedGoodDay();

    const run = await runSource(benchwikiSource, {
      date: TUESDAY,
      now: NOW,
      snapshotRoot: root,
      fetcher: async () => jsonResponse(healthy(35)),
    });

    expect(run.result.status).toBe("truncated");
    expect(run.result.message).toContain("35 records");
    expect(existsSync(snapshotPath(TUESDAY, "benchwiki", root))).toBe(false);
    expect(run.records).toHaveLength(72);
  });

  it("accepts a shrinking but plausible response", async () => {
    await seedGoodDay();

    const run = await runSource(benchwikiSource, {
      date: TUESDAY,
      now: NOW,
      snapshotRoot: root,
      fetcher: async () => jsonResponse(healthy(60)),
    });

    expect(run.result.status).toBe("ok");
    expect(existsSync(snapshotPath(TUESDAY, "benchwiki", root))).toBe(true);
  });

  it("compares against the last good snapshot, not the last attempt", async () => {
    await seedGoodDay();
    // A failed Tuesday leaves no snapshot, so Wednesday still measures against Monday.
    await runSource(benchwikiSource, {
      date: TUESDAY,
      now: NOW,
      snapshotRoot: root,
      fetcher: async () => {
        throw new Error("down");
      },
    });

    const run = await runSource(benchwikiSource, {
      date: "2026-09-12",
      now: "2026-09-12T06:00:00.000Z",
      snapshotRoot: root,
      fetcher: async () => jsonResponse(healthy(30)),
    });

    expect(run.result.previous_record_count).toBe(72);
    expect(run.result.status).toBe("truncated");
  });
});
