import { loadBenchmarks, loadFreshness, loadJoinedScores } from "@/lib/data/derived";
import { EPOCH_ATTRIBUTION, EPOCH_LICENCE } from "@/lib/ingest/epoch";
import {
  BENCHWIKI_ATTRIBUTION,
  BENCHWIKI_LICENCE,
  BENCHWIKI_SITE,
} from "@/lib/ingest/benchwiki";

/**
 * The whole joined corpus, as JSON.
 *
 * Statically generated at build time like every other route — this reads the committed
 * derived files, not a database, and nothing here reaches upstream on a request.
 *
 * **On licensing.** The scores are Epoch AI's under CC BY 4.0, which permits redistribution
 * with attribution, and the attribution travels in the payload rather than in a footer
 * somebody has to find. The benchmark health records are benchwiki's, and benchwiki
 * publishes no licence at all — `02-data/sources-and-licensing.md` treats that as
 * permission-not-granted, which is a stronger constraint for a bulk download than for a
 * rendered page. Including them here is a deliberate decision recorded in that spec, not an
 * oversight, and it is why every record carries its source, its licence status and a link
 * back to the canonical original: anyone who takes this file inherits the same obligations
 * this site has, and can see what they are. A takedown request from benchwiki is honoured
 * by removing the health records from this payload, not argued with.
 */

export const dynamic = "force-static";

export function GET(): Response {
  const scores = loadJoinedScores();
  const benchmarks = loadBenchmarks();
  const freshness = loadFreshness();

  const payload = {
    _meta: {
      generated_at: new Date().toISOString(),
      site: "LLM Atlas",
      record_counts: { scores: scores.length, benchmarks: benchmarks.length },
      source_freshness: freshness,
      sources: [
        {
          source_id: "epoch",
          covers: "benchmark scores and the capability index",
          licence: EPOCH_LICENCE,
          attribution: EPOCH_ATTRIBUTION,
          redistribution: "permitted with attribution",
        },
        {
          source_id: "benchwiki",
          covers: "benchmark health records — status, contamination, lineage, timelines",
          licence: BENCHWIKI_LICENCE,
          attribution: BENCHWIKI_ATTRIBUTION,
          canonical: BENCHWIKI_SITE,
          redistribution:
            "No licence is published for this data. It is mirrored here with attribution " +
            "and canonical links; permission has not been granted, and it has not been " +
            "refused. If you redistribute it further you inherit that uncertainty.",
        },
      ],
      notes: [
        "A vendor-reported score and an independent one are different claims and are never averaged.",
        "health_flags are derived here, not supplied upstream — see /methodology.",
        "A 'disputed' flag means the source reports more than one value for one measurement.",
      ],
    },
    scores,
    benchmarks,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
