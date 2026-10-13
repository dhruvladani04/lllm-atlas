import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * specs/04-design/design-system.md — the quality floor at phone width, and the navigation.
 *
 * The leaderboard's stacked rows are one table restyled, not a second copy of the data, so
 * the claims worth testing are that it reads as cards to the eye and still as a table to a
 * screen reader. Both are checked here because either can break without the other noticing.
 */

const ROUTES = [
  "/",
  "/models",
  "/models?tab=agentic",
  "/models?tab=image",
  "/models/openai/gpt-6-astra",
  "/compare",
  "/benchmarks",
  "/benchmarks/gpqa",
  "/evals",
  "/evals/agentic-systems",
  "/methodology",
];

test.describe("at 390px", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const route of ROUTES) {
    test(`${route} does not scroll sideways`, async ({ page }) => {
      await page.goto(route);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test("a leaderboard row stacks, labels its values and fits the screen", async ({
    page,
  }) => {
    await page.goto("/models");

    const table = page.getByRole("table");
    await expect(table).toHaveCount(1);
    // The table itself must fit: a row that needs sideways scrolling inside its own
    // container is the failure this layout replaced.
    expect(
      await table.evaluate((el) => el.scrollWidth - el.clientWidth),
    ).toBeLessThanOrEqual(1);

    const first = page.locator("tbody tr").first();
    await expect(first).toContainText("%");

    // With the header row not drawn, each value has to say what it is.
    const labels = await first
      .locator("td[data-label]")
      .evaluateAll((cells) =>
        cells.map((cell) =>
          getComputedStyle(cell, "::before").content.replaceAll('"', ""),
        ),
      );
    expect(labels).toEqual(["Epoch index", "Context", "Price in / out", "Released"]);
  });

  test("the stacked leaderboard is still a table to assistive technology", async ({
    page,
  }) => {
    await page.goto("/models");

    // Header cells stay in the accessibility tree while not being drawn.
    for (const name of [
      "Model",
      "Epoch index",
      "Context",
      "Price in / out",
      "Released",
    ]) {
      await expect(page.getByRole("columnheader", { name })).toHaveCount(1);
    }
    await expect(page.locator("tbody").getByRole("row").first()).toBeVisible();
    await expect(
      page.locator("tbody").getByRole("row").first().getByRole("cell").first(),
    ).toHaveText("1");
    // No focusable control is hidden inside the undrawn header.
    await expect(page.getByRole("button", { name: /^Sort by/ })).toHaveCount(0);
  });

  test("the stacked leaderboard passes the accessibility audit", async ({ page }) => {
    // The desktop audit never sees this layout: the roles, the undrawn header and the
    // generated labels only exist below 768px.
    test.setTimeout(120_000);
    await page.goto("/models");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test("filters sit behind one button that counts what is switched on", async ({
    page,
  }) => {
    await page.goto("/models");

    const independent = page.getByLabel("Independent measurements only");
    await expect(independent).toBeHidden();
    await expect(page.getByPlaceholder("Search models")).toBeVisible();

    // "Hide saturated benchmarks" is on by default and does remove rows, so it counts.
    const button = page.getByRole("button", { name: /^Filters/ });
    await expect(button).toHaveText("Filters (1 on)");
    await expect(button).toHaveAttribute("aria-expanded", "false");

    await button.click();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await independent.check();
    await expect(button).toHaveText("Filters (2 on)");
    await expect(page.getByRole("combobox", { name: /Sort by/ })).toBeVisible();
  });

  test("the navigation opens from a menu button and closes on arrival", async ({
    page,
  }) => {
    await page.goto("/");

    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav).toBeHidden();

    await page.getByRole("button", { name: "Menu" }).click();
    await expect(nav).toBeVisible();

    await nav.getByRole("link", { name: "Benchmarks" }).click();
    await expect(page).toHaveURL(/\/benchmarks$/);
    await expect(nav).toBeHidden();
  });
});

test("the navigation marks the section, not only the exact page", async ({ page }) => {
  await page.goto("/models/openai/gpt-6-astra");
  const nav = page.getByRole("navigation", { name: "Main" });

  await expect(nav.getByRole("link", { name: "Leaderboard" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(nav.locator("[aria-current]")).toHaveCount(1);

  await page.goto("/");
  await expect(nav.locator("[aria-current]")).toHaveCount(0);
});

test("the leaderboard shows 25 rows first and says how many there are", async ({
  page,
}) => {
  await page.goto("/models");

  const rows = page.locator("tbody tr");
  await expect(rows).toHaveCount(25);
  await expect(page.getByText(/Showing 25 of \d+ ranked rows/)).toBeVisible();

  await page.getByRole("button", { name: /^Show all \d+$/ }).click();
  expect(await rows.count()).toBeGreaterThan(25);
  await expect(page.getByRole("button", { name: "Show the top 25" })).toBeVisible();
});

test("the ranking's caveats are visible without opening anything", async ({ page }) => {
  await page.goto("/models");

  // What a reader needs in order to judge the table stays on the page...
  await expect(page.getByText(/^Ranked on/)).toBeVisible();
  await expect(page.getByText(/\d+ of \d+ benchmarks have scores/)).toBeVisible();

  // ...and only the reasoning is behind the disclosure.
  const reasoning = page.getByText(/is the benchmark most models here are measured on/);
  await expect(reasoning).toBeHidden();
  await page.getByText("Why this ranking?").click();
  await expect(reasoning).toBeVisible();
});

test("the home page's worked example is in the HTML, not waiting on a script", async ({
  request,
}) => {
  const html = await (await request.get("/")).text();
  expect(html).toContain("Worked example");
  expect(html).not.toMatch(/opacity:\s*0[;"]/);
});
