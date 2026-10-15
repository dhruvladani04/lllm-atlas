import { toTableData } from "@/lib/leaderboard/view";
import {
  rank,
  rankingInputs,
  type RankingTab,
  type RankingView,
} from "@/lib/leaderboard/ranking-inputs";

/**
 * specs/03-sections/leaderboard.md — the leaderboard ranked on a benchmark the reader chose.
 *
 * One static JSON file per tab, saturated-toggle state and alternative basis, written at
 * build time. The page ships only its default ranking; these are fetched when a reader asks
 * for another, so offering every basis costs the first load nothing. Nothing is computed
 * on a request: unknown parameters are a 404, not a render.
 */

export const dynamic = "force-static";
export const dynamicParams = false;

const TABS: RankingTab[] = ["text", "agentic"];
const VIEWS: RankingView[] = ["hidden", "shown"];
/** Not a benchmark slug: the view ranked by the coverage rule. */
const DEFAULT = "default";

export function generateStaticParams() {
  const inputs = rankingInputs();
  return TABS.flatMap((tab) =>
    VIEWS.flatMap((view) => {
      const result = rank(inputs, tab, view);
      // The default ranking of the default view is in the page. Every alternative needs a
      // file, and so does the saturated view's default, which the page no longer ships.
      return [
        ...(view === "shown" ? [{ tab, view, basis: DEFAULT }] : []),
        ...result.options
          .filter((option) => option.slug !== result.defaultReference?.slug)
          .map((option) => ({ tab, view, basis: option.slug })),
      ];
    }),
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tab: string; view: string; basis: string }> },
): Promise<Response> {
  const { tab, view, basis } = await params;
  const result = rank(
    rankingInputs(),
    tab as RankingTab,
    view as RankingView,
    basis === DEFAULT ? null : basis,
  );
  return Response.json(toTableData(result));
}
