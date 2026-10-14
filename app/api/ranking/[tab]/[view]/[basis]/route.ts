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

export function generateStaticParams() {
  const inputs = rankingInputs();
  return TABS.flatMap((tab) =>
    VIEWS.flatMap((view) => {
      const result = rank(inputs, tab, view);
      // The default is already in the page; only the alternatives need a file.
      return result.options
        .filter((option) => option.slug !== result.defaultReference?.slug)
        .map((option) => ({ tab, view, basis: option.slug }));
    }),
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tab: string; view: string; basis: string }> },
): Promise<Response> {
  const { tab, view, basis } = await params;
  const result = rank(rankingInputs(), tab as RankingTab, view as RankingView, basis);
  return Response.json(toTableData(result));
}
