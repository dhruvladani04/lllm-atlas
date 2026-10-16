import Link from "next/link";
import type { SummaryCard } from "@/lib/leaderboard/cards";
import {
  HealthFlags,
  ProvenanceBadge,
  QuotedValue,
  ScoreCell,
  StatusChip,
  formatScore,
} from "@/components/data/primitives";
import { CreatorLogo } from "@/components/ui/creator-logo";

/**
 * specs/03-sections/leaderboard.md — the summary cards.
 *
 * Each card is a row from the ranking with the rule that picked it as its heading, and it
 * carries what the row carries: the benchmark, its status, its health flags and who
 * reported the number. No entrance animation and no colour beyond the data palette.
 */

const usd = (value: number) => `$${value.toFixed(2)}`;

function Card({ card }: { card: SummaryCard }) {
  return (
    // A card holds links rather than being one, so it answers hover with a firmer border
    // and keyboard focus inside it with the accent: the accent is for interaction only.
    <li className="flex w-[16rem] shrink-0 flex-col rounded-md border border-rule bg-surface p-4 shadow-sm transition-colors focus-within:border-accent hover:border-rule-strong lg:w-auto">
      <h3 className="text-xs text-ink-mute">{card.label}</h3>

      <p className="mt-2 flex items-start gap-2 text-sm">
        <span className="mt-px">
          <CreatorLogo creator={card.creator} />
        </span>
        <span>
          <Link
            href={`/models/${card.model_id}`}
            prefetch={false}
            className="font-medium underline-offset-2 hover:underline"
          >
            {card.display_name}
          </Link>
          {card.variant !== "base" ? (
            <span className="font-mono text-xs text-ink-mute"> ({card.variant})</span>
          ) : null}
          <span className="block text-xs text-ink-mute">{card.creator}</span>
        </span>
      </p>

      <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-lg">
          {card.benchmark === null ? (
            <span className="tabular whitespace-nowrap">
              {formatScore(card.value, card.unit)}
              {card.confidence_interval !== null ? (
                <span className="text-ink-mute">
                  {" "}
                  ±{card.confidence_interval.toFixed(1)}
                </span>
              ) : null}
            </span>
          ) : (
            <ScoreCell
              value={card.value}
              unit={card.unit}
              confidenceInterval={card.confidence_interval}
              flags={card.health_flags ?? []}
            />
          )}
        </span>
        {card.provenance !== null ? (
          <ProvenanceBadge provenance={card.provenance} />
        ) : (
          <a className="text-xs text-ink-mute underline" href={card.source_url}>
            Arena
          </a>
        )}
      </p>

      {card.price !== null ? (
        <p className="mt-1 text-xs text-ink-mute">
          <QuotedValue quoted={card.price.input} format={usd} missingReason="" /> in,{" "}
          <QuotedValue quoted={card.price.output} format={usd} missingReason="" /> out,
          per million tokens
        </p>
      ) : null}

      {card.benchmark !== null && card.health_flags !== null ? (
        <p className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <StatusChip status={card.benchmark.status} />
          {/* The chip already says saturated or deprecated; see the home row. */}
          {card.health_flags.some(
            (flag) => flag !== "saturated" && flag !== "deprecated",
          ) ? (
            <HealthFlags
              flags={card.health_flags.filter(
                (flag) => flag !== "saturated" && flag !== "deprecated",
              )}
            />
          ) : null}
          <Link
            href={`/benchmarks/${card.benchmark.slug}`}
            prefetch={false}
            className="text-xs text-ink-mute underline"
          >
            about {card.benchmark.name}
          </Link>
        </p>
      ) : (
        <p className="mt-3 text-xs text-ink-mute">
          No health flags: no benchmark health record exists for an arena board.
        </p>
      )}

      {card.qualifier !== null ? (
        <p className="mt-2 text-xs text-ink-mute">{card.qualifier}</p>
      ) : null}
    </li>
  );
}

export function SummaryCards({
  cards,
  heading,
  more = null,
}: {
  cards: readonly SummaryCard[];
  heading: string;
  /** Where the rest of the cards are, when this shows only some of them. */
  more?: { href: "/models"; label: string } | null;
}) {
  if (cards.length === 0) return null;

  return (
    <section aria-labelledby="summary-cards" className="mt-8">
      <h2 id="summary-cards" className="text-sm font-medium">
        {heading}
      </h2>
      <p className="mt-1 max-w-[76ch] text-xs text-ink-mute">
        Each card is one row from the leaderboard, picked by the rule in its heading.
        &ldquo;Highest on a benchmark&rdquo; is not &ldquo;best&rdquo;.
      </p>
      <ul className="mt-3 flex gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] lg:overflow-visible lg:pb-0">
        {cards.map((card) => (
          <Card key={card.kind} card={card} />
        ))}
      </ul>
      {more !== null ? (
        <p className="mt-3 text-sm">
          <Link href={more.href} className="underline underline-offset-2">
            {more.label}
          </Link>
        </p>
      ) : null}
    </section>
  );
}
