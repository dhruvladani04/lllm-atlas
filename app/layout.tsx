import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Mono, IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";
import { siteUrl } from "@/lib/config";
import { SiteNav } from "@/components/ui/site-nav";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ThemeSync } from "@/components/ui/theme-sync";
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
  // Only the sans is preloaded. Every page linked all four font files at the top of the
  // document, so the serif — used on evals guides alone — competed with the leaderboard's
  // first paint on every route. Mono and serif load when a page first uses them, and
  // `swap` shows the fallback until then.
  preload: false,
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-source-serif",
  display: "swap",
  preload: false,
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
 * The scheme, handled before React exists.
 *
 * While the HTML is still parsing, this applies a stored choice so a reader who chose a
 * scheme never sees the other one flash. With no stored choice it does nothing and the
 * operating system's scheme applies through CSS.
 *
 * It also owns the toggle's click, through one listener on the document. A React handler
 * only works once the page has hydrated, so the first click on a slow phone did nothing;
 * this listener exists from the first byte. The stored value is only ever compared against
 * the literals "light" and "dark" — nothing read from storage is written into the page —
 * and another tab changing the scheme changes this one too.
 */
const THEME_SCRIPT = `(function(){
var K="llm-atlas-theme",d=document.documentElement;
function stored(){try{var t=localStorage.getItem(K);return t==="light"||t==="dark"?t:null}catch(e){return null}}
function apply(t){if(t)d.setAttribute("data-theme",t);else d.removeAttribute("data-theme")}
apply(stored());
document.addEventListener("click",function(e){
var b=e.target&&e.target.closest&&e.target.closest("[data-theme-toggle]");if(!b)return;
var now=d.getAttribute("data-theme")||(window.matchMedia&&matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");
var next=now==="dark"?"light":"dark";
try{localStorage.setItem(K,next)}catch(e){}
apply(next);
});
window.addEventListener("storage",function(e){if(e.key===K)apply(stored())});
})()`;

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
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-paper text-ink">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:bg-surface focus:p-3"
        >
          Skip to content
        </a>

        {/* Deliberately not sticky. The leaderboard's own table header is sticky, and two
            stacked sticky elements have to agree on a pixel offset that an open menu
            changes. Between pinning the nav and pinning the column headers of a long
            table, the table wins. */}
        <header className="border-b border-rule bg-paper shadow-sm">
          <div className="mx-auto flex max-w-data flex-wrap items-center gap-x-3 gap-y-2 px-6 py-3 sm:gap-x-6">
            <Link
              href="/"
              className="order-1 flex items-baseline gap-2 text-sm font-medium underline-offset-2 hover:underline"
            >
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 rounded-sm bg-accent"
              />
              LLM Atlas
            </Link>
            <SiteNav items={NAV} />
            <div className="order-2 ml-auto sm:order-3">
              <ThemeToggle />
              <ThemeSync />
            </div>
          </div>
        </header>

        <div id="content">{children}</div>
      </body>
    </html>
  );
}
