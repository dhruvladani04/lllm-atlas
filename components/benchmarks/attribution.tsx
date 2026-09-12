import { benchwikiUrl } from "@/lib/config";

/**
 * specs/02-data/sources-and-licensing.md, source 1.
 *
 * benchwiki publishes no licence. The endpoint is public but the terms are not stated, so
 * this is treated as permission-not-granted: attribution is prominent and persistent, above
 * the fold rather than in a footer, and it links to the specific record rather than the
 * homepage.
 */
export function BenchwikiAttribution({ slug }: { slug?: string }) {
  return (
    <p className="mt-3 border-l-2 border-rule-strong pl-3 text-sm text-ink-mute">
      Benchmark metadata from{" "}
      <a className="underline" href={benchwikiUrl(slug)}>
        benchwiki
      </a>
      {slug === undefined
        ? ", which researches and maintains these health records. This site mirrors them to join scores to them; the records are theirs."
        : " — this page mirrors their record so scores can be joined to it. The original is canonical."}
    </p>
  );
}
