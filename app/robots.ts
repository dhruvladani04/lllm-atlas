import type { MetadataRoute } from "next";
import { siteUrl } from "@/app/layout";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // A development reference page, not site content.
        disallow: "/tokens",
      },
    ],
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
