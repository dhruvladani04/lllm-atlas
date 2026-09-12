"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

/**
 * The scene the agentic guide is built around — specs/04-design/design-system.md, "3D and
 * scroll-driven scenes".
 *
 * It shows one thing prose cannot: a run that reaches the right answer through the wrong
 * path. Response-level scoring sees only the last node and calls it a pass; trajectory
 * scoring sees the six steps before it and calls it a failure. That is a process, and a
 * still picture of a process is a worse explanation than a moving one.
 *
 * Achromatic, per the colour rule: the only colour is the one that already encodes a fact
 * elsewhere on the site — a wrong step is marked the way a contaminated benchmark is.
 * Under `prefers-reduced-motion` the whole diagram renders at once, which is the same
 * argument delivered in one beat instead of seven.
 */

interface Step {
  label: string;
  detail: string;
  wrong: boolean;
}

const STEPS: Step[] = [
  {
    label: "search_docs",
    detail: "Right tool, right arguments. A reasonable opening.",
    wrong: false,
  },
  {
    label: "search_docs",
    detail: "Same call, same arguments, same result. The loop starts here.",
    wrong: true,
  },
  {
    label: "read_file",
    detail: "Right tool, wrong path — a file that does not exist.",
    wrong: true,
  },
  {
    label: "read_file",
    detail: "Retries the same missing path rather than listing the directory.",
    wrong: true,
  },
  {
    label: "run_tests",
    detail: "Runs the suite before writing any fix. Nothing has changed.",
    wrong: true,
  },
  {
    label: "list_dir",
    detail: "Finally looks. The information was one call away for four steps.",
    wrong: false,
  },
  {
    label: "edit_file",
    detail: "Correct edit, derived from what the listing showed.",
    wrong: false,
  },
  {
    label: "run_tests",
    detail: "Passes. Response-level scoring records a success here.",
    wrong: false,
  },
];

const WIDTH = 680;
const ROW = 46;
const HEIGHT = STEPS.length * ROW + 40;

function StepRow({
  step,
  index,
  opacity,
}: {
  step: Step;
  index: number;
  opacity?: number;
}) {
  const y = 24 + index * ROW;
  return (
    <g opacity={opacity}>
      {index > 0 ? (
        <line x1={40} y1={y - ROW + 8} x2={40} y2={y - 8} stroke="var(--rule-strong)" />
      ) : null}
      {step.wrong ? (
        <rect
          x={34}
          y={y - 6}
          width={12}
          height={12}
          fill="none"
          stroke="var(--risk-high)"
          strokeWidth="1.5"
        />
      ) : (
        <circle cx={40} cy={y} r="5" fill="var(--ink)" />
      )}
      <text
        x={60}
        y={y + 4}
        fontSize="13"
        fill="var(--ink)"
        fontFamily="var(--font-mono)"
      >
        {step.label}
      </text>
      <text x={200} y={y + 4} fontSize="12" fill="var(--ink-mute)">
        {step.detail}
      </text>
      {step.wrong ? (
        <text x={16} y={y + 4} fontSize="11" fill="var(--risk-high)" textAnchor="middle">
          ×
        </text>
      ) : null}
    </g>
  );
}

function Diagram({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label="An eight-step agent trajectory. Steps two to five are wrong: a repeated search, two reads of a path that does not exist, and a test run before any fix. Step six finally lists the directory, step seven makes the correct edit, and step eight passes the tests. Response-level scoring sees only step eight."
    >
      {children}
    </svg>
  );
}

/** What renders under reduced motion, and before the scene is scrolled: the whole argument at once. */
export function TrajectoryStill() {
  return (
    <Diagram>
      {STEPS.map((step, index) => (
        <StepRow key={`${step.label}-${index}`} step={step} index={index} />
      ))}
    </Diagram>
  );
}

export default function TrajectoryScene() {
  const container = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start end", "end start"],
  });
  const revealed = useTransform(scrollYProgress, [0.15, 0.75], [0, STEPS.length]);

  if (reduced) {
    return (
      <div className="my-8">
        <TrajectoryStill />
        <p className="mt-2 text-xs text-ink-mute">
          Shown in full because your system asks for reduced motion.
        </p>
      </div>
    );
  }

  return (
    <div ref={container} className="my-8">
      <div className="sticky top-8">
        <Diagram>
          {STEPS.map((step, index) => (
            <StepReveal
              key={`${step.label}-${index}`}
              step={step}
              index={index}
              revealed={revealed}
            />
          ))}
        </Diagram>
      </div>
      <div style={{ height: `${STEPS.length * 8}vh` }} aria-hidden="true" />
    </div>
  );
}

function StepReveal({
  step,
  index,
  revealed,
}: {
  step: Step;
  index: number;
  revealed: ReturnType<typeof useTransform<number, number>>;
}) {
  const opacity = useTransform(revealed, (value) =>
    value > index ? 1 : Math.max(0.12, value - index + 1),
  );

  return (
    <motion.g style={{ opacity }}>
      <StepRow step={step} index={index} />
    </motion.g>
  );
}
