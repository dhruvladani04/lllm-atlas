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
    // A suggested pair is chosen from the rankings, so it always shares a benchmark.
    await page
      .getByRole("button", { name: /^The top two on/ })
      .first()
      .click();

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

test.describe("compare", () => {
  test("a model can be found by typing, and the choice is in the URL", async ({
    page,
  }) => {
    await page.goto("/compare");
    const first = page.getByRole("combobox", { name: "Model 1" });
    await first.fill("claude");
    const option = page.getByRole("option").first();
    await expect(option).toBeVisible();
    const name = (await option.textContent()) ?? "";
    await first.press("Enter");

    await expect(first).toHaveValue(name);
    await expect(page).toHaveURL(/\/compare\?models=[^,]+$/);

    // Keyboard only for the second.
    const second = page.getByRole("combobox", { name: "Model 2" });
    await second.focus();
    await second.press("ArrowDown");
    await second.press("Enter");
    await expect(page).toHaveURL(/\/compare\?models=[^,]+,[^,]+$/);
  });

  test("a shared URL opens on the same comparison", async ({ page }) => {
    await page.goto("/compare");
    await page
      .getByRole("button", { name: /^The top two on/ })
      .first()
      .click();
    const url = page.url();

    await page.goto(url);
    await expect(
      page.getByRole("heading", { name: /Measured on the same benchmark/ }),
    ).toBeVisible();
  });

  test("a model page's Compare action opens compare with that model chosen", async ({
    page,
  }) => {
    await page.goto("/models/openai/gpt-6-astra");
    await page.getByRole("link", { name: "Compare with…" }).click();
    await expect(page).toHaveURL(/\/compare\?models=openai\/gpt-6-astra$/);
    await expect(page.getByRole("combobox", { name: "Model 1" })).toHaveValue(
      "GPT-6 Astra",
    );
  });
});

test("a model page lists a benchmark's configurations under its best one", async ({
  page,
}) => {
  await page.goto("/models/openai/gpt-6-astra");
  const toggle = page
    .getByRole("button", { name: /^best of \d+ — show \d+ more$/ })
    .first();
  if ((await toggle.count()) === 0) return; // this model has one configuration per benchmark

  const rows = page.locator("tbody tr");
  const before = await rows.count();
  await toggle.click();
  // The label changes once open, so find it by its new name.
  await expect(
    page.getByRole("button", { name: "hide the others" }).first(),
  ).toHaveAttribute("aria-expanded", "true");
  expect(await rows.count()).toBeGreaterThan(before);
});

test("a guide's contents list points at headings that exist", async ({ page }) => {
  await page.goto("/evals/agentic-systems");
  await expect(page.getByText(/\d+ min read/)).toBeVisible();
  const links = page.getByRole("navigation", { name: "Contents" }).getByRole("link");
  expect(await links.count()).toBeGreaterThan(1);
  for (const link of await links.all()) {
    const id = ((await link.getAttribute("href")) ?? "").slice(1);
    await expect(page.locator(`h2[id="${id}"]`)).toHaveCount(1);
  }
});

test("the leaderboard and a benchmark page each carry their chart", async ({ page }) => {
  await page.goto("/models");
  // Drawn only once the reader nears it, so scroll there first.
  await expect(page.getByRole("img", { name: /^Price against score on/ })).toHaveCount(0);
  await page.mouse.wheel(0, 20000);
  await expect(page.getByRole("img", { name: /^Price against score on/ })).toBeVisible();

  await page.goto("/benchmarks/gpqa");
  await expect(page.getByRole("img", { name: /measured on this site/ })).toBeVisible();
});
