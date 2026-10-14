"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import type { ScoreGroup, ScoreLine } from "@/lib/models/score-groups";
import {
  HealthFlags,
  MissingValue,
  ProvenanceBadge,
  ScoreCell,
  StatusChip,
} from "@/components/data/primitives";

/**
 * specs/03-sections/leaderboard.md — the model page's scores.
 *
 * One table for every capability, so the columns line up from the first group to the
 * last; each capability is a row group with its own heading row. A benchmark measured in
 * several configurations shows its best one and a button listing the rest, which are
 * rendered only once asked for.
 */

export interface ScoreSection {
  heading: string;
  /** Benchmarks that no longer discriminate, shown recessed and introduced as such. */
  recessed: boolean;
  groups: ScoreGroup[];
}

const COLUMNS = [
  "Benchmark",
  "Config",
  "Score",
  "Harness",
  "Provenance",
  "Measured",
  "Health",
];

function Line({
  line,
  nested,
  toggle,
}: {
  line: ScoreLine;
  /** A configuration listed under its group's best. */
  nested: boolean;
  toggle: React.ReactNode;
}) {
  return (
    <tr className={`row-hover border-b border-rule ${nested ? "text-ink-mute" : ""}`}>
      <td className={`py-2 pr-3 ${nested ? "pl-4" : ""}`}>
        {nested ? (
          <span className="sr-only">{line.benchmark_name}, another configuration</span>
        ) : (
          <>
            {/* Internal, matching the leaderboard: the benchmark page attributes benchwiki
                and links onward, and carries the reverse lookup back to this model. */}
            <Link
              className="underline-offset-2 hover:underline"
              href={`/benchmarks/${line.benchmark_slug}`}
            >
              {line.benchmark_name}
            </Link>
            <span className="block">
              <StatusChip status={line.status} />
            </span>
          </>
        )}
      </td>
      <td className="py-2 pr-3 font-mono text-xs">
        <span
          className={line.variant === "base" ? "text-ink-mute" : ""}
          title="The setting this score was measured at, such as reasoning effort"
        >
          {line.variant}
        </span>
        {toggle}
      </td>
      <td className="py-2 pr-3 text-right">
        <ScoreCell
          value={line.value}
          unit={line.unit}
          confidenceInterval={line.confidence_interval}
          flags={line.health_flags}
        />
      </td>
      <td className="py-2 pr-3 font-mono text-xs">
        {line.harness ?? <MissingValue reason="Not run under a named agent harness" />}
      </td>
      <td className="py-2 pr-3">
        <ProvenanceBadge provenance={line.provenance} />
      </td>
      <td className="tabular py-2 pr-3 text-xs">
        {line.measured_at ?? (
          <MissingValue reason="The source did not state when this was measured" />
        )}
      </td>
      <td className="py-2">
        <HealthFlags flags={line.health_flags} />
      </td>
    </tr>
  );
}

function Group({ group }: { group: ScoreGroup }) {
  const [open, setOpen] = useState(false);
  const count = group.others.length;
  return (
    <>
      <Line
        line={group.best}
        nested={false}
        toggle={
          count > 0 ? (
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
              className="mt-1 block font-sans text-xs text-ink-mute underline underline-offset-2 hover:text-accent"
            >
              {open ? "hide the others" : `best of ${count + 1} — show ${count} more`}
            </button>
          ) : null
        }
      />
      {open
        ? group.others.map((line) => (
            <Line key={line.key} line={line} nested toggle={null} />
          ))
        : null}
    </>
  );
}

export function ScoreTable({ sections }: { sections: ScoreSection[] }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-rule-strong text-left">
            {COLUMNS.map((column) => (
              <th
                key={column}
                scope="col"
                className={`py-2 pr-3 font-medium ${column === "Score" ? "text-right" : ""}`}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        {sections.map((section) => (
          <tbody key={section.heading}>
            <tr>
              <th
                scope="colgroup"
                colSpan={COLUMNS.length}
                className={`pt-5 pb-1 text-left text-sm font-medium ${
                  section.recessed ? "text-ink-mute" : ""
                }`}
              >
                {section.heading}
                {section.recessed ? (
                  <span className="block text-xs font-normal">
                    Kept visible on purpose. These are often the numbers a launch
                    announcement leads with.
                  </span>
                ) : null}
              </th>
            </tr>
            {section.groups.map((group) => (
              <Fragment key={group.key}>
                <Group group={group} />
              </Fragment>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}
