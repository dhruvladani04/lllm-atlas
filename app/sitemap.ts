import type { MetadataRoute } from "next";
import { loadBenchmarks, loadModels } from "@/lib/data/derived";
import { guideSlugs } from "@/lib/evals/load";
import { benchwikiMode } from "@/lib/config";
import { siteUrl } from "@/app/layout";

/**
 * Every route the site actually serves. Benchmark detail pages are omitted in link mode,
 * because in that mode they redirect to benchwiki and listing them would advertise this
 * site as the canonical home of someone else's records.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entry = (path: string, priority: number) => ({
    url: new URL(path, siteUrl).toString(),
    lastModified: now,
    priority,
  });

  const routes = [
    entry("/", 1),
    entry("/models", 0.9),
    entry("/benchmarks", 0.8),
    entry("/evals", 0.8),
    ...loadModels().map((model) => entry(`/models/${model.model_id}`, 0.6)),
    ...guideSlugs().map((slug) => entry(`/evals/${slug}`, 0.7)),
  ];

  if (benchwikiMode() === "mirror") {
    routes.push(
      ...loadBenchmarks().map((benchmark) => entry(`/benchmarks/${benchmark.slug}`, 0.5)),
    );
  }

  return routes;
}
