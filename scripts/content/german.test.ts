// DE5: every content script takes `--lang de`. These run the passes on the German fixture
// (lib/deck/fixture-de.json) with a fake runner, in a temporary root laid out as content/de/,
// and pin the Spanish side as it was: the same prompts and schemas, paths, voice and mascot files.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LANGS } from "@/lang";
import { fixtureDeckDe } from "@/lib/deck/fixture";
import type { Card, Deck, DraftCard } from "@/lib/deck/types";
import { GERMAN_FORM_ID, validateDeck, validateDraftCard } from "@/lib/deck/validate";
import { CAST_SCHEMA, CAST_SYSTEM } from "./art";
import { artPaths, readStills } from "./art-run";
import { audioPaths, orphanClips, rawKey, tipAudioPaths, VOICE, voiceOf } from "./audio.mjs";
import type { CallResult, DraftRequest, Runner } from "./claude";
import { decisionPath, readDecision, refreshFlagged } from "./decisions";
import { buildDeck } from "./deck-build";
import {
  DRAFT_REQUESTS,
  DraftStore,
  draftWords,
  guardDraft,
  SKIP_REASONS,
  SKIP_REASONS_BY_LANG,
  slug,
  type SpanishMeaning,
  type WordEntry,
} from "./drafting";
import { EXAMPLE_REQUESTS, EXAMPLE_SCHEMA, EXAMPLE_SYSTEM_PROMPT } from "./examples";
import { isCognate, numberWords } from "./known-words";
import { mascotPaths, sharedMascotFiles } from "./mascot.mjs";
import {
  draftForms,
  draftPhrases,
  FORM_REQUESTS,
  FORM_VERBS_BY_LANG,
  formId,
  formJobs,
  PHRASE_REQUESTS,
  phraseJobs,
  wordRanks,
} from "./path-cards";
import { GERMAN_DRAFT_SYSTEM, germanDraftSystem, PROMPTS_READY } from "./prompts-de";
import {
  allDrafted,
  draftedWords,
  idProblem,
  reasonLabel,
  REVIEW_SCHEMA,
  REVIEW_SCHEMAS,
  REVIEW_SYSTEMS,
  reviewCards,
  ReviewStore,
} from "./reviewing";
import { contentPaths, parseLang } from "./script-lang";
import { SOURCES_BY_LANG } from "./sources.mjs";
import { TAG_SCHEMA, TAG_SYSTEMS, tagCards, tagContext, tagGroups, TagStore, WHY_MAX } from "./tagging";
import { draftTips, TIP_REQUESTS, TipStore, tipJobs, tipsForDeck } from "./tips";
import { readTips, readUnits, type TipEntry, type Unit } from "./units";

const usage = { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, costUsd: 0, durationMs: 1, models: ["m"] };
const options = { via: "cli", model: "m", effort: "medium" as const, print: () => {}, sleep: async () => {} };
const fixtureCard = (id: string) => fixtureDeckDe.cards.find((c) => c.id === id)!;

/** The words of the fixture's word cards, as the German word list would rank them. */
const WORD_CARDS = ["mit-with", "gut-good", "gehen-go", "mann-man", "frau-woman", "haus-house", "anrufen-call", "januar-january"];
const wordOf = (id: string) => id.split("-")[0];
const ENTRIES: WordEntry[] = WORD_CARDS.map((id) => ({ rank: fixtureCard(id).rank, word: wordOf(id), forms: [wordOf(id)] }));

/** A fixture card as Claude answers it in German's schema (prompts-de.ts): flat grammar, `regional` as `{ where, text }`. */
function claudeCard(card: Card) {
  const g = (card.grammar ?? {}) as Record<string, unknown>;
  return {
    id: card.id,
    kind: card.kind,
    pos: card.pos,
    target: card.target,
    en: card.en,
    hint: card.hint,
    grammar: {
      gender: g.gender ?? null,
      article: g.article ?? null,
      plural: g.plural ?? null,
      present: g.present ?? null,
      irregular: g.irregular ?? null,
      separable: g.separable ?? null,
      perfekt: g.perfekt ?? null,
    },
    example: card.example,
    regional: card.regional,
    trick: card.trick,
  };
}

const UNITS: Unit[] = [
  {
    id: "me-and-you",
    title: "Me and you",
    goal: "say how you are.",
    tip: "tip-accusative",
    wants: ["gehen: to go", "Mann", "phrase: Wie geht's? = How are you?"],
    payoff: [],
  },
];
const TIPS: TipEntry[] = [{ id: "tip-accusative", title: "The accusative", about: "der becomes den when it is the thing you see." }];

/** A temporary repo root with the German plan in content/de/. */
function germanRoot() {
  const root = mkdtempSync(path.join(tmpdir(), "german-"));
  const paths = contentPaths(root, "de");
  mkdirSync(paths.content, { recursive: true });
  writeFileSync(paths.units, JSON.stringify(UNITS));
  writeFileSync(paths.tipList, JSON.stringify(TIPS));
  return { root, paths };
}

const answer = (output: unknown): CallResult => ({ ok: true, output: structuredClone(output), usage });

/** The fake runner: answers each pass from the fixture, by what the request asks for. */
function fakeRunner(flag: string[] = []) {
  const calls: DraftRequest[] = [];
  const runner: Runner = async (request) => {
    calls.push(request);
    const { prompt } = request;
    const word = /^Rank \d+: (\S+)/.exec(prompt)?.[1];
    if (word) return answer({ skip: null, cards: [claudeCard(fixtureCard(WORD_CARDS.find((id) => wordOf(id) === word)!))] });
    if (prompt.startsWith("Verb: gehen")) {
      const forms = { ich: ["I go", "Ich gehe nach Hause."], du: ["you go", "Du gehst nach Hause."], er: ["he / she goes", "Er geht nach Hause."] };
      return answer({
        cards: Object.entries(forms).map(([person, [en, target]]) => ({ person, en, hint: null, example: { target, en: "Home." }, trick: null })),
      });
    }
    if (prompt.includes("This is a survival chunk")) {
      const card = fixtureCard("phrase-how-are-you");
      return answer({ target: card.target, en: card.en, hint: card.hint, example: card.example, regional: null, trick: null, words: ["wie", "gehen"] });
    }
    if (prompt.startsWith("Tip 1 of 1")) {
      return answer({
        body: ["Der changes to den.", "It is the thing you see.", "Die and das stay."],
        examples: fixtureDeckDe.tips[0].examples.map(({ target, en }) => ({ target, en })),
      });
    }
    if (prompt.includes("The card:")) {
      const shown = prompt.slice(prompt.indexOf("{"), prompt.lastIndexOf("}") + 1);
      const id = JSON.parse(shown).target as string;
      const bad = flag.includes(id);
      const check = { ok: true, problem: null, fix: null };
      return answer({
        back: { target: "back", example: "back" },
        checks: {
          meaning: check,
          oneAnswer: check,
          grammar: bad ? { ok: false, problem: "Wrong plural.", fix: null } : check,
          usage: check,
          example: check,
          trick: check,
          sameAs: check,
        },
        note: null,
      });
    }
    if (prompt.includes("Tag these cards.")) {
      const cards = prompt
        .slice(prompt.indexOf("Tag these cards."))
        .split("\n")
        .filter((line) => line.startsWith("{"))
        .map((line) => JSON.parse(line) as { id: string });
      return answer({
        cards: cards.map(({ id }) => ({
          id,
          unit: id === "gehen-go" || id === "mann-man" ? "me-and-you" : null,
          want: id === "gehen-go" ? "gehen: to go" : id === "mann-man" ? "Mann" : null,
          requires: [],
          tip: id === "mann-man" ? "tip-accusative" : null,
          why: null,
        })),
      });
    }
    throw new Error(`unexpected request: ${prompt.slice(0, 40)}`);
  };
  return { runner, calls };
}

describe("--lang", () => {
  it("is Spanish when left out and refuses a language with no config", () => {
    expect(parseLang(undefined)).toBe("es");
    expect(parseLang("de")).toBe("de");
    expect(() => parseLang("fr")).toThrow(/--lang is es or de/);
  });

  it("keeps every Spanish path and moves German's to content/de and public/deck-de", () => {
    const es = contentPaths("/repo");
    expect([es.content, es.drafts, es.review, es.tags, es.tips, es.deck, es.pathFile, es.units, es.tipList]).toEqual([
      "/repo/content",
      "/repo/content/drafts",
      "/repo/content/review",
      "/repo/content/tags",
      "/repo/content/tips",
      "/repo/content/deck.json",
      "/repo/content/path.md",
      "/repo/content/units.json",
      "/repo/content/tips.json",
    ]);
    expect([es.wordList, es.audioTakes, es.flaggedClips, es.art, es.publicDeck, es.deckUrl, es.fixture]).toEqual([
      "/repo/content/word-list.tsv",
      "/repo/content/audio-takes.json",
      "/repo/content/flagged-clips.html",
      "/repo/content/art",
      "/repo/public/deck",
      "/deck/",
      "/repo/lib/deck/fixture.json",
    ]);
    const de = contentPaths("/repo", "de");
    expect([de.drafts, de.deck, de.wordList, de.art, de.publicDeck, de.deckUrl, de.fixture]).toEqual([
      "/repo/content/de/drafts",
      "/repo/content/de/deck.json",
      "/repo/content/de/word-list.tsv",
      "/repo/content/de/art",
      "/repo/public/deck-de",
      "/deck-de/",
      "/repo/lib/deck/fixture-de.json",
    ]);
    // Shared by both: the caches, the style guide and model sheets.
    expect([de.cache, de.sharedArt]).toEqual(["/repo/content/.cache", "/repo/content/art"]);
  });

  it("reads each language's unit plan and tip list", () => {
    const { root } = germanRoot();
    expect(readUnits(root, "de")).toEqual(UNITS);
    expect(readTips(root, "de")).toEqual(TIPS);
  });
});

describe("Spanish runs are unchanged", () => {
  const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);

  it("sends Claude the same prompts and schemas as before DE5", () => {
    // Recorded from the passes before DE5 made them per language.
    expect({
      draft: [hash(DRAFT_REQUESTS.es.system), hash(DRAFT_REQUESTS.es.schema)],
      form: [hash(FORM_REQUESTS.es.system), hash(FORM_REQUESTS.es.schema)],
      phrase: [hash(PHRASE_REQUESTS.es.system), hash(PHRASE_REQUESTS.es.schema)],
      review: [hash(REVIEW_SYSTEMS.es), hash(REVIEW_SCHEMA)],
      tag: [hash(TAG_SYSTEMS.es), hash(TAG_SCHEMA)],
      tip: [hash(TIP_REQUESTS.es.system), hash(TIP_REQUESTS.es.schema)],
      example: [hash(EXAMPLE_SYSTEM_PROMPT), hash(EXAMPLE_SCHEMA)],
      cast: [hash(CAST_SYSTEM), hash(CAST_SCHEMA)],
    }).toEqual({
      draft: ["cc40aea658adfabe", "04c942f4f7b4735e"],
      form: ["4853a98ca0d15db7", "af7de1409d901713"],
      phrase: ["19060ba5797f8224", "dff41ee9965f998f"],
      review: ["139462dd8c77df68", "ef96241f634907c3"],
      tag: ["7827cfa32c3ab2af", "a780d5676d0e29e0"],
      tip: ["5fb23575ea6cd50c", "474f0c0d46915285"],
      example: ["fa44fcce64d85b7a", "fc3f6249dfc36804"],
      cast: ["9994ffdc19c85d73", "2e86d0ed21d71216"],
    });
  });

  it("takes the voice from lang/es.ts with the hash inputs in the same order, so no clip path changes", () => {
    expect(VOICE).toEqual(LANGS.es.voice);
    expect(Object.keys(voiceOf("es"))).toEqual(["model", "voice", "instructions"]);
    expect(voiceOf("de")).toEqual(LANGS.de.voice);
  });

  it("keeps the Spanish mascot files and lets only Spanish write them", () => {
    const es = mascotPaths("/repo");
    expect(es).toEqual({
      art: "/repo/content/art/mascot",
      cache: "/repo/content/.cache/mascot",
      cutout: "/repo/content/art/cast/concha-cutout.webp",
      idle: { clip: "/repo/public/mascot/idle.mp4", poster: "/repo/public/mascot/idle.webp" },
      celebrate: { clip: "/repo/public/mascot/celebrate.mp4", poster: "/repo/public/mascot/celebrate.webp" },
      still: "/repo/public/mascot/concha.webp",
    });
    expect(sharedMascotFiles("es")).toEqual([]);
    // German's are the concha's until DE14, so `npm run mascot -- --lang de` refuses.
    expect(sharedMascotFiles("de")).toHaveLength(5);
    expect(mascotPaths("/repo", "de").art).toBe("/repo/content/de/art/mascot");
  });
});

describe("German's prompts and rules (DE7)", () => {
  it("has written prompts the scripts send, and its word-list sources (DE6)", () => {
    expect(PROMPTS_READY).toEqual({ es: true, de: true });
    const systems = [
      DRAFT_REQUESTS.de.system,
      FORM_REQUESTS.de.system,
      PHRASE_REQUESTS.de.system,
      REVIEW_SYSTEMS.de,
      TAG_SYSTEMS.de,
      TIP_REQUESTS.de.system,
      EXAMPLE_REQUESTS.de.system,
    ];
    for (const system of systems) {
      expect(system).toMatch(/German/);
      expect(system).not.toMatch(/Spanish words|Latin American|Stand-in/);
    }
    // The tag prompt's limit on a contrast line is the guard's.
    expect(TAG_SYSTEMS.de).toContain(`under ${WHY_MAX} characters`);
    expect(Object.values(SOURCES_BY_LANG.de).map((s) => s.file)).toEqual([
      "de_50k.txt",
      "lemmatization-de.txt",
      "de_DE_frami.dic",
    ]);
  });

  it("lists German's ten form verbs, with ids the validator takes", () => {
    const verbs = FORM_VERBS_BY_LANG.de;
    expect(verbs.map((v) => v.verb)).toEqual(["sein", "haben", "werden", "können", "müssen", "wollen", "möchten", "gehen", "kommen", "wissen"]);
    for (const v of verbs) {
      expect(v.persons).toEqual(["ich", "du", "er"]);
      for (const person of v.persons) expect(formId(v.verb, person, "de")).toMatch(GERMAN_FORM_ID);
      expect(idProblem(formId(v.verb, "ich", "de"), v.verb, 1, "form", "de")).toBeNull();
    }
    expect(formId("möchten", "du", "de")).toBe("moechten-form-du");
    expect(formId("ir", "yo")).toBe("ir-form-yo");
  });

  it("spells German ids with ae, oe, ue and ss, and leaves Spanish's as they were", () => {
    expect(slug("schön", "de")).toBe("schoen");
    expect(slug("schon", "de")).toBe("schon");
    expect(slug("weiß", "de")).toBe("weiss");
    expect(slug("Straße", "de")).toBe("strasse");
    expect(slug("Mädchen", "de")).toBe("maedchen");
    expect(slug("pingüino")).toBe("pinguino");
    expect(slug("más")).toBe("mas");
    expect(idProblem("koennen-can", "können", 17, undefined, "de")).toBeNull();
    expect(idProblem("konnen-can", "können", 17, undefined, "de")).toMatch(/must start with "koennen-"/);
  });

  it("has German's skip reasons: regional-only in place of spain-only", () => {
    expect(SKIP_REASONS_BY_LANG.es).toEqual(SKIP_REASONS);
    expect(SKIP_REASONS_BY_LANG.de).toContain("regional-only");
    expect(SKIP_REASONS_BY_LANG.de).not.toContain("spain-only");
    const entry = { rank: 500, word: "Jänner", forms: [] };
    const skip = (reason: string) => ({ skip: { reason, note: "n" }, cards: [] });
    expect(guardDraft(skip("regional-only"), entry, "de")).toMatchObject({ ok: true, skip: { reason: "regional-only" } });
    expect(guardDraft(skip("spain-only"), entry, "de")).toMatchObject({ ok: false, fields: ["skip"] });
    expect(guardDraft(skip("regional-only"), entry, "es")).toMatchObject({ ok: false, fields: ["skip"] });
  });

  it("ranks a phrase's words in lower case, so a noun's capital does not matter", () => {
    const ranks = wordRanks([
      { rank: 3, word: "ich", forms: [] },
      { rank: 532, word: "Kaffee", forms: [] },
      { rank: 90, word: "morgen", forms: [] },
      { rank: 400, word: "Morgen", forms: [] },
    ]);
    expect(ranks.get("kaffee")).toBe(532);
    expect(ranks.get("morgen")).toBe(90);
  });

  it("counts German cognates and number words as German writes them", () => {
    expect(isCognate("Kaffee", "A coffee, please.", "de")).toBe(true);
    expect(isCognate("Doktor", "He is a doctor.", "de")).toBe(true);
    expect(isCognate("Universität", "The university is big.", "de")).toBe(true);
    expect(isCognate("Familie", "My family is here.", "de")).toBe(true);
    expect(isCognate("Telefon", "Where is the telephone?", "de")).toBe(true);
    expect(isCognate("Musik", "I like music.", "de")).toBe(true);
    expect(isCognate("Hotel", "The hotel is there.", "de")).toBe(true);
    expect(isCognate("Information", "Thanks for the information.", "de")).toBe(true);
    expect(isCognate("Banane", "A banana.", "de")).toBe(true);
    expect(isCognate("Vater", "My father is here.", "de")).toBe(false);
    expect(isCognate("Haus", "The house is big.", "de")).toBe(false);
    // Spanish's rule is unchanged.
    expect(isCognate("problema", "It is a problem.")).toBe(true);
    expect(isCognate("Kaffee", "A coffee, please.")).toBe(false);
    expect(numberWords("de").has("zwölf")).toBe(true);
    expect(numberWords("de").has("ein")).toBe(false);
    expect(numberWords("es").has("doce")).toBe(true);
  });

  it("checks German form ids by ich, du and er", () => {
    expect(idProblem("gehen-form-ich", "gehen", 40, "form", "de")).toBeNull();
    expect(idProblem("gehen-form-yo", "gehen", 40, "form", "de")).toBe('must be "gehen-form-" and ich, du or er');
    expect(idProblem("ir-form-ich", "ir", 40, "form")).toBe('must be "ir-form-" and yo, tu or el');
  });
});

describe("the passes on the German fixture, with a fake runner", () => {
  async function draftAll() {
    const { root, paths } = germanRoot();
    const drafts = new DraftStore(paths.drafts, "de");
    const { runner, calls } = fakeRunner(["der Mann"]);
    const run = { ...options, store: drafts, runner };
    const words = await draftWords(ENTRIES, run);
    const verbs = [{ verb: "gehen", card: "gehen-go", persons: ["ich" as const, "du" as const, "er" as const] }];
    const forms = await draftForms(formJobs(drafts, UNITS, undefined, verbs).jobs, run);
    const phrases = await draftPhrases(phraseJobs(UNITS).jobs, wordRanks(ENTRIES), run);
    return { root, paths, drafts, runner, calls, summaries: { words, forms, phrases } };
  }

  it("drafts German word, form and phrase cards into content/de/drafts with German's schemas", async () => {
    const { drafts, calls, summaries } = await draftAll();
    expect([summaries.words.drafted, summaries.forms.drafted, summaries.phrases.drafted]).toEqual([8, 1, 1]);
    expect(calls[0].schema).toBe(DRAFT_REQUESTS.de.schema);
    expect(calls[0].system).toBe(germanDraftSystem([]));
    expect(calls[0].system.startsWith(GERMAN_DRAFT_SYSTEM)).toBe(true);
    expect(drafts.deckProblems()).toEqual([]);

    const read = (id: string) => JSON.parse(readFileSync(path.join(drafts.cardsDir, `${id}.json`), "utf8")) as DraftCard<"de">;
    for (const id of WORD_CARDS) {
      const card = read(id);
      expect(validateDraftCard(card, "de").ok, id).toBe(true);
      const { unit, requires, tip, why, image, audio, ...want } = fixtureCard(id);
      void [unit, requires, tip, why, image, audio];
      expect(card, id).toMatchObject(want);
      // Media paths are German's own until reuse by meaning (DE13).
      expect(card.audio.word).toBe(`/deck-de/audio/${id}.word.mp3`);
      if (card.image) expect(card.image).toBe(`/deck-de/img/${id}.webp`);
    }
    expect(read("januar-january").regional).toEqual({ where: "Austria", text: "der Jänner" });
    expect(read("anrufen-call").grammar).toMatchObject({ separable: true, present: { ich: "rufe an" } });

    const form = read("gehen-form-ich");
    expect(form).toMatchObject({ kind: "form", target: "ich gehe", image: "/deck-de/img/gehen-go.webp" });
    expect(read("gehen-form-er").target).toBe("er geht");
    expect(read("phrase-how-are-you")).toMatchObject({ kind: "phrase", target: "Wie geht's?", rank: 40 });
  });

  it("refuses a German answer with a Spanish region, naming the field", async () => {
    const { paths } = germanRoot();
    const drafts = new DraftStore(paths.drafts, "de");
    const bad = { ...claudeCard(fixtureCard("januar-january")), regional: { where: "Spain", text: "enero" } };
    const runner: Runner = async () => answer({ skip: null, cards: [bad] });
    const summary = await draftWords([{ rank: 900, word: "januar", forms: [] }], { ...options, store: drafts, runner, retries: 0 });
    expect(summary.failed).toBe(1);
    const failed = readFileSync(path.join(drafts.dir, "usage.jsonl"), "utf8");
    expect(JSON.parse(failed.trim()).fields).toEqual(["regional.where"]);
  });

  it("reviews, decides, tags, drafts the tip and builds a German deck", async () => {
    const { root, paths, drafts, runner } = await draftAll();
    const reviews = new ReviewStore(paths.review);
    const reviewed = await reviewCards(allDrafted(drafts), { ...options, drafts, store: reviews, runner });
    // mann-man fails the grammar check; the phrase is flagged for "wie", not in the word list.
    expect([reviewed.passed, reviewed.flagged]).toEqual([10, 2]);

    const flagged = refreshFlagged(drafts, reviews);
    expect(flagged.waiting.sort()).toEqual(["mann-man", "phrase-how-are-you"]);
    const decision = readFileSync(decisionPath(reviews, "mann-man"), "utf8");
    expect(decision).toMatch(/^plural: +die Männer$/m);
    expect(decision).toContain("# Then run: npm run deck -- --lang de");
    expect(readDecision(reviews, "mann-man", "de")!.errors).toEqual([]);
    // Approved with a corrected plural.
    writeFileSync(
      decisionPath(reviews, "mann-man"),
      decision.replace("decision: pending", "decision: approve").replace(/^plural: +die Männer$/m, "plural: die Männer"),
    );
    expect(readFileSync(reviews.flaggedFile, "utf8")).toContain("content/de/review/decisions/");

    const tags = new TagStore(paths.tags);
    const groups = tagGroups(drafts);
    const ctx = tagContext(groups, readUnits(root, "de"), readTips(root, "de"), "de");
    const tagged = await tagCards(groups, ctx, { ...options, store: tags, runner });
    expect(tagged.failed).toBe(0);

    const tipStore = new TipStore(paths.tips, "de");
    await draftTips(tipJobs(TIPS, UNITS), { ...options, store: tipStore, runner });
    const tipFile = tipStore.file("tip-accusative");
    writeFileSync(tipFile, readFileSync(tipFile, "utf8").replace("status: pending", "status: approve"));
    const tips = tipsForDeck(tipStore, TIPS);
    expect(tips.tips.map((t) => t.id)).toEqual(["tip-accusative"]);

    const build = buildDeck(drafts, reviews, null, { plan: { units: UNITS, tipList: TIPS, tags }, tips: tips.tips, lemmas: null });
    expect(build.orderProblems).toEqual([]);
    expect(build.deckProblems).toEqual([]);
    const deck = build.deck as Deck<"de">;
    expect(deck.lang).toBe("de");
    expect(validateDeck(deck, "de").ok).toBe(true);
    expect(validateDeck(deck, "es").ok).toBe(false);
    expect(build.waiting).toEqual(["phrase-how-are-you"]);
    expect(deck.cards.slice(0, 2).map((c) => c.id)).toEqual(["gehen-go", "mann-man"]);
    for (const card of deck.cards) {
      expect(card.audio).toEqual(audioPaths(card, {}, "de"));
      expect(card.audio.word).toMatch(/^\/deck-de\/audio\//);
    }
    expect(deck.tips[0].examples[0].audio).toMatch(/^\/deck-de\/audio\/tip-accusative\.1\.[0-9a-f]{8}\.mp3$/);
  });
});

describe("audio, art and mascot for German", () => {
  it("names German clips under /deck-de/audio with German's voice", () => {
    const card = fixtureCard("gehen-go");
    const de = audioPaths(card, {}, "de");
    const es = audioPaths(card);
    expect(de.word).toMatch(/^\/deck-de\/audio\/gehen-go\.word\.[0-9a-f]{8}\.mp3$/);
    expect(es.word).toMatch(/^\/deck\/audio\//);
    // A different voice is a different clip.
    expect(de.word.split(".").at(-2)).not.toBe(es.word.split(".").at(-2));
    expect(rawKey("Hallo", 1, "de")).not.toBe(rawKey("Hallo"));
    const tip = tipAudioPaths(fixtureDeckDe.tips[0], {}, "de");
    expect(tip.examples[1].audio).toMatch(/^\/deck-de\/audio\/tip-accusative\.2\./);
    expect(orphanClips(["gehen-go.word.aaaa.mp3"], [{ cards: [{ audio: { word: "/deck-de/audio/gehen-go.word.aaaa.mp3" } }] }], "de")).toEqual([]);
  });

  it("works on German's own stills only, from content/de/art", () => {
    const { root, paths } = germanRoot();
    writeFileSync(paths.deck, JSON.stringify(fixtureDeckDe));
    const p = artPaths(root, "de");
    expect([p.cast, p.review, p.stills, p.style]).toEqual([
      path.join(root, "content", "de", "art", "cast.tsv"),
      path.join(root, "content", "de", "art", "review.tsv"),
      path.join(root, "content", "de", "art", "stills"),
      path.join(root, "content", "art", "style.md"),
    ]);
    expect(p.cache).toBe(path.join(root, "content", ".cache", "art-de"));
    // haus-house and gehen-go reuse Spanish stills by their Spanish paths: Spanish's to render.
    expect(readStills(p).map((s) => s.id)).toEqual(["sein-be", "mann-man", "frau-woman", "anrufen-call", "gut-good", "januar-january"]);
    expect(existsSync(p.cast)).toBe(false);
  });
});

describe("sameAs: the Spanish card of the same meaning (DE7)", () => {
  const SPANISH: SpanishMeaning[] = [
    { id: "ir-go", en: "to go", hint: null },
    { id: "casa-house", en: "house", hint: null },
  ];
  const entry = { rank: 40, word: "gehen", forms: ["gehen"] };
  const gehen = (sameAs: string | null) => ({ skip: null, cards: [{ ...claudeCard(fixtureCard("gehen-go")), sameAs }] });

  async function draftGehen(sameAs: string | null) {
    const { paths } = germanRoot();
    const drafts = new DraftStore(paths.drafts, "de");
    const calls: DraftRequest[] = [];
    const runner: Runner = async (request) => {
      calls.push(request);
      return answer(gehen(sameAs));
    };
    const summary = await draftWords([entry], { ...options, store: drafts, runner, retries: 0, spanish: SPANISH });
    return { paths, drafts, calls, summary };
  }

  it("gives the word pass the Spanish cards and keeps each card's sameAs in the word file, not the card", async () => {
    const { drafts, calls, summary } = await draftGehen("ir-go");
    expect(summary.drafted).toBe(1);
    expect(calls[0].system).toBe(germanDraftSystem(SPANISH));
    expect(calls[0].system).toContain("- ir-go | to go");
    const word = JSON.parse(readFileSync(drafts.wordFile(40), "utf8"));
    expect(word.sameAs).toEqual({ "gehen-go": "ir-go" });
    const card = JSON.parse(readFileSync(path.join(drafts.cardsDir, "gehen-go.json"), "utf8"));
    expect(card).not.toHaveProperty("sameAs");
    expect(validateDraftCard(card, "de").ok).toBe(true);
    expect(draftedWords(drafts)[0].sameAs).toEqual({ "gehen-go": "ir-go" });
  });

  it("refuses a sameAs that is not a Spanish card's id", async () => {
    const { drafts, summary } = await draftGehen("ir-walk");
    expect(summary.failed).toBe(1);
    expect(JSON.parse(readFileSync(drafts.logFile, "utf8").trim()).fields).toEqual(["sameAs"]);
    expect(guardDraft(gehen(null), entry, "de")).toMatchObject({ ok: true, sameAs: [null] });
    // A Spanish word file has no sameAs.
    expect(guardDraft({ skip: null, cards: [] }, entry, "es")).toMatchObject({ ok: false });
  });

  it("has the reviewer check sameAs, flag it with its own reason and back-translate as target", async () => {
    const { paths, drafts } = await draftGehen("casa-house");
    const reviews = new ReviewStore(paths.review);
    const calls: DraftRequest[] = [];
    const check = { ok: true, problem: null, fix: null };
    const runner: Runner = async (request) => {
      calls.push(request);
      return answer({
        back: { target: "to go", example: "I'm going home." },
        checks: {
          meaning: check,
          oneAnswer: check,
          grammar: check,
          usage: { ok: false, problem: "Not said in Germany.", fix: null },
          example: check,
          trick: check,
          sameAs: { ok: false, problem: "casa-house means house.", fix: "ir-go" },
        },
        note: null,
      });
    };
    const summary = await reviewCards(draftedWords(drafts), { ...options, drafts, store: reviews, runner, spanish: SPANISH });
    expect(summary.reasons).toEqual({ usage: 1, sameAs: 1 });
    expect(calls[0].schema).toBe(REVIEW_SCHEMAS.de);
    expect(calls[0].system).toContain("- casa-house | house");
    expect(calls[0].prompt).toContain('sameAs: casa-house, the Spanish card "house".');
    const review = reviews.get("gehen-go")!;
    expect(review.back).toEqual({ target: "to go", example: "I'm going home." });

    refreshFlagged(drafts, reviews);
    const decision = readFileSync(decisionPath(reviews, "gehen-go"), "utf8");
    expect(decision).toContain(`#   - ${reasonLabel("sameAs", "de")}: casa-house means house. Suggested fix: ir-go`);
    expect(decision).toContain("#   - Usage in Germany: Not said in Germany.");
    expect(decision).toContain("# sameAs is not a card line: correct it in content/de/drafts/words/0040.json.");
    expect(readFileSync(reviews.flaggedFile, "utf8")).toContain('answer "to go"');
    expect(reasonLabel("usage")).toBe("Latin American usage");
  });
});
