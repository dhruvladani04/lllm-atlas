import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The registry review UI writes to disk and has no authentication. It must not exist in a
 * production build.
 *
 * A runtime `notFound()` is not sufficient on its own and was not sufficient here: the
 * `app/(dev)/` route group does *not* exclude a route from the build — `/tokens` ships
 * today — so the first attempt at this shipped `/review` and a writable POST endpoint as
 * server functions, reachable-but-404ing. They are now excluded by file extension, and this
 * test is what stops someone reinstating them by renaming a file back.
 */

const DEV_ONLY = [
  join("app", "(dev)", "review", "page.dev.tsx"),
  join("app", "api", "registry-approve", "route.dev.ts"),
];

describe("dev-only routes", () => {
  it.each(DEV_ONLY)("%s uses a dev-only extension", (path) => {
    expect(existsSync(path)).toBe(true);
  });

  it("has no production-extension page or route beside them", () => {
    // A `page.tsx` next to `page.dev.tsx` would silently ship the route again.
    for (const path of DEV_ONLY) {
      const directory = join(path, "..");
      const shipped = readdirSync(directory).filter((name) =>
        /^(page|route)\.(tsx|ts|jsx|js|mdx)$/.test(name),
      );
      expect(shipped, `${directory} must contain no production route file`).toEqual([]);
    }
  });

  it("registers the dev-only extensions only outside production", () => {
    const config = readFileSync("next.config.ts", "utf8");
    expect(config).toContain("dev.tsx");
    expect(config).toContain('process.env.NODE_ENV === "production"');
  });

  it("guards at runtime as well, so the extension trick is not the only defence", () => {
    for (const path of DEV_ONLY) {
      expect(readFileSync(path, "utf8")).toContain(
        'process.env.NODE_ENV === "production"',
      );
    }
  });

  it("never writes the registry from a request handler", () => {
    // The endpoint records decisions; `scripts/registry-approve.ts` is the only writer of
    // models.json, so no request can change what the site claims. Comments are stripped
    // first: the file explains that rule in prose, and matching the prose is not a test.
    const code = readFileSync(
      join("app", "api", "registry-approve", "route.dev.ts"),
      "utf8",
    )
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(code).not.toContain("models.json");
    expect(code).toContain("approvals.json");
  });
});
