// The Learn and Practice queues: which cards a session shows, and in what order.
// See docs/design.md, "Learn" and "Practice".
//
// Everything here is a pure function of the deck, card state and reviews. Nothing reads
// the clock or the store; the one source of randomness (shuffle) is passed in.

import type { Card, DeckTip, PartOfSpeech } from "@/lib/deck/types";
import { isDue, isSeen, predictedRecall, type CardState, type ReviewEvent } from "@/lib/scheduler";
import type { Rating } from "@/lib/store/types";
import { isTipReached, tipOf } from "./tips";

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

// ---------- Steps ----------

/**
 * One step of a batch, and one segment of its bar. An `intro` shows a new card before
 * it is tested (Learn only); a `test` is the usual front, reveal and rating; a `tip`
 * shows a tip before `card`, the first card of the batch naming it (Learn only, never rated).
 */
export type Step = { kind: "intro" | "test"; card: Card } | { kind: "tip"; card: Card; tip: DeckTip };

/** What the intro's two buttons choose: "Got it" or "I already know this". */
export type IntroChoice = "got-it" | "known";

/** After "Got it", the card's test comes this many steps later, or at the end of the batch. */
export const TEST_DELAY = 3;

/** A test step for each card, as Practice shows them. */
export function testSteps(cards: readonly Card[]): Step[] {
  return cards.map((card) => ({ kind: "test", card }));
}

/**
 * The next Learn batch: an intro for each of the first `batchSize` cards of the Learn
 * queue. Each card's test joins the batch when its intro is passed (`afterIntro`).
 *
 * A tip the deck ships (`tips`) comes as a step before the intro of the first card in the
 * batch naming it, while no card naming it has been seen. Once one is seen, the tip is
 * reached and no later batch shows it.
 */
export function learnBatch(
  cards: readonly Card[],
  states: CardStates,
  batchSize: number = DEFAULT_BATCH_SIZE,
  tips: readonly DeckTip[] = [],
): Step[] {
  const steps: Step[] = [];
  const shown = new Set<string>();
  for (const card of learnQueue(cards, states).slice(0, Math.max(0, batchSize))) {
    const tip = tipOf(tips, card);
    if (tip && !shown.has(tip.id) && !isTipReached(tip, cards, states)) {
      shown.add(tip.id);
      steps.push({ kind: "tip", card, tip });
    }
    steps.push({ kind: "intro", card });
  }
  return steps;
}

/**
 * The batch after the intro at `index` is passed. "Got it" puts the card's test
 * `TEST_DELAY` steps later, or at the end if fewer steps remain; "I already know this"
 * adds nothing, since the card is rated `known` and leaves the batch. Returns the same
 * array when nothing changes. `batch` is not modified.
 */
export function afterIntro(batch: readonly Step[], index: number, choice: IntroChoice): readonly Step[] {
  const step = batch[index];
  if (!step || step.kind !== "intro" || choice === "known") return batch;
  const at = Math.min(index + TEST_DELAY, batch.length);
  return [...batch.slice(0, at), { kind: "test", card: step.card }, ...batch.slice(at)];
}

/**
 * The batch after the test at `index` has been rated. A card rated red returns once
 * more at the end of the batch; a red on that second test does not add a third.
 * Returns the same array when nothing changes. `batch` is not modified.
 */
export function afterLearnRating(batch: readonly Step[], index: number, rating: Rating): readonly Step[] {
  const step = batch[index];
  if (!step || step.kind !== "test" || rating !== "again") return batch;
  const isTest = (other: Step) => other.kind === "test" && other.card.id === step.card.id;
  const isFirstTest = batch.findIndex(isTest) === index;
  const alreadyReturning = batch.some((other, i) => i > index && isTest(other));
  return isFirstTest && !alreadyReturning ? [...batch, { kind: "test", card: step.card }] : batch;
}

/**
 * For the intro of a later meaning: the word's meaning the learner has already seen. Only
 * content and glue cards count, as in the deck build's sibling rule (form and phrase cards
 * borrow a rank). When several are seen, the nearest one before `card` in the deck wins.
 */
export function earlierMeaning(cards: readonly Card[], states: CardStates, card: Card): Card | undefined {
  if (card.kind !== "content" && card.kind !== "glue") return undefined;
  const at = cards.findIndex((other) => other.id === card.id);
  const siblings = cards
    .map((other, index) => ({ other, index }))
    .filter(
      ({ other }) =>
        other.id !== card.id &&
        other.rank === card.rank &&
        (other.kind === "content" || other.kind === "glue") &&
        isSeen(states.get(other.id)),
    );
  const before = siblings.filter(({ index }) => index < at);
  return (before.at(-1) ?? siblings[0])?.other;
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
