import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * specs/05-delivery/definition-of-done.md — the accessibility floor, measured rather than
 * eyeballed. Contrast is already unit-tested against the tokens; this checks the rendered
 * pages for the rest: heading order, table semantics, link names, landmarks.
 *
 * The audit waits for animations to finish first. The home page's worked example fades its
 * caveat in a beat after the score, and auditing mid-fade measures half-opacity ink against
 * white and reports a contrast failure for text that is on its way to passing. The settled
 * page is the one a reader actually reads — and readers who cannot tolerate the animation
 * get the settled page immediately, because `prefers-reduced-motion` renders it at once.
 */

/** Resolves once every running animation has finished, so nothing is audited mid-fade. */
async function settled(page: Page): Promise<void> {
  await page.waitForFunction(
    () => document.getAnimations().every((animation) => animation.playState === "finished"),
    undefined,
    { timeout: 5000 },
  );
}

const ROUTES = [
  "/",
  "/models",
  "/benchmarks",
  "/benchmarks/gpqa",
  "/evals",
  "/evals/agentic-systems",
];

for (const route of ROUTES) {
  test(`${route} has no detectable accessibility violations`, async ({ page }) => {
    await page.goto(route);
    await settled(page);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    if (results.violations.length > 0) {
      console.log(
        results.violations
          .map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s) — ${v.help}`)
          .join("\n"),
      );
    }
    expect(results.violations).toEqual([]);
  });
}

test("the site is keyboard navigable from the top", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
});

test("360px wide is readable without horizontal scroll", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/models");

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
