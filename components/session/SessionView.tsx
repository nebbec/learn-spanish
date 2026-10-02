"use client";

import type { ReactNode } from "react";
import { BatchFrame, CardExtras, CardFront, Reveal, type ExtrasStore } from "@/components/card";
import type { Session } from "./useSession";

export interface SessionViewProps {
  session: Session;
  /** Shows the frame's close button when given. */
  onClose?: () => void;
  /** Passed to the note field and report button. Defaults to the app's shared store. */
  store?: ExtrasStore;
  /** What to show once every card is rated: the batch-end screen. */
  children: ReactNode;
}

/** Draws a session: the batch frame, then the front or the reveal of the card on screen. */
export function SessionView({ session, onClose, store, children }: SessionViewProps) {
  const { card, index, batch } = session;
  return (
    <BatchFrame total={batch.length} index={index} onClose={onClose}>
      {!card ? (
        children
      ) : session.revealed ? (
        // Keyed by position, so a card that returns starts with a fresh reveal.
        <Reveal key={index} card={card} onRate={session.rate}>
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
