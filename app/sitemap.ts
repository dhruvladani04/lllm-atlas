import type { MetadataRoute } from "next";
import { loadModels } from "@/lib/data/derived";
import { guideSlugs } from "@/lib/evals/load";
import { siteUrl } from "@/lib/config";

/**
 * Every route this site asks to have indexed — which is not the same as every route it
 * serves.
 *
 * Benchmark detail pages are deliberately absent in both modes. They carry
 * `rel="canonical"` pointing at benchwiki, because the record is benchwiki's and
 * `02-data/sources-and-licensing.md` treats an unlicensed source as permission-not-granted.
 * Listing a URL in your own sitemap while canonicalling it to someone else's domain asks a
 * crawler to do two contradictory things; the canonical is the one that reflects who
 * actually owns the record, so the sitemap yields.
 *
 * The cost is real and worth stating: the reverse lookup those pages carry — which models
 * on this site have a score on this benchmark, with provenance and harness — is this
 * site's own contribution and currently cannot rank on its own. Giving it an indexable
 * home of its own, separate from the mirrored record, is the fix, and it is a feature
 * rather than a metadata tweak. `/benchmarks` itself stays listed: the capability × status
 * matrix is this site's work, not a mirror of anyone's page.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entry = (path: string, priority: number) => ({
    url: new URL(path, siteUrl()).toString(),
    lastModified: now,
    priority,
  });

  return [
    entry("/", 1),
    entry("/models", 0.9),
    entry("/compare", 0.8),
    entry("/benchmarks", 0.8),
    entry("/evals", 0.8),
    entry("/methodology", 0.7),
    ...loadModels().map((model) => entry(`/models/${model.model_id}`, 0.6)),
    ...guideSlugs().map((slug) => entry(`/evals/${slug}`, 0.7)),
  ];
}
