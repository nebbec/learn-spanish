"use client";

import { useState, type ReactNode } from "react";
import type { ExtrasStore } from "@/components/card";
import { Mascot, type MascotPose } from "@/components/motion";
import type { Card, DeckTip, PartOfSpeech } from "@/lib/deck";
import { DEFAULT_BATCH_SIZE, practiceQueue, testSteps, type CardStates, type PracticeMode } from "@/lib/queues";
import type { ReviewEvent } from "@/lib/scheduler";
import { BatchEnd } from "./BatchEnd";
import { SessionView } from "./SessionView";
import { summarize, useSession, type SessionStore } from "./useSession";

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

export interface PracticeSessionProps {
  /** The whole deck. */
  cards: readonly Card[];
  /** The tips the deck ships, for the "?" on the reveal of a card naming one. */
  tips?: readonly DeckTip[];
  /** Card state when the screen opens. */
  states: CardStates;
  /** Every review on the device. Only the Struggling option reads them. */
  reviews?: readonly ReviewEvent[];
  /** Defaults to `due`: due cards, the caught-up marker, then extra practice. */
  mode?: PracticeMode;
  /** Restrict to one part of speech. */
  pos?: PartOfSpeech;
  /** Whether the sitting starts in Reverse. The toggle on the end screens changes it from there. */
  reverse?: boolean;
  /** Told when the Reverse toggle is flipped, so the route can keep the URL in step. */
  onReverseChange?: (reverse: boolean) => void;
  /** Leaves for the menu. */
  onExit: () => void;
  /** Called as each batch ends, once its ratings are stored. */
  onBatchEnd?: () => void;
  batchSize?: number;
  /** Defaults to the app's shared store. Tests pass their own. */
  store?: SessionStore & ExtrasStore;
  clock?: () => number;
  /** Used by Shuffle. Defaults to `Math.random`. */
  random?: () => number;
}

interface Plan {
  /** The queue cut into batches. Due cards and extra practice never share a batch. */
  batches: Card[][];
  /**
   * How many of the batches hold due cards; the caught-up marker comes after
   * them. Null for Shuffle, In order and Struggling, which have no marker.
   */
  dueBatches: number | null;
}

function cut(cards: readonly Card[], size: number): Card[][] {
  const step = Math.max(1, size);
  const batches: Card[][] = [];
  for (let i = 0; i < cards.length; i += step) batches.push(cards.slice(i, i + step));
  return batches;
}

/**
 * Practice: seen cards in the order the chosen option gives, a batch at a
 * time. The queue is built once, when the screen opens, and is not re-sorted
 * as ratings come in.
 */
export function PracticeSession({
  cards,
  tips = [],
  states,
  reviews,
  mode = "due",
  pos,
  reverse: startsReversed = false,
  onReverseChange,
  onExit,
  onBatchEnd,
  batchSize = DEFAULT_BATCH_SIZE,
  store,
  clock = Date.now,
  random,
}: PracticeSessionProps) {
  const [plan] = useState<Plan>(() => {
    const queue = practiceQueue({ cards, states, now: clock(), reviews }, { mode, pos, random });
    if (queue.caughtUpAt === null) return { batches: cut(queue.cards, batchSize), dueBatches: null };
    const due = cut(queue.cards.slice(0, queue.caughtUpAt), batchSize);
    return { batches: [...due, ...cut(queue.cards.slice(queue.caughtUpAt), batchSize)], dueBatches: due.length };
  });
  // With nothing due, the sitting opens on the caught-up marker.
  const [run, setRun] = useState({ step: 0, states, atMarker: plan.dueBatches === 0 });
  const [reverse, setReverse] = useState(startsReversed);

  const toggle = (
    <button
      type="button"
      data-testid="reverse-toggle"
      aria-pressed={reverse}
      onClick={() => {
        setReverse(!reverse);
        onReverseChange?.(!reverse);
      }}
      className="min-h-12 rounded-button border-2 border-line bg-surface px-4 py-2 font-bold text-ink"
    >
      Reverse (Spanish first): {reverse ? "on" : "off"}
    </button>
  );

  if (plan.batches.length === 0) {
    return (
      <Notice testId="practice-empty" title={EMPTY[mode]} mascot="still" onExit={onExit}>
        {pos ? `No ${pos} cards match yet.` : "Cards show up here once you have seen them in Learn."}
      </Notice>
    );
  }

  if (run.atMarker) {
    return (
      <Notice
        testId="caught-up"
        title="You're all caught up!"
        mascot="celebrate"
        onExit={onExit}
        actions={
          <>
            {toggle}
            <button
              type="button"
              data-testid="another-batch"
              onClick={() => setRun({ ...run, atMarker: false })}
              className="min-h-14 rounded-button bg-brand px-4 py-3 font-display text-xl font-bold text-on-brand"
            >
              Extra practice
            </button>
          </>
        }
      >
        Nothing is due. Keep going for extra practice.
      </Notice>
    );
  }

  const next = plan.batches[run.step + 1];
  // The marker replaces the batch-end title once the last due card is rated.
  const caughtUp = plan.dueBatches !== null && run.step + 1 === plan.dueBatches;
  const stillDue = plan.dueBatches !== null && run.step + 1 < plan.dueBatches;
  const upTo = stillDue ? plan.dueBatches! : plan.batches.length;
  const left = plan.batches.slice(run.step + 1, upTo).reduce((sum, batch) => sum + batch.length, 0);

  return (
    <PracticeBatch
      key={run.step}
      batch={plan.batches[run.step]}
      tips={tips}
      states={run.states}
      reverse={reverse}
      store={store}
      clock={clock}
      onExit={onExit}
      onFinish={onBatchEnd}
      end={{
        title: caughtUp ? "You're all caught up!" : "Batch done!",
        line: caughtUp ? (
          <span data-testid="caught-up">
            {next ? "Every due card is done. Keep going for extra practice." : "Every due card is done."}
          </span>
        ) : (
          <span data-testid="summary-remaining">
            {left === 0 ? "That was the last of them." : `${plural(left, "card")} ${stillDue ? "still due" : "left"}.`}
          </span>
        ),
        anotherLabel: caughtUp ? "Extra practice" : "Another batch",
        actions: toggle,
      }}
      onAnother={next ? (after) => setRun({ step: run.step + 1, states: after, atMarker: false }) : undefined}
    />
  );
}

const EMPTY: Record<PracticeMode, string> = {
  due: "Nothing to practise yet",
  shuffle: "Nothing to practise yet",
  "in-order": "Nothing to practise yet",
  struggling: "No struggling cards",
};

interface PracticeBatchProps {
  batch: readonly Card[];
  tips: readonly DeckTip[];
  states: CardStates;
  reverse: boolean;
  store?: SessionStore & ExtrasStore;
  clock: () => number;
  onExit: () => void;
  onFinish?: () => void;
  onAnother?: (states: CardStates) => void;
  end: { title: string; line: ReactNode; anotherLabel: string; actions: ReactNode };
}

function PracticeBatch({ batch, tips, states, reverse, store, clock, onExit, onFinish, onAnother, end }: PracticeBatchProps) {
  const session = useSession({
    steps: testSteps(batch),
    section: "practice",
    direction: reverse ? "reverse" : "forward",
    states,
    store,
    clock,
  });

  return (
    <SessionView
      session={session}
      store={store}
      onClose={session.finished ? undefined : onExit}
      onFinish={onFinish}
      tips={tips}
    >
      {session.finished && (
        <BatchEnd
          title={end.title}
          summary={summarize(session.ratings)}
          onAnother={onAnother && (() => onAnother(session.states))}
          anotherLabel={end.anotherLabel}
          actions={end.actions}
          onMenu={onExit}
        >
          {end.line}
        </BatchEnd>
      )}
    </SessionView>
  );
}

/** A screen with no card on it: the caught-up marker before extra practice, or an empty queue. */
function Notice({
  testId,
  title,
  children,
  mascot,
  actions,
  onExit,
}: {
  testId: string;
  title: string;
  children: ReactNode;
  /** The caught-up marker celebrates; an empty queue has the still. */
  mascot: MascotPose;
  actions?: ReactNode;
  onExit: () => void;
}) {
  return (
    <main data-testid={testId} className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 p-6">
      <div className="flex flex-col items-center gap-5 rounded-card border-2 border-line bg-surface p-8 text-center shadow-card">
        <div data-testid="mascot-slot" aria-hidden="true" className={mascot === "still" ? "size-28 shrink-0" : "size-36 shrink-0"}>
          <Mascot pose={mascot} />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-prompt font-bold">{title}</h1>
          <p className="text-lg text-ink-soft">{children}</p>
        </div>
      </div>
      {actions}
      <button
        type="button"
        data-testid="to-menu"
        onClick={onExit}
        className="min-h-14 rounded-button border-2 border-line bg-surface px-4 py-3 font-display text-xl font-bold text-ink"
      >
        Menu
      </button>
    </main>
  );
}
