// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Wheel } from "@/components/Wheel";
import type { PartOfSpeech } from "@/lib/deck";
import { fixtureDeck } from "@/lib/deck/fixture";
import { petalPath, progressStats, wheelSlices, type ProgressStats } from "@/lib/progress";
import type { CardState } from "@/lib/scheduler";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const cards = fixtureDeck.cards;
const FIXTURE_GROUPS = ["noun", "verb", "adjective", "adverb", "pronoun", "preposition", "phrase"];

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
const text = (testId: string) => host.querySelector(`[data-testid="${testId}"]`)?.textContent;
const dot = () => host.querySelector('[data-testid="wheel-centre-dot"]');
/** The petal shape the wheel draws with: radius 104, inner circle 17. */
const SHAPE = { innerRadius: 17, gap: (3.4 * Math.PI) / 180, outerCorner: 9, innerCorner: 4 };
const slicesOf = (stats: ProgressStats) => wheelSlices(stats, { radius: 104, innerRadius: 17 });

describe("Wheel", () => {
  it("renders the empty state: every petal labelled and grey, no fill, the centre dot, 0% in the legend", () => {
    render(statsFor());
    const groups = [...host.querySelectorAll("[data-pos]")].map((g) => g.getAttribute("data-pos"));
    expect(groups).toEqual(FIXTURE_GROUPS);
    expect([...host.querySelectorAll("[data-pos] text")].map((t) => t.textContent)).toEqual([
      "nouns",
      "verbs",
      "adjectives",
      "adverbs",
      "pronouns",
      "prep.",
      "phrases",
    ]);
    for (const pos of FIXTURE_GROUPS) {
      expect(layer(pos, "seen")).toBe("");
      expect(layer(pos, "memorized")).toBe("");
      expect(layer(pos, "ghost")).not.toBe("");
      expect(slice(pos).querySelector('[data-layer="ghost"]')!.getAttribute("class")).toBe("fill-ghost");
    }
    expect(dot()).not.toBeNull();
    expect(text("legend-seen")).toBe("0% seen");
    expect(text("legend-memorized")).toBe("0% memorized");
    expect(host.querySelector("svg")!.getAttribute("aria-label")).toBe(
      "Progress: 0 of 16 cards memorized, 0 seen",
    );
  });

  it("renders the partial state: the petal's tint for seen with its full colour inside it", () => {
    const stats = statsFor(
      state("casa-house", 30),
      state("carro-car", 3),
      state("problema-problem", 3),
      state("tiempo-time", 3),
      state("ir-go", 3),
    );
    render(stats);
    const [noun, verb] = slicesOf(stats);

    // Nouns: 4 of 5 seen, 1 of 5 memorized. The fill keeps the ring's area true to the fraction.
    expect(noun.seenRadius).toBeCloseTo(Math.sqrt(17 ** 2 + 0.8 * (104 ** 2 - 17 ** 2)), 6);
    expect(noun.memorizedRadius).toBeCloseTo(Math.sqrt(17 ** 2 + 0.2 * (104 ** 2 - 17 ** 2)), 6);
    expect(layer("noun", "seen")).toBe(petalPath(noun.startAngle, noun.endAngle, noun.seenRadius, SHAPE));
    expect(layer("noun", "memorized")).toBe(petalPath(noun.startAngle, noun.endAngle, noun.memorizedRadius, SHAPE));
    expect(layer("noun", "ghost")).toBe(petalPath(noun.startAngle, noun.endAngle, 104, SHAPE));

    // Verbs: 1 of 2 seen, none memorized.
    expect(layer("verb", "seen")).toBe(petalPath(verb.startAngle, verb.endAngle, verb.seenRadius, SHAPE));
    expect(layer("verb", "memorized")).toBe("");
    // Untouched groups stay empty.
    expect(layer("adverb", "seen")).toBe("");

    // The full colour is painted after the tint, so it sits on top of it, and both over the grey.
    const layers = [...slice("noun").querySelectorAll("[data-layer]")].map((p) => p.getAttribute("data-layer"));
    expect(layers).toEqual(["ghost", "seen", "memorized"]);
    expect(slice("noun").querySelector('[data-layer="seen"]')!.getAttribute("class")).toBe("fill-pos-noun-seen");
    expect(slice("noun").querySelector('[data-layer="memorized"]')!.getAttribute("class")).toBe("fill-pos-noun");
    expect(slice("verb").querySelector('[data-layer="seen"]')!.getAttribute("class")).toBe("fill-pos-verb-seen");

    // 5 of 16 seen is 31%, 1 of 16 memorized is 6%. Something memorized: no centre dot.
    expect(text("legend-seen")).toBe("31% seen");
    expect(text("legend-memorized")).toBe("6% memorized");
    expect(dot()).toBeNull();
    expect(slice("noun").getAttribute("aria-label")).toBe("Nouns: 1 memorized and 4 seen, of 5");
  });

  it("renders the complete state: every petal full colour to the rim", () => {
    const stats = statsFor(...cards.map((c) => state(c.id, 40)));
    render(stats);
    for (const s of slicesOf(stats)) {
      const full = petalPath(s.startAngle, s.endAngle, 104, SHAPE);
      expect(layer(s.pos, "memorized")).toBe(full);
      expect(layer(s.pos, "seen")).toBe(full);
    }
    expect(text("legend-seen")).toBe("100% seen");
    expect(text("legend-memorized")).toBe("100% memorized");
  });

  it("renders an empty deck without petals", () => {
    render(progressStats([], new Map()));
    expect(host.querySelectorAll("[data-pos]")).toHaveLength(0);
    expect(text("legend-seen")).toBe("0% seen");
  });

  it("calls back with the part of speech of a tapped slice", () => {
    const onSliceTap = vi.fn();
    render(statsFor(), onSliceTap);
    act(() => {
      slice("verb")
        .querySelector('[data-layer="ghost"]')!
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
