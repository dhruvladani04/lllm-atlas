"use client";

import dynamic from "next/dynamic";
import { TrajectoryStill } from "@/components/evals/trajectory-scene";

/**
 * specs/03-sections/evals.md — `<Scene id="..." fallback="...">`.
 *
 * A client wrapper, because `ssr: false` is how the scene is kept out of the server
 * render — and out of any data route's bundle, since nothing on /models or /benchmarks
 * imports it. Every
 * scene ships a still diagram carrying the same information, which renders while the scene
 * loads, when JavaScript is unavailable, and under `prefers-reduced-motion`. A scene that
 * cannot be reduced to a still diagram is explaining nothing and does not belong in a guide.
 */

const SCENES = {
  "agent-trajectory": {
    still: TrajectoryStill,
    component: dynamic(() => import("@/components/evals/trajectory-scene"), {
      ssr: false,
      loading: () => <TrajectoryStill />,
    }),
  },
} as const;

export type SceneId = keyof typeof SCENES;

export function Scene({ id, caption }: { id: SceneId; caption: string }) {
  const entry = SCENES[id];
  if (entry === undefined) return null;
  const Animated = entry.component;

  return (
    <figure className="my-8">
      <noscript>
        <entry.still />
      </noscript>
      <Animated />
      <figcaption className="mt-2 max-w-[66ch] text-xs text-ink-mute">
        {caption}
      </figcaption>
    </figure>
  );
}
