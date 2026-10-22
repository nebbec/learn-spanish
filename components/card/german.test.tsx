// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CardFront, caseChange, formPerson, Intro, Reveal, splitGluePrompt } from "@/components/card";
import type { Card } from "@/lib/deck";
import { fixtureCardDe, fixtureDeckDe } from "@/lib/deck/fixture";

// The German card layouts (DE4), drawn from the German fixture. See docs/german.md,
// "What the cards look like" and "Decided in DE4".

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
const reveal = (card: Card) => render(<Reveal card={card} onRate={() => {}} onPlay={() => {}} />);
const intro = (card: Card) => render(<Intro card={card} onChoose={() => {}} onPlay={() => {}} />);

/** What the strip shows for each fixture card, on the intro and the reveal alike. */
const STRIPS: Record<string, { variant: string; text: string } | null> = {
  "sein-form-ich": { variant: "verb", text: "ich bin · du bist · er istIrregular" },
  "phrase-how-are-you": null,
  "mit-with": null,
  "mann-man": { variant: "noun", text: "der Mann · die Männer" },
  "frau-woman": { variant: "noun", text: "die Frau · die Frauen" },
  "haus-house": { variant: "noun", text: "das Haus · die Häuser" },
  "gehen-go": { variant: "verb", text: "ich gehe · du gehst · er gehtIrregular" },
  "anrufen-call": { variant: "verb", text: "ich rufe an · du rufst an · er ruft anIrregularSeparable" },
  "gut-good": null,
  "januar-january": { variant: "noun", text: "der Januar · no plural" },
  "case-i-see-the-man": { variant: "case", text: "Akkusativ · masculine: der → den" },
  "case-im-calling-you": { variant: "case", text: "Akkusativ: du → dich" },
};

describe("German fixture, every card", () => {
  it("has a strip expectation for each card", () => {
    expect(Object.keys(STRIPS).sort()).toEqual(fixtureDeckDe.cards.map((c) => c.id).sort());
  });

  it.each(fixtureDeckDe.cards)("$id: the reveal shows the answer, meaning, strip and example", (card) => {
    reveal(card);
    expect(text("answer")).toBe(card.target);
    expect(text("pos")).toBe(card.pos);
    expect(text("example-es")).toBe(card.example.target);
    const meaning = text("meaning")!;
    expect(meaning).toContain(card.en.replace(/[[\]]/g, ""));
    expect(meaning).not.toMatch(/[[\]]/);
    expect(q("character")?.querySelector("img")?.getAttribute("src") ?? null).toBe(card.image);
    const strip = STRIPS[card.id];
    expect(q("grammar")?.dataset.variant ?? null).toBe(strip?.variant ?? null);
    expect(text("grammar") ?? null).toBe(strip?.text ?? null);
    expect(text("regional") ?? null).toBe(card.regional ? `${card.regional.where}: ${card.regional.text}` : null);
  });

  it.each(fixtureDeckDe.cards)("$id: the intro shows the same strip", (card) => {
    intro(card);
    expect(text("intro-es")).toBe(card.target);
    expect(text("grammar") ?? null).toBe(STRIPS[card.id]?.text ?? null);
    expect(q("perfekt") !== null).toBe(card.pos === "verb");
  });
});

describe("German nouns", () => {
  it("show the answer and its plural, both in the language being learned", () => {
    reveal(fixtureCardDe("haus-house"));
    expect(text("plural")).toBe("die Häuser");
    expect(q("plural")!.lang).toBe(q("answer")!.lang);
  });

  it("say so when a noun has no plural in common use", () => {
    reveal(fixtureCardDe("januar-january"));
    expect(text("plural")).toBe("no plural");
    expect(q("plural")!.lang).toBe("");
  });
});

describe("German verbs", () => {
  it("strip the three persons, split for a separable verb, with both chips and the Perfekt", () => {
    reveal(fixtureCardDe("anrufen-call"));
    expect(text("grammar")).toContain("ich rufe an · du rufst an · er ruft an");
    expect(text("irregular")).toBe("Irregular");
    expect(text("separable")).toBe("Separable");
    expect(text("perfekt")).toBe("Perfekt: hat angerufen");
    expect(q("own-form")).toBeNull();
  });

  it("take ist for a sein verb, and show no separable chip on a verb that is not", () => {
    reveal(fixtureCardDe("gehen-go"));
    expect(text("perfekt")).toBe("Perfekt: ist gegangen");
    expect(q("separable")).toBeNull();
  });

  it("leave the irregular chip off a regular verb", () => {
    const base = fixtureCardDe("anrufen-call");
    if (base.pos !== "verb") throw new Error("not a verb");
    const machen = {
      ...base,
      id: "machen-make",
      target: "machen",
      grammar: {
        present: { ich: "mache", du: "machst", er: "macht" },
        irregular: false,
        separable: false,
        perfekt: { aux: "haben" as const, participle: "gemacht" },
      },
    };
    reveal(machen);
    expect(text("grammar")).toBe("ich mache · du machst · er macht");
    expect(q("irregular")).toBeNull();
    expect(text("perfekt")).toBe("Perfekt: hat gemacht");
  });
});

describe("German form cards", () => {
  it("highlight their own form, with its pronoun, in the verb's strip", () => {
    const card = fixtureCardDe("sein-form-ich");
    expect(formPerson(card)).toBe("ich");
    reveal(card);
    expect(text("own-form")).toBe("ich bin");
    expect(text("own-form")).toBe(card.target);
    expect(host.querySelectorAll("mark")).toHaveLength(1);

    reveal({ ...card, id: "sein-form-er", target: "er ist" });
    expect(text("own-form")).toBe("er ist");
  });

  it("highlight a separable verb's split form", () => {
    const anrufen = fixtureCardDe("anrufen-call");
    const card = { ...anrufen, id: "anrufen-form-du", kind: "form" as const, target: "du rufst an" };
    intro(card);
    expect(text("own-form")).toBe("du rufst an");
  });

  it("show the English and the verb's character on the front", () => {
    const card = fixtureCardDe("sein-form-ich");
    render(<CardFront card={card} onReveal={() => {}} />);
    expect(text("prompt")).toBe(card.en);
    expect(q("character")!.querySelector("img")!.getAttribute("src")).toBe(card.image);
    expect(q("card-front")!.textContent).not.toContain(card.target);
  });
});

describe("Case cards", () => {
  it.each(fixtureDeckDe.cards.filter((c) => c.kind === "case"))(
    "$id is on the glue layout: its target marked, no character",
    (card) => {
      render(<CardFront card={card} onReveal={() => {}} />);
      const { before, target, after } = splitGluePrompt(card.en);
      expect(q("card-front")!.dataset.kind).toBe("case");
      expect(text("prompt")).toBe(before + target + after);
      expect(text("target")).toBe(target);
      expect(q("target")!.tagName).toBe("MARK");
      expect(q("character")).toBeNull();
      expect(q("card-front")!.textContent).not.toContain(card.target);
    },
  );

  it("keep the target marked under the answer", () => {
    reveal(fixtureCardDe("case-i-see-the-man"));
    expect(q("meaning")!.querySelector("mark")!.textContent).toBe("the");
  });

  it("name the case and gender, and mark the word that changed", () => {
    reveal(fixtureCardDe("case-i-see-the-man"));
    expect(text("case")).toBe("Akkusativ");
    expect(q("grammar")!.querySelector("mark")!.textContent).toBe("den");
  });

  it("name the dative and the plural", () => {
    const base = fixtureCardDe("case-i-see-the-man");
    if (base.pos !== "determiner" || !base.grammar) throw new Error("not a case card");
    const card = {
      ...base,
      id: "case-with-the-children",
      target: "mit den Kindern",
      en: "with [the] children",
      grammar: { case: "dat" as const, gender: "pl" as const, from: "die" },
    };
    reveal(card);
    expect(text("grammar")).toBe("Dativ · plural: die → den");
  });

  it("start the answer below the tip's \"?\", having no character above it", () => {
    const card = fixtureCardDe("case-i-see-the-man");
    const tip = fixtureDeckDe.tips.find((t) => t.id === card.tip)!;
    render(<Reveal card={card} onRate={() => {}} onPlay={() => {}} tip={tip} />);
    expect(q("tip-open")).not.toBeNull();
    expect(q("answer-block")!.className).toContain("pt-10");
    render(<Intro card={card} onChoose={() => {}} onPlay={() => {}} tip={tip} />);
    expect(q("answer-block")!.className).toContain("pt-3");
    reveal(card);
    expect(q("answer-block")!.className).not.toContain("pt-");
  });
});

describe("caseChange", () => {
  it.each([
    ["den Mann", "der", "den"],
    ["mit einem Freund", "ein", "einem"],
    ["meinem Bruder", "mein", "meinem"],
    ["dich", "du", "dich"],
    ["ihn", "er", "ihn"],
    ["mich", "ich", "mich"],
    ["Hallo Welt", "du", "Hallo Welt"],
  ])("%s from %s is %s", (target, from, word) => {
    expect(caseChange(target, from)).toBe(word);
  });
});

describe("Regional footnote", () => {
  it("names the card's own region", () => {
    reveal(fixtureCardDe("januar-january"));
    expect(text("regional")).toBe("Austria: der Jänner");
    const swiss = fixtureCardDe("januar-january");
    reveal({ ...swiss, regional: { where: "Switzerland", text: "der Januar" } });
    expect(text("regional")).toBe("Switzerland: der Januar");
  });

  it("is left out of the intro, as Spanish's is", () => {
    intro(fixtureCardDe("januar-january"));
    expect(q("regional")).toBeNull();
  });
});
