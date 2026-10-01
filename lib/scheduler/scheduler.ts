// The scheduler: a thin wrapper around ts-fsrs. See docs/design.md, "Learning engine".
//
// Everything here is a pure function of its arguments. Card state is a cache: replaying
// the same set of forward reviews always gives the same state, whatever order they were
// stored in, which is what lets two devices merge reviews without conflicts.

import { fsrs, Rating as FsrsRating, State, type Card as FsrsCard, type Grade } from "ts-fsrs";
import type { CardStateRow, Rating, Review } from "@/lib/store/types";

/** A card is memorized once its stability reaches this many days. */
export const MEMORIZED_STABILITY_DAYS = 21;

/**
 * Fuzz is off so that replay is deterministic. Everything else is the ts-fsrs default:
 * FSRS-6 weights, 90% target recall, short-term learning steps on.
 */
const engine = fsrs({ enable_fuzz: false });

export const CARD_PHASES = ["learning", "review", "relearning"] as const;
/** Where FSRS has the card. A card with no state at all is unseen. */
export type CardPhase = (typeof CARD_PHASES)[number];

/** FSRS state for one seen card, as kept in the `card_state` store. All times are epoch milliseconds. */
export interface CardState extends CardStateRow {
  /** When the card next becomes due. */
  due: number;
  /** Days until predicted recall falls to 90%. */
  stability: number;
  /** FSRS difficulty, 1 to 10. */
  difficulty: number;
  phase: CardPhase;
  /** Position within the short-term (re)learning steps. */
  learningSteps: number;
  /** The interval FSRS last scheduled, in days. */
  scheduledDays: number;
  /** Number of forward ratings. */
  reps: number;
  /** Number of reds given after the card had left the learning phase. */
  lapses: number;
  /** Time of the latest forward rating. */
  lastReview: number;
}

/** The part of a review the scheduler reads. A full `Review` satisfies it. */
export type ReviewEvent = Pick<Review, "id" | "cardId" | "direction" | "rating" | "timestamp">;

const PHASE_TO_FSRS: Record<CardPhase, State> = {
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
};

const FSRS_TO_PHASE: Partial<Record<State, CardPhase>> = {
  [State.Learning]: "learning",
  [State.Review]: "review",
  [State.Relearning]: "relearning",
};

/**
 * Maps a rating button to an FSRS grade. Green is Good, except on a card's first view,
 * where it means "I already knew this" and maps to Easy.
 */
export function toFsrsGrade(rating: Rating, firstView: boolean): Grade {
  switch (rating) {
    case "good":
      return firstView ? FsrsRating.Easy : FsrsRating.Good;
    case "nearly":
      return FsrsRating.Hard;
    case "again":
      return FsrsRating.Again;
  }
}

function toFsrsCard(state: CardState): FsrsCard {
  return {
    due: new Date(state.due),
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: 0,
    scheduled_days: state.scheduledDays,
    learning_steps: state.learningSteps,
    reps: state.reps,
    lapses: state.lapses,
    state: PHASE_TO_FSRS[state.phase],
    last_review: new Date(state.lastReview),
  };
}

function newFsrsCard(now: number): FsrsCard {
  return {
    due: new Date(now),
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    learning_steps: 0,
    reps: 0,
    lapses: 0,
    state: State.New,
  };
}

/**
 * The state of a card after one more forward rating. Pass `undefined` as `prev` for a
 * card's first view. `prev` is not modified.
 *
 * A rating timestamped earlier than the card's latest one (a device with a slow clock)
 * is treated as happening at the same moment as the latest, so time never runs backwards.
 */
export function rateCard(
  prev: CardState | undefined,
  cardId: string,
  rating: Rating,
  timestamp: number,
): CardState {
  const at = prev ? Math.max(timestamp, prev.lastReview) : timestamp;
  const card = prev ? toFsrsCard(prev) : newFsrsCard(at);
  const next = engine.next(card, new Date(at), toFsrsGrade(rating, prev === undefined)).card;
  const phase = FSRS_TO_PHASE[next.state];
  if (!phase) throw new Error(`Unexpected FSRS state ${next.state} for card ${cardId}`);
  return {
    cardId,
    due: next.due.getTime(),
    stability: next.stability,
    difficulty: next.difficulty,
    phase,
    learningSteps: next.learning_steps,
    scheduledDays: next.scheduled_days,
    reps: next.reps,
    lapses: next.lapses,
    lastReview: at,
  };
}

/** Time order, with the event id breaking ties so that the order is total. */
function byTimeThenId(a: ReviewEvent, b: ReviewEvent): number {
  if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Rebuilds card state from review events. Reverse reviews are ignored, and a review
 * that appears twice (same id) counts once. The result depends only on the set of
 * events, not on the order they are passed in. Cards with no forward review are absent.
 */
export function replayReviews(reviews: readonly ReviewEvent[]): Map<string, CardState> {
  const unique = new Map<string, ReviewEvent>();
  for (const review of reviews) {
    if (review.direction === "forward") unique.set(review.id, review);
  }
  const ordered = [...unique.values()].sort(byTimeThenId);

  const states = new Map<string, CardState>();
  for (const review of ordered) {
    states.set(
      review.cardId,
      rateCard(states.get(review.cardId), review.cardId, review.rating, review.timestamp),
    );
  }
  return states;
}

/** Seen: the card has at least one forward rating, which is exactly when it has a state. */
export function isSeen(state: CardState | undefined): state is CardState {
  return state !== undefined;
}

/** Due: a seen card whose scheduled review time has passed. */
export function isDue(state: CardState | undefined, now: number): boolean {
  return state !== undefined && state.due <= now;
}

/**
 * Memorized: a seen card expected to be recalled three weeks from now, meaning its
 * stability is 21 days or more.
 *
 * A card that is relearning after a red is never memorized. A red nearly always takes
 * stability below 21 days by itself, but FSRS lowers it only mildly when the red comes
 * on the same day as the previous rating (extra practice), so a very stable card could
 * otherwise stay memorized straight after being failed. It counts again once a later
 * rating returns it to review with stability still at 21 days or more.
 */
export function isMemorized(state: CardState | undefined): boolean {
  return (
    state !== undefined &&
    state.phase !== "relearning" &&
    state.stability >= MEMORIZED_STABILITY_DAYS
  );
}

/**
 * The predicted probability, 0 to 1, that the card would be recalled at `now`.
 * An unseen card has no prediction and returns 0.
 */
export function predictedRecall(state: CardState | undefined, now: number): number {
  if (state === undefined) return 0;
  return engine.get_retrievability(toFsrsCard(state), new Date(Math.max(now, state.lastReview)), false);
}
