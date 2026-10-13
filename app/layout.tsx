import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Mono, IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";
import { siteUrl } from "@/lib/config";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-source-serif",
  display: "swap",
});

const DESCRIPTION =
  "Model scores shown with the health of the benchmark that produced them and the provenance of the number.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "LLM Atlas",
    template: "%s — LLM Atlas",
  },
  description: DESCRIPTION,
  applicationName: "LLM Atlas",
  openGraph: {
    type: "website",
    siteName: "LLM Atlas",
    title: "LLM Atlas",
    description: DESCRIPTION,
    url: siteUrl(),
  },
  twitter: {
    card: "summary",
    title: "LLM Atlas",
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

const NAV = [
  { href: "/models", label: "Leaderboard" },
  { href: "/compare", label: "Compare" },
  { href: "/benchmarks", label: "Benchmarks" },
  { href: "/evals", label: "Evals" },
  { href: "/methodology", label: "Methodology" },
] as const;

/**
 * Applies a stored light preference while the HTML is still being parsed, before anything
 * paints. Without it a reader who chose light would see the dark default flash on every
 * load. The key matches `THEME_KEY` in the toggle, and the script only ever compares the
 * stored value against a literal — nothing read from storage is written into the page.
 */
const APPLY_THEME =
  '(function(){try{if(localStorage.getItem("llm-atlas-theme")==="light")document.documentElement.setAttribute("data-theme","light")}catch(e){}})()';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexMono.variable} ${sourceSerif.variable}`}
      // Browser extensions write their own attributes onto <html> before React hydrates
      // — a screen recorder adding `data-scribe-recorder-ready` is enough to trigger a
      // hydration warning for something no code here did. This suppresses exactly one
      // level: attribute differences on <html> itself. Mismatches anywhere inside the
      // tree still surface, which is where a real one would be. The scheme script below
      // relies on the same allowance: it sets `data-theme` here before hydration.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPLY_THEME }} />
      </head>
      <body className="min-h-screen bg-paper text-ink">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:bg-surface focus:p-3"
        >
          Skip to content
        </a>

        {/* Deliberately not sticky. The leaderboard's own table header is sticky, and two
            stacked sticky elements have to agree on a pixel offset that the nav breaks by
            wrapping to two lines below ~400px — the table header would pin underneath it
            at exactly the widths the quality floor promises to support. Between pinning
            the nav and pinning the column headers of a 49-row table, the table wins. */}
        <header className="border-b border-rule bg-paper shadow-sm">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-baseline gap-x-6 gap-y-2 px-6 py-3">
            <Link
              href="/"
              className="flex items-baseline gap-2 text-sm font-medium underline-offset-2 hover:underline"
            >
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 rounded-sm bg-accent"
              />
              LLM Atlas
            </Link>
            <nav aria-label="Main">
              {/* flex-wrap, not flex: five items no longer fit on one line at 360px, which
                  the quality floor promises to support. */}
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {NAV.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-ink-mute underline-offset-2 hover:text-ink hover:underline"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <div id="content">{children}</div>
      </body>
    </html>
  );
}
