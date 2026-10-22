import { describe, expect, it } from "vitest";
import { fixtureDeck } from "@/lib/deck/fixture";
import { GREETING_TEXT, menuGreeting } from "@/lib/progress";
import { currentUnit } from "@/lib/queues";
import type { CardState } from "@/lib/scheduler";

const { cards, units } = fixtureDeck;
const NOW = Date.UTC(2026, 9, 4, 9, 0, 0);
const DAY = 24 * 60 * 60 * 1000;
const UNIT_1 = ["ir-form-yo", "ir-form-tu", "casa-house", "phrase-going-home"];

/** A seen card, due `dueIn` from now (negative: already due). */
function seen(cardId: string, dueIn = DAY): CardState {
  return {
    cardId,
    due: NOW + dueIn,
    stability: 3,
    difficulty: 5,
    phase: "review",
    learningSteps: 0,
    scheduledDays: 3,
    reps: 1,
    lapses: 0,
    lastReview: NOW - DAY,
  };
}

const statesOf = (...list: CardState[]) => new Map(list.map((s) => [s.cardId, s]));
const greet = (states: Map<string, CardState>, deckUnits = units) => GREETING_TEXT[menuGreeting(cards, deckUnits, states, NOW)];

describe("menuGreeting", () => {
  it("says ¡Hola! when nothing is seen yet", () => {
    expect(greet(new Map())).toBe("¡Hola!");
    expect(greet(new Map(), [])).toBe("¡Hola!");
  });

  it("says ¡Vamos! while the unit the learner is on has unseen cards", () => {
    expect(greet(statesOf(seen("ir-form-yo"), seen("casa-house")))).toBe("¡Vamos!");
  });

  it("says ¡Muy bien! once that unit is finished and nothing is due", () => {
    expect(greet(statesOf(...UNIT_1.map((id) => seen(id))))).toBe("¡Muy bien!");
  });

  it("says ¡Vamos! when a card is due, unit finished or not", () => {
    expect(greet(statesOf(...UNIT_1.map((id) => seen(id)), seen("ir-form-yo", -1000)))).toBe("¡Vamos!");
  });

  it("in the frequency phase, says ¡Muy bien! when nothing is due and ¡Vamos! when something is", () => {
    expect(greet(statesOf(seen("ir-go")), [])).toBe("¡Muy bien!");
    expect(greet(statesOf(seen("ir-go"), seen("de-of", -1000)), [])).toBe("¡Vamos!");
    // Past the units: a frequency-phase card seen ends the starter path, whatever was left in a unit.
    expect(greet(statesOf(seen("casa-house"), seen("ir-go")))).toBe("¡Muy bien!");
  });
});

describe("currentUnit", () => {
  it("is the latest unit holding a seen card, and null with nothing seen or past the units", () => {
    expect(currentUnit(cards, new Map(), units)).toBeNull();
    expect(currentUnit(cards, statesOf(seen("casa-house")), units)?.id).toBe("where-i-go");
    expect(currentUnit(cards, statesOf(seen("casa-house"), seen("bueno-good")), units)?.id).toBe("good-things");
    expect(currentUnit(cards, statesOf(seen("casa-house"), seen("ir-go")), units)).toBeNull();
  });
});
