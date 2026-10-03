"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { BatchFrame, CardExtras, CardFront, Intro, Reveal, TipScreen, type ExtrasStore } from "@/components/card";
import { MOVE_MS, useMotion } from "@/components/motion";
import type { Card, DeckTip } from "@/lib/deck";
import { tipOf, type Step } from "@/lib/queues";
import type { Rating } from "@/lib/store";
import type { Session } from "./useSession";

export interface SessionViewProps {
  session: Session;
  /** Shows the frame's close button when given. */
  onClose?: () => void;
  /** Passed to the note field and report button. Defaults to the app's shared store. */
  store?: ExtrasStore;
  /** What to show once every card is rated: the batch-end screen. */
  children: ReactNode;
  /** Called once when every card is rated and stored. */
  onFinish?: () => void;
  /** For an intro: the meaning of the same word already seen, if any. Learn passes `earlierMeaning`. */
  earlierMeaning?: (card: Card) => Card | undefined;
  /** The tips the deck ships, for the "?" on the intro and reveal of a card naming one. */
  tips?: readonly DeckTip[];
  /** The frame's title for the step on screen (Learn: the unit's name), if any. */
  title?: (step: Step | undefined) => string | undefined;
}

/** The character's answer to a rating. Orange has none. */
const RATING_MOVE: Partial<Record<Rating, "jump" | "droop">> = { good: "jump", again: "droop" };

/** A rated card kept on screen while its character finishes its move. */
interface Leaving {
  card: Card;
  index: number;
  total: number;
  move: "jump" | "droop";
}

/**
 * Draws a session: the batch frame, then the front or the reveal of the card
 * on screen. After a green or a red on a card with a character, the reveal
 * stays for the length of the jump or droop. The rating is stored straight
 * away; only the change of card waits.
 */
export function SessionView({
  session,
  onClose,
  store,
  children,
  onFinish,
  earlierMeaning,
  tips = [],
  title,
}: SessionViewProps) {
  const motion = useMotion();
  const finish = useRef(onFinish);
  useEffect(() => {
    finish.current = onFinish;
  });
  useEffect(() => {
    if (session.finished) finish.current?.();
  }, [session.finished]);
  const [leaving, setLeaving] = useState<Leaving | null>(null);
  const held = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const { index, batch } = session;

  function rate(rating: Rating) {
    // The card on screen is already rated and on its way out.
    if (held.current) return;
    const move = RATING_MOVE[rating];
    const rated = session.card;
    if (motion && move && rated?.image) {
      held.current = true;
      setLeaving({ card: rated, index, total: batch.length, move });
      timer.current = setTimeout(() => {
        held.current = false;
        setLeaving(null);
      }, MOVE_MS[move]);
    }
    void session.rate(rating);
  }

  const card = leaving?.card ?? session.card;
  const shownIndex = leaving?.index ?? index;
  return (
    <BatchFrame
      total={leaving?.total ?? batch.length}
      index={shownIndex}
      onClose={onClose}
      title={title?.(batch[shownIndex])}
    >
      {!card ? (
        children
      ) : !leaving && session.step?.kind === "tip" ? (
        <TipScreen key={index} tip={session.step.tip} onDone={session.passTip} />
      ) : !leaving && session.step?.kind === "intro" ? (
        // Keyed by position, like the front, so each step starts fresh.
        <div key={index} className="flex min-h-0 flex-1 flex-col gap-3">
          <Intro
            card={card}
            earlier={earlierMeaning?.(card)}
            tip={tipOf(tips, card)}
            onChoose={(choice) => void session.introduce(choice)}
          />
          {session.error && (
            <p role="alert" data-testid="session-error" className="w-full text-center font-bold text-again">
              {session.error}
            </p>
          )}
        </div>
      ) : leaving || session.revealed ? (
        // Keyed by position, so a card that returns starts with a fresh reveal.
        <Reveal key={shownIndex} card={card} onRate={rate} move={leaving?.move} tip={tipOf(tips, card)}>
          {session.error && (
            <p role="alert" data-testid="session-error" className="w-full font-bold text-again">
              {session.error}
            </p>
          )}
          <CardExtras card={card} store={store} />
        </Reveal>
      ) : (
        <CardFront key={index} card={card} direction={session.direction} onReveal={session.reveal} />
      )}
    </BatchFrame>
  );
}
