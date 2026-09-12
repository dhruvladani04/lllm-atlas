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
    // A percentage, a provenance label and a health verdict, on the same row.
    await expect(firstRow).toContainText("%");
    await expect(firstRow.getByText(/^(ind\.|vendor|mixed)$/)).toBeVisible();
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
