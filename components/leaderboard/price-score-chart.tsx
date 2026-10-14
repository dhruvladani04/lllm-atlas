import type { TableModel, TableRow } from "@/lib/leaderboard/view";
import { formatScore } from "@/components/data/primitives";

/**
 * specs/03-sections/leaderboard.md — price against score, on the benchmark the table ranks.
 *
 * One dot per row the table is showing, so it follows the basis, the filters and the
 * saturated toggle. Price is input plus output per million tokens on a log axis: the
 * cheapest and dearest models differ by three orders of magnitude, and a linear axis puts
 * every affordable model in one pixel. Open-weights models are hollow, so the distinction
 * survives greyscale. Rows without a readable price are left off and counted, never placed
 * at zero.
 *
 * The chart is a picture of the table, not a replacement for it: the SVG is one image with
 * a description, and every number on it is in the rows below with its caveats.
 */

const WIDTH = 720;
const HEIGHT = 300;
const PAD = { top: 16, right: 16, bottom: 36, left: 44 };

interface Dot {
  key: string;
  name: string;
  price: number;
  routed: boolean;
  value: number;
  open: boolean;
  provenance: TableRow["provenance"];
}

export function PriceScoreChart({
  rows,
  models,
  benchmarkName,
}: {
  rows: readonly TableRow[];
  models: Record<string, TableModel>;
  benchmarkName: string;
}) {
  const dots: Dot[] = [];
  let unpriced = 0;
  for (const row of rows) {
    const model = models[row.model_id];
    const input = model?.price_input;
    const output = model?.price_output;
    if (
      model === undefined ||
      input == null ||
      output == null ||
      input.value + output.value <= 0
    ) {
      unpriced += 1;
      continue;
    }
    dots.push({
      key: row.key,
      name:
        row.variant === "base"
          ? model.display_name
          : `${model.display_name} (${row.variant})`,
      price: input.value + output.value,
      routed: input.quoted_by === "openrouter" || output.quoted_by === "openrouter",
      value: row.value,
      open: model.open_weights === true,
      provenance: row.provenance,
    });
  }
  if (dots.length < 3) return null;

  const unit = rows[0]?.unit ?? "percent";
  const prices = dots.map((dot) => Math.log10(dot.price));
  const minLog = Math.floor(Math.min(...prices));
  const maxLog = Math.ceil(Math.max(...prices));
  const values = dots.map((dot) => dot.value);
  // Position, not length, carries the score here, so the axis may start above zero; it is
  // labelled, and rounded out to tens so it does not hug the data.
  const minValue = Math.floor(Math.min(...values) / 10) * 10;
  const maxValue = Math.ceil(Math.max(...values) / 10) * 10 || 1;

  const x = (price: number) =>
    PAD.left +
    ((Math.log10(price) - minLog) / (maxLog - minLog || 1)) *
      (WIDTH - PAD.left - PAD.right);
  const y = (value: number) =>
    HEIGHT -
    PAD.bottom -
    ((value - minValue) / (maxValue - minValue || 1)) * (HEIGHT - PAD.top - PAD.bottom);

  const ticks = Array.from({ length: maxLog - minLog + 1 }, (_, i) => 10 ** (minLog + i));
  const yTicks = Array.from(
    { length: Math.round((maxValue - minValue) / 10) + 1 },
    (_, i) => minValue + i * 10,
  );

  return (
    <section className="mt-10" aria-labelledby="price-score">
      <h2 id="price-score" className="text-lg font-medium">
        Price against score on {benchmarkName}
      </h2>
      <p className="mt-1 max-w-[66ch] text-sm text-ink-mute">
        One dot per row in the table above. Hollow dots are open-weights models. Price is
        input plus output per million tokens, on a log scale.
        {unpriced > 0
          ? ` ${unpriced} row${unpriced === 1 ? " has" : "s have"} no readable price and ${unpriced === 1 ? "is" : "are"} not drawn.`
          : ""}
      </p>
      <figure className="mt-3">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          // Drawn at about its own size: scaled to a 1280px column, 11px labels became
          // 19px and the chart outgrew the screen it sits on.
          className="w-full max-w-[48rem]"
          role="img"
          aria-label={`Price against score on ${benchmarkName} for ${dots.length} models. Prices run from $${Math.min(...dots.map((d) => d.price)).toFixed(2)} to $${Math.max(...dots.map((d) => d.price)).toFixed(2)} per million tokens; scores from ${formatScore(Math.min(...values), unit)} to ${formatScore(Math.max(...values), unit)}.`}
        >
          {yTicks.map((tick) => (
            <g key={`y${tick}`}>
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
          {ticks.map((tick) => (
            <g key={`x${tick}`}>
              <line
                x1={x(tick)}
                x2={x(tick)}
                y1={PAD.top}
                y2={HEIGHT - PAD.bottom}
                stroke="var(--rule)"
              />
              <text
                x={x(tick)}
                y={HEIGHT - PAD.bottom + 16}
                textAnchor="middle"
                fontSize="11"
                fill="var(--ink-mute)"
              >
                {tick < 1 ? `$${tick}` : `$${Math.round(tick)}`}
              </text>
            </g>
          ))}
          <text
            x={WIDTH - PAD.right}
            y={HEIGHT - 4}
            textAnchor="end"
            fontSize="11"
            fill="var(--ink-mute)"
          >
            price per million tokens, input + output
          </text>

          {dots.map((dot) => (
            <circle
              key={dot.key}
              cx={x(dot.price)}
              cy={y(dot.value)}
              r="4"
              fill={dot.open ? "var(--surface)" : "var(--ink)"}
              fillOpacity={dot.open ? 1 : 0.7}
              stroke="var(--ink)"
              strokeWidth="1.5"
            >
              <title>
                {`${dot.name}: ${formatScore(dot.value, unit)}, $${dot.price.toFixed(2)} per million tokens${dot.routed ? " (OpenRouter's routed price)" : ""}, ${dot.provenance === "independent" ? "independently measured" : dot.provenance === "mixed" ? "independent and vendor-reported numbers" : "vendor-reported"}${dot.open ? ", open weights" : ""}`}
              </title>
            </circle>
          ))}
        </svg>
      </figure>
    </section>
  );
}
