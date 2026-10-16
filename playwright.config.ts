import { defineConfig } from "@playwright/test";

/**
 * specs/05-delivery/milestones.md — two smoke paths.
 *
 * They run against a production build, because that is the only thing that proves the
 * prerendered pages carry what they claim to.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: process.env.CI ? "github" : "list",
  // A dark operating system by default, so the suite reads the site the way most of its
  // readers arrive; the light scheme is audited by emulating a light one.
  use: { baseURL: "http://localhost:3210", colorScheme: "dark" },
  webServer: {
    command: "pnpm build && pnpm start -p 3210",
    url: "http://localhost:3210",
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
