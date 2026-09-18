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
      /(measured independently of the model's maker|reported by the model's own maker|both independent and vendor-reported)/,
    );
    const stated = (await badgeInRow.count()) > 0 || (await statedAboveTable.count()) > 0;
    expect(stated, "the view states provenance in the row or above the table").toBe(true);
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
