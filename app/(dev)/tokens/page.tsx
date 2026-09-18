import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Design tokens",
  robots: { index: false, follow: false },
};

const NEUTRAL = [
  { token: "--paper", use: "page" },
  { token: "--surface", use: "table, panels" },
  { token: "--ink", use: "primary text" },
  { token: "--ink-mute", use: "secondary text" },
  { token: "--rule", use: "hairlines, table borders" },
  { token: "--rule-strong", use: "emphasised borders" },
] as const;

const ACCENT = [
  { token: "--accent", use: "link hover/focus, focus ring, checked controls" },
  { token: "--accent-strong", use: "hover/active state of the accent" },
] as const;

const DATA = [
  { token: "--status-active", meaning: "benchmark still discriminates", glyph: "●" },
  { token: "--status-nearing", meaning: "nearing saturation", glyph: "◐" },
  { token: "--status-saturated", meaning: "saturated — stop reading this", glyph: "○" },
  { token: "--status-deprecated", meaning: "deprecated", glyph: "×" },
  { token: "--risk-high", meaning: "high contamination", glyph: "!" },
  { token: "--risk-medium", meaning: "medium contamination", glyph: "!" },
  { token: "--provenance-vendor", meaning: "vendor-reported", glyph: "v" },
  { token: "--stale", meaning: "source older than 7 days", glyph: "~" },
] as const;

function Swatches({ scheme }: { scheme: "light" | "dark" }) {
  return (
    <section className={`scheme-${scheme} bg-paper p-6`}>
      <h2 className="text-lg font-medium text-ink">
        {scheme === "light" ? "Light scheme" : "Dark scheme"}
      </h2>

      <h3 className="mt-6 text-sm font-medium text-ink">Neutral base</h3>
      <ul className="mt-2 divide-y divide-rule border-y border-rule">
        {NEUTRAL.map(({ token, use }) => (
          <li key={token} className="flex items-center gap-4 py-2">
            <span
              aria-hidden="true"
              className="h-6 w-10 shrink-0 border border-rule-strong"
              style={{ backgroundColor: `var(${token})` }}
            />
            <code className="font-mono text-xs text-ink">{token}</code>
            <span className="text-xs text-ink-mute">{use}</span>
          </li>
        ))}
      </ul>

      <h3 className="mt-6 text-sm font-medium text-ink">
        Interface accent — interaction only, never a static heading or border
      </h3>
      <ul className="mt-2 divide-y divide-rule border-y border-rule">
        {ACCENT.map(({ token, use }) => (
          <li key={token} className="flex items-center gap-4 py-2">
            <span
              aria-hidden="true"
              className="h-6 w-10 shrink-0 rounded-sm"
              style={{ backgroundColor: `var(${token})` }}
            />
            <code className="font-mono text-xs text-ink">{token}</code>
            <span className="text-xs text-ink-mute">{use}</span>
          </li>
        ))}
      </ul>

      <h3 className="mt-8 text-sm font-medium text-ink">
        Data palette — colour never travels alone
      </h3>
      <ul className="mt-2 divide-y divide-rule border-y border-rule">
        {DATA.map(({ token, meaning, glyph }) => (
          <li key={token} className="flex items-center gap-4 py-2">
            <span
              className="w-6 shrink-0 text-center text-sm"
              style={{ color: `var(${token})` }}
            >
              {glyph}
            </span>
            <span className="text-sm" style={{ color: `var(${token})` }}>
              {meaning}
            </span>
            <code className="ml-auto font-mono text-xs text-ink-mute">{token}</code>
          </li>
        ))}
      </ul>

      <h3 className="mt-8 text-sm font-medium text-ink">Type</h3>
      <p className="mt-2 text-base text-ink">
        IBM Plex Sans, interface and tables.{" "}
        <span className="tabular">1,234,567 · 92.4 · 1.0000</span>
      </p>
      <p className="mt-1 font-serif text-base text-ink">
        Source Serif 4, long-form evals guides.
      </p>
      <p className="mt-1 font-mono text-xs text-ink">anthropic/claude-opus-5</p>
    </section>
  );
}

export default function TokensPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-xl font-medium">Design tokens</h1>
      <p className="mt-2 max-w-[66ch] text-sm text-ink-mute">
        A development reference, not a site page. Both schemes are forced here so they can
        be compared; everywhere else the scheme follows the reader&rsquo;s system setting.
        Every status colour is paired with a glyph and a label, so the meaning survives
        colour blindness, greyscale printing and disabled CSS.
      </p>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Swatches scheme="light" />
        <Swatches scheme="dark" />
      </div>
    </main>
  );
}
