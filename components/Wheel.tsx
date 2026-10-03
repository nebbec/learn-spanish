"use client";

// The wheel: one slice per part of speech, filled from the centre outwards.
// See docs/design.md, "The wheel". Presentational: stats in, slice taps out.

import type { KeyboardEvent } from "react";
import type { PartOfSpeech } from "@/lib/deck";
import { polarPoint, sectorPath, wheelSlices, type ProgressStats } from "@/lib/progress";

/** Full radius of the wheel, in viewBox units. */
const RADIUS = 100;
const LABEL_RADIUS = RADIUS + 10;

export const POS_LABELS: Record<PartOfSpeech, string> = {
  noun: "Nouns",
  verb: "Verbs",
  adjective: "Adjectives",
  adverb: "Adverbs",
  pronoun: "Pronouns",
  preposition: "Prepositions",
  conjunction: "Conjunctions",
  determiner: "Determiners",
  other: "Other",
  phrase: "Phrases",
};

export interface WheelProps {
  stats: ProgressStats;
  /** Called with the part of speech of a tapped slice. Without it the slices are not interactive. */
  onSliceTap?: (pos: PartOfSpeech) => void;
  className?: string;
}

export function Wheel({ stats, onSliceTap, className }: WheelProps) {
  const slices = wheelSlices(stats, { radius: RADIUS });

  return (
    <svg
      viewBox="-185 -130 370 260"
      role="group"
      aria-label={`Progress: ${stats.memorized} of ${stats.total} cards memorized, ${stats.seen} seen`}
      className={className}
      data-testid="wheel"
    >
      {/* The empty wheel, visible wherever a slice is not filled. */}
      <circle r={RADIUS} className="fill-surface stroke-line" strokeWidth={2} />

      {slices.map((slice) => {
        const { pos, startAngle, endAngle } = slice;
        const label = POS_LABELS[pos];
        const middle = (startAngle + endAngle) / 2;
        const at = polarPoint(middle, LABEL_RADIUS);
        // Labels sit outside the rim and read away from it; near the top and bottom they are centred.
        const anchor = Math.abs(at.x) < 30 ? "middle" : at.x > 0 ? "start" : "end";
        const interactive = onSliceTap
          ? {
              role: "button",
              tabIndex: 0,
              onClick: () => onSliceTap(pos),
              onKeyDown: (event: KeyboardEvent) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                onSliceTap(pos);
              },
              className: "cursor-pointer outline-none focus-visible:[&_[data-layer=hit]]:stroke-ink",
            }
          : {};

        return (
          <g
            key={pos}
            data-pos={pos}
            aria-label={`${label}: ${slice.memorized} memorized and ${slice.seen} seen, of ${slice.total}`}
            {...interactive}
          >
            <path
              data-layer="seen"
              d={sectorPath(startAngle, endAngle, slice.seenRadius)}
              className="fill-brand-soft"
            />
            <path
              data-layer="memorized"
              d={sectorPath(startAngle, endAngle, slice.memorizedRadius)}
              className="fill-brand"
            />
            {/* The whole slice takes the tap, filled or not, and draws the slice's outline. */}
            <path
              data-layer="hit"
              d={sectorPath(startAngle, endAngle, RADIUS)}
              fill="transparent"
              className="stroke-line"
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
            <text
              x={at.x.toFixed(1)}
              y={at.y.toFixed(1)}
              textAnchor={anchor}
              dominantBaseline="middle"
              className="fill-ink-soft font-body"
              fontSize={11}
              fontWeight={700}
            >
              {label}
            </text>
          </g>
        );
      })}

      {/* The headline count. A halo keeps it readable over the fill; taps pass through to the slices. */}
      <g
        data-testid="wheel-centre"
        aria-hidden="true"
        pointerEvents="none"
        textAnchor="middle"
        className="fill-ink stroke-surface font-display"
        strokeLinejoin="round"
        paintOrder="stroke"
      >
        <text y={2} fontSize={34} fontWeight={800} strokeWidth={5}>
          {stats.memorized}
        </text>
        <text y={18} fontSize={11} fontWeight={700} strokeWidth={3.5}>
          of {stats.total}
        </text>
      </g>
    </svg>
  );
}
