import { Rating as FsrsRating } from "ts-fsrs";
import { describe, expect, it } from "vitest";
import {
  MEMORIZED_STABILITY_DAYS,
  isDue,
  isMemorized,
  isSeen,
  predictedRecall,
  rateCard,
  replayReviews,
  toFsrsGrade,
  type CardState,
  type ReviewEvent,
} from "@/lib/scheduler";
import type { Direction, Rating } from "@/lib/store";

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 0, 1, 9);

let nextId = 0;
function review(
  cardId: string,
  rating: Rating,
  timestamp: number,
  direction: Direction = "forward",
): ReviewEvent {
  nextId += 1;
  return { id: `r-${String(nextId).padStart(4, "0")}`, cardId, direction, rating, timestamp };
}

/** Rates one card green every time it falls due, until it is memorized. */
function memorize(cardId: string): CardState {
  let state = rateCard(undefined, cardId, "nearly", T0);
  for (let i = 0; i < 50 && !isMemorized(state); i += 1) {
    state = rateCard(state, cardId, "good", state.due);
  }
  expect(isMemorized(state)).toBe(true);
  return state;
}

function shuffled<T>(items: readonly T[], seed: number): T[] {
  const out = [...items];
  let s = seed;
  for (let i = out.length - 1; i > 0; i -= 1) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

describe("rating mapping", () => {
  it("maps green to Easy on a first view and Good afterwards", () => {
    expect(toFsrsGrade("good", true)).toBe(FsrsRating.Easy);
    expect(toFsrsGrade("good", false)).toBe(FsrsRating.Good);
  });

  it("maps orange to Hard and red to Again on any view", () => {
    for (const firstView of [true, false]) {
      expect(toFsrsGrade("nearly", firstView)).toBe(FsrsRating.Hard);
      expect(toFsrsGrade("again", firstView)).toBe(FsrsRating.Again);
    }
  });

  it("gives a first-view green a longer first interval than any other first rating", () => {
    const green = rateCard(undefined, "casa-house", "good", T0);
    const orange = rateCard(undefined, "casa-house", "nearly", T0);
    const red = rateCard(undefined, "casa-house", "again", T0);

    expect(green.due - T0).toBeGreaterThanOrEqual(DAY);
    expect(green.due).toBeGreaterThan(orange.due);
    expect(orange.due).toBeGreaterThan(red.due);
    expect(green.stability).toBeGreaterThan(orange.stability);
    expect(orange.stability).toBeGreaterThan(red.stability);
  });

  it("treats a later green as Good, not Easy", () => {
    const first = rateCard(undefined, "casa-house", "nearly", T0);
    const viaRateCard = rateCard(first, "casa-house", "good", T0 + DAY);
    const easyAgain = rateCard(undefined, "casa-house", "good", T0);
    // A second-view green must not reproduce the first-view (Easy) outcome.
    expect(viaRateCard.reps).toBe(2);
    expect(viaRateCard.stability).not.toBe(easyAgain.stability);
  });
});

describe("rateCard", () => {
  it("does not modify the previous state", () => {
    const first = rateCard(undefined, "ir-go", "good", T0);
    const copy = { ...first };
    rateCard(first, "ir-go", "again", T0 + DAY);
    expect(first).toEqual(copy);
  });

  it("produces plain numbers that survive structured cloning", () => {
    const state = rateCard(undefined, "ir-go", "good", T0);
    expect(structuredClone(state)).toEqual(state);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
    expect(state.lastReview).toBe(T0);
    expect(state.reps).toBe(1);
  });

  it("gives an early review a smaller gain than a due one", () => {
    const first = rateCard(undefined, "ir-go", "good", T0);
    const early = rateCard(first, "ir-go", "good", T0 + DAY);
    const onTime = rateCard(first, "ir-go", "good", first.due);
    expect(first.due - T0).toBeGreaterThan(DAY);
    expect(early.stability).toBeLessThan(onTime.stability);
  });
});

describe("replay", () => {
  const events: ReviewEvent[] = [
    review("casa-house", "good", T0),
    review("ir-go", "again", T0 + 1000),
    review("ir-go", "nearly", T0 + 60_000),
    review("de-of", "nearly", T0 + 90_000),
    review("casa-house", "good", T0 + 9 * DAY),
    review("ir-go", "good", T0 + 2 * DAY),
    review("de-of", "again", T0 + 3 * DAY),
    review("ir-go", "good", T0 + 12 * DAY),
    review("casa-house", "again", T0 + 40 * DAY),
    review("de-of", "good", T0 + 4 * DAY),
  ];

  it("matches rating the cards one at a time in time order", () => {
    const states = replayReviews(events);
    let casa = rateCard(undefined, "casa-house", "good", T0);
    casa = rateCard(casa, "casa-house", "good", T0 + 9 * DAY);
    casa = rateCard(casa, "casa-house", "again", T0 + 40 * DAY);

    expect(states.size).toBe(3);
    expect(states.get("casa-house")).toEqual(casa);
    expect(states.get("ir-go")?.reps).toBe(4);
  });

  it("gives identical state whatever order the events are stored in", () => {
    const expected = replayReviews(events);
    for (let seed = 1; seed <= 25; seed += 1) {
      expect(replayReviews(shuffled(events, seed))).toEqual(expected);
    }
    expect(replayReviews([...events].reverse())).toEqual(expected);
  });

  it("breaks timestamp ties by event id, so simultaneous ratings replay the same way", () => {
    const a: ReviewEvent = { id: "a", cardId: "lo-him", direction: "forward", rating: "again", timestamp: T0 };
    const b: ReviewEvent = { id: "b", cardId: "lo-him", direction: "forward", rating: "good", timestamp: T0 };
    const ab = replayReviews([a, b]);
    expect(replayReviews([b, a])).toEqual(ab);
    // "a" sorts first, so the red is the first view and the green is a plain Good.
    const manual = rateCard(rateCard(undefined, "lo-him", "again", T0), "lo-him", "good", T0);
    expect(ab.get("lo-him")).toEqual(manual);
  });

  it("counts a duplicated event once", () => {
    expect(replayReviews([...events, ...events])).toEqual(replayReviews(events));
  });

  it("ignores reverse reviews", () => {
    const withReverse = [
      ...events,
      review("casa-house", "again", T0 + 5 * DAY, "reverse"),
      review("bueno-good", "good", T0 + 5 * DAY, "reverse"),
    ];
    const states = replayReviews(withReverse);
    expect(states).toEqual(replayReviews(events));
    expect(states.has("bueno-good")).toBe(false);
  });

  it("returns no state for an empty history", () => {
    expect(replayReviews([]).size).toBe(0);
  });
});

describe("seen and due", () => {
  it("treats a card with no state as unseen, not due and not memorized", () => {
    expect(isSeen(undefined)).toBe(false);
    expect(isDue(undefined, T0)).toBe(false);
    expect(isMemorized(undefined)).toBe(false);
    expect(predictedRecall(undefined, T0)).toBe(0);
  });

  it("makes a card seen after one forward rating of any colour", () => {
    for (const rating of ["good", "nearly", "again"] as const) {
      expect(isSeen(replayReviews([review("casa-house", rating, T0)]).get("casa-house"))).toBe(true);
    }
  });

  it("makes a card due exactly when its scheduled time has passed", () => {
    const state = rateCard(undefined, "casa-house", "good", T0);
    expect(isDue(state, T0)).toBe(false);
    expect(isDue(state, state.due - 1)).toBe(false);
    expect(isDue(state, state.due)).toBe(true);
    expect(isDue(state, state.due + DAY)).toBe(true);
  });
});

describe("memorized", () => {
  const base: CardState = { ...rateCard(undefined, "casa-house", "good", T0), phase: "review" };

  it("uses a 21-day stability threshold", () => {
    expect(MEMORIZED_STABILITY_DAYS).toBe(21);
    expect(isMemorized({ ...base, stability: 20.99 })).toBe(false);
    expect(isMemorized({ ...base, stability: 21 })).toBe(true);
    expect(isMemorized({ ...base, stability: 21.01 })).toBe(true);
  });

  it("is not reached by a single rating, and is reached by repeated greens", () => {
    expect(isMemorized(base)).toBe(false);
    expect(isMemorized(memorize("casa-house"))).toBe(true);
  });

  it("drops a memorized card back to seen on a red", () => {
    const memorized = memorize("casa-house");
    const after = rateCard(memorized, "casa-house", "again", memorized.due);

    expect(after.stability).toBeLessThan(memorized.stability);
    expect(isMemorized(after)).toBe(false);
    expect(isSeen(after)).toBe(true);
    expect(after.lapses).toBe(memorized.lapses + 1);
  });

  it("drops a memorized card on a red however strong or recently reviewed it was", () => {
    for (const stability of [21, 30, 100, 365, 3650, 36500]) {
      for (const difficulty of [1, 5, 10]) {
        for (const elapsedDays of [0, 1, stability, stability * 3]) {
          const strong: CardState = { ...base, phase: "review", stability, difficulty, lastReview: T0 };
          const after = rateCard(strong, "casa-house", "again", T0 + elapsedDays * DAY);
          const label = `s=${stability} d=${difficulty} t=${elapsedDays}`;
          expect(after.stability, label).toBeLessThan(stability);
          expect(isMemorized(after), label).toBe(false);
          expect(isSeen(after), label).toBe(true);
        }
      }
    }
  });

  it("drops a very stable card failed on the day of its last review, until it is passed again", () => {
    // FSRS barely lowers stability for a same-day red, so the threshold alone would not drop it.
    const strong: CardState = { ...base, stability: 365, difficulty: 5, lastReview: T0 };
    const failed = rateCard(strong, "casa-house", "again", T0 + 60_000);
    expect(failed.stability).toBeGreaterThanOrEqual(MEMORIZED_STABILITY_DAYS);
    expect(failed.phase).toBe("relearning");
    expect(isMemorized(failed)).toBe(false);

    const passed = rateCard(failed, "casa-house", "good", failed.due);
    expect(passed.phase).toBe("review");
    expect(isMemorized(passed)).toBe(true);
  });
});

describe("predicted recall", () => {
  const state = { ...rateCard(undefined, "casa-house", "good", T0), stability: 10 };

  it("is 1 at the moment of review and 90% after one stability interval", () => {
    expect(predictedRecall(state, T0)).toBeCloseTo(1, 6);
    expect(predictedRecall(state, T0 + 10 * DAY)).toBeCloseTo(0.9, 3);
  });

  it("falls as time passes", () => {
    const r1 = predictedRecall(state, T0 + DAY);
    const r2 = predictedRecall(state, T0 + 20 * DAY);
    const r3 = predictedRecall(state, T0 + 200 * DAY);
    expect(r1).toBeGreaterThan(r2);
    expect(r2).toBeGreaterThan(r3);
    expect(r3).toBeGreaterThan(0);
  });

  it("is higher for a more stable card at the same elapsed time", () => {
    const weak = { ...state, stability: 2 };
    expect(predictedRecall(state, T0 + 5 * DAY)).toBeGreaterThan(predictedRecall(weak, T0 + 5 * DAY));
  });
});
