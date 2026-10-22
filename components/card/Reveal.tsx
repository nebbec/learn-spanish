"use client";

import type { ReactNode } from "react";
import { playClip, useAutoplay } from "@/components/audio";
import { useMotion } from "@/components/motion";
import { LANG } from "@/lang";
import type { Card, DeckTip } from "@/lib/deck";
import type { ButtonRating, Rating } from "@/lib/store";
import { CharacterSlot } from "./CardFront";
import { GrammarStrip } from "./GrammarStrip";
import { splitGluePrompt } from "./gluePrompt";
import { TipButton } from "./Tip";

/** The three rating buttons, in the order they sit on screen. */
export const RATING_BUTTONS: { rating: ButtonRating; label: string; className: string }[] = [
  { rating: "again", label: "Didn't have it", className: "bg-again text-on-again" },
  { rating: "nearly", label: "Nearly", className: "bg-nearly text-on-nearly" },
  { rating: "good", label: "Got it", className: "bg-good text-on-good" },
];

export interface RevealProps {
  card: Card;
  /** Fired once per press of a rating button. */
  onRate: (rating: Rating) => void;
  /** Plays a clip, given its path. Defaults to `playClip`. */
  onPlay?: (src: string) => void;
  /**
   * The character's move. It wiggles when the reveal opens; the session passes
   * `jump` after a green and `droop` after a red.
   */
  move?: "wiggle" | "jump" | "droop";
  /** Extra content under the card details, above the rating buttons: C3's note field and report button. */
  children?: ReactNode;
  /** The tip the card names, if the deck ships it: a "?" opens it over the card. */
  tip?: DeckTip;
}

/**
 * The answer side of a card: the answer, its grammar, the example sentence and
 * audio, with the three rating buttons pinned to the bottom. It looks the same
 * in both directions, so it takes no `direction`. The word clip plays when it
 * opens, unless muted.
 */
export function Reveal({ card, onRate, onPlay = playClip, move = "wiggle", children, tip }: RevealProps) {
  const motion = useMotion();
  useAutoplay(card.audio.word, onPlay);
  return (
    <div
      data-testid="reveal"
      data-card-id={card.id}
      data-enter={motion ? "reveal" : undefined}
      className="flex min-h-0 flex-1 flex-col gap-3"
    >
      <div className="relative flex min-h-0 flex-1 flex-col items-center gap-3 overflow-y-auto overscroll-contain rounded-card border-2 border-line bg-surface p-5 text-center shadow-card">
        {tip && <TipButton tip={tip} onPlay={onPlay} className="absolute right-3 top-3" />}
        {/* With a "?" in the corner, the character keeps clear of it on both sides. */}
        <CharacterSlot image={card.image} className={`max-h-36 min-h-20 ${tip ? "px-12" : ""}`} move={move} />

        {/* With a "?" and no character above it, the answer starts below the "?". */}
        <div data-testid="answer-block" className={`flex flex-col items-center gap-1 ${tip && !card.image ? "pt-10" : ""}`}>
          <div className="flex items-center gap-2">
            <span data-testid="answer" lang={LANG.tag} className="font-display text-answer font-bold">
              {card.target}
            </span>
            <AudioButton label="Play the word" testId="play-word" onPress={() => onPlay(card.audio.word)} />
          </div>
          <span
            data-testid="pos"
            className="rounded-chip bg-brand-soft px-2 py-0.5 text-sm font-bold uppercase tracking-wide text-ink"
          >
            {card.pos}
          </span>
          <Meaning card={card} />
        </div>

        <GrammarStrip card={card} />

        <WhyLine card={card} />

        <div className="flex w-full items-start gap-2 rounded-button bg-quiet p-3 text-left">
          <p className="flex flex-1 flex-col gap-0.5">
            <span data-testid="example-es" lang={LANG.tag} className="text-lg font-bold">
              {card.example.target}
            </span>
            <span data-testid="example-en" className="text-ink-soft">
              {card.example.en}
            </span>
          </p>
          <AudioButton label="Play the sentence" testId="play-sentence" onPress={() => onPlay(card.audio.sentence)} />
        </div>

        {card.regional && (
          <p data-testid="regional" className="text-sm text-ink-soft">
            {card.regional.where}: <span lang={LANG.tag}>{card.regional.text}</span>
          </p>
        )}

        {children}
      </div>

      <div role="group" aria-label="Rate your answer" className="grid grid-cols-3 gap-2">
        {RATING_BUTTONS.map(({ rating, label, className }) => (
          <button
            key={rating}
            type="button"
            data-testid={`rate-${rating}`}
            onClick={() => onRate(rating)}
            className={`min-h-16 rounded-button px-2 py-3 font-display text-lg font-bold leading-tight ${className}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The English, small, under the answer. Glue and case prompts keep their highlighted target. */
export function Meaning({ card }: { card: Card }) {
  const glue = card.kind === "glue" || card.kind === "case" ? splitGluePrompt(card.en) : null;
  return (
    <span data-testid="meaning" className="text-ink-soft">
      {glue ? (
        <>
          {glue.before}
          <mark className="rounded-chip bg-sun px-1 text-ink">{glue.target}</mark>
          {glue.after}
        </>
      ) : (
        card.en
      )}
      {card.hint && ` (${card.hint})`}
    </span>
  );
}

/** The one-line contrast with a near neighbour ("Use estar for how or where…"), on the intro and the reveal. */
export function WhyLine({ card }: { card: Card }) {
  if (!card.why) return null;
  return (
    <p data-testid="why" className="w-full rounded-button bg-quiet p-3 text-left">
      {card.why}
    </p>
  );
}

export function AudioButton({ label, testId, onPress }: { label: string; testId: string; onPress: () => void }) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-label={label}
      onClick={onPress}
      className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-on-brand"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-current">
        <path d="M4 9v6h4l5 4V5L8 9H4z" />
        <path
          d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
