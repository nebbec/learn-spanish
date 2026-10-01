// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Wheel } from "@/components/Wheel";
import type { PartOfSpeech } from "@/lib/deck";
import { fixtureDeck } from "@/lib/deck/fixture";
import { progressStats, sectorPath, wheelSlices, type ProgressStats } from "@/lib/progress";
import type { CardState } from "@/lib/scheduler";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const cards = fixtureDeck.cards;
const FIXTURE_GROUPS = ["noun", "verb", "adjective", "adverb", "pronoun", "preposition"];

function state(cardId: string, stability: number): CardState {
  return {
    cardId,
    due: 0,
    stability,
    difficulty: 5,
    phase: "review",
    learningSteps: 0,
    scheduledDays: 1,
    reps: 1,
    lapses: 0,
    lastReview: 0,
  };
}

function statsFor(...list: CardState[]): ProgressStats {
  return progressStats(cards, new Map(list.map((s) => [s.cardId, s])));
}

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

function render(stats: ProgressStats, onSliceTap?: (pos: PartOfSpeech) => void) {
  act(() => root.render(<Wheel stats={stats} onSliceTap={onSliceTap} />));
}

const slice = (pos: string) => host.querySelector<SVGGElement>(`[data-pos="${pos}"]`)!;
const layer = (pos: string, name: string) =>
  slice(pos).querySelector(`[data-layer="${name}"]`)!.getAttribute("d");
const centre = () => host.querySelector('[data-testid="wheel-centre"]')!.textContent;

describe("Wheel", () => {
  it("renders the empty state: every slice labelled, no fill, 0 in the centre", () => {
    render(statsFor());
    const groups = [...host.querySelectorAll("[data-pos]")].map((g) => g.getAttribute("data-pos"));
    expect(groups).toEqual(FIXTURE_GROUPS);
    expect([...host.querySelectorAll("[data-pos] text")].map((t) => t.textContent)).toEqual([
      "Nouns",
      "Verbs",
      "Adjectives",
      "Adverbs",
      "Pronouns",
      "Prepositions",
    ]);
    for (const pos of FIXTURE_GROUPS) {
      expect(layer(pos, "seen")).toBe("");
      expect(layer(pos, "memorized")).toBe("");
      expect(layer(pos, "hit")).not.toBe("");
    }
    expect(centre()).toBe("0of 12");
    expect(host.querySelector("svg")!.getAttribute("aria-label")).toBe(
      "Progress: 0 of 12 cards memorized, 0 seen",
    );
  });

  it("renders the partial state: a tint for seen with the solid memorized layer inside it", () => {
    const stats = statsFor(
      state("casa-house", 30),
      state("carro-car", 3),
      state("problema-problem", 3),
      state("tiempo-time", 3),
      state("ir-go", 3),
    );
    render(stats);
    const [noun, verb] = wheelSlices(stats, { radius: 100 });

    // Nouns: 4 of 5 seen, 1 of 5 memorized. Radii are square roots of those fractions.
    expect(noun.seenRadius).toBeCloseTo(89.44, 2);
    expect(noun.memorizedRadius).toBeCloseTo(44.72, 2);
    expect(layer("noun", "seen")).toBe(sectorPath(noun.startAngle, noun.endAngle, noun.seenRadius));
    expect(layer("noun", "memorized")).toBe(
      sectorPath(noun.startAngle, noun.endAngle, noun.memorizedRadius),
    );
    expect(layer("noun", "seen")).toContain("A 89.443 89.443");
    expect(layer("noun", "memorized")).toContain("A 44.721 44.721");

    // Verbs: 1 of 2 seen, none memorized.
    expect(layer("verb", "seen")).toBe(sectorPath(verb.startAngle, verb.endAngle, verb.seenRadius));
    expect(layer("verb", "memorized")).toBe("");
    // Untouched groups stay empty.
    expect(layer("adverb", "seen")).toBe("");

    // The solid layer is painted after the tint, so it sits on top of it.
    const layers = [...slice("noun").querySelectorAll("[data-layer]")].map((p) =>
      p.getAttribute("data-layer"),
    );
    expect(layers).toEqual(["seen", "memorized", "hit"]);
    expect(slice("noun").querySelector('[data-layer="seen"]')!.getAttribute("class")).toContain(
      "fill-brand-soft",
    );
    expect(slice("noun").querySelector('[data-layer="memorized"]')!.getAttribute("class")).toMatch(
      /fill-brand(\s|$)/,
    );

    expect(centre()).toBe("1of 12");
    expect(slice("noun").getAttribute("aria-label")).toBe("Nouns: 1 memorized and 4 seen, of 5");
  });

  it("renders the complete state: every slice solid to the rim", () => {
    const stats = statsFor(...cards.map((c) => state(c.id, 40)));
    render(stats);
    for (const s of wheelSlices(stats, { radius: 100 })) {
      const full = sectorPath(s.startAngle, s.endAngle, 100);
      expect(layer(s.pos, "memorized")).toBe(full);
      expect(layer(s.pos, "seen")).toBe(full);
    }
    expect(centre()).toBe("12of 12");
  });

  it("renders an empty deck without slices", () => {
    render(progressStats([], new Map()));
    expect(host.querySelectorAll("[data-pos]")).toHaveLength(0);
    expect(centre()).toBe("0of 0");
  });

  it("calls back with the part of speech of a tapped slice", () => {
    const onSliceTap = vi.fn();
    render(statsFor(), onSliceTap);
    act(() => {
      slice("verb")
        .querySelector('[data-layer="hit"]')!
        .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onSliceTap).toHaveBeenCalledTimes(1);
    expect(onSliceTap).toHaveBeenLastCalledWith("verb");

    for (const pos of FIXTURE_GROUPS) {
      act(() => {
        slice(pos).dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(onSliceTap).toHaveBeenLastCalledWith(pos);
    }
  });

  it("makes each slice a keyboard-operable button", () => {
    const onSliceTap = vi.fn();
    render(statsFor(), onSliceTap);
    const pronoun = slice("pronoun");
    expect(pronoun.getAttribute("role")).toBe("button");
    expect(pronoun.getAttribute("tabindex")).toBe("0");
    for (const key of ["Enter", " "]) {
      act(() => {
        pronoun.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
      });
    }
    act(() => {
      pronoun.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    });
    expect(onSliceTap.mock.calls).toEqual([["pronoun"], ["pronoun"]]);
  });

  it("has no buttons when no tap callback is given", () => {
    render(statsFor());
    expect(host.querySelectorAll('[role="button"]')).toHaveLength(0);
    expect(slice("noun").hasAttribute("tabindex")).toBe(false);
  });
});
