"use client";

import { useState } from "react";
import type { ExtrasStore } from "@/components/card";
import type { Card } from "@/lib/deck";
import { afterLearnRating, learnBatch, learnQueue, type CardStates } from "@/lib/queues";
import { BatchEnd } from "./BatchEnd";
import { SessionView } from "./SessionView";
import { summarize, useSession, type SessionStore } from "./useSession";

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

export interface LearnSessionProps {
  /** The whole deck. */
  cards: readonly Card[];
  /** Card state when the screen opens. */
  states: CardStates;
  /** Leaves for the menu. */
  onExit: () => void;
  batchSize?: number;
  /** Defaults to the app's shared store. Tests pass their own. */
  store?: SessionStore & ExtrasStore;
  clock?: () => number;
}

/** Learn: unseen cards in batches, most common first, until none are left. */
export function LearnSession({ cards, states, onExit, batchSize, store, clock }: LearnSessionProps) {
  // Each batch is cut fresh from the cards still unseen when it starts.
  const [round, setRound] = useState(() => ({ number: 0, states, batch: learnBatch(cards, states, batchSize) }));

  if (round.batch.length === 0) {
    return (
      <main data-testid="learn-empty" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6">
        <div className="rounded-card border-2 border-line bg-surface p-8 text-center shadow-card">
          <h1 className="font-display text-prompt font-bold">Nothing new to learn</h1>
          <p className="mt-2 text-lg text-ink-soft">You have seen every card. Practice keeps them fresh.</p>
        </div>
        <button
          type="button"
          data-testid="to-menu"
          onClick={onExit}
          className="min-h-14 rounded-button bg-brand px-4 py-3 font-display text-xl font-bold text-on-brand"
        >
          Menu
        </button>
      </main>
    );
  }

  return (
    <LearnBatch
      key={round.number}
      cards={cards}
      batch={round.batch}
      states={round.states}
      store={store}
      clock={clock}
      onExit={onExit}
      onAnother={(next) =>
        setRound({ number: round.number + 1, states: next, batch: learnBatch(cards, next, batchSize) })
      }
    />
  );
}

interface LearnBatchProps {
  cards: readonly Card[];
  batch: readonly Card[];
  states: CardStates;
  store?: SessionStore & ExtrasStore;
  clock?: () => number;
  onExit: () => void;
  onAnother: (states: CardStates) => void;
}

function LearnBatch({ cards, batch, states, store, clock, onExit, onAnother }: LearnBatchProps) {
  const session = useSession({
    cards: batch,
    section: "learn",
    states,
    afterRating: afterLearnRating,
    store,
    clock,
  });

  return (
    <SessionView session={session} store={store} onClose={session.finished ? undefined : onExit}>
      {session.finished && (
        <LearnEnd
          session={session}
          remaining={learnQueue(cards, session.states).length}
          onExit={onExit}
          onAnother={() => onAnother(session.states)}
        />
      )}
    </SessionView>
  );
}

function LearnEnd({
  session,
  remaining,
  onExit,
  onAnother,
}: {
  session: ReturnType<typeof useSession>;
  remaining: number;
  onExit: () => void;
  onAnother: () => void;
}) {
  const summary = summarize(session.ratings);
  return (
    <BatchEnd
      title="Batch done!"
      summary={summary}
      onAnother={remaining > 0 ? onAnother : undefined}
      onMenu={onExit}
    >
      <span data-testid="summary-cards">{plural(summary.cards, "new card")} seen.</span>{" "}
      <span data-testid="summary-remaining">
        {remaining > 0 ? `${plural(remaining, "card")} left to learn.` : "That was the last of them."}
      </span>
    </BatchEnd>
  );
}
