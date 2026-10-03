"use client";

import { useRef, useState } from "react";
import type { Card } from "@/lib/deck";
import { afterIntro, type CardStates, type IntroChoice, type Step } from "@/lib/queues";
import { rateCard } from "@/lib/scheduler";
import { localStore, type Direction, type LocalStore, type Rating, type Section } from "@/lib/store";

/** The part of the local store a session writes to. */
export type SessionStore = Pick<LocalStore, "appendReview" | "putCardState">;

/** One rating given during the session, in the order it was tapped. */
export interface SessionRating {
  cardId: string;
  rating: Rating;
  /** Id of the review event the rating was stored as. */
  reviewId: string;
}

export interface SessionOptions {
  /**
   * The queue: the steps to show, in order. Read once, when the session starts. Learn
   * passes `learnBatch`'s intros; Practice passes `testSteps(cards)`.
   */
  steps: readonly Step[];
  section: Section;
  /** Defaults to forward. Reverse ratings are stored but never change card state. */
  direction?: Direction;
  /** Card state when the session starts. Not modified. */
  states: CardStates;
  /**
   * Returns the queue after the test at `index` was rated. Learn passes
   * `afterLearnRating`, which brings a red back at the end of the batch.
   */
  afterRating?: (batch: readonly Step[], index: number, rating: Rating) => readonly Step[];
  /** Defaults to the app's shared store. Tests pass their own. */
  store?: SessionStore;
  /** Defaults to `Date.now`. */
  clock?: () => number;
}

export interface Session {
  /** The steps of the session. Grows when an intro's test joins or a red brings a test back. */
  batch: readonly Step[];
  /** Position of the step on screen. Equal to `batch.length` once finished. */
  index: number;
  /** The step on screen, or undefined once finished. */
  step: Step | undefined;
  /** The card of the step on screen (for a tip, the card it comes before), or undefined once finished. */
  card: Card | undefined;
  revealed: boolean;
  finished: boolean;
  direction: Direction;
  /** Every rating so far, oldest first. */
  ratings: readonly SessionRating[];
  /** Card state including this session's forward ratings. */
  states: CardStates;
  /** Set when a rating could not be saved. The card stays on screen so it can be rated again. */
  error: string | null;
  reveal: () => void;
  /** Stores the rating, updates card state and moves to the next step. Ignored before the reveal and on an intro. */
  rate: (rating: Rating) => Promise<void>;
  /**
   * Passes the intro on screen. "Got it" stores nothing and puts the card's test later in
   * the batch; "I already know this" stores the rating `known` (Easy) and the card leaves
   * the batch. Ignored on a test.
   */
  introduce: (choice: IntroChoice) => Promise<void>;
  /** Moves on from the tip on screen. Stores nothing: a tip is never rated. Ignored on a card. */
  passTip: () => void;
}

interface SessionState {
  batch: readonly Step[];
  index: number;
  revealed: boolean;
  ratings: readonly SessionRating[];
  states: CardStates;
}

/**
 * Runs one sitting over a queue of cards: front, reveal, rating, next card.
 * Each rating is appended to the `reviews` store before the session advances,
 * so the stored reviews are exactly what was tapped. A forward rating also
 * updates the card's state; a reverse rating does not.
 */
export function useSession(options: SessionOptions): Session {
  const { section, direction = "forward", afterRating, store, clock = Date.now } = options;

  const [state, setState] = useState<SessionState>(() => ({
    batch: options.steps,
    index: 0,
    revealed: false,
    ratings: [],
    states: options.states,
  }));
  const [error, setError] = useState<string | null>(null);

  // The handlers read the latest state from here, so a second tap that lands
  // before React re-renders cannot act on a stale card.
  const live = useRef(state);
  const saving = useRef(false);

  const commit = (next: SessionState) => {
    live.current = next;
    setState(next);
  };

  const reveal = () => {
    const now = live.current;
    if (now.revealed || now.batch[now.index]?.kind !== "test") return;
    commit({ ...now, revealed: true });
  };

  /** Stores one rating of the card on screen and moves on, with the batch `nextBatch` gives. */
  const storeRating = async (rating: Rating, nextBatch: (now: SessionState) => readonly Step[]) => {
    const now = live.current;
    const card = now.batch[now.index]?.card;
    if (!card) return;
    saving.current = true;
    try {
      const target = store ?? localStore();
      const timestamp = clock();
      const review = await target.appendReview({ cardId: card.id, direction, rating, section, timestamp });

      let states = now.states;
      if (direction === "forward") {
        const next = rateCard(states.get(card.id), card.id, rating, timestamp);
        states = new Map(states).set(card.id, next);
        // card_state is a cache of the reviews. If this write fails the review is
        // still stored, and a replay rebuilds the state, so the session carries on.
        await target.putCardState(next).catch(() => {});
      }

      commit({
        batch: nextBatch(now),
        index: now.index + 1,
        revealed: false,
        ratings: [...now.ratings, { cardId: card.id, rating, reviewId: review.id }],
        states,
      });
      setError(null);
    } catch {
      setError("Couldn't save that rating. Tap it again.");
    } finally {
      saving.current = false;
    }
  };

  const rate = async (rating: Rating) => {
    const now = live.current;
    if (now.batch[now.index]?.kind !== "test" || !now.revealed || saving.current) return;
    await storeRating(rating, (at) => (afterRating ? afterRating(at.batch, at.index, rating) : at.batch));
  };

  const introduce = async (choice: IntroChoice) => {
    const now = live.current;
    if (now.batch[now.index]?.kind !== "intro" || saving.current) return;
    if (choice === "known") {
      await storeRating("known", (at) => afterIntro(at.batch, at.index, choice));
      return;
    }
    commit({ ...now, batch: afterIntro(now.batch, now.index, choice), index: now.index + 1, revealed: false });
    setError(null);
  };

  const passTip = () => {
    const now = live.current;
    if (now.batch[now.index]?.kind !== "tip" || saving.current) return;
    commit({ ...now, index: now.index + 1, revealed: false });
  };

  const step = state.batch[state.index];
  return {
    batch: state.batch,
    index: state.index,
    step,
    card: step?.card,
    revealed: state.revealed,
    finished: state.index >= state.batch.length,
    direction,
    ratings: state.ratings,
    states: state.states,
    error,
    reveal,
    rate,
    introduce,
    passTip,
  };
}

/**
 * What the batch-end screen reports. Each card counts once, under its first rating of the
 * session; `known` counts as green.
 */
export interface SessionSummary {
  /** Distinct cards rated. */
  cards: number;
  good: number;
  nearly: number;
  again: number;
}

export function summarize(ratings: readonly SessionRating[]): SessionSummary {
  const first = new Map<string, Rating>();
  for (const { cardId, rating } of ratings) {
    if (!first.has(cardId)) first.set(cardId, rating);
  }
  const summary: SessionSummary = { cards: first.size, good: 0, nearly: 0, again: 0 };
  for (const rating of first.values()) summary[rating === "known" ? "good" : rating] += 1;
  return summary;
}
