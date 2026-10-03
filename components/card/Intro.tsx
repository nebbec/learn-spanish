"use client";

import { useMotion } from "@/components/motion";
import type { Card, DeckTip } from "@/lib/deck";
import type { IntroChoice } from "@/lib/queues";
import { CharacterSlot } from "./CardFront";
import { splitGluePrompt } from "./gluePrompt";
import { AudioButton, GrammarStrip, Meaning, playClip, WhyLine } from "./Reveal";
import { TipButton } from "./Tip";

export interface IntroProps {
  card: Card;
  /**
   * For a later meaning: the meaning of the same word already seen, which adds the line
   * "You know *esperar* = to wait. It also means:". Learn works it out with `earlierMeaning`.
   */
  earlier?: Card;
  /** Fired once per press of "Got it" or "I already know this". */
  onChoose: (choice: IntroChoice) => void;
  /** Plays a clip, given its path. Defaults to `playClip`. */
  onPlay?: (src: string) => void;
  /** The tip the card names, if the deck ships it: a "?" opens it over the card. */
  tip?: DeckTip;
}

/**
 * A new card shown before its first test, in Learn: the character, the Spanish with its
 * audio, the English, the grammar strip and the `why` line. "Got it" sends the card on to
 * its test later in the batch; "I already know this" rates it `known`. Never rated as a
 * test. See "Intro, then test" in docs/design.md.
 */
export function Intro({ card, earlier, onChoose, onPlay = playClip, tip }: IntroProps) {
  const motion = useMotion();
  return (
    <div
      data-testid="intro"
      data-card-id={card.id}
      data-kind={card.kind}
      data-enter={motion ? "card" : undefined}
      className="flex min-h-0 flex-1 flex-col gap-3"
    >
      <div className="relative flex min-h-0 flex-1 flex-col items-center gap-3 overflow-y-auto overscroll-contain rounded-card border-2 border-line bg-surface p-5 text-center shadow-card">
        {tip && <TipButton tip={tip} onPlay={onPlay} className="absolute right-3 top-3" />}
        <span className="text-sm font-bold uppercase tracking-wide text-ink-soft">New card</span>
        {earlier && <EarlierLine earlier={earlier} />}
        {/* With a "?" in the corner, the character keeps clear of it on both sides. */}
        <CharacterSlot image={card.image} className={`max-h-40 min-h-20 ${tip ? "px-12" : ""}`} move="pop" />

        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <span data-testid="intro-es" lang="es" className="font-display text-answer font-bold">
              {card.es}
            </span>
            <AudioButton label="Play the word" testId="play-word" onPress={() => onPlay(card.audio.word)} />
          </div>
          <span
            data-testid="pos"
            className="rounded-chip bg-brand-soft px-2 py-0.5 text-sm font-bold uppercase tracking-wide text-brand"
          >
            {card.pos}
          </span>
          <Meaning card={card} />
        </div>

        <GrammarStrip card={card} />

        <WhyLine card={card} />
      </div>

      <div role="group" aria-label="New card" className="grid grid-cols-2 gap-2">
        <button
          type="button"
          data-testid="intro-known"
          onClick={() => onChoose("known")}
          className="min-h-16 rounded-button bg-good-soft px-2 py-3 font-display text-lg font-bold leading-tight text-good"
        >
          I already know this
        </button>
        <button
          type="button"
          data-testid="intro-got-it"
          onClick={() => onChoose("got-it")}
          className="min-h-16 rounded-button bg-brand px-2 py-3 font-display text-lg font-bold leading-tight text-on-brand"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

/** "You know esperar = to wait. It also means:", from the meaning already seen. */
function EarlierLine({ earlier }: { earlier: Card }) {
  const meaning = earlier.kind === "glue" ? splitGluePrompt(earlier.en).target : earlier.en;
  return (
    <p data-testid="earlier-meaning" className="text-lg">
      You know{" "}
      <em lang="es" className="font-bold">
        {earlier.es}
      </em>{" "}
      = {meaning}. It also means:
    </p>
  );
}
