import { expect, test } from "@playwright/test";

/**
 * Smoke path 2: the other two sections, and the promises they make about their sources.
 */
test.describe("benchmarks and evals", () => {
  test("the matrix renders and attributes benchwiki above the fold", async ({ page }) => {
    await page.goto("/benchmarks");

    await expect(
      page.getByRole("heading", { name: "Benchmarks", level: 1 }),
    ).toBeVisible();
    await expect(page.getByText(/Benchmark metadata from/).first()).toBeVisible();

    // Rows are capabilities, columns are status — the grid is the information.
    await expect(page.getByRole("columnheader", { name: /Capability/ })).toBeVisible();
  });

  test("a mirrored benchmark page is canonical to benchwiki", async ({ page }) => {
    await page.goto("/benchmarks/gpqa");

    await expect(page.getByRole("heading", { name: "GPQA", level: 1 })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Models scored on this benchmark/ }),
    ).toBeVisible();

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute(
      "href",
      "https://benchwiki.vercel.app/benchmarks/gpqa",
    );
  });

  test("an evals guide states its unit of evaluation and when it was verified", async ({
    page,
  }) => {
    await page.goto("/evals/agentic-systems");

    await expect(
      page.getByRole("heading", { name: "Evaluating agentic systems", level: 1 }),
    ).toBeVisible();
    await expect(page.getByText(/Unit of evaluation:/).first()).toBeVisible();
    await expect(page.getByText(/Last verified \d{4}-\d{2}-\d{2}/).first()).toBeVisible();
  });

  test("the home page demonstrates the thesis with a real row", async ({ page }) => {
    await page.goto("/");

    // The caveat is revealed a beat after the score; both must end up present.
    await expect(page.getByText(/on ARC-AGI|on [A-Z]/).first()).toBeVisible();
    await expect(
      page.getByText(/saturated|contaminated|superseded/).first(),
    ).toBeVisible();
  });
});
