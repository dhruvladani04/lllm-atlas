import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ModelRegistry, UnresolvedNames } from "@/lib/schemas/model";
import { buildRegistryIndex, type RegistryIndex } from "@/lib/registry/resolve";

/**
 * Registry files are parsed, never cast — specs/05-delivery/definition-of-done.md.
 * A malformed registry stops the run; it never degrades into a partial one.
 */

export const REGISTRY_PATH = join("data", "registry", "models.json");
export const UNRESOLVED_PATH = join("data", "registry", "unresolved.json");

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

export function loadRegistry(path: string = REGISTRY_PATH): ModelRegistry {
  return ModelRegistry.parse(readJson(path));
}

export function loadRegistryIndex(path: string = REGISTRY_PATH): RegistryIndex {
  return buildRegistryIndex(loadRegistry(path));
}

export function loadUnresolved(path: string = UNRESOLVED_PATH): UnresolvedNames {
  return UnresolvedNames.parse(readJson(path));
}
