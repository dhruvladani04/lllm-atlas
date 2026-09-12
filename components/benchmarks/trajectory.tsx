import type { Benchmark, TimelinePoint } from "@/lib/schemas/benchmark";

/**
 * specs/03-sections/benchmarks.md — the trajectory.
 *
 * Points are drawn, never joined. The source's own warning is the reason: connecting
 * points across exam years, harnesses or protocol changes with one line asserts a
 * continuity the data does not support, and a drawn line is a much stronger claim than a
 * scatter of dots.
 *
 * Hand-rolled SVG rather than a chart library: this is a scatter with two mark types, and
 * a charting dependency would add weight to a route that does not need one. Vendor-reported
 * and independent points are distinguished by *shape* as well as colour, so the difference
 * survives greyscale and colour blindness.
 */

const WIDTH = 720;
const HEIGHT = 260;
const PAD = { top: 16, right: 16, bottom: 28, left: 40 };

function year(date: string): number {
  return Number.parseInt(date.slice(0, 4), 10);
}

export function Trajectory({ benchmark }: { benchmark: Benchmark }) {
  const points = benchmark.performance_timeline.filter((point) =>
    /^\d{4}-\d{2}-\d{2}$/.test(point.measured_at),
  );

  if (points.length === 0) {
    return (
      <p className="mt-2 max-w-[66ch] text-sm text-ink-mute">
        No trajectory is published for this benchmark upstream, so none is shown. An empty
        chart would imply the scores exist and are flat.
      </p>
    );
  }

  const times = points.map((point) => Date.parse(point.measured_at));
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const span = maxTime - minTime || 1;

  const values = points.map((point) => point.score);
  const maxValue = Math.max(...values, benchmark.human_baseline.score ?? 0);
  const minValue = Math.min(...values, 0);
  const range = maxValue - minValue || 1;

  const x = (point: TimelinePoint) =>
    PAD.left +
    ((Date.parse(point.measured_at) - minTime) / span) * (WIDTH - PAD.left - PAD.right);
  const y = (value: number) =>
    HEIGHT - PAD.bottom - ((value - minValue) / range) * (HEIGHT - PAD.top - PAD.bottom);

  const baseline = benchmark.human_baseline.score;
  const firstYear = year(points[0]?.measured_at ?? "");
  const lastYear = year(points[points.length - 1]?.measured_at ?? "");

  return (
    <figure className="mt-3">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`Scores on ${benchmark.name} over time, ${points.length} points from ${firstYear} to ${lastYear}. Vendor-reported points are drawn as open squares, independent ones as filled circles.`}
      >
        <line
          x1={PAD.left}
          y1={HEIGHT - PAD.bottom}
          x2={WIDTH - PAD.right}
          y2={HEIGHT - PAD.bottom}
          stroke="var(--rule-strong)"
        />
        <line
          x1={PAD.left}
          y1={PAD.top}
          x2={PAD.left}
          y2={HEIGHT - PAD.bottom}
          stroke="var(--rule-strong)"
        />

        {baseline !== null ? (
          <>
            <line
              x1={PAD.left}
              y1={y(baseline)}
              x2={WIDTH - PAD.right}
              y2={y(baseline)}
              stroke="var(--ink-mute)"
              strokeDasharray="4 4"
            />
            <text
              x={WIDTH - PAD.right}
              y={y(baseline) - 4}
              textAnchor="end"
              fontSize="11"
              fill="var(--ink-mute)"
            >
              human baseline
            </text>
          </>
        ) : null}

        {points.map((point, index) =>
          point.provenance === "independent" ? (
            <circle
              key={`${point.model}-${point.measured_at}-${index}`}
              cx={x(point)}
              cy={y(point.score)}
              r="3.5"
              fill="var(--ink)"
            >
              <title>{`${point.model} — ${point.score} on ${point.measured_at} (independent)`}</title>
            </circle>
          ) : (
            <rect
              key={`${point.model}-${point.measured_at}-${index}`}
              x={x(point) - 3.5}
              y={y(point.score) - 3.5}
              width="7"
              height="7"
              fill="none"
              stroke="var(--provenance-vendor)"
              strokeWidth="1.5"
            >
              <title>{`${point.model} — ${point.score} on ${point.measured_at} (vendor-reported)`}</title>
            </rect>
          ),
        )}

        <text x={PAD.left} y={HEIGHT - 8} fontSize="11" fill="var(--ink-mute)">
          {firstYear}
        </text>
        <text
          x={WIDTH - PAD.right}
          y={HEIGHT - 8}
          textAnchor="end"
          fontSize="11"
          fill="var(--ink-mute)"
        >
          {lastYear}
        </text>
        <text x={4} y={PAD.top + 4} fontSize="11" fill="var(--ink-mute)">
          {maxValue.toFixed(0)}
        </text>
        <text x={4} y={HEIGHT - PAD.bottom} fontSize="11" fill="var(--ink-mute)">
          {minValue.toFixed(0)}
        </text>
      </svg>

      <figcaption className="mt-2 max-w-[66ch] text-xs text-ink-mute">
        <span aria-hidden="true">● </span>independent · <span aria-hidden="true">▫ </span>
        vendor-reported. Points are not joined: the scores come from different models,
        harnesses and protocol versions, and a line between them would claim a continuity
        the data does not have.
      </figcaption>
    </figure>
  );
}
