"use client";

import { useRef, useState, type PointerEvent } from "react";
import { useMotion, type Move } from "@/components/motion";
import { LANG } from "@/lang";
import type { Card } from "@/lib/deck";
import type { Direction } from "@/lib/store";
import { splitGluePrompt } from "./gluePrompt";
import { GapSentence, PairPrompt, prepositionGrammar } from "./prepositionFaces";

/** How far down, in CSS pixels, a drag must travel to count as a swipe. */
export const SWIPE_DISTANCE = 40;

export interface CardFrontProps {
  card: Card;
  /** `forward` shows the English prompt; `reverse` shows the answer, in the language being learned. Defaults to forward. */
  direction?: Direction;
  /** Fired once per tap, key press or downward swipe. */
  onReveal: () => void;
}

/**
 * The side of a card shown before the answer. The whole card is one button:
 * tapping it, pressing Enter or Space on it, or swiping down on it asks for the reveal.
 */
export function CardFront({ card, direction = "forward", onReveal }: CardFrontProps) {
  const start = useRef<{ x: number; y: number } | null>(null);
  // A swipe is followed by a click on the same element; this stops it revealing twice.
  const swiped = useRef(false);
  const motion = useMotion();

  function onPointerDown(e: PointerEvent) {
    start.current = { x: e.clientX, y: e.clientY };
    swiped.current = false;
  }

  function onPointerUp(e: PointerEvent) {
    const from = start.current;
    start.current = null;
    if (!from) return;
    const dx = e.clientX - from.x;
    const dy = e.clientY - from.y;
    if (dy >= SWIPE_DISTANCE && dy > Math.abs(dx)) {
      swiped.current = true;
      onReveal();
    }
  }

  function onClick() {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    onReveal();
  }

  return (
    <button
      type="button"
      data-testid="card-front"
      data-card-id={card.id}
      data-kind={card.kind}
      data-direction={direction}
      data-enter={motion ? "card" : undefined}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (start.current = null)}
      onClick={onClick}
      // touch-none: the browser leaves the drag to us instead of scrolling or refreshing.
      className="flex min-h-0 w-full flex-1 touch-none select-none flex-col items-center gap-4 rounded-card border-2 border-line bg-surface p-6 text-center shadow-card"
    >
      {direction === "reverse" ? (
        card.kind === "pair" ? (
          <PairReverseFace card={card} />
        ) : card.kind === "gap" ? (
          <GapReverseFace card={card} />
        ) : (
          <ReverseFace card={card} />
        )
      ) : card.kind === "pair" ? (
        <PairFace card={card} />
      ) : card.kind === "gap" ? (
        <GapFace card={card} />
      ) : card.kind === "glue" || card.kind === "case" ? (
        <GlueFace card={card} />
      ) : card.kind === "phrase" ? (
        <PhraseFace card={card} />
      ) : (
        <ContentFace card={card} />
      )}
      <span className="text-sm font-bold text-ink-soft">Tap or swipe down to reveal</span>
    </button>
  );
}

/** Content and form cards: the character over the English. A form card's character is its verb's. */
function ContentFace({ card }: { card: Card }) {
  return (
    <>
      <CharacterSlot image={card.image} move="pop" />
      <span className="flex flex-col gap-1">
        <span data-testid="prompt" className="font-display text-prompt font-bold">
          {card.en}
        </span>
        <Hint hint={card.hint} />
        <SayIt card={card} />
      </span>
    </>
  );
}

/** Glue and case cards: the English phrase with its target marked, and no character. */
function GlueFace({ card }: { card: Card }) {
  const { before, target, after } = splitGluePrompt(card.en);
  return (
    <span className="flex flex-1 flex-col items-center justify-center gap-3">
      <span data-testid="prompt" className="font-display text-prompt font-bold">
        {before}
        <mark data-testid="target" className="rounded-chip bg-sun px-1.5 text-ink">
          {target}
        </mark>
        {after}
      </span>
      <Hint hint={card.hint} />
      <SayIt card={card} />
    </span>
  );
}

/** The glue layout with nothing marked: a phrase card asks for the whole phrase, and has no character. */
function PhraseFace({ card }: { card: Card }) {
  return (
    <span className="flex flex-1 flex-col items-center justify-center gap-3">
      <span data-testid="prompt" className="font-display text-prompt font-bold">
        {card.en}
      </span>
      <Hint hint={card.hint} />
      <SayIt card={card} />
    </span>
  );
}

/** A pair card: the verb and its objects with a blank for the preposition, and the item's gloss under it. */
function PairFace({ card }: { card: Card }) {
  const grammar = prepositionGrammar(card);
  return (
    <span className="flex flex-1 flex-col items-center justify-center gap-3">
      {grammar && <PairPrompt grammar={grammar} />}
      <span data-testid="gloss" className="text-lg text-ink-soft">
        {card.en}
      </span>
      <Hint hint={card.hint} />
      <SayIt card={card} />
    </span>
  );
}

/** A gap card: its sentence with one blank line per blanked word, and the sentence's English under it. */
function GapFace({ card }: { card: Card }) {
  return (
    <span className="flex flex-1 flex-col items-center justify-center gap-3">
      <GapSentence sentence={card.example.target} blank testId="prompt" className="font-display text-2xl font-bold leading-snug" />
      <span data-testid="sentence-en" className="text-lg text-ink-soft">
        {card.en}
      </span>
      <Hint hint={card.hint} />
      <SayIt card={card} />
    </span>
  );
}

/** A pair card in Reverse: the gloss first, the whole pattern on the back. */
function PairReverseFace({ card }: { card: Card }) {
  return (
    <span className="flex flex-1 flex-col items-center justify-center gap-3">
      <span data-testid="prompt" className="font-display text-prompt font-bold">
        {card.en}
      </span>
      <Hint hint={card.hint} />
      <span className="text-ink-soft">How does it go in {LANG.language}?</span>
    </span>
  );
}

/** A gap card in Reverse: the whole sentence, its gap filled in, to understand. */
function GapReverseFace({ card }: { card: Card }) {
  return (
    <span className="flex flex-1 flex-col items-center justify-center gap-3">
      <GapSentence sentence={card.example.target} blank={false} testId="prompt" className="font-display text-2xl font-bold leading-snug" />
      <span className="text-ink-soft">What does it mean?</span>
    </span>
  );
}

/** The language being learned first. No character and no English hint: either would give the answer away. */
function ReverseFace({ card }: { card: Card }) {
  return (
    <span className="flex flex-1 flex-col items-center justify-center gap-3">
      <span data-testid="prompt" lang={LANG.tag} className="font-display text-answer font-bold">
        {card.target}
      </span>
      <span className="text-ink-soft">What does it mean?</span>
    </span>
  );
}

/** In the starter path (a card with a unit), the forward front asks for the answer out loud. */
function SayIt({ card }: { card: Card }) {
  if (!card.unit) return null;
  return (
    <span data-testid="say-it" className="text-base font-bold text-ink-soft">
      Say it out loud
    </span>
  );
}

function Hint({ hint }: { hint: string | null }) {
  if (!hint) return null;
  return (
    <span data-testid="hint" className="text-lg text-ink-soft">
      ({hint})
    </span>
  );
}

/**
 * Where a content card's character goes. A plain `<img>`: deck art is a static
 * file the service worker caches, and the Next image optimiser needs a server.
 * `move` is the move the character plays; changing it plays the new one. It is
 * dropped when motion is reduced. Art that fails to load leaves the slot out, so
 * a card whose still is not made yet (F2) shows no broken image.
 */
export function CharacterSlot({
  image,
  className = "",
  move,
}: {
  image: string | null;
  className?: string;
  move?: Move;
}) {
  const motion = useMotion();
  const [failed, setFailed] = useState<string | null>(null);
  if (!image || failed === image) return null;
  return (
    <span
      data-testid="character"
      data-move={motion ? move : undefined}
      className={`flex min-h-0 w-full flex-1 items-center justify-center ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image}
        alt=""
        draggable={false}
        onError={() => setFailed(image)}
        className="max-h-full max-w-full object-contain"
      />
    </span>
  );
}
