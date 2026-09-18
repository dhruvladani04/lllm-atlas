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

test.describe("methodology, compare and export", () => {
  test("the methodology page states the rules and counts them from real data", async ({
    page,
  }) => {
    await page.goto("/methodology");
    await expect(
      page.getByRole("heading", { name: "Methodology", level: 1 }),
    ).toBeVisible();
    // The claim that makes the ranking readable at all.
    await expect(page.getByText(/best on this benchmark/)).toBeVisible();
    await expect(page.getByText(/never averages them/)).toBeVisible();
  });

  test("compare separates comparable benchmarks from partially-measured ones", async ({
    page,
  }) => {
    await page.goto("/compare");
    const selects = page.locator("select");
    await selects.nth(0).selectOption({ index: 1 });
    await selects.nth(1).selectOption({ index: 2 });

    await expect(
      page.getByRole("heading", { name: /Measured on the same benchmark/ }),
    ).toBeVisible();
    // A blank must never be presentable as a low score.
    await expect(
      page.getByText(/only the first group can be\s+read as a comparison/),
    ).toBeVisible();
  });

  test("the export carries its own licensing, so the file stays self-describing", async ({
    request,
  }) => {
    const json = await request.get("/api/scores");
    expect(json.ok()).toBe(true);
    const body = (await json.json()) as {
      _meta: { sources: { source_id: string; redistribution: string }[] };
      scores: unknown[];
    };
    expect(body.scores.length).toBeGreaterThan(0);

    const benchwiki = body._meta.sources.find((s) => s.source_id === "benchwiki");
    expect(benchwiki?.redistribution).toMatch(/No licence is published/);

    const csv = await request.get("/api/scores.csv");
    expect(csv.headers()["content-type"]).toContain("text/csv");
    expect(await csv.text()).toMatch(/^# LLM Atlas/);
  });
});
