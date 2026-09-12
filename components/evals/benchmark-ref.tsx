import Link from "next/link";
import { loadBenchmarks } from "@/lib/data/derived";
import { StatusChip } from "@/components/data/primitives";

/**
 * specs/03-sections/evals.md — `<BenchmarkRef slug="...">`.
 *
 * Pulls live benchmark metadata from `data/`, linking section 3 back to sections 1 and 2.
 * Used for the judge-model argument with a real example rather than an abstract caveat: a
 * benchmark that judges with a model inherits that model's biases, and this component shows
 * which ones actually do.
 */
export function BenchmarkRef({ slug }: { slug: string }) {
  const benchmark = loadBenchmarks().find((entry) => entry.slug === slug);

  if (benchmark === undefined) {
    return (
      <span
        className="text-ink-mute"
        title={`No benchmark record for "${slug}" in this build`}
      >
        {slug} (no record)
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2">
      <Link
        href={`/benchmarks/${benchmark.slug}`}
        className="underline-offset-2 hover:underline"
      >
        {benchmark.name}
      </Link>
      <StatusChip status={benchmark.status} />
      {benchmark.judge_model !== null ? (
        <span className="text-xs text-ink-mute">judged by {benchmark.judge_model}</span>
      ) : null}
    </span>
  );
}
