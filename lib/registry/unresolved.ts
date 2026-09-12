import { writeFileSync } from "node:fs";
import type { UnresolvedName, UnresolvedNames } from "@/lib/schemas/model";

/**
 * specs/01-architecture/model-registry.md — unresolved names accumulate here for a human
 * to review. They are never dropped, never guessed at, and never fuzzy-matched into a
 * model they might be. The count is surfaced in the ingestion log so the list cannot grow
 * in silence.
 */

export interface UnresolvedSighting {
  name: string;
  source_id: string;
}

/**
 * Merges this run's sightings into the existing list. Pure, so the merge is testable
 * without touching the disk. `today` is an ISO date supplied by the caller rather than
 * read from the clock, so a run is reproducible.
 */
export function mergeUnresolved(
  existing: UnresolvedNames,
  sightings: readonly UnresolvedSighting[],
  today: string,
): UnresolvedNames {
  const key = (name: string, source_id: string) => `${source_id}\u0000${name}`;
  const merged = new Map<string, UnresolvedName>();

  for (const entry of existing) {
    merged.set(key(entry.name, entry.source_id), { ...entry });
  }

  for (const sighting of sightings) {
    const k = key(sighting.name, sighting.source_id);
    const found = merged.get(k);
    if (found) {
      merged.set(k, {
        ...found,
        last_seen_at: today,
        occurrences: found.occurrences + 1,
      });
    } else {
      merged.set(k, {
        name: sighting.name,
        source_id: sighting.source_id,
        first_seen_at: today,
        last_seen_at: today,
        occurrences: 1,
      });
    }
  }

  return [...merged.values()].sort(
    (a, b) => a.source_id.localeCompare(b.source_id) || a.name.localeCompare(b.name),
  );
}

export function writeUnresolved(path: string, entries: UnresolvedNames): void {
  writeFileSync(path, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
}
