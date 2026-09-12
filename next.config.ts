import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Every page in this project renders from JSON committed to the repository.
  // Nothing fetches upstream at request time — see specs/01-architecture/data-pipeline.md.
  typedRoutes: true,
};

export default nextConfig;
