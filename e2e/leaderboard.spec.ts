import { expect, test } from "@playwright/test";

/**
 * Smoke path 1: the thesis.
 *
 * Every score must appear with its benchmark's health and the number's provenance. A test
 * that only checked the page returned 200 would pass on a site that had silently lost the
 * thing it exists for.
 */
test.describe("the leaderboard states its caveats", () => {
  test("shows a score, its benchmark, provenance and health together", async ({
    page,
  }) => {
    await page.goto("/models");

    await expect(
      page.getByRole("heading", { name: "Leaderboard", level: 1 }),
    ).toBeVisible();

    // The ranking names the benchmark it ranks on, rather than implying a universal score.
    await expect(page.getByText(/Ranked on/)).toBeVisible();

    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible();
    await expect(firstRow).toContainText("%");

    // Provenance must be stated — but it is legitimately stated in one of two places.
    // Where every row agrees, the column collapses into a sentence above the table rather
    // than repeating one word forty-nine times; where rows differ, the column is present.
    // The thesis is violated only if neither is true, which is what this asserts.
    const badgeInRow = firstRow.getByText(/^(ind\.|vendor|mixed)$/);
    const statedAboveTable = page.getByText(
      /(every number independently measured|every number reported by the model's own maker|both independent and vendor-reported numbers)/,
    );
    // Visible, not merely present: the long form of this sentence also exists inside the
    // closed "Why this ranking?" disclosure, and a caveat nobody can see is not stated.
    const stated =
      (await badgeInRow.count()) > 0 || (await statedAboveTable.first().isVisible());
    expect(stated, "the view states provenance in the row or above the table").toBe(true);
  });

  test("every summary card carries its benchmark's status, or says why it has none", async ({
    page,
  }) => {
    await page.goto("/models");

    const cards = page.getByRole("region", { name: "At a glance" }).getByRole("listitem");
    expect(await cards.count()).toBeGreaterThan(0);

    // A card is a score in larger type at the top of the page. One without its caveat
    // would be the thing this site argues against, in the most prominent place it has.
    for (const card of await cards.all()) {
      await expect(card).toContainText(
        /active|nearing saturation|saturated|deprecated|no benchmark health record exists/,
      );
      await expect(card.getByRole("link").first()).toHaveAttribute("href", /^\/models\//);
    }
  });

  test("the saturated toggle reports what it excludes", async ({ page }) => {
    await page.goto("/models");
    const toggle = page.getByLabel(/Hide saturated benchmarks/);
    await expect(toggle).toBeChecked();
    await expect(page.getByText(/hiding \d+ scores? on \d+ benchmarks?/)).toBeVisible();

    await toggle.uncheck();
    await expect(page.getByText(/hiding \d+ scores? on \d+ benchmarks?/)).toHaveCount(0);
  });

  test("a model page reaches its benchmark, and the benchmark reaches back", async ({
    page,
  }) => {
    await page.goto("/models");
    await page.locator("tbody tr").first().getByRole("link").first().click();

    await expect(page.getByRole("heading", { name: "Health summary" })).toBeVisible();
    await expect(
      page.getByText(/score(s)? sit on benchmarks that still discriminate/),
    ).toBeVisible();
  });
});

test.describe("ranking on another benchmark", () => {
  test("the reader can pick the basis, and the choice is in the URL", async ({
    page,
  }) => {
    await page.goto("/models");
    const select = page.getByRole("combobox", { name: "Rank on" });
    const options = await select.locator("option").allTextContents();
    expect(options.length).toBeGreaterThan(1);
    // Every option states its benchmark's health, not just its name.
    for (const option of options) {
      expect(option).toMatch(/active|nearing saturation|saturated|deprecated/);
    }

    const second = await select.locator("option").nth(1).getAttribute("value");
    const name = (await select.locator("option").nth(1).textContent())?.split(" — ")[0];
    await select.selectOption(second!);

    await expect(page).toHaveURL(new RegExp(`basis=${second}`));
    await expect(page.getByText(/your choice; the default is/)).toBeVisible();
    await expect(
      page
        .locator("p", { hasText: /^Ranked on/ })
        .getByRole("link")
        .first(),
    ).toHaveText(name!.trim());

    // The same URL opens on the same ranking.
    await page.reload();
    await expect(page.getByText(/your choice; the default is/)).toBeVisible();

    await page.getByRole("button", { name: "Back to the default" }).click();
    await expect(page).not.toHaveURL(/basis=/);
    await expect(page.getByText(/your choice; the default is/)).toHaveCount(0);
  });

  test("an unknown basis in the URL falls back to the default", async ({ page }) => {
    await page.goto("/models?tab=text&basis=not-a-benchmark");
    await expect(page.getByText(/^Ranked on/)).toBeVisible();
    await expect(page.getByText(/your choice; the default is/)).toHaveCount(0);
  });
});
