import { describe, expect, it } from "vitest";
import {
  ARENA_CATEGORY,
  arenaRowsUrl,
  fetchArenaLeaderboard,
  halfWidth,
  toArenaRow,
} from "@/lib/ingest/arena";
import type { ArenaDatasetRow } from "@/lib/schemas/arena";

const NOW = "2026-10-13T06:00:00.000Z";

function row(over: Partial<ArenaDatasetRow> = {}): ArenaDatasetRow {
  return {
    model_name: "gpt-image-2.5-sunburst",
    organization: "openai",
    license: "Proprietary",
    rating: 1424.55,
    rating_lower: 1417.73,
    rating_upper: 1431.38,
    variance: 12.13,
    vote_count: 17752,
    rank: 1,
    category: ARENA_CATEGORY,
    leaderboard_publish_date: "2026-10-07",
    ...over,
  };
}

function page(rows: ArenaDatasetRow[], total = rows.length) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve({ num_rows_total: total, rows: rows.map((r) => ({ row: r })) }),
  } as unknown as Response;
}

describe("halfWidth", () => {
  it("converts published bounds into the half-width the site renders", () => {
    expect(halfWidth(row({ rating: 100, rating_lower: 95, rating_upper: 105 }))).toBe(5);
  });

  it("reports the wider side of an asymmetric interval rather than averaging it", () => {
    // Averaging would produce a number neither bound supports; the wider side keeps the
    // stated uncertainty instead of understating it.
    expect(halfWidth(row({ rating: 100, rating_lower: 90, rating_upper: 103 }))).toBe(10);
  });

  it("is null when no interval was published", () => {
    expect(halfWidth(row({ rating_lower: null, rating_upper: null }))).toBeNull();
  });
});

describe("toArenaRow", () => {
  it("keeps the vote count and the model's own licence", () => {
    expect(toArenaRow(row())).toMatchObject({
      rank: 1,
      model: "gpt-image-2.5-sunburst",
      vendor: "openai",
      license: "Proprietary",
      votes: 17752,
    });
  });
});

describe("fetchArenaLeaderboard", () => {
  it("keeps the board and drops the sub-boards", async () => {
    // `latest` carries every category; only `overall` is the text-to-image ranking.
    const { payload } = await fetchArenaLeaderboard(NOW, () =>
      Promise.resolve(
        page([
          row({ rank: 1 }),
          row({ rank: 2, model_name: "flare" }),
          row({ rank: 1, model_name: "something-3d", category: "3d_modeling" }),
        ]),
      ),
    );

    expect(payload.models).toHaveLength(2);
    expect(payload.meta.model_count).toBe(2);
  });

  it("records the board's publish date, not the fetch date", async () => {
    const { payload } = await fetchArenaLeaderboard(NOW, () =>
      Promise.resolve(page([row()])),
    );
    expect(payload.meta.last_updated).toBe("2026-10-07");
    expect(payload.meta.fetched_at).toBe(NOW);
  });

  it("orders by rank", async () => {
    const { payload } = await fetchArenaLeaderboard(NOW, () =>
      Promise.resolve(page([row({ rank: 3, model_name: "c" }), row({ rank: 1, model_name: "a" })])),
    );
    expect(payload.models.map((m) => m.model)).toEqual(["a", "c"]);
  });

  it("pages until the rows run out", async () => {
    const seen: string[] = [];
    const fetcher = (url: string) => {
      seen.push(url);
      const offset = Number(new URL(url).searchParams.get("offset"));
      const rows = offset === 0 ? Array.from({ length: 100 }, (_, i) => row({ rank: i + 1 })) : [row({ rank: 101 })];
      return Promise.resolve(page(rows, 101));
    };

    const { payload } = await fetchArenaLeaderboard(NOW, fetcher);
    expect(seen).toHaveLength(2);
    expect(payload.models).toHaveLength(101);
  });

  it("treats a board with no rows in the category as a failure", async () => {
    // Arena has never published an empty leaderboard, so an empty one means something
    // upstream changed — which must not be mistaken for "no models ranked".
    await expect(
      fetchArenaLeaderboard(NOW, () =>
        Promise.resolve(page([row({ category: "3d_modeling" })])),
      ),
    ).rejects.toThrow(/none in the "overall" category/);
  });

  it("throws on a transport failure rather than returning a partial board", async () => {
    await expect(
      fetchArenaLeaderboard(NOW, () =>
        Promise.resolve({ ok: false, status: 503 } as unknown as Response),
      ),
    ).rejects.toThrow(/503/);
  });

  it("requests the text-to-image latest split", () => {
    const url = new URL(arenaRowsUrl());
    expect(url.searchParams.get("config")).toBe("text_to_image");
    expect(url.searchParams.get("split")).toBe("latest");
  });
});
