// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { autoplayClip, blankCount, CardFront, caseChange, formPerson, Intro, Reveal, splitGluePrompt } from "@/components/card";
import { LANG } from "@/lang";
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
  "pair-warten-auf": { variant: "preposition", text: "auf jemanden warten" },
  "pair-gratulieren-zu": { variant: "preposition", text: "jemandem zu etwas gratulieren" },
  "gap-warten-auf": { variant: "preposition", text: "auf jemanden warten · auf + Akk" },
  "gap-gratulieren-zu": { variant: "preposition", text: "jemandem zu etwas gratulieren · zu + Dat" },
};

/** The example as read: a gap card's brackets mark its blank, which the reveal fills in. */
const readExample = (card: Card) => card.example.target.replace(/[[\]]/g, "");

describe("German fixture, every card", () => {
  it("has a strip expectation for each card", () => {
    expect(Object.keys(STRIPS).sort()).toEqual(fixtureDeckDe.cards.map((c) => c.id).sort());
  });

  it.each(fixtureDeckDe.cards)("$id: the reveal shows the answer, meaning, strip and example", (card) => {
    reveal(card);
    expect(text("answer")).toBe(card.target);
    expect(text("pos")).toBe(card.pos);
    expect(text("example-es")).toBe(readExample(card));
    if (card.kind === "gap") {
      // A gap card's English is under its sentence, not under the answer.
      expect(q("meaning")).toBeNull();
      expect(text("example-en")).toBe(card.en);
    } else {
      const meaning = text("meaning")!;
      expect(meaning).toContain(card.en.replace(/[[\]]/g, ""));
      expect(meaning).not.toMatch(/[[\]]/);
    }
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

  it("say so when a noun is used only in the plural", () => {
    const leute = { ...fixtureCardDe("haus-house"), target: "die Leute" };
    leute.grammar = { gender: "pl", article: "die", plural: null };
    reveal(leute);
    expect(text("plural")).toBe("plural only");
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

describe("Pair cards", () => {
  const pairs = fixtureDeckDe.cards.filter((c) => c.kind === "pair");

  it("are two in the fixture, in the Prepositions petal, with no character", () => {
    expect(pairs.map((c) => [c.id, c.pos, c.image])).toEqual([
      ["pair-warten-auf", "preposition", null],
      ["pair-gratulieren-zu", "preposition", null],
    ]);
  });

  it.each(pairs)("$id: the front is the verb and its objects with one blank, and the gloss under it", (card) => {
    render(<CardFront card={card} onReveal={() => {}} />);
    expect(q("card-front")!.dataset.kind).toBe("pair");
    expect(host.querySelectorAll('[data-testid="blank"]')).toHaveLength(1);
    expect(q("prompt")!.lang).toBe(LANG.tag);
    expect(text("gloss")).toBe(card.en);
    expect(q("character")).toBeNull();
    // Neither the answer nor the preposition is given away.
    expect(q("card-front")!.textContent).not.toContain(card.target);
  });

  it("put the verb's own objects on the front, never the preposition's", () => {
    render(<CardFront card={fixtureCardDe("pair-warten-auf")} onReveal={() => {}} />);
    expect(text("prompt")!.trim()).toBe("warten");
    render(<CardFront card={fixtureCardDe("pair-gratulieren-zu")} onReveal={() => {}} />);
    expect(text("prompt")!.trim()).toBe("gratulieren jemandem");
  });

  it("answer the preposition and case, with the whole pattern and a new example", () => {
    reveal(fixtureCardDe("pair-warten-auf"));
    expect(text("answer")).toBe("auf + Akk");
    expect(text("meaning")).toBe("to wait for");
    expect(text("pattern")).toBe("auf jemanden warten");
    expect(q("pattern")!.querySelector("mark")!.textContent).toBe("auf");
    expect(text("example-es")).toBe("Ich warte auf den Bus.");
  });

  it("answer both prepositions of an either item", () => {
    const base = fixtureCardDe("pair-warten-auf");
    if (base.pos !== "preposition" || !base.grammar) throw new Error("not a pair card");
    const card = {
      ...base,
      id: "pair-erzaehlen-von-ueber",
      target: "von + Dat / über + Akk",
      en: "to tell about",
      grammar: { verb: "erzählen", objects: "jemandem", prep: "von / über", case: "dat / akk" as const, pattern: "jemandem von etwas / über etwas erzählen" },
    };
    reveal(card);
    expect(text("answer")).toBe("von + Dat / über + Akk");
    expect([...q("pattern")!.querySelectorAll("mark")].map((m) => m.textContent)).toEqual(["von", "über"]);
  });

  it("in Reverse show the gloss first, and the whole pattern on the back", () => {
    const card = fixtureCardDe("pair-warten-auf");
    render(<CardFront card={card} direction="reverse" onReveal={() => {}} />);
    expect(text("prompt")).toBe("to wait for");
    expect(q("blank")).toBeNull();
    expect(q("card-front")!.textContent).not.toContain("jemanden");
    reveal(card);
    expect(text("pattern")).toBe("auf jemanden warten");
  });

  it("play the word clip, which says the whole pattern, by themselves", () => {
    const card = fixtureCardDe("pair-warten-auf");
    expect(autoplayClip(card)).toBe(card.audio.word);
  });
});

describe("Gap cards", () => {
  const gaps = fixtureDeckDe.cards.filter((c) => c.kind === "gap");

  it("are two in the fixture, each requiring its pair card", () => {
    expect(gaps.map((c) => [c.id, c.pos, c.requires])).toEqual([
      ["gap-warten-auf", "preposition", ["pair-warten-auf"]],
      ["gap-gratulieren-zu", "preposition", ["pair-gratulieren-zu"]],
    ]);
  });

  it.each(gaps)("$id: the front is the sentence with one blank line per blanked word, and its English", (card) => {
    render(<CardFront card={card} onReveal={() => {}} />);
    expect(q("card-front")!.dataset.kind).toBe("gap");
    expect(host.querySelectorAll('[data-testid="blank"]')).toHaveLength(blankCount(card.target));
    expect(text("sentence-en")).toBe(card.en);
    expect(q("character")).toBeNull();
    expect(q("card-front")!.textContent).not.toMatch(/[[\]]/);
    expect(q("card-front")!.textContent).not.toContain(card.target);
  });

  it("blank a two-word span with two lines, and a contraction with one", () => {
    render(<CardFront card={fixtureCardDe("gap-warten-auf")} onReveal={() => {}} />);
    expect(host.querySelectorAll('[data-testid="blank"]')).toHaveLength(2);
    expect(text("prompt")).toBe("Zwanzig Minuten habe ich heute   U-Bahn gewartet.");
    render(<CardFront card={fixtureCardDe("gap-gratulieren-zu")} onReveal={() => {}} />);
    expect(host.querySelectorAll('[data-testid="blank"]')).toHaveLength(1);
  });

  it("fill the gap in on the reveal, highlighted, and name the pattern and case", () => {
    reveal(fixtureCardDe("gap-warten-auf"));
    expect(text("answer")).toBe("auf die");
    expect(text("gap-fill")).toBe("auf die");
    expect(q("gap-fill")!.tagName).toBe("MARK");
    expect(text("grammar")).toBe("auf jemanden warten · auf + Akk");
  });

  it("show the sentence, filled in, on the intro too", () => {
    intro(fixtureCardDe("gap-gratulieren-zu"));
    expect(text("intro-es")).toBe("zum");
    expect(text("example-es")).toBe("Wir gratulieren dir zum Geburtstag.");
    expect(text("example-en")).toBe("We congratulate you on your birthday.");
    expect(q("meaning")).toBeNull();
  });

  it("in Reverse show the whole sentence, filled in, to understand", () => {
    render(<CardFront card={fixtureCardDe("gap-warten-auf")} direction="reverse" onReveal={() => {}} />);
    expect(text("prompt")).toBe("Zwanzig Minuten habe ich heute auf die U-Bahn gewartet.");
    expect(q("blank")).toBeNull();
    expect(q("card-front")!.textContent).not.toContain("subway");
  });

  it("play the sentence clip by themselves", () => {
    const card = fixtureCardDe("gap-warten-auf");
    expect(autoplayClip(card)).toBe(card.audio.sentence);
    const played: string[] = [];
    render(<Reveal card={card} onRate={() => {}} onPlay={(src) => played.push(src)} />);
    expect(played).toEqual([card.audio.sentence]);
  });
});
