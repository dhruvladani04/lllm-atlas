"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import type { Demonstration } from "@/lib/home/demonstration";
import { HealthFlags, ScoreCell, StatusChip } from "@/components/data/primitives";

/**
 * specs/04-design/design-system.md — the one orchestrated moment on the whole site.
 *
 * The score resolves first and the health flags a beat later, so the reader sees the number
 * the way a launch announcement presents it, and then sees what it is standing on. That
 * sequence *is* the argument; delivering both at once would state the thesis instead of
 * demonstrating it.
 *
 * Under `prefers-reduced-motion` everything renders at once — the same argument in one beat
 * rather than two, with nothing withheld.
 */

const SCORE_IN = { duration: 0.35, ease: [0.2, 0.6, 0.2, 1] as const };
const CAVEAT_IN = { duration: 0.4, delay: 1.1, ease: [0.2, 0.6, 0.2, 1] as const };

export function DemonstrationRow({ demonstration }: { demonstration: Demonstration }) {
  const reduced = useReducedMotion();
  const { model, variant, headline, successor } = demonstration;

  const appear = (delay: typeof SCORE_IN | typeof CAVEAT_IN) =>
    reduced
      ? { initial: false as const }
      : {
          initial: { opacity: 0, y: 4 },
          animate: { opacity: 1, y: 0 },
          transition: delay,
        };

  return (
    <section
      className="mt-8 rounded-md border border-rule bg-surface p-6 shadow-md"
      aria-label="A worked example"
    >
      <p className="text-xs font-medium text-ink-mute">Worked example</p>
      <motion.div className="mt-3" {...appear(SCORE_IN)}>
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
      </motion.div>

      <motion.div {...appear(CAVEAT_IN)} className="mt-4">
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
      </motion.div>
    </section>
  );
}
