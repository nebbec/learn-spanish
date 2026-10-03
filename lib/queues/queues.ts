// The Learn and Practice queues: which cards a session shows, and in what order.
// See docs/design.md, "Learn" and "Practice".
//
// Everything here is a pure function of the deck, card state and reviews. Nothing reads
// the clock or the store; the one source of randomness (shuffle) is passed in.

import type { Card, PartOfSpeech } from "@/lib/deck/types";
import { isDue, isSeen, predictedRecall, type CardState, type ReviewEvent } from "@/lib/scheduler";
import type { Rating } from "@/lib/store/types";

/** Card state by card id, as `replayReviews` returns it. Unseen cards are absent. */
export type CardStates = ReadonlyMap<string, CardState>;

/** The default number of cards in a batch. Settings can change it. */
export const DEFAULT_BATCH_SIZE = 15;

/** A card counts as struggling when a red is among this many of its latest forward ratings. */
export const STRUGGLING_WINDOW = 3;

/**
 * Sorts by frequency rank, most common first. Two meanings of one word share a rank;
 * they keep their deck order, so the result is the same on every device.
 */
function byRank(cards: readonly Card[]): Card[] {
  return cards
    .map((card, index) => ({ card, index }))
    .sort((a, b) => a.card.rank - b.card.rank || a.index - b.index)
    .map((entry) => entry.card);
}

// ---------- Learn ----------

/**
 * Every unseen card in the order Learn shows them: the deck file's order. The deck build
 * computes that order (units, `requires`, the frequency phase's interleave, sibling
 * spacing; see "Learning path" in docs/design.md), so Learn only follows it.
 */
export function learnQueue(cards: readonly Card[], states: CardStates): Card[] {
  return cards.filter((card) => !isSeen(states.get(card.id)));
}

/** The next Learn batch: the first `batchSize` cards of the Learn queue. */
export function learnBatch(
  cards: readonly Card[],
  states: CardStates,
  batchSize: number = DEFAULT_BATCH_SIZE,
): Card[] {
  return learnQueue(cards, states).slice(0, Math.max(0, batchSize));
}

/**
 * The batch after the card at `index` has been rated. A card rated red returns once
 * more at the end of the batch; a red on that second showing does not add a third.
 * Returns the same array when nothing changes. `batch` is not modified.
 */
export function afterLearnRating(batch: readonly Card[], index: number, rating: Rating): readonly Card[] {
  const card = batch[index];
  if (!card || rating !== "again") return batch;
  const isFirstShowing = batch.findIndex((other) => other.id === card.id) === index;
  const alreadyReturning = batch.some((other, i) => i > index && other.id === card.id);
  return isFirstShowing && !alreadyReturning ? [...batch, card] : batch;
}

// ---------- Practice ----------

export const PRACTICE_MODES = ["due", "shuffle", "in-order", "struggling"] as const;
/**
 * `due` is the default Practice: due cards, then extra practice. The other three are
 * the Shuffle, In order and Struggling options.
 */
export type PracticeMode = (typeof PRACTICE_MODES)[number];

export interface PracticeInput {
  cards: readonly Card[];
  states: CardStates;
  /** Epoch milliseconds. Used by the `due` mode only. */
  now: number;
  /** Needed by the `struggling` mode only. Reverse reviews are ignored. */
  reviews?: readonly ReviewEvent[];
}

export interface PracticeOptions {
  /** Defaults to `due`. */
  mode?: PracticeMode;
  /** Restrict to one part of speech. Combines with any mode. */
  pos?: PartOfSpeech;
  /** Returns a number from 0 (inclusive) to 1 (exclusive). Used by `shuffle`; defaults to `Math.random`. */
  random?: () => number;
}

export interface PracticeQueue {
  /** The cards in the order to show them. */
  cards: Card[];
  /**
   * In `due` mode, the number of due cards: the "You're all caught up" marker sits
   * before `cards[caughtUpAt]`, and everything from there on is extra practice.
   * Null in the other modes, which have no marker.
   */
  caughtUpAt: number | null;
}

/** Seen cards, optionally limited to one part of speech, in deck order. */
function seenCards(cards: readonly Card[], states: CardStates, pos?: PartOfSpeech): Card[] {
  return cards.filter((card) => isSeen(states.get(card.id)) && (pos === undefined || card.pos === pos));
}

/** Due cards, most common first. */
export function dueQueue(cards: readonly Card[], states: CardStates, now: number): Card[] {
  return byRank(seenCards(cards, states).filter((card) => isDue(states.get(card.id), now)));
}

/**
 * Extra practice: seen cards that are not yet due, lowest predicted recall first,
 * with frequency rank breaking ties.
 */
export function extraPracticeQueue(cards: readonly Card[], states: CardStates, now: number): Card[] {
  const notDue = byRank(seenCards(cards, states).filter((card) => !isDue(states.get(card.id), now)));
  // The input is already in rank order, so sorting by recall with the index as the
  // tie-break leaves rank as the second key.
  return notDue
    .map((card, index) => ({ card, index, recall: predictedRecall(states.get(card.id), now) }))
    .sort((a, b) => a.recall - b.recall || a.index - b.index)
    .map((entry) => entry.card);
}

/** Time order, with the event id breaking ties: the order the scheduler replays in. */
function byTimeThenId(a: ReviewEvent, b: ReviewEvent): number {
  if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * The ids of cards with a red among their last three forward ratings. Reverse reviews
 * are ignored and a review that appears twice (same id) counts once.
 */
export function strugglingCardIds(reviews: readonly ReviewEvent[]): Set<string> {
  const unique = new Map<string, ReviewEvent>();
  for (const review of reviews) {
    if (review.direction === "forward") unique.set(review.id, review);
  }
  const ratings = new Map<string, Rating[]>();
  for (const review of [...unique.values()].sort(byTimeThenId)) {
    const list = ratings.get(review.cardId) ?? [];
    list.push(review.rating);
    ratings.set(review.cardId, list);
  }
  const struggling = new Set<string>();
  for (const [cardId, list] of ratings) {
    if (list.slice(-STRUGGLING_WINDOW).includes("again")) struggling.add(cardId);
  }
  return struggling;
}

/** Fisher-Yates, on a copy. */
function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * The Practice queue for a mode, optionally limited to one part of speech. Only seen
 * cards ever appear. Reverse is not a queue concern: it changes how a card is shown
 * and how its rating is stored, not which cards come up.
 */
export function practiceQueue(input: PracticeInput, options: PracticeOptions = {}): PracticeQueue {
  const { states, now } = input;
  const { mode = "due", pos, random = Math.random } = options;
  const seen = seenCards(input.cards, states, pos);

  switch (mode) {
    case "due": {
      const due = dueQueue(seen, states, now);
      return { cards: [...due, ...extraPracticeQueue(seen, states, now)], caughtUpAt: due.length };
    }
    case "shuffle":
      return { cards: shuffle(byRank(seen), random), caughtUpAt: null };
    case "in-order":
      return { cards: byRank(seen), caughtUpAt: null };
    case "struggling": {
      const struggling = strugglingCardIds(input.reviews ?? []);
      return { cards: byRank(seen.filter((card) => struggling.has(card.id))), caughtUpAt: null };
    }
  }
}
