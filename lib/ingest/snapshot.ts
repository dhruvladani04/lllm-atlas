import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

/**
 * specs/01-architecture/data-pipeline.md — dated snapshots.
 *
 * Keep every snapshot. They are small JSON files and they are the only score history the
 * site has. Nothing here prunes.
 */

export const SNAPSHOT_ROOT = join("data", "snapshots");

export const SnapshotStatus = z.enum(["ok", "unreachable", "schema-error", "truncated"]);
export type SnapshotStatus = z.infer<typeof SnapshotStatus>;

export const SnapshotMeta = z.object({
  source_id: z.string().min(1),
  source_url: z.url(),
  fetched_at: z.iso.datetime(),
  record_count: z.number().int().nonnegative(),
  status: SnapshotStatus,
});
export type SnapshotMeta = z.infer<typeof SnapshotMeta>;

export const Snapshot = z.object({
  _meta: SnapshotMeta,
  records: z.array(z.unknown()),
});
export type Snapshot = z.infer<typeof Snapshot>;

export function snapshotDir(date: string, root: string = SNAPSHOT_ROOT): string {
  return join(root, date);
}

export function snapshotPath(
  date: string,
  sourceId: string,
  root: string = SNAPSHOT_ROOT,
): string {
  return join(snapshotDir(date, root), `${sourceId}.json`);
}

export function writeSnapshot(
  date: string,
  meta: SnapshotMeta,
  records: readonly unknown[],
  root: string = SNAPSHOT_ROOT,
): string {
  const dir = snapshotDir(date, root);
  mkdirSync(dir, { recursive: true });
  const path = snapshotPath(date, meta.source_id, root);
  const snapshot: Snapshot = { _meta: SnapshotMeta.parse(meta), records: [...records] };
  writeFileSync(path, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  return path;
}

export function readSnapshot(path: string): Snapshot {
  return Snapshot.parse(JSON.parse(readFileSync(path, "utf8")) as unknown);
}

/**
 * The most recent successful snapshot for a source, which is what the site keeps serving
 * when today's fetch fails. Directories are dated, so lexical order is chronological.
 */
export function findLatestSnapshot(
  sourceId: string,
  root: string = SNAPSHOT_ROOT,
  before?: string,
): { date: string; path: string; snapshot: Snapshot } | null {
  if (!existsSync(root)) return null;
  const dates = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((date) => (before === undefined ? true : date < before))
    .sort()
    .reverse();

  for (const date of dates) {
    const path = snapshotPath(date, sourceId, root);
    if (!existsSync(path)) continue;
    const snapshot = readSnapshot(path);
    if (snapshot._meta.status === "ok") return { date, path, snapshot };
  }
  return null;
}
