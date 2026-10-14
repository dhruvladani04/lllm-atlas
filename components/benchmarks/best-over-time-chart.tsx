import type { BestOverTime } from "@/lib/benchmarks/best-over-time";

/**
 * specs/03-sections/benchmarks.md — the best score measured on this site, over time.
 *
 * Every independently measured score is a faint dot; the record-setters are joined by a
 * step line, which holds each record flat until the next one beats it. A step and not a
 * slope: between two records nothing was measured higher, and a diagonal would draw scores
 * nobody recorded. The line is omitted when the scores were measured under different
 * harnesses — see `bestOverTime`.
 */

const WIDTH = 720;
const HEIGHT = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 40 };

function year(time: number): number {
  return new Date(time).getUTCFullYear();
}

export function BestOverTimeChart({
  series,
  benchmarkName,
  names,
}: {
  series: BestOverTime;
  benchmarkName: string;
  names: Record<string, string>;
}) {
  const { points, records } = series;
  if (points.length === 0) return null;

  const times = points.map((point) => point.time);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const span = maxTime - minTime || 1;
  // Percent scores are drawn on 0–100 so a climb toward the ceiling looks like one.
  const maxValue = Math.max(100, ...points.map((point) => point.value));

  const x = (time: number) =>
    PAD.left + ((time - minTime) / span) * (WIDTH - PAD.left - PAD.right);
  const y = (value: number) =>
    HEIGHT - PAD.bottom - (value / maxValue) * (HEIGHT - PAD.top - PAD.bottom);

  const step = records
    .map((record, index) => {
      const next = records[index + 1];
      const end = next === undefined ? maxTime : next.time;
      return `${index === 0 ? "M" : "L"}${x(record.time)},${y(record.value)} L${x(end)},${y(record.value)}`;
    })
    .join(" ");

  const best = records[records.length - 1];
  const label =
    `Scores on ${benchmarkName} measured on this site, ${points.length} points from ` +
    `${year(minTime)} to ${year(maxTime)}.` +
    (best !== undefined
      ? ` The best so far is ${best.value.toFixed(1)}%, by ${names[best.model_id] ?? best.model_id}.`
      : "");

  return (
    <figure className="mt-3">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={label}
      >
        {[0, 25, 50, 75, 100].map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--rule)"
            />
            <text
              x={PAD.left - 6}
              y={y(tick) + 4}
              textAnchor="end"
              fontSize="11"
              fill="var(--ink-mute)"
            >
              {tick}
            </text>
          </g>
        ))}

        {points.map((point, index) => (
          <circle
            key={`${point.model_id}-${point.time}-${index}`}
            cx={x(point.time)}
            cy={y(point.value)}
            r="2.5"
            fill="var(--ink-mute)"
            fillOpacity="0.45"
          >
            <title>{`${names[point.model_id] ?? point.model_id}: ${point.value.toFixed(1)}%`}</title>
          </circle>
        ))}

        {records.length > 0 ? (
          <path d={step} fill="none" stroke="var(--ink)" strokeWidth="1.5" />
        ) : null}
        {records.map((record) => (
          <circle
            key={`record-${record.model_id}-${record.time}`}
            cx={x(record.time)}
            cy={y(record.value)}
            r="3.5"
            fill="var(--ink)"
          >
            <title>{`${names[record.model_id] ?? record.model_id}: ${record.value.toFixed(1)}%, best at the time`}</title>
          </circle>
        ))}

        <text x={PAD.left} y={HEIGHT - 8} fontSize="11" fill="var(--ink-mute)">
          {year(minTime)}
        </text>
        <text
          x={WIDTH - PAD.right}
          y={HEIGHT - 8}
          textAnchor="end"
          fontSize="11"
          fill="var(--ink-mute)"
        >
          {year(maxTime)}
        </text>
      </svg>
      <figcaption className="mt-1 max-w-[66ch] text-xs text-ink-mute">
        {series.noLine === "harnesses"
          ? "Each dot is a score measured on this site. No line is drawn: these scores come from different agent harnesses, so a new best may be a better harness rather than a better model."
          : "Each dot is a score measured on this site; the line steps up at each new best and stays flat until the next one. A line that has stopped climbing is what saturation looks like."}
      </figcaption>
    </figure>
  );
}
