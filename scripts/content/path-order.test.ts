// The learning path's order rules (L6) on small made-up decks. The interleave of content and
// glue cards moved here from lib/queues (B3): Learn now follows the deck file.

import { describe, expect, it } from "vitest";
import type { Card, CardKind } from "@/lib/deck/types";
import { fixtureCard, fixtureDeck } from "@/lib/deck/fixture";
import { interleave, pathMarkdown, pathOrder, SIBLING_SPACING } from "./path-order";
import type { Unit } from "./units";

const BASE: Record<CardKind, string> = { content: "casa-house", glue: "de-of", form: "ir-form-yo", phrase: "phrase-going-home" };

/** A made-up card: only its id, kind, rank and path fields matter to the order. */
function card(id: string, kind: CardKind, rank: number, path: Partial<Pick<Card, "unit" | "requires">> = {}): Card {
  return { ...fixtureCard(BASE[kind]), id, kind, rank, unit: null, requires: [], tip: null, why: null, ...path };
}

const ids = (list: readonly Card[]) => list.map((c) => c.id);
const unit = (id: string, cap?: number): Unit => ({ id, title: id, goal: "say it.", tip: null, cap, wants: [], payoff: [] });

describe("the fixture", () => {
  it("is in the order the build computes, whatever order its cards come in", () => {
    const cards = fixtureDeck.cards;
    // Cards of one rank keep the order they were drafted in (a verb's yo, tu, él), so the sort is stable.
    for (const input of [cards, [...cards].sort((a, b) => b.rank - a.rank)]) {
      const order = pathOrder(input, fixtureDeck.units);
      expect(order.problems).toEqual([]);
      expect(ids(order.cards)).toEqual(ids(cards));
      expect(order.starter).toBe(7);
    }
  });
});

describe("rule 1: units", () => {
  it("come in plan order, and within a unit requires first, then word cards before phrases, then rank", () => {
    const cards = [
      card("b-word", "content", 3, { unit: "b" }),
      card("a-phrase", "phrase", 5, { unit: "a" }),
      card("a-late", "content", 80, { unit: "a" }),
      card("a-needs-late", "content", 10, { unit: "a", requires: ["a-late"] }),
      card("a-first", "content", 50, { unit: "a" }),
      card("a-form", "form", 60, { unit: "a" }),
      card("free", "content", 1),
    ];
    const order = pathOrder(cards, [unit("a"), unit("b")]);
    expect(ids(order.cards)).toEqual(["a-first", "a-form", "a-late", "a-needs-late", "a-phrase", "b-word", "free"]);
    expect(order.starter).toBe(6);
  });

  it("keeps a unit's meanings of one word together: spacing is for the frequency phase", () => {
    const cards = [card("ser-one", "content", 4, { unit: "a" }), card("ser-two", "content", 4, { unit: "a" }), card("x", "content", 9)];
    expect(ids(pathOrder(cards, [unit("a")]).cards)).toEqual(["ser-one", "ser-two", "x"]);
  });
});

describe("rule 2: caps", () => {
  it("drops the lowest-ranked word cards past the cap to the frequency phase, never a phrase or a card the unit requires", () => {
    const cards = [
      card("w1", "content", 10, { unit: "a" }),
      card("w2", "content", 20, { unit: "a" }),
      card("w3", "content", 30, { unit: "a" }),
      card("w4", "content", 40, { unit: "a" }),
      card("p1", "phrase", 40, { unit: "a", requires: ["w4"] }),
      card("p2", "phrase", 10, { unit: "a" }),
    ];
    const order = pathOrder(cards, [unit("a", 4)]);
    expect(order.capped).toEqual(["w3", "w2"]);
    expect(ids(order.cards)).toEqual(["w1", "w4", "p2", "p1", "w2", "w3"]);
    expect(order.starter).toBe(4);
    expect(order.cards.slice(4).map((c) => c.unit)).toEqual([null, null]);
  });

  it("takes 12 cards when the unit names no cap", () => {
    const cards = Array.from({ length: 14 }, (_, i) => card(`w${i}`, "content", i + 1, { unit: "a" }));
    expect(pathOrder(cards, [unit("a")]).capped).toEqual(["w13", "w12"]);
  });
});

describe("rule 3: the frequency phase", () => {
  it("draws two content cards, then one glue card, each queue by rank, whatever the input order", () => {
    const cards = [
      card("c4", "content", 40),
      card("g2", "glue", 25),
      card("c1", "content", 10),
      card("c3", "content", 30),
      card("g1", "glue", 2),
      card("c2", "content", 20),
    ];
    expect(ids(pathOrder(cards, []).cards)).toEqual(["c1", "c2", "g1", "c3", "c4", "g2"]);
  });

  it("continues with the other queue when one runs out", () => {
    const content = [1, 2, 3, 4, 5].map((r) => card(`c${r}`, "content", r));
    const glue = [1, 2, 3, 4].map((r) => card(`g${r}`, "glue", r));
    expect(ids(interleave(content, glue.slice(0, 1)))).toEqual(["c1", "c2", "g1", "c3", "c4", "c5"]);
    expect(ids(interleave(content.slice(0, 2), glue))).toEqual(["c1", "c2", "g1", "g2", "g3", "g4"]);
  });

  it("puts form and phrase cards outside a unit in the content queue by rank", () => {
    const cards = [card("p", "phrase", 15), card("c1", "content", 10), card("f", "form", 20), card("g", "glue", 1)];
    expect(ids(pathOrder(cards, []).cards)).toEqual(["c1", "p", "g", "f"]);
  });

  it("puts a card at the later of its rank slot and the slot just after its last requires", () => {
    const cards = [
      card("c1", "content", 10),
      card("c2", "content", 20, { requires: ["c5"] }),
      card("c3", "content", 30),
      card("c4", "content", 40, { requires: ["c1"] }),
      card("c5", "content", 50),
      card("c6", "content", 60),
    ];
    expect(ids(pathOrder(cards, []).cards)).toEqual(["c1", "c3", "c4", "c5", "c2", "c6"]);
  });
});

describe("rule 4: sibling spacing", () => {
  const filler = Array.from({ length: 60 }, (_, i) => card(`f${i}`, "content", 100 + i));

  it("puts a word's later meaning at least 50 cards after the previous one", () => {
    expect(SIBLING_SPACING).toBe(50);
    const cards = [card("que-what", "content", 5), card("que-that", "content", 5), ...filler];
    const order = ids(pathOrder(cards, []).cards);
    expect(order.indexOf("que-that") - order.indexOf("que-what")).toBe(50);
  });

  it("counts from a meaning in the starter path, and takes another spacing when asked", () => {
    const cards = [card("que-what", "content", 5, { unit: "a" }), card("que-that", "content", 5), ...filler];
    const order = ids(pathOrder(cards, [unit("a")], { spacing: 3 }).cards);
    expect(order.slice(0, 5)).toEqual(["que-what", "f0", "f1", "que-that", "f2"]);
  });

  it("ignores form and phrase cards sharing the rank, and puts later meanings at the end when the cards run out", () => {
    const cards = [
      card("ir-go", "content", 30),
      card("ir-leave", "content", 30),
      card("ir-form-yo", "form", 30),
      card("phrase-lets-go", "phrase", 30),
      card("g", "glue", 1),
    ];
    expect(ids(pathOrder(cards, []).cards)).toEqual(["ir-go", "g", "ir-form-yo", "phrase-lets-go", "ir-leave"]);
  });
});

describe("rule 5: nothing before what it requires", () => {
  it("refuses an unknown id, an unknown unit and a cycle, naming ids only", () => {
    const order = pathOrder(
      [
        card("a", "content", 1, { requires: ["b"] }),
        card("b", "content", 2, { requires: ["c"] }),
        card("c", "content", 3, { requires: ["a"] }),
        card("d", "content", 4, { requires: ["nope"], unit: "gone" }),
      ],
      [],
    );
    expect(order.cards).toEqual([]);
    expect(order.problems).toEqual([
      "d: unit gone is not in content/units.json",
      "d requires nope, which is not a drafted card",
      "requires go round in a circle: a > b > c > a",
    ]);
  });

  it("refuses a unit card that requires a card coming later", () => {
    const cards = [card("a1", "content", 1, { unit: "a", requires: ["b1"] }), card("b1", "content", 2, { unit: "b" }), card("free", "content", 3)];
    expect(pathOrder(cards, [unit("a"), unit("b")]).problems).toEqual(["a1 (unit a) requires b1, which comes later"]);
    const late = [card("a1", "content", 1, { unit: "a", requires: ["free"] }), card("free", "content", 3)];
    expect(pathOrder(late, [unit("a")]).problems).toEqual(["a1 (unit a) requires free, which comes later"]);
  });
});

describe("path.md", () => {
  it("lists every unit with its cards, goal and unmatched wants, then the frequency phase", () => {
    const units = [{ ...unit("a"), title: "First", wants: ["one", "two"] }, { ...unit("b"), title: "Second", wants: ["three"] }];
    const cards = [card("a1", "content", 1, { unit: "a" }), card("free", "glue", 3)];
    const text = pathMarkdown({
      order: pathOrder(cards, units),
      units,
      notes: new Map([["free", "not in the deck: waiting for your decision"]]),
      matched: new Map([["a", new Set(["one"])]]),
    });
    expect(text).toContain("## Unit 1 · First (`a`)\n\nNow you can say it.\n\n1. `a1` · house → la casa\n\nWants no drafted card fills:\n\n- two\n");
    expect(text).toContain("## Unit 2 · Second (`b`)\n\nNow you can say it.\n\nNo cards yet.\n\nWants no drafted card fills:\n\n- three\n");
    expect(text).toContain("## Frequency phase\n\n2. `free` · the house [of] Maria → de · *not in the deck: waiting for your decision*\n");
  });
});
