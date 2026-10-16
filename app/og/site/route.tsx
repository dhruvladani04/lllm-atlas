import { ImageResponse } from "next/og";
import { OG_COLOURS, OG_SIZE, OgCard } from "@/lib/og/card";

/**
 * The site's link preview, used by every page that does not draw its own.
 *
 * A static route rather than an `opengraph-image` file: file-based images take priority over
 * a page's own metadata, so a site-wide one would have masked the per-model images.
 */

export const dynamic = "force-static";

export function GET(): Response {
  return new ImageResponse(
    <OgCard
      eyebrow="Benchmarks, with their health"
      title="A score is only as good as the benchmark behind it."
      footer="Every number with its source, its date, and whether the test still discriminates."
    >
      <div
        style={{
          display: "flex",
          fontSize: 32,
          color: OG_COLOURS.MUTE,
          lineHeight: 1.35,
        }}
      >
        Rankings that say which benchmark they rank on, how saturated it is, and who
        measured each number.
      </div>
    </OgCard>,
    OG_SIZE,
  );
}
