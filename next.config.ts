import type { NextConfig } from "next";

/**
 * Content Security Policy.
 *
 * `script-src` carries `'unsafe-inline'` deliberately and not lazily. The App Router emits
 * the RSC payload as inline `<script>` tags, and the alternative — per-request nonces via
 * middleware — forces every route to render dynamically, which would trade this site's
 * entire static-first architecture for a header. The trade is worth naming: the site
 * renders no user input anywhere (every page is built from JSON committed to the repo, and
 * the one URL parameter it reads, `?tab=`, is matched against a fixed list rather than
 * printed), so the injection surface `'unsafe-inline'` would otherwise protect is empty.
 * What the policy still buys is real: no foreign script origin can execute, nothing can
 * frame the site, and no plugin or object can load.
 *
 * `frame-src` allows exactly one origin — the CampusX playlist embedded on the foundations
 * guide, which uses youtube-nocookie.com rather than youtube.com.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src https://www.youtube-nocookie.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // frame-ancestors above is the modern control; this is the legacy equivalent for
  // anything that predates CSP support.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Every page in this project renders from JSON committed to the repository.
  // Nothing fetches upstream at request time — see specs/01-architecture/data-pipeline.md.
  typedRoutes: true,

  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
