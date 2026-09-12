import type { ReactNode } from "react";

/**
 * specs/03-sections/evals.md — `<MetricCard>`: name, what it measures, what it misses,
 * which frameworks implement it.
 *
 * "What it misses" is required rather than optional. Naming only what a metric measures is
 * how eval content misleads people: every measure has a blind spot, and the blind spot is
 * usually where production failures live.
 */
export function MetricCard({
  name,
  measures,
  misses,
  frameworks = [],
}: {
  name: string;
  measures: ReactNode;
  misses: ReactNode;
  frameworks?: string[];
}) {
  return (
    <div className="my-5 border border-rule p-4">
      <h4 className="text-sm font-medium">{name}</h4>
      <dl className="mt-2 space-y-2 text-sm">
        <div>
          <dt className="text-xs text-ink-mute">Measures</dt>
          <dd>{measures}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-mute">Misses</dt>
          <dd>{misses}</dd>
        </div>
        {frameworks.length > 0 ? (
          <div>
            <dt className="text-xs text-ink-mute">Implemented by</dt>
            <dd className="font-mono text-xs">{frameworks.join(", ")}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
