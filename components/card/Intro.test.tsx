// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Intro } from "@/components/card";
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
const text = (testId: string) => q(testId)?.textContent;
const click = (testId: string) => act(() => q(testId)!.click());

describe("Intro, every fixture card", () => {
  it.each(fixtureDeck.cards)("$id shows the Spanish, the English and the character, with no test", (card) => {
    render(<Intro card={card} onChoose={() => {}} />);
    expect(q("intro")!.dataset.cardId).toBe(card.id);
    expect(text("intro-es")).toBe(card.es);
    expect(q("intro-es")!.lang).toBe("es");
    expect(text("meaning")).toContain(card.en.replace(/[[\]]/g, ""));
    expect(q("character")?.querySelector("img")?.getAttribute("src") ?? null).toBe(card.image);
    // An intro is not a test: no front to flip, no rating buttons, no example to give it away.
    expect(q("card-front")).toBeNull();
    expect(host.querySelector('[data-testid^="rate-"]')).toBeNull();
    expect(text("why") ?? null).toBe(card.why);
    expect(q("earlier-meaning")).toBeNull();
  });

  it("shows the grammar strip, with a form card's own verb forms", () => {
    render(<Intro card={fixtureCard("ir-form-tu")} onChoose={() => {}} />);
    expect(q("grammar")!.dataset.variant).toBe("verb");
    expect(text("grammar")).toContain("tú vas");
    expect(text("why")!.length).toBeGreaterThan(0);
  });

  it("plays the word clip on the audio button", () => {
    const onPlay = vi.fn();
    const card = fixtureCard("casa-house");
    render(<Intro card={card} onChoose={() => {}} onPlay={onPlay} />);
    click("play-word");
    expect(onPlay).toHaveBeenCalledWith(card.audio.word);
  });

  it("says which meaning of a word the learner already knows", () => {
    render(<Intro card={fixtureCard("tiempo-weather")} earlier={fixtureCard("tiempo-time")} onChoose={() => {}} />);
    expect(text("earlier-meaning")).toBe(`You know ${fixtureCard("tiempo-time").es} = ${fixtureCard("tiempo-time").en}. It also means:`);
  });

  it("names a glue word's earlier meaning by its target, without the sentence around it", () => {
    render(<Intro card={fixtureCard("lo-him")} earlier={fixtureCard("de-of")} onChoose={() => {}} />);
    expect(text("earlier-meaning")).toMatch(/^You know de = of\. It also means:$/);
  });
});

describe("Intro, the two buttons", () => {
  it.each([
    ["intro-got-it", "got-it"],
    ["intro-known", "known"],
  ])("%s fires onChoose once with %s", (testId, choice) => {
    const onChoose = vi.fn();
    render(<Intro card={fixtureCard("casa-house")} onChoose={onChoose} />);
    click(testId);
    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith(choice);
  });

  it("labels them in words", () => {
    render(<Intro card={fixtureCard("casa-house")} onChoose={() => {}} />);
    expect(text("intro-got-it")).toBe("Got it");
    expect(text("intro-known")).toBe("I already know this");
  });
});
