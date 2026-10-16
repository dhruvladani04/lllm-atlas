import type { Metadata } from "next";
import type { JoinedScore } from "@/lib/schemas/score";
import { isDiscriminating } from "@/lib/leaderboard/rows";
import { OG_SIZE } from "@/lib/og/card";

/**
 * Open Graph and Twitter metadata for a page that is likely to be shared.
 *
 * A page's `openGraph` replaces its parent's rather than merging with it, so a page that
 * sets its own title has to restate everything else — this keeps that in one place. The
 * image is one of the static routes under `app/og/`.
 */
export function shareMetadata({
  title,
  description,
  path,
  image,
  alt,
}: {
  title: string;
  description: string;
  path: string;
  image: string;
  alt: string;
}): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: {
      type: "website",
      siteName: "LLM Atlas",
      title,
      description,
      url: path,
      images: [{ url: image, ...OG_SIZE, alt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: image, alt }],
    },
  };
}

/**
 * A model's quotable number: its best independent percentage on a benchmark that still
 * discriminates. The preview image and the page description both use it, so a shared link
 * never leads with a saturated or vendor-reported score.
 */
export function quotableScore(scores: readonly JoinedScore[]): JoinedScore | undefined {
  return scores
    .filter(
      (score) =>
        score.provenance === "independent" &&
        score.unit === "percent" &&
        isDiscriminating(score.benchmark),
    )
    .sort((a, b) => b.value - a.value)[0];
}

/** The preview image route for a model. Model ids are always "<creator>/<model>". */
export function modelImagePath(model_id: string): string {
  return `/og/models/${model_id}`;
}
