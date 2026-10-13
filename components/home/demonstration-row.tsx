import Link from "next/link";
import type { Demonstration } from "@/lib/home/demonstration";
import { HealthFlags, ScoreCell, StatusChip } from "@/components/data/primitives";

/**
 * specs/04-design/design-system.md — the one orchestrated moment on the whole site.
 *
 * The score is at full strength from the first paint and the caveat arrives a beat later,
 * so the reader sees the number the way a launch announcement presents it and then sees
 * what it is standing on. That sequence *is* the argument.
 *
 * Nothing is ever hidden to make it. This used to fade both halves in from `opacity: 0`
 * with a script, which meant the server HTML carried an invisible card: with JavaScript
 * slow, blocked or failed, the page's whole thesis was a blank box. Now the caveat is
 * present and readable in the HTML and a CSS animation only brings it up from dimmed. It
 * needs no script, and under `prefers-reduced-motion` it does not run at all.
 */

export function DemonstrationRow({ demonstration }: { demonstration: Demonstration }) {
  const { model, variant, headline, successor } = demonstration;

  return (
    <section
      className="mt-8 rounded-md border border-rule bg-surface p-6 shadow-md"
      aria-label="A worked example"
    >
      <p className="text-xs font-medium text-ink-mute">Worked example</p>
      <div className="mt-3">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <Link
            href={`/models/${model.model_id}`}
            className="text-lg underline-offset-2 hover:underline"
          >
            {model.display_name}
          </Link>
          {variant !== "base" ? (
            <span className="font-mono text-xs text-ink-mute">({variant})</span>
          ) : null}
          <span className="text-sm text-ink-mute">{model.creator}</span>
        </div>

        <p className="mt-3 flex flex-wrap items-baseline gap-x-3">
          <span className="tabular text-2xl">
            <ScoreCell score={headline} />
          </span>
          <span className="text-sm text-ink-mute">
            on{" "}
            <Link
              href={`/benchmarks/${headline.benchmark.slug}`}
              className="underline-offset-2 hover:underline"
            >
              {headline.benchmark.name}
            </Link>
          </span>
        </p>
      </div>

      <div className="caveat-arrives mt-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <StatusChip status={headline.benchmark.status} />
          {/* The chip already says saturated or deprecated; repeating it as a flag reads
              like two separate findings rather than one. */}
          <HealthFlags
            flags={headline.health_flags.filter(
              (flag) => flag !== "saturated" && flag !== "deprecated",
            )}
          />
        </div>

        {successor !== null ? (
          <p className="mt-4 max-w-[66ch] text-sm">
            The same model scores{" "}
            <strong className="tabular font-medium">{successor.value.toFixed(1)}%</strong>{" "}
            on{" "}
            <Link
              href={`/benchmarks/${successor.benchmark.slug}`}
              className="underline-offset-2 hover:underline"
            >
              {successor.benchmark.name}
            </Link>
            , the successor built because the first one stopped separating models. Both
            numbers are real. Only one of them is worth quoting.
          </p>
        ) : (
          <p className="mt-4 max-w-[66ch] text-sm">
            The number is real. The benchmark behind it no longer separates strong models
            from weak ones, which is not something the number tells you.
          </p>
        )}
      </div>
    </section>
  );
}
