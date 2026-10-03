// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Reveal, TipButton, TipScreen } from "@/components/card";
import { fixtureCard, fixtureDeck } from "@/lib/deck/fixture";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const tip = fixtureDeck.tips[0];
let host: HTMLDivElement;
let root: Root;

const q = (testId: string) => document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("the tip screen", () => {
  it("shows the title, body and examples, plays an example and moves on with Got it", () => {
    const played: string[] = [];
    let done = 0;
    act(() => root.render(<TipScreen tip={tip} onDone={() => (done += 1)} onPlay={(src) => played.push(src)} />));
    expect(q("tip-title")!.textContent).toBe(tip.title);
    expect(q("tip-body")!.textContent).toBe(tip.body);
    expect(document.querySelectorAll('[data-testid="tip-example"]')).toHaveLength(tip.examples.length);
    act(() => q("tip-play-1")!.click());
    expect(played).toEqual([tip.examples[0].audio]);
    act(() => q("tip-continue")!.click());
    expect(done).toBe(1);
  });
});

describe("the tip's \"?\"", () => {
  it("opens the tip over the card and closes with the button or Escape", () => {
    act(() => root.render(<TipButton tip={tip} />));
    expect(q("tip-open")!.getAttribute("aria-label")).toBe(`Tip: ${tip.title}`);
    act(() => q("tip-open")!.click());
    expect(q("tip-sheet")!.dataset.tipId).toBe(tip.id);
    act(() => q("tip-close")!.click());
    expect(q("tip-sheet")).toBeNull();

    act(() => q("tip-open")!.click());
    act(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    expect(q("tip-sheet")).toBeNull();
  });

  it("sits on a reveal only when given the card's tip", () => {
    const card = fixtureCard("ir-form-yo");
    act(() => root.render(<Reveal card={card} onRate={() => {}} />));
    expect(q("tip-open")).toBeNull();
    act(() => root.render(<Reveal card={card} onRate={() => {}} tip={tip} />));
    expect(q("tip-open")).not.toBeNull();
  });
});
