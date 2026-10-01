import { describe, expect, it } from "vitest";
import { PARTS_OF_SPEECH } from "@/lib/deck";
import { fixtureDeck } from "@/lib/deck/fixture";
import {
  MIN_SLICE_ANGLE,
  fillRadius,
  polarPoint,
  progressStats,
  sectorPath,
  sliceAngles,
  wheelSlices,
} from "@/lib/progress";
import { replayReviews, type CardState } from "@/lib/scheduler";

const FULL_TURN = 2 * Math.PI;
const cards = fixtureDeck.cards;

function state(cardId: string, stability: number, phase: CardState["phase"] = "review"): CardState {
  return {
    cardId,
    due: 0,
    stability,
    difficulty: 5,
    phase,
    learningSteps: 0,
    scheduledDays: 1,
    reps: 1,
    lapses: 0,
    lastReview: 0,
  };
}

function statesOf(...list: CardState[]): Map<string, CardState> {
  return new Map(list.map((s) => [s.cardId, s]));
}

const sum = (numbers: number[]) => numbers.reduce((a, b) => a + b, 0);

describe("progressStats", () => {
  it("counts the fixture by part of speech, in wheel order, with nothing seen", () => {
    const stats = progressStats(cards, new Map());
    expect(stats).toMatchObject({ total: 12, seen: 0, memorized: 0 });
    expect(stats.byPos.map((g) => g.pos)).toEqual([...PARTS_OF_SPEECH]);
    expect(Object.fromEntries(stats.byPos.map((g) => [g.pos, g.total]))).toEqual({
      noun: 5,
      verb: 2,
      adjective: 1,
      adverb: 1,
      pronoun: 2,
      preposition: 1,
      conjunction: 0,
      determiner: 0,
      other: 0,
    });
    expect(stats.byPos.every((g) => g.seen === 0 && g.memorized === 0)).toBe(true);
  });

  it("counts seen and memorized cards, memorized being a subset of seen", () => {
    const stats = progressStats(
      cards,
      statesOf(
        state("casa-house", 30),
        state("carro-car", 3),
        state("ir-go", 21),
        state("de-of", 20.9),
      ),
    );
    expect(stats).toMatchObject({ total: 12, seen: 4, memorized: 2 });
    const byPos = Object.fromEntries(stats.byPos.map((g) => [g.pos, g]));
    expect(byPos.noun).toMatchObject({ total: 5, seen: 2, memorized: 1 });
    expect(byPos.verb).toMatchObject({ total: 2, seen: 1, memorized: 1 });
    expect(byPos.preposition).toMatchObject({ total: 1, seen: 1, memorized: 0 });
    expect(byPos.adverb).toMatchObject({ total: 1, seen: 0, memorized: 0 });
  });

  it("does not count a relearning card as memorized, whatever its stability", () => {
    const stats = progressStats(cards, statesOf(state("casa-house", 90, "relearning")));
    expect(stats).toMatchObject({ seen: 1, memorized: 0 });
  });

  it("works from replayed reviews and ignores reverse ratings and unknown cards", () => {
    const states = replayReviews([
      { id: "a", cardId: "casa-house", direction: "forward", rating: "good", timestamp: 1 },
      { id: "b", cardId: "ir-go", direction: "reverse", rating: "good", timestamp: 2 },
      { id: "c", cardId: "not-in-deck", direction: "forward", rating: "good", timestamp: 3 },
    ]);
    expect(progressStats(cards, states)).toMatchObject({ total: 12, seen: 1, memorized: 0 });
  });
});

describe("sliceAngles", () => {
  it("is proportional to each group's share when every share clears the minimum", () => {
    const angles = sliceAngles([500, 300, 200]);
    expect(angles[0]).toBeCloseTo(FULL_TURN * 0.5);
    expect(angles[1]).toBeCloseTo(FULL_TURN * 0.3);
    expect(angles[2]).toBeCloseTo(FULL_TURN * 0.2);
  });

  it("gives a small group the minimum and shares the rest in proportion", () => {
    const angles = sliceAngles([600, 390, 10]);
    expect(angles[2]).toBeCloseTo(MIN_SLICE_ANGLE);
    expect(sum(angles)).toBeCloseTo(FULL_TURN);
    expect(angles[0] / angles[1]).toBeCloseTo(600 / 390);
  });

  it("catches a group that only falls below the minimum once others are raised", () => {
    // Shares of a full turn: 64.8 percent, six of 5.7 percent, and 1 percent. The minimum is 5.56 percent.
    // Raising the last group to the minimum pulls the 5.7 percent groups down to 5.44 percent, below it.
    const totals = [648, 57, 57, 57, 57, 57, 57, 10];
    const angles = sliceAngles(totals);
    expect(angles[0]).toBeCloseTo(FULL_TURN - 7 * MIN_SLICE_ANGLE);
    expect(sum(angles)).toBeCloseTo(FULL_TURN);
    for (const angle of angles) expect(angle).toBeGreaterThanOrEqual(MIN_SLICE_ANGLE - 1e-12);
    for (const angle of angles.slice(1)) expect(angle).toBeCloseTo(MIN_SLICE_ANGLE);
  });

  it("holds the minimum for a realistic 1,000-card deck", () => {
    const totals = [420, 250, 130, 70, 50, 30, 20, 20, 10];
    const angles = sliceAngles(totals);
    expect(sum(angles)).toBeCloseTo(FULL_TURN);
    for (const angle of angles) expect(angle).toBeGreaterThanOrEqual(MIN_SLICE_ANGLE - 1e-12);
    // Bigger groups never get narrower slices.
    for (let i = 1; i < angles.length; i++) expect(angles[i]).toBeLessThanOrEqual(angles[i - 1] + 1e-12);
  });

  it("gives a group with no cards no slice", () => {
    const angles = sliceAngles([3, 0, 1]);
    expect(angles[1]).toBe(0);
    expect(sum(angles)).toBeCloseTo(FULL_TURN);
  });

  it("gives one group the whole wheel, and an empty deck nothing", () => {
    expect(sliceAngles([0, 7, 0])).toEqual([0, FULL_TURN, 0]);
    expect(sliceAngles([0, 0])).toEqual([0, 0]);
  });

  it("falls back to equal slices when the minimum cannot fit", () => {
    const angles = sliceAngles([100, 1, 1, 1], Math.PI);
    for (const angle of angles) expect(angle).toBeCloseTo(FULL_TURN / 4);
  });
});

describe("fillRadius", () => {
  it("is the square root of the fraction, times the full radius", () => {
    expect(fillRadius(0, 10, 100)).toBe(0);
    expect(fillRadius(1, 4, 100)).toBeCloseTo(50);
    expect(fillRadius(5, 10, 100)).toBeCloseTo(70.71, 2);
    expect(fillRadius(10, 10, 100)).toBe(100);
    expect(fillRadius(1, 4)).toBeCloseTo(0.5);
  });

  it("makes the filled area match the fraction", () => {
    const r = fillRadius(3, 10, 100);
    expect((r * r) / (100 * 100)).toBeCloseTo(0.3);
  });

  it("is 0 for an empty group and never exceeds the full radius", () => {
    expect(fillRadius(0, 0, 100)).toBe(0);
    expect(fillRadius(12, 10, 100)).toBe(100);
  });
});

describe("wheelSlices", () => {
  it("lays the slices end to end from the top, leaving out empty groups", () => {
    const slices = wheelSlices(progressStats(cards, new Map()));
    expect(slices.map((s) => s.pos)).toEqual([
      "noun",
      "verb",
      "adjective",
      "adverb",
      "pronoun",
      "preposition",
    ]);
    expect(slices[0].startAngle).toBe(0);
    for (let i = 1; i < slices.length; i++) expect(slices[i].startAngle).toBe(slices[i - 1].endAngle);
    expect(slices.at(-1)!.endAngle).toBe(FULL_TURN);
    for (const s of slices) expect(s.endAngle - s.startAngle).toBeGreaterThanOrEqual(MIN_SLICE_ANGLE - 1e-12);
  });

  it("gives each slice a seen radius and a memorized radius inside it", () => {
    const stats = progressStats(
      cards,
      statesOf(state("casa-house", 30), state("carro-car", 3), state("problema-problem", 3), state("tiempo-time", 3)),
    );
    const noun = wheelSlices(stats, { radius: 100 })[0];
    expect(noun.seenRadius).toBeCloseTo(Math.sqrt(4 / 5) * 100);
    expect(noun.memorizedRadius).toBeCloseTo(Math.sqrt(1 / 5) * 100);
    for (const s of wheelSlices(stats)) expect(s.memorizedRadius).toBeLessThanOrEqual(s.seenRadius);
  });

  it("is a complete disc when every card is memorized", () => {
    const stats = progressStats(cards, statesOf(...cards.map((c) => state(c.id, 40))));
    for (const s of wheelSlices(stats)) {
      expect(s.seenRadius).toBe(1);
      expect(s.memorizedRadius).toBe(1);
    }
  });

  it("returns no slices for an empty deck", () => {
    expect(wheelSlices(progressStats([], new Map()))).toEqual([]);
  });
});

describe("polarPoint and sectorPath", () => {
  it("measures angles clockwise from the top", () => {
    expect(polarPoint(0, 100)).toEqual({ x: 0, y: -100 });
    const right = polarPoint(Math.PI / 2, 100);
    expect(right.x).toBeCloseTo(100);
    expect(right.y).toBeCloseTo(0);
    const bottom = polarPoint(Math.PI, 100);
    expect(bottom.x).toBeCloseTo(0);
    expect(bottom.y).toBeCloseTo(100);
  });

  it("draws a sector from the centre, sweeping clockwise", () => {
    expect(sectorPath(0, Math.PI / 2, 100)).toBe("M 0 0 L 0 -100 A 100 100 0 0 1 100 0 Z");
  });

  it("sets the large-arc flag past a half turn", () => {
    expect(sectorPath(0, 1.5 * Math.PI, 100)).toBe("M 0 0 L 0 -100 A 100 100 0 1 1 -100 0 Z");
  });

  it("draws a full turn as a circle, and nothing for an empty sector", () => {
    expect(sectorPath(0, FULL_TURN, 50)).toBe("M 0 -50 A 50 50 0 1 1 0 50 A 50 50 0 1 1 0 -50 Z");
    expect(sectorPath(0, 1, 0)).toBe("");
    expect(sectorPath(1, 1, 50)).toBe("");
  });
});
