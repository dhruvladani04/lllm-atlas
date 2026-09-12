import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Mono, IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";
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

export const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";

const DESCRIPTION =
  "Model scores shown with the health of the benchmark that produced them and the provenance of the number.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
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
    url: siteUrl,
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
  { href: "/benchmarks", label: "Benchmarks" },
  { href: "/evals", label: "Evals" },
] as const;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexMono.variable} ${sourceSerif.variable}`}
    >
      <body className="min-h-screen bg-paper text-ink">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:bg-surface focus:p-3"
        >
          Skip to content
        </a>

        <header className="border-b border-rule">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-baseline gap-x-6 gap-y-2 px-6 py-3">
            <Link
              href="/"
              className="text-sm font-medium underline-offset-2 hover:underline"
            >
              LLM Atlas
            </Link>
            <nav aria-label="Main">
              <ul className="flex gap-4 text-sm">
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
          </div>
        </header>

        <div id="content">{children}</div>
      </body>
    </html>
  );
}
