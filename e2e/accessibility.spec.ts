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
    () =>
      document.getAnimations().every((animation) => animation.playState === "finished"),
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

/**
 * Both schemes are audited. Dark is the default and light is one click away, and a contrast
 * failure in the scheme nobody happened to test is exactly how the tinted pills broke once.
 */
const CASES = (["dark", "light"] as const).flatMap((scheme) =>
  ROUTES.map((route) => ({ scheme, route })),
);

for (const { scheme, route } of CASES) {
  test(`${route} has no detectable accessibility violations in the ${scheme} scheme`, async ({
    page,
  }) => {
    // Axe walks every cell of a table that now has several hundred rows, and the suite
    // runs each route twice. The audit is slow, not hung; the default 30s was a guess made
    // when the registry held thirty models.
    test.setTimeout(120_000);

    // The scheme comes from the operating system here, which is what a first visit gets.
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(route);
    expect(await page.locator("html").getAttribute("data-theme")).toBeNull();
    expect(
      await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme),
    ).toBe(scheme);
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

test("the scheme toggle switches to light, and the choice survives a reload", async ({
  page,
}) => {
  await page.goto("/");
  const paper = () =>
    page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const dark = await paper();

  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await paper()).not.toBe(dark);

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("button", { name: "Switch to dark theme" })).toBeVisible();
});

test("a first visit follows the operating system's scheme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Switch to dark theme" })).toBeVisible();
  expect(
    await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme),
  ).toBe("light");
});

test("a reader's choice beats the operating system's", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript(() => localStorage.setItem("llm-atlas-theme", "dark"));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(
    await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme),
  ).toBe("dark");
});

test("the toggle works before the page's JavaScript has loaded", async ({ page }) => {
  // No framework code at all: the inline script in the document is all there is, which is
  // the state a slow phone is in for its first second or two.
  await page.route("**/_next/static/chunks/**", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

for (const route of ["/", "/models"])
  test(`${route} is readable at 360px without horizontal scroll`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(route);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
