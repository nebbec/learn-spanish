"use client";

import { playClip } from "@/components/audio";
import { AudioButton } from "@/components/card/Reveal";
import type { Card, DeckUnit } from "@/lib/deck";

export interface UnitPayoffProps {
  unit: DeckUnit;
  /** The unit's phrase cards, in deck order. */
  phrases: readonly Card[];
  /** Plays a clip, given its path. Defaults to `playClip`. */
  onPlay?: (src: string) => void;
}

/**
 * The top of a unit's batch end: what the learner can now say, with the unit's phrase
 * cards and their audio. See "Units in Learn" in docs/design.md.
 */
export function UnitPayoff({ unit, phrases, onPlay = playClip }: UnitPayoffProps) {
  return (
    <section data-testid="unit-payoff" aria-label="Now you can say" className="flex w-full flex-col gap-2">
      <p data-testid="unit-goal" className="text-lg font-bold">
        Now you can {unit.goal}
      </p>
      {phrases.length > 0 && (
        <ul className="flex w-full flex-col gap-2">
          {phrases.map((card) => (
            <li
              key={card.id}
              data-testid="payoff-phrase"
              data-card={card.id}
              className="flex items-center gap-2 rounded-button bg-paper p-3 text-left"
            >
              <p className="flex flex-1 flex-col gap-0.5">
                <span lang="es" className="text-lg font-bold">
                  {card.es}
                </span>
                <span className="text-ink-soft">{card.en}</span>
              </p>
              <AudioButton
                label={`Play “${card.es}”`}
                testId={`payoff-play-${card.id}`}
                onPress={() => onPlay(card.audio.word)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
