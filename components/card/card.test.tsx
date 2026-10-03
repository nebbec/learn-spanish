// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BatchFrame, CardFront, Reveal, SWIPE_DISTANCE, splitGluePrompt } from "@/components/card";
import { fixtureCard, fixtureDeck } from "@/lib/deck/fixture";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

const render = (node: ReactNode) => act(() => root.render(node));
const q = (testId: string) => host.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
const front = () => q("card-front")!;

function pointer(type: string, x: number, y: number) {
  act(() => {
    front().dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }));
  });
}

/** A drag from (100, 100), ending with the click a browser sends afterwards. */
function drag(dx: number, dy: number) {
  pointer("pointerdown", 100, 100);
  pointer("pointerup", 100 + dx, 100 + dy);
  act(() => front().click());
}

describe("splitGluePrompt", () => {
  it("splits around the bracketed target", () => {
    expect(splitGluePrompt("the house [of] Maria")).toEqual({
      before: "the house ",
      target: "of",
      after: " Maria",
    });
    expect(splitGluePrompt("I see [him]")).toEqual({ before: "I see ", target: "him", after: "" });
  });

  it("treats a prompt with no brackets as all target", () => {
    expect(splitGluePrompt("of")).toEqual({ before: "", target: "of", after: "" });
  });
});

describe("CardFront, forward", () => {
  it.each(fixtureDeck.cards.filter((c) => c.kind === "content"))(
    "content card $id shows the English prompt, its hint and the character",
    (card) => {
      render(<CardFront card={card} onReveal={() => {}} />);
      expect(q("prompt")!.textContent).toBe(card.en);
      expect(q("hint")?.textContent ?? null).toBe(card.hint && `(${card.hint})`);
      expect(q("character")!.querySelector("img")!.getAttribute("src")).toBe(card.image);
      expect(q("target")).toBeNull();
      expect(front().textContent).not.toContain(card.es);
    },
  );

  it.each(fixtureDeck.cards.filter((c) => c.kind === "glue"))(
    "glue card $id shows the phrase with its target highlighted and no character",
    (card) => {
      render(<CardFront card={card} onReveal={() => {}} />);
      const { before, target, after } = splitGluePrompt(card.en);
      expect(q("prompt")!.textContent).toBe(before + target + after);
      expect(q("prompt")!.textContent).not.toMatch(/[[\]]/);
      expect(q("target")!.tagName).toBe("MARK");
      expect(q("target")!.textContent).toBe(target);
      expect(q("hint")?.textContent ?? null).toBe(card.hint && `(${card.hint})`);
      expect(q("character")).toBeNull();
      expect(host.querySelector("img")).toBeNull();
    },
  );

  it.each(fixtureDeck.cards.filter((c) => c.kind === "form"))(
    "form card $id shows the English prompt, its hint and its verb's character",
    (card) => {
      render(<CardFront card={card} onReveal={() => {}} />);
      expect(front().dataset.kind).toBe("form");
      expect(q("prompt")!.textContent).toBe(card.en);
      expect(q("hint")?.textContent ?? null).toBe(card.hint && `(${card.hint})`);
      expect(q("character")!.querySelector("img")!.getAttribute("src")).toBe(fixtureCard("ir-go").image);
      expect(q("target")).toBeNull();
      expect(front().textContent).not.toContain(card.es);
    },
  );

  it.each(fixtureDeck.cards.filter((c) => c.kind === "phrase"))(
    "phrase card $id shows the whole English phrase, nothing marked and no character",
    (card) => {
      render(<CardFront card={card} onReveal={() => {}} />);
      expect(front().dataset.kind).toBe("phrase");
      expect(q("prompt")!.textContent).toBe(card.en);
      expect(q("target")).toBeNull();
      expect(host.querySelector("mark")).toBeNull();
      expect(q("character")).toBeNull();
      expect(host.querySelector("img")).toBeNull();
      expect(front().textContent).not.toContain(card.es);
    },
  );

  it("leaves the character out when its art does not load", () => {
    const card = fixtureDeck.cards.find((c) => c.kind === "content")!;
    render(<CardFront card={card} onReveal={() => {}} />);
    act(() => {
      q("character")!.querySelector("img")!.dispatchEvent(new Event("error"));
    });
    expect(q("character")).toBeNull();
    expect(front().textContent).toContain(card.en);
  });

  it("tells the two meanings of el tiempo apart", () => {
    render(<CardFront card={fixtureCard("tiempo-time")} onReveal={() => {}} />);
    const time = front().textContent;
    render(<CardFront card={fixtureCard("tiempo-weather")} onReveal={() => {}} />);
    expect(front().textContent).not.toBe(time);
  });
});

describe("CardFront, reverse", () => {
  it.each(fixtureDeck.cards)("$id shows the Spanish and hides the character and the English", (card) => {
    render(<CardFront card={card} direction="reverse" onReveal={() => {}} />);
    expect(q("prompt")!.textContent).toBe(card.es);
    expect(q("prompt")!.getAttribute("lang")).toBe("es");
    expect(q("character")).toBeNull();
    expect(host.querySelector("img")).toBeNull();
    expect(q("hint")).toBeNull();
    expect(q("target")).toBeNull();
    expect(front().dataset.direction).toBe("reverse");
  });
});

describe("Form and phrase cards, both directions", () => {
  const pathCards = fixtureDeck.cards.filter((c) => c.kind === "form" || c.kind === "phrase");

  it("the fixture has both kinds", () => {
    expect(pathCards.map((c) => c.kind)).toEqual(expect.arrayContaining(["form", "phrase"]));
  });

  it.each(pathCards.flatMap((card) => (["forward", "reverse"] as const).map((direction) => ({ card, direction }))))(
    "$card.id, $direction: the front asks and the reveal answers",
    ({ card, direction }) => {
      let revealed = false;
      render(<CardFront card={card} direction={direction} onReveal={() => (revealed = true)} />);
      expect(q("prompt")!.textContent).toBe(direction === "forward" ? card.en : card.es);
      act(() => front().click());
      expect(revealed).toBe(true);

      render(<Reveal card={card} onRate={() => {}} />);
      expect(q("answer")!.textContent).toBe(card.es);
      expect(q("meaning")!.textContent).toContain(card.en);
      expect(q("character")?.querySelector("img")?.getAttribute("src") ?? null).toBe(card.image);
      expect(q("why")?.textContent ?? null).toBe(card.why);
      if (card.kind === "form") expect(q("own-form")).not.toBeNull();
      else expect(q("grammar")).toBeNull();
    },
  );
});

describe("CardFront gestures", () => {
  const card = fixtureCard("casa-house");

  it("is a button, so the keyboard can reveal it", () => {
    render(<CardFront card={card} onReveal={() => {}} />);
    expect(front().tagName).toBe("BUTTON");
  });

  it.each(["forward", "reverse"] as const)("a tap fires reveal once (%s)", (direction) => {
    const onReveal = vi.fn();
    render(<CardFront card={card} direction={direction} onReveal={onReveal} />);
    drag(0, 0);
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it.each(["forward", "reverse"] as const)("a swipe down fires reveal once (%s)", (direction) => {
    const onReveal = vi.fn();
    render(<CardFront card={card} direction={direction} onReveal={onReveal} />);
    drag(5, SWIPE_DISTANCE + 20);
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it("a swipe fires on release, before any click arrives", () => {
    const onReveal = vi.fn();
    render(<CardFront card={card} onReveal={onReveal} />);
    pointer("pointerdown", 100, 100);
    pointer("pointerup", 100, 100 + SWIPE_DISTANCE);
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it("a tap after a swipe still reveals", () => {
    const onReveal = vi.fn();
    render(<CardFront card={card} onReveal={onReveal} />);
    drag(0, 80);
    drag(0, 0);
    expect(onReveal).toHaveBeenCalledTimes(2);
  });

  it("a cancelled drag does not count as a swipe", () => {
    const onReveal = vi.fn();
    render(<CardFront card={card} onReveal={onReveal} />);
    pointer("pointerdown", 100, 100);
    pointer("pointercancel", 100, 100);
    pointer("pointerup", 100, 300);
    expect(onReveal).not.toHaveBeenCalled();
  });

  it("leaves the drag to the app: no browser scrolling on the card", () => {
    render(<CardFront card={card} onReveal={() => {}} />);
    expect(front().className).toContain("touch-none");
  });
});

describe("BatchFrame", () => {
  const segments = () => [...host.querySelectorAll("[data-segment]")].map((s) => s.getAttribute("data-segment"));

  it("draws one segment per card: done, current, upcoming", () => {
    render(
      <BatchFrame total={5} index={2}>
        <p>card</p>
      </BatchFrame>,
    );
    expect(segments()).toEqual(["done", "done", "current", "upcoming", "upcoming"]);
    const bar = host.querySelector('[role="progressbar"]')!;
    expect(bar.getAttribute("aria-label")).toBe("Card 3 of 5");
    expect(host.textContent).toContain("card");
  });

  it("grows when a red brings a card back, and fills when the batch ends", () => {
    render(<BatchFrame total={3} index={0}>{null}</BatchFrame>);
    expect(segments()).toEqual(["current", "upcoming", "upcoming"]);
    render(<BatchFrame total={4} index={4}>{null}</BatchFrame>);
    expect(segments()).toEqual(["done", "done", "done", "done"]);
  });

  it("turns overscroll off while mounted and restores it after", () => {
    document.documentElement.style.overscrollBehavior = "auto";
    render(<BatchFrame total={1} index={0}>{null}</BatchFrame>);
    expect(document.documentElement.style.overscrollBehavior).toBe("none");
    expect(q("batch-frame")!.className).toContain("overscroll-none");
    render(null);
    expect(document.documentElement.style.overscrollBehavior).toBe("auto");
  });

  it("shows a close button only when onClose is given", () => {
    render(<BatchFrame total={1} index={0}>{null}</BatchFrame>);
    expect(host.querySelector('[aria-label="Close"]')).toBeNull();
    const onClose = vi.fn();
    render(<BatchFrame total={1} index={0} onClose={onClose}>{null}</BatchFrame>);
    act(() => host.querySelector<HTMLButtonElement>('[aria-label="Close"]')!.click());
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
