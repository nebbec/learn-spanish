// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RATING_BUTTONS, Reveal } from "@/components/card";
import { fixtureCard, fixtureDeck } from "@/lib/deck/fixture";
import { RATINGS } from "@/lib/store";

/** The reveal's buttons: every rating but `known`, which only the intro gives. */
const BUTTONS = RATINGS.filter((rating) => rating !== "known");

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
  vi.unstubAllGlobals();
});

const render = (node: ReactNode) => act(() => root.render(node));
const q = (testId: string) => host.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
const text = (testId: string) => q(testId)?.textContent;
const click = (testId: string) => act(() => q(testId)!.click());

describe("Reveal, every fixture card", () => {
  it.each(fixtureDeck.cards)("$id shows the Spanish, part of speech, meaning and example", (card) => {
    render(<Reveal card={card} onRate={() => {}} />);
    expect(q("reveal")!.dataset.cardId).toBe(card.id);
    expect(text("answer")).toBe(card.es);
    expect(q("answer")!.lang).toBe("es");
    expect(text("pos")).toBe(card.pos);
    expect(text("example-es")).toBe(card.example.es);
    expect(text("example-en")).toBe(card.example.en);

    // The English is shown without the square brackets of a glue prompt.
    const meaning = text("meaning")!;
    expect(meaning).toContain(card.en.replace(/[[\]]/g, ""));
    expect(meaning).not.toMatch(/[[\]]/);
    if (card.hint) expect(meaning).toContain(`(${card.hint})`);

    // The character shows for content cards only.
    const img = q("character")?.querySelector("img");
    expect(img?.getAttribute("src") ?? null).toBe(card.image);

    expect(text("spain") ?? null).toBe(card.spain ? `Spain: ${card.spain}` : null);

    const variant = q("grammar")?.dataset.variant ?? null;
    expect(variant).toBe(["noun", "adjective", "verb"].includes(card.pos) ? card.pos : null);

    expect(text("why") ?? null).toBe(card.why);
  });

  it("has seen a Spain footnote and all three grammar variants in the fixture", () => {
    expect(fixtureDeck.cards.some((c) => c.spain)).toBe(true);
    for (const pos of ["noun", "adjective", "verb"]) {
      expect(fixtureDeck.cards.some((c) => c.pos === pos)).toBe(true);
    }
  });
});

describe("Reveal, grammar strip", () => {
  it("noun: article and gender, including an unexpected gender", () => {
    render(<Reveal card={fixtureCard("casa-house")} onRate={() => {}} />);
    expect(text("grammar")).toBe("la · feminine");
    render(<Reveal card={fixtureCard("problema-problem")} onRate={() => {}} />);
    expect(text("grammar")).toBe("el · masculine");
  });

  it("adjective: both endings", () => {
    render(<Reveal card={fixtureCard("bueno-good")} onRate={() => {}} />);
    expect(text("grammar")).toBe("bueno / buena");
  });

  it("verb: three present-tense forms, flagged only when irregular", () => {
    render(<Reveal card={fixtureCard("ir-go")} onRate={() => {}} />);
    expect(text("grammar")).toContain("yo voy · tú vas · él va");
    expect(text("irregular")).toBe("Irregular");

    render(<Reveal card={fixtureCard("hablar-speak")} onRate={() => {}} />);
    expect(text("grammar")).toBe("yo hablo · tú hablas · él habla");
    expect(q("irregular")).toBeNull();
  });

  it("form card: the strip is its verb's, with its own form highlighted", () => {
    render(<Reveal card={fixtureCard("ir-form-yo")} onRate={() => {}} />);
    expect(text("grammar")).toContain("yo voy · tú vas · él va");
    expect(q("own-form")!.tagName).toBe("MARK");
    expect(text("own-form")).toBe("yo voy");
    expect(host.querySelectorAll("mark")).toHaveLength(1);

    render(<Reveal card={fixtureCard("ir-form-tu")} onRate={() => {}} />);
    expect(text("own-form")).toBe("tú vas");

    const el = { ...fixtureCard("ir-form-yo"), id: "ir-form-el", es: "va" };
    render(<Reveal card={el} onRate={() => {}} />);
    expect(text("own-form")).toBe("él va");
  });

  it("a verb card, and hay, highlight nothing", () => {
    render(<Reveal card={fixtureCard("ir-go")} onRate={() => {}} />);
    expect(q("own-form")).toBeNull();

    const hay = { ...fixtureCard("ir-form-yo"), id: "haber-form-hay", es: "hay" };
    render(<Reveal card={hay} onRate={() => {}} />);
    expect(q("grammar")).not.toBeNull();
    expect(q("own-form")).toBeNull();
  });

  it("phrase card: no strip, no character", () => {
    render(<Reveal card={fixtureCard("phrase-going-home")} onRate={() => {}} />);
    expect(q("grammar")).toBeNull();
    expect(q("character")).toBeNull();
    expect(text("pos")).toBe("phrase");
  });

  it("other parts of speech have no strip", () => {
    render(<Reveal card={fixtureCard("ahora-now")} onRate={() => {}} />);
    expect(q("grammar")).toBeNull();
  });
});

describe("Reveal, why line", () => {
  it("shows a card's contrast line, and none on a card without one", () => {
    const card = fixtureCard("ir-form-tu");
    render(<Reveal card={card} onRate={() => {}} />);
    expect(text("why")).toBe(card.why);
    expect(card.why!.length).toBeGreaterThan(0);

    render(<Reveal card={fixtureCard("ir-form-yo")} onRate={() => {}} />);
    expect(q("why")).toBeNull();
  });
});

describe("Reveal, audio", () => {
  it("each button plays its own clip, and nothing plays on render", () => {
    const card = fixtureCard("casa-house");
    const onPlay = vi.fn();
    render(<Reveal card={card} onRate={() => {}} onPlay={onPlay} />);
    expect(onPlay).not.toHaveBeenCalled();
    click("play-word");
    expect(onPlay).toHaveBeenLastCalledWith(card.audio.word);
    click("play-sentence");
    expect(onPlay).toHaveBeenLastCalledWith(card.audio.sentence);
    expect(onPlay).toHaveBeenCalledTimes(2);
    expect(q("play-word")!.getAttribute("aria-label")).toBe("Play the word");
    expect(q("play-sentence")!.getAttribute("aria-label")).toBe("Play the sentence");
  });

  it("by default plays through an Audio element and swallows a refused playback", async () => {
    const played: string[] = [];
    vi.stubGlobal(
      "Audio",
      class {
        constructor(public src: string) {}
        play() {
          played.push(this.src);
          return Promise.reject(new Error("not allowed"));
        }
      },
    );
    const card = fixtureCard("ir-go");
    render(<Reveal card={card} onRate={() => {}} />);
    click("play-word");
    click("play-sentence");
    await Promise.resolve();
    expect(played).toEqual([card.audio.word, card.audio.sentence]);
  });
});

describe("Reveal, rating", () => {
  it("has one labelled button per rating, and none for known", () => {
    render(<Reveal card={fixtureCard("casa-house")} onRate={() => {}} />);
    expect(RATING_BUTTONS.map((b) => b.rating).sort()).toEqual([...BUTTONS].sort());
    expect(q("rate-known")).toBeNull();
    for (const { rating, label } of RATING_BUTTONS) {
      expect(label.length).toBeGreaterThan(0);
      expect(text(`rate-${rating}`)).toBe(label);
    }
  });

  it.each(BUTTONS)("pressing %s fires onRate once with that rating", (rating) => {
    const onRate = vi.fn();
    render(<Reveal card={fixtureCard("casa-house")} onRate={onRate} />);
    click(`rate-${rating}`);
    expect(onRate).toHaveBeenCalledTimes(1);
    expect(onRate).toHaveBeenCalledWith(rating);
  });

  it("renders children between the details and the rating buttons", () => {
    render(
      <Reveal card={fixtureCard("casa-house")} onRate={() => {}}>
        <div data-testid="extra">note goes here</div>
      </Reveal>,
    );
    const extra = q("extra")!;
    const rate = q("rate-good")!;
    expect(extra.compareDocumentPosition(rate) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(q("reveal")!.contains(extra)).toBe(true);
  });
});
