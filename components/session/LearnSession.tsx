"use client";

import { useState, type ReactNode } from "react";
import type { ExtrasStore } from "@/components/card";
import type { Card, DeckTip, DeckUnit } from "@/lib/deck";
import {
  DEFAULT_BATCH_SIZE,
  afterLearnRating,
  earlierMeaning,
  isUnitComplete,
  learnCut,
  learnQueue,
  learnSteps,
  unitName,
  unitOf,
  unitPhrases,
  type CardStates,
  type LearnCut,
  type Step,
} from "@/lib/queues";
import { BatchEnd } from "./BatchEnd";
import { SessionView } from "./SessionView";
import { UnitPayoff } from "./UnitPayoff";
import { summarize, useSession, type SessionStore } from "./useSession";

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

export interface LearnSessionProps {
  /** The whole deck. */
  cards: readonly Card[];
  /** The tips the deck ships. A tip comes as a step before the first card naming it, and opens from its "?". */
  tips?: readonly DeckTip[];
  /**
   * The starter path's units, in order. While a unit has unseen cards a batch is one unit;
   * without units every batch is cut by size.
   */
  units?: readonly DeckUnit[];
  /** Card state when the screen opens. */
  states: CardStates;
  /** Leaves for the menu. */
  onExit: () => void;
  /** Cards in a batch after the starter path. */
  batchSize?: number;
  /** Called as each batch after the first starts, once the ratings of the one before are stored. */
  onBatchStart?: () => void;
  /** Called as each batch ends, once its ratings are stored. */
  onBatchEnd?: () => void;
  /** Defaults to the app's shared store. Tests pass their own. */
  store?: SessionStore & ExtrasStore;
  clock?: () => number;
}

/**
 * Learn: unseen cards in batches, in the deck file's order, until none are left. Each new
 * card is introduced before it is tested. In the starter path a batch is one unit.
 */
export function LearnSession({
  cards,
  tips = [],
  units = [],
  states,
  onExit,
  batchSize = DEFAULT_BATCH_SIZE,
  onBatchStart,
  onBatchEnd,
  store,
  clock,
}: LearnSessionProps) {
  // Each batch is cut fresh from the cards still unseen when it starts.
  const cutFor = (next: CardStates) => {
    const cut = learnCut(cards, next, units, batchSize);
    return { cut, states: next, batch: learnSteps(cut.cards, cards, next, tips) };
  };
  const [round, setRound] = useState(() => ({ number: 0, ...cutFor(states) }));

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
      tips={tips}
      units={units}
      cut={round.cut}
      batch={round.batch}
      states={round.states}
      store={store}
      clock={clock}
      onExit={onExit}
      onFinish={onBatchEnd}
      onAnother={(next) => {
        setRound({ number: round.number + 1, ...cutFor(next) });
        onBatchStart?.();
      }}
    />
  );
}

interface LearnBatchProps {
  cards: readonly Card[];
  tips: readonly DeckTip[];
  units: readonly DeckUnit[];
  cut: LearnCut;
  batch: readonly Step[];
  states: CardStates;
  store?: SessionStore & ExtrasStore;
  clock?: () => number;
  onExit: () => void;
  onFinish?: () => void;
  onAnother: (states: CardStates) => void;
}

function LearnBatch({ cards, tips, units, cut, batch, states, store, clock, onExit, onFinish, onAnother }: LearnBatchProps) {
  const session = useSession({
    steps: batch,
    section: "learn",
    states,
    afterRating: afterLearnRating,
    store,
    clock,
  });

  return (
    <SessionView
      session={session}
      store={store}
      onClose={session.finished ? undefined : onExit}
      onFinish={onFinish}
      earlierMeaning={(card) => earlierMeaning(cards, session.states, card)}
      tips={tips}
      title={(step) => frameTitle(units, cut, step)}
    >
      {session.finished && (
        <LearnEnd
          session={session}
          payoff={
            cut.unit && isUnitComplete(cut.unit, cards, session.states) ? (
              <UnitPayoff unit={cut.unit} phrases={unitPhrases(cut.unit, cards)} />
            ) : undefined
          }
          remaining={learnQueue(cards, session.states).length}
          onExit={onExit}
          onAnother={() => onAnother(session.states)}
        />
      )}
    </SessionView>
  );
}

/**
 * The frame's title for a step: "New in <unit title>" on a card added to a unit already
 * finished, otherwise the batch's unit ("Unit 3 · How and where I am"). None after the starter path.
 */
function frameTitle(units: readonly DeckUnit[], cut: LearnCut, step: Step | undefined): string | undefined {
  const added = step && cut.added.some((card) => card.id === step.card.id) ? unitOf(units, step.card) : undefined;
  if (added) return `New in ${added.title}`;
  return cut.unit ? unitName(units, cut.unit) : undefined;
}

function LearnEnd({
  session,
  payoff,
  remaining,
  onExit,
  onAnother,
}: {
  session: ReturnType<typeof useSession>;
  /** The unit's "now you can say" list, when the batch finished its unit. */
  payoff?: ReactNode;
  remaining: number;
  onExit: () => void;
  onAnother: () => void;
}) {
  const summary = summarize(session.ratings);
  return (
    <BatchEnd
      title={payoff ? "Unit complete!" : "Batch done!"}
      summary={summary}
      payoff={payoff}
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
