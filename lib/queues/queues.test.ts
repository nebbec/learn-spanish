import { describe, expect, it } from "vitest";
import type { Card } from "@/lib/deck";
import { fixtureCard, fixtureDeck } from "@/lib/deck/fixture";
import {
  DEFAULT_BATCH_SIZE,
  afterLearnRating,
  dueQueue,
  extraPracticeQueue,
  learnBatch,
  learnQueue,
  practiceQueue,
  strugglingCardIds,
} from "@/lib/queues";
import { isDue, predictedRecall, replayReviews, type ReviewEvent } from "@/lib/scheduler";
import type { Direction, Rating } from "@/lib/store";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const T0 = Date.UTC(2026, 0, 1, 9);

const cards = fixtureDeck.cards;
// The fixture's file order, which the deck build computed: two units, then the frequency phase.
const FILE_ORDER = cards.map((card) => card.id);

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

const ids = (list: readonly Card[]) => list.map((card) => card.id);
const reversed = <T>(list: readonly T[]) => [...list].reverse();

/** A deterministic stand-in for Math.random. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

// The interleave of content and glue cards, units and sibling spacing are the deck build's
// (scripts/content/path-order.test.ts): Learn follows the deck file.
describe("Learn queue", () => {
  it("is every unseen card in the deck file's order", () => {
    expect(ids(learnQueue(cards, new Map()))).toEqual(FILE_ORDER);
    expect(FILE_ORDER.slice(0, 4)).toEqual(["ir-form-yo", "ir-form-tu", "casa-house", "phrase-going-home"]);
  });

  it("follows the file whatever the ranks, kinds or units", () => {
    expect(ids(learnQueue(reversed(cards), new Map()))).toEqual(reversed(FILE_ORDER));
  });

  it("leaves out seen cards, whatever their rating, and ignores reverse ratings", () => {
    const states = replayReviews([
      review("ir-form-yo", "again", T0),
      review("de-of", "nearly", T0),
      review("bueno-good", "good", T0, "reverse"),
    ]);
    const queue = ids(learnQueue(cards, states));
    expect(queue).toEqual(FILE_ORDER.filter((id) => id !== "ir-form-yo" && id !== "de-of"));
    expect(queue).toContain("bueno-good");
  });

  it("is empty when every card is seen", () => {
    const states = replayReviews(cards.map((card) => review(card.id, "good", T0)));
    expect(learnQueue(cards, states)).toEqual([]);
  });

  it("cuts a batch to the batch size, 15 by default", () => {
    expect(ids(learnBatch(cards, new Map(), 6))).toEqual(FILE_ORDER.slice(0, 6));
    expect(DEFAULT_BATCH_SIZE).toBe(15);
    expect(ids(learnBatch(cards, new Map()))).toEqual(FILE_ORDER.slice(0, 15));
    const states = replayReviews(FILE_ORDER.slice(0, 15).map((id) => review(id, "good", T0)));
    expect(ids(learnBatch(cards, states))).toEqual(["tiempo-weather"]);
  });
});

describe("Learn batch: reds return at the end", () => {
  const batch = learnBatch(cards, new Map(), 4);

  it("appends a card rated red to the end of the batch", () => {
    const next = afterLearnRating(batch, 1, "again");
    expect(ids(next)).toEqual([...ids(batch), batch[1].id]);
    expect(batch).toHaveLength(4);
  });

  it("leaves the batch alone on green or orange", () => {
    expect(afterLearnRating(batch, 1, "good")).toBe(batch);
    expect(afterLearnRating(batch, 1, "nearly")).toBe(batch);
  });

  it("brings a card back only once", () => {
    const once = afterLearnRating(batch, 0, "again");
    expect(afterLearnRating(once, 0, "again")).toBe(once);
    // Red again on the second showing, which is the last card of the batch.
    expect(afterLearnRating(once, once.length - 1, "again")).toBe(once);
  });

  it("keeps returned cards in the order they were failed", () => {
    let current = afterLearnRating(batch, 2, "again");
    current = afterLearnRating(current, 3, "again");
    expect(ids(current).slice(4)).toEqual([batch[2].id, batch[3].id]);
  });
});

describe("Practice: due cards, then extra practice", () => {
  it("puts due cards first, most common first", () => {
    // Reds are due again within minutes. Stored out of rank order on purpose.
    const states = replayReviews([
      review("carro-car", "again", T0),
      review("de-of", "again", T0 + 3 * MINUTE),
      review("casa-house", "again", T0 + MINUTE),
      review("tiempo-weather", "again", T0 + 2 * MINUTE),
      review("tiempo-time", "again", T0 + 2 * MINUTE),
    ]);
    const now = T0 + HOUR;
    const expected = ["de-of", "tiempo-time", "tiempo-weather", "casa-house", "carro-car"];
    expect(ids(dueQueue(cards, states, now))).toEqual(expected);
    expect(practiceQueue({ cards, states, now })).toEqual({
      cards: expected.map(fixtureCard),
      caughtUpAt: 5,
    });
  });

  it("places the caught-up marker after the due cards and before extra practice", () => {
    const states = replayReviews([
      review("ir-go", "good", T0),
      review("carro-car", "again", T0),
      review("de-of", "good", T0),
      review("casa-house", "again", T0),
    ]);
    const now = T0 + HOUR;
    expect(isDue(states.get("ir-go"), now)).toBe(false);
    const queue = practiceQueue({ cards, states, now });
    expect(ids(queue.cards)).toEqual(["casa-house", "carro-car", "de-of", "ir-go"]);
    expect(queue.caughtUpAt).toBe(2);
  });

  it("orders extra practice by lowest predicted recall first", () => {
    // Same rating, so the same stability: the longer ago, the lower the recall.
    const states = replayReviews([
      review("de-of", "good", T0 + 2 * DAY),
      review("carro-car", "good", T0),
      review("ir-go", "good", T0 + DAY),
    ]);
    const now = T0 + 3 * DAY;
    const recall = (id: string) => predictedRecall(states.get(id), now);
    expect(recall("carro-car")).toBeLessThan(recall("ir-go"));
    expect(recall("ir-go")).toBeLessThan(recall("de-of"));
    expect(ids(extraPracticeQueue(cards, states, now))).toEqual(["carro-car", "ir-go", "de-of"]);
    expect(practiceQueue({ cards, states, now })).toEqual({
      cards: ["carro-car", "ir-go", "de-of"].map(fixtureCard),
      caughtUpAt: 0,
    });
  });

  it("breaks recall ties by frequency rank", () => {
    const states = replayReviews([
      review("carro-car", "good", T0),
      review("hablar-speak", "good", T0),
      review("de-of", "good", T0),
      review("problema-problem", "good", T0 - DAY),
    ]);
    expect(ids(extraPracticeQueue(reversed(cards), states, T0 + DAY))).toEqual([
      "problema-problem",
      "de-of",
      "hablar-speak",
      "carro-car",
    ]);
  });

  it("never shows unseen cards", () => {
    const states = replayReviews([review("casa-house", "good", T0)]);
    for (const mode of ["due", "shuffle", "in-order", "struggling"] as const) {
      const queue = practiceQueue({ cards, states, now: T0 + 30 * DAY, reviews: [] }, { mode });
      expect(ids(queue.cards).filter((id) => id !== "casa-house")).toEqual([]);
    }
    expect(practiceQueue({ cards, states: new Map(), now: T0 })).toEqual({ cards: [], caughtUpAt: 0 });
  });
});

describe("Practice options", () => {
  // Seen: four due (red) and four not due (green). Four cards stay unseen.
  const reviews = [
    review("carro-car", "again", T0),
    review("lo-him", "good", T0),
    review("casa-house", "good", T0),
    review("ir-go", "again", T0),
    review("tiempo-weather", "good", T0),
    review("tiempo-time", "again", T0),
    review("de-of", "good", T0),
    review("hablar-speak", "again", T0),
  ];
  const states = replayReviews(reviews);
  const now = T0 + HOUR;
  const seenByRank = [
    "de-of",
    "lo-him",
    "ir-go",
    "tiempo-time",
    "tiempo-weather",
    "casa-house",
    "hablar-speak",
    "carro-car",
  ];

  it("in order: every seen card by frequency rank, due or not", () => {
    const queue = practiceQueue({ cards: reversed(cards), states, now }, { mode: "in-order" });
    expect(ids(queue.cards).filter((id) => !id.startsWith("tiempo"))).toEqual(
      seenByRank.filter((id) => !id.startsWith("tiempo")),
    );
    expect(practiceQueue({ cards, states, now }, { mode: "in-order" })).toEqual({
      cards: seenByRank.map(fixtureCard),
      caughtUpAt: null,
    });
  });

  it("shuffle: every seen card once, in an order set by the random source", () => {
    const a = practiceQueue({ cards, states, now }, { mode: "shuffle", random: seeded(1) });
    const again = practiceQueue({ cards, states, now }, { mode: "shuffle", random: seeded(1) });
    const b = practiceQueue({ cards, states, now }, { mode: "shuffle", random: seeded(2) });
    expect(a.caughtUpAt).toBeNull();
    expect(ids(a.cards).sort()).toEqual([...seenByRank].sort());
    expect(ids(b.cards).sort()).toEqual([...seenByRank].sort());
    expect(ids(a.cards)).toEqual(ids(again.cards));
    expect(ids(a.cards)).not.toEqual(ids(b.cards));
    expect(ids(a.cards)).not.toEqual(seenByRank);
  });

  it("shuffle: uses Math.random when no source is given", () => {
    const queue = practiceQueue({ cards, states, now }, { mode: "shuffle" });
    expect(ids(queue.cards).sort()).toEqual([...seenByRank].sort());
  });

  it("struggling: cards with a red among their last three forward ratings, by rank", () => {
    const history = [
      // Red was four ratings ago: no longer struggling.
      review("de-of", "again", T0),
      review("de-of", "good", T0 + DAY),
      review("de-of", "nearly", T0 + 2 * DAY),
      review("de-of", "good", T0 + 3 * DAY),
      // Red is exactly the third from last.
      review("carro-car", "again", T0),
      review("carro-car", "good", T0 + DAY),
      review("carro-car", "good", T0 + 2 * DAY),
      // The latest rating is a red.
      review("casa-house", "good", T0),
      review("casa-house", "again", T0 + DAY),
      // Never red.
      review("ir-go", "nearly", T0),
      // A red in Reverse does not count.
      review("lo-him", "good", T0),
      review("lo-him", "again", T0 + DAY, "reverse"),
    ];
    expect([...strugglingCardIds(history)].sort()).toEqual(["carro-car", "casa-house"]);

    const input = { cards, states: replayReviews(history), now: T0 + 4 * DAY };
    const expected = { cards: ["casa-house", "carro-car"].map(fixtureCard), caughtUpAt: null };
    expect(practiceQueue({ ...input, reviews: history }, { mode: "struggling" })).toEqual(expected);
    // Reviews are read in time order however they were stored, and a duplicate counts once.
    const stored = [...reversed(history), history[0], history[0], history[0]];
    expect(practiceQueue({ ...input, reviews: stored }, { mode: "struggling" })).toEqual(expected);
  });

  it("part of speech: limits the due and extra-practice sections to that slice", () => {
    const queue = practiceQueue({ cards, states, now }, { pos: "noun" });
    expect(ids(queue.cards)).toEqual(["tiempo-time", "carro-car", "tiempo-weather", "casa-house"]);
    expect(queue.caughtUpAt).toBe(2);

    const verbs = practiceQueue({ cards, states, now }, { pos: "verb" });
    expect(ids(verbs.cards)).toEqual(["ir-go", "hablar-speak"]);
    expect(verbs.caughtUpAt).toBe(2);

    expect(practiceQueue({ cards, states, now }, { pos: "adjective" }).cards).toEqual([]);
  });

  it("part of speech: combines with in order, shuffle and struggling", () => {
    const nouns = ["tiempo-time", "tiempo-weather", "casa-house", "carro-car"];
    const input = { cards, states, now, reviews };
    expect(ids(practiceQueue(input, { mode: "in-order", pos: "noun" }).cards)).toEqual(nouns);
    expect(
      ids(practiceQueue(input, { mode: "shuffle", pos: "noun", random: seeded(3) }).cards).sort(),
    ).toEqual([...nouns].sort());
    expect(ids(practiceQueue(input, { mode: "struggling", pos: "noun" }).cards)).toEqual([
      "tiempo-time",
      "carro-car",
    ]);
    expect(ids(practiceQueue(input, { mode: "struggling", pos: "pronoun" }).cards)).toEqual([]);
  });
});
