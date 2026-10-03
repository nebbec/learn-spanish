import { describe, expect, it } from "vitest";
import type { Card } from "@/lib/deck";
import { fixtureCard, fixtureDeck } from "@/lib/deck/fixture";
import {
  DEFAULT_BATCH_SIZE,
  TEST_DELAY,
  afterIntro,
  afterLearnRating,
  earlierMeaning,
  testSteps,
  type Step,
  dueQueue,
  extraPracticeQueue,
  isUnitComplete,
  learnBatch,
  learnCut,
  unitName,
  unitPhrases,
  learnQueue,
  practiceQueue,
  reachedTips,
  strugglingCardIds,
  tipOf,
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
/** Steps written short: `intro:casa-house`, `test:casa-house`. */
const steps = (list: readonly Step[]) => list.map((step) => `${step.kind}:${step.card.id}`);
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

  it("cuts a batch to the batch size, 15 by default, as an intro for each card", () => {
    expect(steps(learnBatch(cards, new Map(), 3))).toEqual(FILE_ORDER.slice(0, 3).map((id) => `intro:${id}`));
    expect(DEFAULT_BATCH_SIZE).toBe(15);
    expect(learnBatch(cards, new Map()).map((step) => step.card.id)).toEqual(FILE_ORDER.slice(0, 15));
    const states = replayReviews(FILE_ORDER.slice(0, 15).map((id) => review(id, "good", T0)));
    expect(steps(learnBatch(cards, states))).toEqual(["intro:tiempo-weather"]);
  });
});

describe("Learn batch: intros, then tests", () => {
  const batch = learnBatch(cards, new Map(), 4);
  const [a, b, c, d] = FILE_ORDER;

  it("puts a card's test three steps after its intro on Got it", () => {
    expect(TEST_DELAY).toBe(3);
    const next = afterIntro(batch, 0, "got-it");
    expect(steps(next)).toEqual([`intro:${a}`, `intro:${b}`, `intro:${c}`, `test:${a}`, `intro:${d}`]);
    expect(batch).toHaveLength(4);
  });

  it("puts the test at the end when fewer steps remain", () => {
    expect(steps(afterIntro(batch, 3, "got-it"))).toEqual([...steps(batch), `test:${d}`]);
    expect(steps(afterIntro(batch, 2, "got-it"))).toEqual([...steps(batch), `test:${c}`]);
  });

  it("shows every intro before its test when each intro is passed in turn", () => {
    let current: readonly Step[] = batch;
    for (let i = 0; i < current.length; i += 1) {
      if (current[i].kind === "intro") current = afterIntro(current, i, "got-it");
    }
    expect(steps(current)).toEqual([
      `intro:${a}`,
      `intro:${b}`,
      `intro:${c}`,
      `test:${a}`,
      `test:${b}`,
      `test:${c}`,
      `intro:${d}`,
      `test:${d}`,
    ]);
  });

  it("adds no test for a card the learner already knows", () => {
    expect(afterIntro(batch, 1, "known")).toBe(batch);
  });

  it("leaves the batch alone when the step is not an intro", () => {
    const tested = testSteps(cards.slice(0, 2));
    expect(afterIntro(tested, 0, "got-it")).toBe(tested);
  });
});

describe("Learn batch: tips", () => {
  const tips = fixtureDeck.tips;
  // The fixture's one tip is named by its first two cards, ir-form-yo and ir-form-tu.
  const named = cards.filter((card) => card.tip === "tip-verb-endings").map((card) => card.id);

  it("shows a tip once, before the first card naming it", () => {
    expect(named).toEqual(["ir-form-yo", "ir-form-tu"]);
    expect(steps(learnBatch(cards, new Map(), 3, tips))).toEqual([
      "tip:ir-form-yo",
      "intro:ir-form-yo",
      "intro:ir-form-tu",
      "intro:casa-house",
    ]);
    const tip = learnBatch(cards, new Map(), 1, tips)[0];
    expect(tip.kind === "tip" && tip.tip.id).toBe("tip-verb-endings");
  });

  it("does not show it again once a card naming it is seen", () => {
    const seen = replayReviews([review("ir-form-yo", "good", T0)]);
    expect(steps(learnBatch(cards, seen, 2, tips))).toEqual(["intro:ir-form-tu", "intro:casa-house"]);
    const known = replayReviews([review("ir-form-tu", "known", T0)]);
    expect(steps(learnBatch(cards, known, 1, tips))).toEqual(["intro:ir-form-yo"]);
  });

  it("is shown again while no card naming it is seen, as after a batch left early", () => {
    const other = replayReviews([review("casa-house", "good", T0)]);
    expect(steps(learnBatch(cards, other, 1, tips))).toEqual(["tip:ir-form-yo", "intro:ir-form-yo"]);
  });

  it("shows no tip the deck does not ship", () => {
    expect(steps(learnBatch(cards, new Map(), 1))).toEqual(["intro:ir-form-yo"]);
    expect(tipOf([], fixtureCard("ir-form-yo"))).toBeUndefined();
    expect(tipOf(tips, fixtureCard("casa-house"))).toBeUndefined();
    expect(tipOf(tips, fixtureCard("ir-form-tu"))?.id).toBe("tip-verb-endings");
  });

  it("counts a tip as reached once a card naming it is seen", () => {
    expect(reachedTips(tips, cards, new Map())).toEqual([]);
    expect(reachedTips(tips, cards, replayReviews([review("casa-house", "good", T0)]))).toEqual([]);
    const seen = replayReviews([review("ir-form-tu", "again", T0)]);
    expect(reachedTips(tips, cards, seen).map((tip) => tip.id)).toEqual(["tip-verb-endings"]);
  });
});

describe("Learn batch: units", () => {
  const units = fixtureDeck.units;
  const UNIT_1 = ["ir-form-yo", "ir-form-tu", "casa-house", "phrase-going-home"];
  const UNIT_2 = ["bueno-good", "ahora-now", "phrase-thats-great"];
  const FREQUENCY = FILE_ORDER.slice(UNIT_1.length + UNIT_2.length);
  const seen = (...list: string[]) => replayReviews(list.map((id, i) => review(id, "good", T0 + i * MINUTE)));
  const cut = (states: ReturnType<typeof seen>, size = DEFAULT_BATCH_SIZE) => {
    const { unit, added, cards: batch } = learnCut(cards, states, units, size);
    return { unit: unit?.id ?? null, added: ids(added), cards: ids(batch) };
  };

  it("makes a batch of the first unit, whatever the batch size, with its tip", () => {
    expect(cut(new Map(), 2)).toEqual({ unit: "where-i-go", added: [], cards: UNIT_1 });
    expect(steps(learnBatch(cards, new Map(), 2, fixtureDeck.tips, units))).toEqual([
      "tip:ir-form-yo",
      ...UNIT_1.map((id) => `intro:${id}`),
    ]);
  });

  it("goes on with a unit left part way, then takes the next unit", () => {
    expect(cut(seen("ir-form-yo"))).toEqual({ unit: "where-i-go", added: [], cards: UNIT_1.slice(1) });
    expect(cut(seen(...UNIT_1))).toEqual({ unit: "good-things", added: [], cards: UNIT_2 });
  });

  it("cuts the frequency phase by batch size once every unit is seen", () => {
    const starter = seen(...UNIT_1, ...UNIT_2);
    expect(cut(starter, 3)).toEqual({ unit: null, added: [], cards: FREQUENCY.slice(0, 3) });
    expect(cut(starter)).toEqual({ unit: null, added: [], cards: FREQUENCY });
    expect(steps(learnBatch(cards, starter, 2, fixtureDeck.tips, units))).toEqual(
      FREQUENCY.slice(0, 2).map((id) => `intro:${id}`),
    );
  });

  it("leads with a card added to a unit already finished", () => {
    // casa-house stands in for a card added to unit 1 after the learner moved on to unit 2.
    const inUnit2 = seen("ir-form-yo", "ir-form-tu", "phrase-going-home", "bueno-good");
    expect(cut(inUnit2)).toEqual({
      unit: "good-things",
      added: ["casa-house"],
      cards: ["casa-house", "ahora-now", "phrase-thats-great"],
    });
    // In the frequency phase the added card counts towards the batch size.
    const pastUnits = seen("ir-form-yo", "ir-form-tu", "phrase-going-home", ...UNIT_2, "ir-go");
    expect(cut(pastUnits, 3)).toEqual({
      unit: null,
      added: ["casa-house"],
      cards: ["casa-house", ...FREQUENCY.slice(1, 3)],
    });
  });

  it("cuts by size when the deck has no units", () => {
    const { unit, cards: batch } = learnCut(cards, new Map(), [], 3);
    expect(unit).toBeNull();
    expect(ids(batch)).toEqual(FILE_ORDER.slice(0, 3));
  });

  it("names a unit, knows when it is complete, and lists its phrases", () => {
    expect(unitName(units, units[1])).toBe("Unit 2 · Good things");
    expect(isUnitComplete(units[0], cards, seen(...UNIT_1.slice(1)))).toBe(false);
    expect(isUnitComplete(units[0], cards, seen(...UNIT_1))).toBe(true);
    expect(ids(unitPhrases(units[0], cards))).toEqual(["phrase-going-home"]);
    expect(ids(unitPhrases(units[1], cards))).toEqual(["phrase-thats-great"]);
  });
});

describe("Learn batch: reds return at the end", () => {
  const batch = testSteps(cards.slice(0, 4));

  it("appends a test rated red to the end of the batch", () => {
    const next = afterLearnRating(batch, 1, "again");
    expect(steps(next)).toEqual([...steps(batch), `test:${batch[1].card.id}`]);
    expect(batch).toHaveLength(4);
  });

  it("leaves the batch alone on green, orange or known", () => {
    expect(afterLearnRating(batch, 1, "good")).toBe(batch);
    expect(afterLearnRating(batch, 1, "nearly")).toBe(batch);
    expect(afterLearnRating(batch, 1, "known")).toBe(batch);
  });

  it("brings a card back only once", () => {
    const once = afterLearnRating(batch, 0, "again");
    expect(afterLearnRating(once, 0, "again")).toBe(once);
    // Red again on the second test, which is the last step of the batch.
    expect(afterLearnRating(once, once.length - 1, "again")).toBe(once);
  });

  it("keeps returned cards in the order they were failed", () => {
    let current = afterLearnRating(batch, 2, "again");
    current = afterLearnRating(current, 3, "again");
    expect(steps(current).slice(4)).toEqual([`test:${batch[2].card.id}`, `test:${batch[3].card.id}`]);
  });

  it("counts an intro before the test as no showing", () => {
    const withIntro = afterIntro(learnBatch(cards, new Map(), 1), 0, "got-it");
    const once = afterLearnRating(withIntro, 1, "again");
    const [first] = FILE_ORDER;
    expect(steps(once)).toEqual([`intro:${first}`, `test:${first}`, `test:${first}`]);
    expect(afterLearnRating(once, 2, "again")).toBe(once);
  });
});

describe("earlier meaning", () => {
  it("is the seen content or glue card of the same rank", () => {
    const later = fixtureCard("tiempo-weather");
    expect(earlierMeaning(cards, new Map(), later)).toBeUndefined();
    const seen = replayReviews([review("tiempo-time", "good", T0)]);
    expect(earlierMeaning(cards, seen, later)?.id).toBe("tiempo-time");
    // The first meaning has the second as its sibling too, once that one is seen.
    expect(earlierMeaning(cards, replayReviews([review("tiempo-weather", "good", T0)]), fixtureCard("tiempo-time"))?.id).toBe(
      "tiempo-weather",
    );
  });

  it("ignores form and phrase cards, which borrow a rank", () => {
    const formsSeen = replayReviews([review("ir-form-yo", "good", T0), review("ir-form-tu", "good", T0)]);
    expect(earlierMeaning(cards, formsSeen, fixtureCard("ir-go"))).toBeUndefined();
    const goSeen = replayReviews([review("ir-go", "good", T0)]);
    expect(earlierMeaning(cards, goSeen, fixtureCard("ir-form-yo"))).toBeUndefined();
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
      review("ir-go", "known", T0),
      review("carro-car", "again", T0),
      review("de-of", "known", T0),
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
      review("de-of", "known", T0 + 2 * DAY),
      review("carro-car", "known", T0),
      review("ir-go", "known", T0 + DAY),
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
      review("carro-car", "known", T0),
      review("hablar-speak", "known", T0),
      review("de-of", "known", T0),
      review("problema-problem", "known", T0 - DAY),
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
  // Seen: four due (red) and four not due (known, so Easy). Four cards stay unseen.
  const reviews = [
    review("carro-car", "again", T0),
    review("lo-him", "known", T0),
    review("casa-house", "known", T0),
    review("ir-go", "again", T0),
    review("tiempo-weather", "known", T0),
    review("tiempo-time", "again", T0),
    review("de-of", "known", T0),
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
