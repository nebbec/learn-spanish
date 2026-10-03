"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { BatchFrame, CardExtras, CardFront, Reveal, type ExtrasStore } from "@/components/card";
import { MOVE_MS, useMotion } from "@/components/motion";
import type { Card } from "@/lib/deck";
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
export function SessionView({ session, onClose, store, children, onFinish }: SessionViewProps) {
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
    <BatchFrame total={leaving?.total ?? batch.length} index={shownIndex} onClose={onClose}>
      {!card ? (
        children
      ) : leaving || session.revealed ? (
        // Keyed by position, so a card that returns starts with a fresh reveal.
        <Reveal key={shownIndex} card={card} onRate={rate} move={leaving?.move}>
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
