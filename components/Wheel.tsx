"use client";

// The wheel: one petal per part of speech, filled outwards from a small inner circle,
// with a legend under it. See docs/design.md, "The wheel" ("Decided in U1").
// Presentational: stats in, petal taps out.

import type { KeyboardEvent } from "react";
import type { PartOfSpeech } from "@/lib/deck";
import { percentOf, petalPath, polarPoint, wheelSlices, type PetalShape, type ProgressStats } from "@/lib/progress";

/** Full radius of the wheel, in viewBox units. The viewBox is 358 by 256, leaving room for the labels. */
const RADIUS = 104;
/** Every petal reaches the same inner circle; gaps are by angle, so they narrow towards the centre. */
const PETAL: PetalShape = { innerRadius: 17, gap: (3.4 * Math.PI) / 180, outerCorner: 9, innerCorner: 4 };
const LABEL_RADIUS = RADIUS + 12;

/** Names for screen readers. */
export const POS_NAMES: Record<PartOfSpeech, string> = {
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

/** The short words outside the rim, cut where the full word would not fit a 390 px phone. */
export const POS_LABELS: Record<PartOfSpeech, string> = {
  noun: "nouns",
  verb: "verbs",
  adjective: "adjectives",
  adverb: "adverbs",
  pronoun: "pronouns",
  preposition: "prep.",
  conjunction: "conj.",
  determiner: "determiners",
  other: "other",
  phrase: "phrases",
};

/** Each petal's colours: its colour mixed into white for seen, full for memorized. Spelled out so Tailwind finds them. */
const POS_FILLS: Record<PartOfSpeech, { seen: string; memorized: string }> = {
  noun: { seen: "fill-pos-noun-seen", memorized: "fill-pos-noun" },
  verb: { seen: "fill-pos-verb-seen", memorized: "fill-pos-verb" },
  adjective: { seen: "fill-pos-adjective-seen", memorized: "fill-pos-adjective" },
  adverb: { seen: "fill-pos-adverb-seen", memorized: "fill-pos-adverb" },
  pronoun: { seen: "fill-pos-pronoun-seen", memorized: "fill-pos-pronoun" },
  preposition: { seen: "fill-pos-preposition-seen", memorized: "fill-pos-preposition" },
  conjunction: { seen: "fill-pos-conjunction-seen", memorized: "fill-pos-conjunction" },
  determiner: { seen: "fill-pos-determiner-seen", memorized: "fill-pos-determiner" },
  other: { seen: "fill-pos-other-seen", memorized: "fill-pos-other" },
  phrase: { seen: "fill-pos-phrase-seen", memorized: "fill-pos-phrase" },
};

export interface WheelProps {
  stats: ProgressStats;
  /** Called with the part of speech of a tapped petal. Without it the petals are not interactive. */
  onSliceTap?: (pos: PartOfSpeech) => void;
  className?: string;
}

export function Wheel({ stats, onSliceTap, className = "" }: WheelProps) {
  const slices = wheelSlices(stats, { radius: RADIUS, innerRadius: PETAL.innerRadius });
  const petal = (startAngle: number, endAngle: number, radius: number) => petalPath(startAngle, endAngle, radius, PETAL);

  return (
    <div className={`flex flex-col items-center gap-1.5 ${className}`}>
      <svg
        viewBox="-179 -128 358 256"
        role="group"
        aria-label={`Progress: ${stats.memorized} of ${stats.total} cards memorized, ${stats.seen} seen`}
        className="aspect-[358/256] h-[clamp(190px,30.5dvh,256px)] max-w-full"
        data-testid="wheel"
      >
        {slices.map((slice) => {
          const { pos, startAngle, endAngle } = slice;
          const name = POS_NAMES[pos];
          const fills = POS_FILLS[pos];
          const middle = (startAngle + endAngle) / 2;
          const at = polarPoint(middle, LABEL_RADIUS);
          // Labels read away from the rim: centred at the very bottom, otherwise starting or ending at it.
          const anchor = Math.abs(at.x) < LABEL_RADIUS / 10 ? "middle" : at.x > 0 ? "start" : "end";
          // Near the top a label sits on its baseline, near the bottom it hangs, and at the sides it is centred.
          const rise = -at.y / LABEL_RADIUS;
          const nudge = rise > 0.77 ? -1 : rise < -0.77 ? 11 : 4;
          const ghost = petal(startAngle, endAngle, RADIUS);
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
                className: "group cursor-pointer outline-none",
              }
            : {};

          return (
            <g
              key={pos}
              data-pos={pos}
              aria-label={`${name}: ${slice.memorized} memorized and ${slice.seen} seen, of ${slice.total}`}
              {...interactive}
            >
              {/* The whole petal stands for all its cards and takes the tap, filled or not. */}
              <path data-layer="ghost" d={ghost} className="fill-ghost" />
              <path data-layer="seen" d={petal(startAngle, endAngle, slice.seenRadius)} className={fills.seen} />
              <path
                data-layer="memorized"
                d={petal(startAngle, endAngle, slice.memorizedRadius)}
                className={fills.memorized}
              />
              {onSliceTap && (
                <path
                  d={ghost}
                  fill="none"
                  strokeWidth={2}
                  className="stroke-transparent group-focus-visible:stroke-ink"
                />
              )}
              <text
                x={at.x.toFixed(1)}
                y={(at.y + nudge).toFixed(1)}
                textAnchor={anchor}
                className="fill-ink-soft font-body"
                fontSize={11.5}
                fontWeight={600}
              >
                {POS_LABELS[pos]}
              </text>
            </g>
          );
        })}

        {/* With nothing memorized, a dot of the memorized colour shows the legend's second colour from the start. */}
        {stats.memorized === 0 && (
          <circle data-testid="wheel-centre-dot" r={7} pointerEvents="none" className="fill-ink" />
        )}
      </svg>

      <p data-testid="wheel-legend" className="flex gap-5.5 text-sm font-semibold text-ink">
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2.75 rounded-[3px] bg-ink/22" />
          <span data-testid="legend-seen">{percentOf(stats.seen, stats.total)}% seen</span>
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2.75 rounded-[3px] bg-ink" />
          <span data-testid="legend-memorized">{percentOf(stats.memorized, stats.total)}% memorized</span>
        </span>
      </p>
    </div>
  );
}
