import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { DraftCard } from "@/lib/deck/types";
import { FORM_ID, PHRASE_ID, validateDraftCard, validateDraftCards } from "@/lib/deck/validate";
import type { DraftRequest, Runner } from "./claude";
import { buildDeck } from "./deck-build";
import { cardFromDecision, decisionFile, parseDecision, refreshFlagged } from "./decisions";
import { type DraftOptions, type DraftStore, withMedia } from "./drafting";
import {
  draftForms,
  draftPhrases,
  FORM_SCHEMA,
  FORM_SYSTEM_PROMPT,
  FORM_VERBS,
  formId,
  formJobs,
  formPrompt,
  guardForms,
  guardPhrase,
  PHRASE_SYSTEM_PROMPT,
  phraseId,
  phraseJobs,
  phrasePrompt,
  type FormJob,
} from "./path-cards";
import { fakeReviewer, options as reviewOptions, setup, usage } from "./review-fixture";
import { allDrafted, draftedForms, draftedPhrases, idProblem, reviewCards } from "./reviewing";
import type { Unit } from "./units";

const units: Unit[] = [
  { id: "me-and-you", title: "Me and you", goal: "say hello.", tip: null, wants: ["yo", "phrase: me llamo = my name is"], payoff: [] },
  {
    id: "where-i-go",
    title: "Where I go",
    goal: "say where you are going.",
    tip: null,
    wants: ["ir: I go (voy)", "ir: you go (vas)", "ir: he / she goes (va)", "casa"],
    payoff: ["I'm going home", "You're going to the house of Maria today"],
  },
  { id: "later", title: "Later", goal: "talk about shoes.", tip: null, wants: ["zapato"], payoff: ["Nice shoes"] },
];

const ranks = new Map([
  ["el", 1],
  ["de", 2],
  ["a", 6],
  ["ir", 15],
  ["me", 18],
  ["yo", 37],
  ["casa", 90],
  ["llamar", 300],
  ["hoy", 1050],
]);

const irGo = withMedia({
  id: "ir-go",
  rank: 15,
  kind: "content",
  pos: "verb",
  es: "ir",
  en: "to go",
  hint: null,
  grammar: { present: { yo: "voy", tu: "vas", el: "va" }, irregular: true },
  example: { es: "Voy al parque.", en: "I'm going to the park." },
  spain: null,
  trick: "IR sounds like EAR: you go wherever your ear hears music.",
}) as DraftCard;

const FORM_ANSWER = {
  cards: [
    { person: "yo", en: "I go", hint: null, example: { es: "Voy a casa.", en: "I'm going home." }, trick: "VOY sounds like VOYAGE: I go on a voyage." },
    { person: "tu", en: "you go", hint: "informal", example: { es: "¿Vas a casa?", en: "Are you going home?" }, trick: null },
    { person: "el", en: "he / she goes", hint: null, example: { es: "Ella va a casa.", en: "She is going home." }, trick: null },
  ],
};

const PHRASE_ANSWERS: Record<string, unknown> = {
  "my name is": {
    es: "me llamo",
    en: "My name is",
    hint: null,
    example: { es: "Hola, me llamo Ana.", en: "Hi, my name is Ana." },
    spain: null,
    trick: null,
    words: ["me", "llamar"],
  },
  "I'm going home": {
    es: "Voy a casa.",
    en: "I'm going home.",
    hint: null,
    example: { es: "Ya es tarde, voy a casa.", en: "It's late, I'm going home." },
    spain: null,
    trick: null,
    words: ["ir", "a", "casa"],
  },
  "You're going to the house of Maria today": {
    es: "Hoy vas a la casa de María.",
    en: "You're going to Maria's house today.",
    hint: "informal",
    example: { es: "¿Hoy vas a la casa de María?", en: "Are you going to Maria's house today?" },
    spain: null,
    trick: null,
    words: ["hoy", "ir", "a", "el", "casa", "de"],
  },
};

/** A fake Claude for the draft pass: answers by the system prompt, and for a phrase by its English. */
function fakeDrafter() {
  const requests: DraftRequest[] = [];
  const runner: Runner = async (request) => {
    requests.push(request);
    if (request.system === FORM_SYSTEM_PROMPT) return { ok: true, output: structuredClone(FORM_ANSWER), usage };
    const en = /Its English: "([^"]*)"/.exec(request.prompt)?.[1] ?? "";
    return { ok: true, output: structuredClone(PHRASE_ANSWERS[en]), usage };
  };
  return { runner, requests };
}

function draftOptions(store: DraftStore, runner: Runner, print: string[] = []): DraftOptions {
  return { store, runner, via: "cli", model: "claude-opus-5-5", effort: "medium", print: (l) => print.push(l), sleep: async () => {} };
}

function withIr() {
  const env = setup();
  env.drafts.saveWord({ rank: 15, word: "ir", forms: ["voy", "va", "ir"] }, [irGo], null, { via: "cli" });
  return env;
}

const irJob = (drafts: DraftStore): FormJob => formJobs(drafts, units, ["ir"]).jobs[0];
const threePhrases = () => phraseJobs(units).jobs.filter((j) => j.unit !== "later");

describe("form and phrase ids", () => {
  it("makes a form id per verb and person, and haber's hay", () => {
    expect(formId("ser", "yo")).toBe("ser-form-yo");
    expect(formId("haber", "hay")).toBe("haber-form-hay");
    for (const v of FORM_VERBS) for (const p of v.persons) expect(formId(v.verb, p)).toMatch(FORM_ID);
    expect(FORM_VERBS.flatMap((v) => v.persons)).toHaveLength(31);
  });

  it("makes a phrase id from the plan's first four English words, apostrophes dropped", () => {
    expect(phraseId("my name is")).toBe("phrase-my-name-is");
    expect(phraseId("I'm going home")).toBe("phrase-im-going-home");
    expect(phraseId("You’re going to the house of Maria today")).toBe("phrase-youre-going-to-the");
    expect(phraseId("¿Cómo estás?")).toBe("phrase-como-estas");
    expect(phraseId("?!")).toBe("");
    for (const en of ["my name is", "I'm going home", "Nice shoes"]) expect(phraseId(en)).toMatch(PHRASE_ID);
  });

  it("checks a form or phrase id by its group's kind in the review and the build", () => {
    expect(idProblem("ir-form-yo", "ir", 15, "form")).toBeNull();
    expect(idProblem("haber-form-hay", "haber", 12, "form")).toBeNull();
    expect(idProblem("ser-form-yo", "ir", 15, "form")).toMatch(/must be "ir-form-"/);
    expect(idProblem("haber-form-yo", "haber", 12, "form")).toMatch(/haber-form-hay/);
    expect(idProblem("ir-form-we", "ir", 15, "form")).toMatch(/yo, tu or el/);
    expect(idProblem("phrase-im-going-home", "where-i-go", 90, "phrase")).toBeNull();
    expect(idProblem("phrase-a-b-c-d-e", "where-i-go", 90, "phrase")).toMatch(/one to four/);
    expect(idProblem("going-home", "where-i-go", 90, "phrase")).toMatch(/phrase-/);
  });

  it("finds no clash among the real plan's phrase ids", () => {
    const { problems } = phraseJobs(JSON.parse(readFileSync(path.join(process.cwd(), "content", "units.json"), "utf8")));
    expect(problems).toEqual([]);
  });
});

describe("form prompt", () => {
  it("gives the verb's card prompt and forms, the forms to write, the plan's wants and the other verbs", () => {
    const { drafts } = withIr();
    const { jobs, missing } = formJobs(drafts, units, ["ir", "tener", "ser"]);
    expect(missing).toEqual(["ser"]);
    const job = jobs.find((j) => j.verb === "ir")!;
    expect(job.cards).toEqual([
      { person: "yo", id: "ir-form-yo", es: "voy" },
      { person: "tu", id: "ir-form-tu", es: "vas" },
      { person: "el", id: "ir-form-el", es: "va" },
    ]);
    const prompt = formPrompt(job);
    expect(prompt).toContain('Verb: ir, rank 15. Its card asks "to go".');
    expect(prompt).toContain("Present tense: yo voy · tú vas · él va (irregular).");
    expect(prompt).toContain("- tu: vas");
    expect(prompt).toContain("The unit plan asks for: ir: I go (voy); ir: you go (vas); ir: he / she goes (va).");
    expect(prompt).toContain('The other verbs with form cards ask: tener: "to have" (hint: own).');
    expect(FORM_SYSTEM_PROMPT).toContain('a "you" card\'s hint always says "informal"');
    expect((FORM_SCHEMA as { required: string[] }).required).toEqual(["cards"]);
  });

  it("leaves out a verb whose card is not drafted, or is not a verb", () => {
    const { drafts } = withIr();
    const { jobs, missing } = formJobs(drafts, units);
    expect(jobs.map((j) => j.verb)).toEqual(["tener", "ir"]);
    expect(missing).toContain("ser");
  });
});

describe("phrase prompt", () => {
  it("lists each unit's chunks then its payoffs, in plan order, with what is met by the end of the unit", () => {
    const { jobs } = phraseJobs(units);
    expect(jobs.map((j) => [j.id, j.unit, j.source, j.order])).toEqual([
      ["phrase-my-name-is", "me-and-you", "chunk", 0],
      ["phrase-im-going-home", "where-i-go", "payoff", 1],
      ["phrase-youre-going-to-the", "where-i-go", "payoff", 2],
      ["phrase-nice-shoes", "later", "payoff", 3],
    ]);
    const chunk = phrasePrompt(jobs[0]);
    expect(chunk).toContain('Unit 1 of the starter path: "Me and you". Its goal: now you can say hello.');
    expect(chunk).toContain('This is a survival chunk. Its English: "my name is". Its Spanish, from the plan: me llamo');
    expect(chunk).toContain("- yo");
    expect(chunk).not.toContain("- casa");
    const payoff = phrasePrompt(jobs[1]);
    expect(payoff).toContain('This is a payoff phrase. Its English: "I\'m going home".');
    expect(payoff).toContain("- phrase: me llamo = my name is");
    expect(payoff).toContain("- ir: I go (voy)");
    expect(payoff).not.toContain("zapato");
    expect(PHRASE_SYSTEM_PROMPT).toContain("Leave out names.");
  });

  it("reports two plan lines that make one id", () => {
    const twice = [units[0], { ...units[2], id: "again", payoff: ["My name is!"] }];
    expect(phraseJobs(twice).problems).toEqual(["phrase-my-name-is: made from a line of me-and-you and one of again; reword one"]);
  });
});

describe("guards", () => {
  it("takes a form's es, grammar and still from the verb, and refuses a missing person or an example without the form", () => {
    const { drafts } = withIr();
    const job = irJob(drafts);
    const guarded = guardForms(structuredClone(FORM_ANSWER), job);
    expect(guarded.ok).toBe(true);
    const cards = guarded.ok ? guarded.cards : [];
    expect(cards.map((c) => [c.id, c.kind, c.pos, c.es, c.image])).toEqual([
      ["ir-form-yo", "form", "verb", "voy", "/deck/img/ir-go.webp"],
      ["ir-form-tu", "form", "verb", "vas", "/deck/img/ir-go.webp"],
      ["ir-form-el", "form", "verb", "va", "/deck/img/ir-go.webp"],
    ]);
    expect(cards[0].audio.word).toBe("/deck/audio/ir-form-yo.word.mp3");

    const missing = { cards: FORM_ANSWER.cards.slice(0, 2) };
    expect(guardForms(missing, job)).toEqual({ ok: false, kind: "invalid", fields: ["cards"] });
    const noForm = structuredClone(FORM_ANSWER);
    noForm.cards[1].example.es = "¿Quieres ir a casa?";
    expect(guardForms(noForm, job)).toEqual({ ok: false, kind: "invalid", fields: ["example.es"] });
    const samePrompt = structuredClone(FORM_ANSWER);
    samePrompt.cards[2].en = "I go";
    expect(guardForms(samePrompt, job)).toEqual({ ok: false, kind: "invalid", fields: ["en"] });
  });

  it("ranks a phrase by its rarest word and lists the words outside the top 1,000", () => {
    const [chunk, , long] = threePhrases();
    const first = guardPhrase(PHRASE_ANSWERS["my name is"], chunk, ranks);
    expect(first.guarded).toMatchObject({ ok: true, cards: [{ id: "phrase-my-name-is", rank: 300, kind: "phrase", pos: "phrase", image: null, grammar: null }] });
    expect(first.words).toEqual({ words: [{ word: "me", rank: 18 }, { word: "llamar", rank: 300 }], outside: [] });
    const second = guardPhrase(PHRASE_ANSWERS["You're going to the house of Maria today"], long, ranks);
    expect(second.guarded).toMatchObject({ ok: true, cards: [{ rank: 1050 }] });
    expect(second.words?.outside).toEqual(["hoy"]);
    const none = guardPhrase({ ...(PHRASE_ANSWERS["my name is"] as object), words: ["ana"] }, chunk, ranks);
    expect(none.guarded).toEqual({ ok: false, kind: "invalid", fields: ["rank", "words"] });
  });
});

describe("form and phrase run", () => {
  it("drafts three form cards and three phrase cards into valid card files, and a rerun resumes", async () => {
    const { drafts } = withIr();
    const { runner, requests } = fakeDrafter();
    const printed: string[] = [];
    const forms = await draftForms([irJob(drafts)], draftOptions(drafts, runner, printed));
    const phrases = await draftPhrases(threePhrases(), ranks, draftOptions(drafts, runner, printed));
    expect(forms).toMatchObject({ drafted: 1, cards: 3, failed: 0, calls: 1 });
    expect(phrases).toMatchObject({ drafted: 3, cards: 3, failed: 0, calls: 3 });
    expect(requests.map((r) => r.schema === FORM_SCHEMA)).toEqual([true, false, false, false]);

    const ids = ["ir-form-yo", "ir-form-tu", "ir-form-el", "phrase-my-name-is", "phrase-im-going-home", "phrase-youre-going-to-the"];
    for (const id of ids) {
      const card = JSON.parse(readFileSync(path.join(drafts.cardsDir, `${id}.json`), "utf8"));
      expect(validateDraftCard(card).ok).toBe(true);
    }
    expect(validateDraftCards(drafts.cards()).ok).toBe(true);
    expect(drafts.readGroup("form", "ir")).toMatchObject({ kind: "form", rank: 15, word: "ir", from: "ir-go", cards: ids.slice(0, 3) });
    expect(drafts.readGroup("phrase", "phrase-youre-going-to-the")).toMatchObject({ kind: "phrase", unit: "where-i-go", order: 2, outside: ["hoy"] });
    // Only ids, verbs and unit ids are printed.
    expect(printed).toEqual([
      "form ir: ir-form-yo, ir-form-tu, ir-form-el",
      "phrase me-and-you: phrase-my-name-is",
      "phrase where-i-go: phrase-im-going-home",
      "phrase where-i-go: phrase-youre-going-to-the",
    ]);

    const again = fakeDrafter();
    await draftForms([irJob(drafts)], draftOptions(drafts, again.runner));
    const resumed = await draftPhrases(threePhrases(), ranks, draftOptions(drafts, again.runner));
    expect(again.requests).toHaveLength(0);
    expect(resumed).toMatchObject({ alreadyDrafted: 3, drafted: 0 });

    // A changed plan line is drafted again; redrafting the verb's word keeps its form cards.
    const changed = threePhrases().map((j) => (j.id === "phrase-im-going-home" ? { ...j, line: "I'm going home now" } : j));
    await draftPhrases(changed, ranks, draftOptions(drafts, again.runner));
    expect(again.requests).toHaveLength(1);
    drafts.saveWord({ rank: 15, word: "ir", forms: ["ir"] }, [irGo], null, { via: "cli" });
    expect(existsSync(path.join(drafts.cardsDir, "ir-form-yo.json"))).toBe(true);
  });

  it("reviews them with the same review pass, flags a phrase with a word outside the top 1,000, and the deck build reads them", async () => {
    const { drafts, store } = withIr();
    const { runner } = fakeDrafter();
    await draftForms([irJob(drafts)], draftOptions(drafts, runner));
    await draftPhrases(threePhrases(), ranks, draftOptions(drafts, runner));

    const groups = [...draftedForms(drafts), ...draftedPhrases(drafts)];
    expect(groups.map((g) => [g.kind, g.word, g.rank, g.cards.length])).toEqual([
      ["form", "ir", 15, 3],
      ["phrase", "me-and-you", 300, 1],
      ["phrase", "where-i-go", 1050, 2],
    ]);
    expect(allDrafted(drafts).slice(-3)).toEqual(groups);

    const reviewer = fakeReviewer();
    const printed: string[] = [];
    const summary = await reviewCards(groups, reviewOptions(drafts, store, reviewer.runner, printed));
    expect(summary).toMatchObject({ cards: 6, passed: 5, flagged: 1, reasons: { words: 1 } });
    const prompts = reviewer.requests.map((r) => r.prompt);
    expect(prompts[0]).toContain("A form card of the verb ir, rank 15");
    expect(prompts[0]).toContain('The verb\'s other form cards ask: "you go" (hint: informal); "he / she goes".');
    expect(prompts[3]).toContain("A phrase card of the starter path's unit me-and-you");
    expect(prompts[3]).toContain("This is the unit's only phrase card.");
    expect(prompts[4]).toContain('The unit\'s other phrase cards ask: "You\'re going to Maria\'s house today." (hint: informal).');
    for (const p of prompts) expect(p).not.toMatch(/form-|phrase-|\/deck\//);

    expect(store.get("phrase-youre-going-to-the")).toMatchObject({ rank: 1050, word: "where-i-go", flagged: true, findings: [{ reason: "words" }] });
    expect(store.get("ir-form-tu")).toMatchObject({ rank: 15, word: "ir", flagged: false });
    expect(printed).toContain("#1050 where-i-go: phrase-youre-going-to-the flagged (words)");

    const flagged = refreshFlagged(drafts, store);
    expect(flagged.waiting).toContain("phrase-youre-going-to-the");
    const build = buildDeck(drafts, store, null);
    expect(build.passed).toEqual(expect.arrayContaining(["ir-form-yo", "phrase-my-name-is"]));
    expect(build.waiting).toContain("phrase-youre-going-to-the");
    expect(build.problems).toEqual([]);
  });

  it("gives a form card back unchanged from its decision file, still and all", async () => {
    const { drafts } = withIr();
    await draftForms([irJob(drafts)], draftOptions(drafts, fakeDrafter().runner));
    const card = JSON.parse(readFileSync(path.join(drafts.cardsDir, "ir-form-tu.json"), "utf8")) as DraftCard;
    const review = { id: card.id, rank: 15, word: "ir", draft: "0", flagged: true, findings: [], back: { es: "", example: "" }, via: "cli", model: "m", effort: "medium", reviewedAt: "" };
    expect(cardFromDecision(card, parseDecision(decisionFile(card, review)).fields)).toEqual(card);
  });
});
