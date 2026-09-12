import { expect, test } from "@playwright/test";

/**
 * specs/05-delivery/definition-of-done.md — "No console errors or hydration warnings".
 *
 * Asserted rather than assumed. A hydration mismatch is invisible until it corrupts what a
 * reader sees, and this site's whole claim is that what you see is what the data says.
 */
const ROUTES = [
  "/",
  "/models",
  "/models?tab=agentic",
  "/models?tab=image",
  "/benchmarks",
  "/benchmarks/gpqa",
  "/evals",
  "/evals/agentic-systems",
];

for (const route of ROUTES) {
  test(`${route} logs no console errors or hydration warnings`, async ({ page }) => {
    const problems: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error" || message.type() === "warning") {
        const text = message.text();
        // Ignore network noise from third-party embeds; the site's own output is what matters.
        if (/youtube|favicon|ERR_BLOCKED|net::/i.test(text)) return;
        problems.push(`${message.type()}: ${text}`);
      }
    });
    page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));

    await page.goto(route, { waitUntil: "networkidle" });
    expect(problems).toEqual([]);
  });
}
