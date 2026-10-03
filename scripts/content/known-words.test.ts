import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Card, DraftCard } from "@/lib/deck/types";
import type { CallResult, DraftRequest, Runner } from "./claude";
import { buildDeck } from "./deck-build";
import { exampleJobs, examplePrompt, EXAMPLE_SCHEMA, EXAMPLE_SYSTEM_PROMPT, guardExample, redraftExamples } from "./examples";
import {
  cardWords,
  checkExample,
  checkExamples,
  isCognate,
  knownBefore,
  lemmasFrom,
  tokens,
  wordLemmas,
  wordsBefore,
} from "./known-words";
import { fakeReviewer, options, setup, usage } from "./review-fixture";
import { allDrafted, cardHash, readDraftCard, reviewCards } from "./reviewing";
import { TagStore } from "./tagging";

/** A made-up lemma list in E1's format: "lemma<TAB>form". */
const lemmas = lemmasFrom(
  [
    "ser\tsoy",
    "ser\teres",
    "ser\tes",
    "estar\testoy",
    "estar\testá",
    "tener\ttengo",
    "tener\ttienes",
    "tener\ttiene",
    "hablar\thablo",
    "hablar\thablas",
    "hablar\thabla",
    "el\tla",
    "el\tlos",
    "casa\tcasas",
    "bueno\tbuena",
    "perro\tperros",
    "doctor\tdoctores",
    "ver\tveo",
  ].join("\n"),
);

const known = (...words: string[]) => new Set(words.flatMap((w) => wordLemmas(w, lemmas)));

function card(fields: Partial<Card> & Pick<Card, "es" | "example">): Card {
  return {
    id: fields.es.replace(/\W+/g, "-"),
    rank: 1,
    kind: "content",
    pos: "noun",
    en: "x",
    hint: null,
    grammar: null,
    spain: null,
    trick: null,
    image: null,
    audio: { word: "/w.mp3", sentence: "/s.mp3" },
    unit: null,
    requires: [],
    tip: null,
    why: null,
    ...fields,
  } as Card;
}

describe("the known-words check on made-up sentences", () => {
  it("knows a conjugated form of a known verb, and a plural of a known noun", () => {
    const check = checkExample(
      card({ es: "la casa", unit: "home", example: { es: "Hablo de las casas.", en: "I talk about the houses." } }),
      known("hablar", "de", "las"),
      lemmas,
    );
    expect(check).toEqual({ ok: true, starter: true, unknown: [], cognates: [] });
    // Without the verb card before it, "hablo" is not met yet.
    expect(checkExample(card({ es: "la casa", unit: "home", example: { es: "Hablo de las casas.", en: "x" } }), known("de", "las"), lemmas).unknown).toEqual(["Hablo"]);
  });

  it("allows one obvious cognate in the starter path, but not two, and no other word", () => {
    const soy = (es: string, en: string) => checkExample(card({ es: "soy", unit: "who-i-am", example: { es, en } }), known("de"), lemmas);
    expect(soy("Soy doctor.", "I am a doctor.")).toMatchObject({ ok: true, cognates: ["doctor"], unknown: [] });
    expect(soy("Soy doctor de hotel.", "I am a hotel doctor.")).toMatchObject({ ok: false, cognates: ["doctor", "hotel"] });
    expect(soy("Soy médico.", "I am a doctor.")).toMatchObject({ ok: false, unknown: ["médico"], cognates: [] });
    expect(isCognate("problema", "It is a problem.")).toBe(true);
    expect(isCognate("información", "The information.")).toBe(true);
    expect(isCognate("ciudad", "The city.")).toBe(false);
  });

  it("allows names and numbers anywhere", () => {
    const check = (es: string) => checkExample(card({ es: "tener", unit: "home", example: { es, en: "x" } }), known("de", "la"), lemmas);
    expect(check("Tengo la casa de María.").ok).toBe(false); // casa is not met
    expect(check("Tengo 3 perros.").unknown).toEqual(["perros"]);
    expect(check("Tengo dos.").ok).toBe(true);
    expect(check("¿Tienes 20? Ana tiene diez.").ok).toBe(true);
    expect(check("Ana tiene la de Juan.").ok).toBe(true);
    // A capital at the start of a sentence is not a name when the word is in the lemma list.
    expect(check("Perros, tengo dos.").unknown).toEqual(["Perros"]);
  });

  it("allows two other words of any kind in the frequency phase, not three", () => {
    const check = (es: string) => checkExample(card({ es: "tener", example: { es, en: "x" } }), known(), lemmas);
    expect(check("Tengo perros buenos.")).toMatchObject({ ok: true, starter: false, unknown: ["perros", "buenos"] });
    expect(check("Tengo perros buenos aquí.").ok).toBe(false);
  });

  it("counts the card's own words: its answer, its strip and its feminine", () => {
    const tener = card({ es: "tener", pos: "verb", grammar: { present: { yo: "tengo", tu: "tienes", el: "tiene" }, irregular: true }, example: { es: "x", en: "x" } });
    expect([...cardWords(tener, lemmas)]).toEqual(expect.arrayContaining(["tener", "tengo", "tienes", "tiene"]));
    const buena = card({ es: "bueno", unit: "u", grammar: { feminine: "buena" }, example: { es: "Buena casa.", en: "x" } });
    expect(checkExample(buena, known("casa"), lemmas).ok).toBe(true);
  });

  it("walks the order: an example knows only the cards before it, so a reorder can break it", () => {
    const yo = card({ es: "soy", unit: "u", example: { es: "Soy Ana.", en: "I am Ana." } });
    const casa = card({ es: "la casa", unit: "u", example: { es: "Es la casa.", en: "It is the house." } });
    expect([...checkExamples([yo, casa], lemmas).values()].map((c) => c.ok)).toEqual([true, true]);
    expect([...checkExamples([casa, yo], lemmas).values()].map((c) => c.ok)).toEqual([false, true]);
    expect(knownBefore([yo, casa], casa.id, lemmas)).toEqual(new Set(["soy", "ser"]));
    expect(wordsBefore([yo, casa], casa.id)).toEqual(["soy"]);
    expect(knownBefore([yo], "nothing", lemmas)).toBeNull();
  });

  it("splits sentences into words and marks the first of each sentence", () => {
    expect(tokens("Hola, ¿cómo estás? Bien.")).toEqual([
      { word: "Hola", first: true },
      { word: "cómo", first: false },
      { word: "estás", first: false },
      { word: "Bien", first: true },
    ]);
  });
});

describe("the known-words check in the review pass and the deck build", () => {
  it("flags a card with reason known-words when the review is given its problem", async () => {
    const { drafts, store } = setup();
    const { runner } = fakeReviewer();
    await reviewCards(allDrafted(drafts), { ...options(drafts, store, runner), knownWords: new Map([["de-of", "The example uses words not met before this card: casa."]]) });
    expect(store.get("de-of")).toMatchObject({ flagged: true, findings: [{ reason: "known-words", fix: "npm run draft -- --examples --ids de-of" }] });
    expect(store.get("bueno-good")?.flagged).toBe(false);
  });

  it("lists the deck's broken examples by id and names their words in path.md", async () => {
    const { drafts, store } = setup();
    await reviewCards(allDrafted(drafts), options(drafts, store, fakeReviewer().runner));
    const without = buildDeck(drafts, store, null);
    expect(without.examples.size).toBe(0);
    expect(without.brokenExamples).toEqual([]);
    const build = buildDeck(drafts, store, null, { lemmas });
    expect(build.order.map((c) => c.id)).toEqual(without.order.map((c) => c.id));
    const broken = build.order.filter((c) => !build.examples.get(c.id)!.ok).map((c) => c.id);
    expect(broken.length).toBeGreaterThan(0);
    // Only cards in the deck are listed (flagged cards wait for a decision).
    expect(build.brokenExamples).toEqual(broken.filter((id) => build.deck!.cards.some((c) => c.id === id)));
    expect(build.pathText).toContain("example uses words not met yet");
    expect(build.deck).toEqual(without.deck);
  });
});

describe("the example redraft", () => {
  function runner(answers: unknown[]) {
    const requests: DraftRequest[] = [];
    const run: Runner = async (request) => {
      requests.push(request);
      return { ok: true, output: answers[Math.min(requests.length - 1, answers.length - 1)], usage } satisfies CallResult;
    };
    return { run, requests };
  }

  it("changes only the example, asks again when it still uses words not met, and keeps a current tag", async () => {
    const { dir, drafts, store } = setup();
    const before = readDraftCard(drafts, "bueno-good")!;
    const tags = new TagStore(path.join(dir, "tags"));
    writeFileSync(tags.file("bueno-good"), JSON.stringify({ id: "bueno-good", unit: null, want: null, requires: [], tip: null, draft: cardHash(before) }));

    const build = buildDeck(drafts, store, null, { lemmas });
    const { jobs, missing } = exampleJobs(build, drafts, ["bueno-good", "nope"], lemmas);
    expect(missing).toEqual(["nope"]);
    expect(jobs[0].check.ok).toBe(false);
    const prompt = examplePrompt(jobs[0]);
    expect(prompt).toContain("Why it is redrafted: The example uses words not met before this card");
    expect(prompt).toContain(`Words met before this card (${jobs[0].met.length}): `);
    expect(jobs[0].met).toEqual(expect.arrayContaining(["tener", "tengo"]));

    const fake = runner([
      { example: { es: "Es un buen día.", en: "It's a good day." } },
      { example: { es: "Tengo un perro bueno.", en: "I have a good dog." } },
    ]);
    const print: string[] = [];
    const summary = await redraftExamples(jobs, lemmas, {
      store: drafts,
      runner: fake.run,
      via: "cli",
      model: "claude-opus-5-5",
      effort: "medium",
      tags,
      print: (line) => print.push(line),
      sleep: async () => {},
    });
    expect(summary).toMatchObject({ drafted: 1, failed: 0, calls: 2, failedCalls: 1 });
    expect(fake.requests[0]).toMatchObject({ system: EXAMPLE_SYSTEM_PROMPT, schema: EXAMPLE_SCHEMA });
    expect(print).toEqual(["example bueno-good: bueno-good"]);

    const after = readDraftCard(drafts, "bueno-good")!;
    expect(after).toEqual({ ...before, example: { es: "Tengo un perro bueno.", en: "I have a good dog." } });
    expect(JSON.parse(readFileSync(tags.file("bueno-good"), "utf8")).draft).toBe(cardHash(after));
    expect(existsSync(path.join(drafts.failedDir, "example-bueno-good-1.json"))).toBe(true);
    const log = readFileSync(drafts.logFile, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    expect(log.slice(-2).map((l) => [l.group, l.id, l.ok, l.error])).toEqual([
      ["example", "bueno-good", false, "invalid"],
      ["example", "bueno-good", true, null],
    ]);

    // Rerunning skips a card whose example now passes; --redo redrafts it.
    const again = exampleJobs(buildDeck(drafts, store, null, { lemmas }), drafts, ["bueno-good"], lemmas).jobs;
    const rerun = runner([{ example: { es: "Tengo un perro bueno.", en: "I have a good dog." } }]);
    const base = { store: drafts, runner: rerun.run, via: "cli", model: "m", effort: "medium" as const, print: () => {}, sleep: async () => {} };
    expect((await redraftExamples(again, lemmas, base)).calls).toBe(0);
    expect((await redraftExamples(again, lemmas, { ...base, redo: true })).calls).toBe(1);
  });

  it("refuses a malformed answer or a changed card", () => {
    const { drafts, store } = setup();
    const { jobs } = exampleJobs(buildDeck(drafts, store, null, { lemmas }), drafts, ["casa-house"], lemmas);
    expect(guardExample({}, jobs[0], lemmas)).toMatchObject({ ok: false, kind: "shape" });
    expect(guardExample({ example: { es: "", en: "x" } }, jobs[0], lemmas)).toMatchObject({ ok: false, fields: ["example.es"] });
    const ok = guardExample({ example: { es: "La casa.", en: "The house." } }, jobs[0], lemmas);
    expect(ok.ok && (ok.cards[0] as DraftCard)).toEqual({ ...jobs[0].card, example: { es: "La casa.", en: "The house." } });
  });
});
