// DE9: German case cards in the pipeline. The case list is the unit plan's `case:` wants; each is drafted with
// one call (answer and prompt fixed by the plan), reviewed and tagged by unit like phrase cards, and ordered
// after the unit's word cards. A fake runner stands in for Claude.

import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { fixtureDeckDe } from "@/lib/deck/fixture";
import type { Card, DraftCard } from "@/lib/deck/types";
import { validateDraftCard } from "@/lib/deck/validate";
import type { CallResult, Runner } from "./claude";
import { DraftStore } from "./drafting";
import { CASE_REQUESTS, caseId, caseJobs, caseTasks, draftCases, guardCase, wordRanks } from "./path-cards";
import { pathOrder } from "./path-order";
import { GERMAN_CASE_SCHEMA, GERMAN_CASE_SYSTEM } from "./prompts-de";
import { allDrafted, draftedCases, idProblem, reviewPrompt } from "./reviewing";
import { guardTags, tagContext, tagGroups, tagPrompt } from "./tagging";
import type { TipEntry, Unit } from "./units";

const usage = { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, costUsd: 0, durationMs: 1, models: ["m"] };
const answer = (output: unknown): CallResult => ({ ok: true, output: structuredClone(output), usage });
const options = { via: "cli", model: "m", effort: "medium" as const, print: () => {}, sleep: async () => {} };

const UNITS: Unit[] = [
  {
    id: "my-people",
    title: "My people",
    goal: "talk about your family.",
    tip: null,
    wants: ["der / die / das: the", "Mann: man", "Freund"],
    payoff: [],
  },
  {
    id: "a-coffee-please",
    title: "A coffee, please",
    goal: "order a coffee.",
    tip: "tip-accusative",
    cap: 6,
    wants: ["sehen", "case: den Mann = I see [the] man", "case: einen Kaffee = [a] coffee, please"],
    payoff: [],
  },
  {
    id: "with-friends",
    title: "With friends",
    goal: "say who you are with.",
    tip: "tip-dative",
    wants: ["mit: with", "case: mit einem Freund = with [a] friend"],
    payoff: [],
  },
];
const TIPS: TipEntry[] = [
  { id: "tip-accusative", title: "The accusative", about: "der becomes den." },
  { id: "tip-dative", title: "The dative", about: "after mit." },
];
const RANKS = wordRanks([
  { rank: 1, word: "der", forms: [] },
  { rank: 3, word: "ein", forms: [] },
  { rank: 30, word: "mit", forms: [] },
  { rank: 60, word: "Mann", forms: [] },
  { rank: 150, word: "Freund", forms: [] },
  { rank: 400, word: "Kaffee", forms: [] },
]);

/** Claude's answer for each case card, by its answer. */
const ANSWERS: Record<string, Record<string, unknown>> = {
  "den Mann": { pos: "determiner", case: "akk", gender: "masculine", from: "der", example: { target: "Ich sehe den Mann.", en: "I see the man." }, words: ["der", "Mann"] },
  "einen Kaffee": { pos: "determiner", case: "akk", gender: "masculine", from: "Ein", example: { target: "Einen Kaffee, bitte.", en: "A coffee, please." }, words: ["ein", "Kaffee"] },
  "mit einem Freund": { pos: "determiner", case: "dat", gender: "masculine", from: "ein", example: { target: "Ich gehe mit einem Freund.", en: "I'm going with a friend." }, words: ["mit", "ein", "Freund"] },
};
const claudeAnswer = (target: string) => ({ hint: null, trick: null, ...ANSWERS[target] });

function fakeRunner() {
  const prompts: string[] = [];
  const runner: Runner = async (request) => {
    prompts.push(request.prompt);
    const target = /^The card's answer: (.+)$/m.exec(request.prompt)?.[1];
    if (!target) throw new Error(`unexpected request: ${request.prompt.slice(0, 40)}`);
    return answer(claudeAnswer(target));
  };
  return { runner, prompts };
}

describe("the case list", () => {
  it("makes ids from the plan's English: case- and four words, brackets and apostrophes dropped", () => {
    expect(caseId("I see [the] man")).toBe("case-i-see-the-man");
    expect(caseId("[a] coffee, please")).toBe("case-a-coffee-please");
    expect(caseId("I'm going to [my] mother's")).toBe("case-im-going-to-my");
    expect(caseId("at [my] brother's")).toBe("case-at-my-brothers");
  });

  it("is the plan's case wants in plan order, each with what the learner has met", () => {
    const { jobs, problems } = caseJobs(UNITS);
    expect(problems).toEqual([]);
    expect(jobs.map((j) => [j.id, j.unit, j.target, j.order])).toEqual([
      ["case-i-see-the-man", "a-coffee-please", "den Mann", 0],
      ["case-a-coffee-please", "a-coffee-please", "einen Kaffee", 1],
      ["case-with-a-friend", "with-friends", "mit einem Freund", 2],
    ]);
    expect(jobs[0].known).toContain("Mann: man");
    expect(jobs[0].known).not.toContain("mit: with");
  });

  it("names two wants that make one id", () => {
    const twice = [{ ...UNITS[1], wants: ["case: den Mann = I see [the] man", "case: einen Mann = I see [the] man"] }];
    expect(caseJobs(twice).problems).toEqual(["case-i-see-the-man: made from a want of a-coffee-please and one of a-coffee-please; reword one"]);
  });

  it("is German only", () => {
    expect(CASE_REQUESTS.es).toBeUndefined();
    expect(CASE_REQUESTS.de).toEqual({ system: GERMAN_CASE_SYSTEM, schema: GERMAN_CASE_SCHEMA });
    const store = new DraftStore(mkdtempSync(path.join(tmpdir(), "cases-es-")));
    expect(() => caseTasks(caseJobs(UNITS).jobs, store, RANKS)).toThrow(/has no case cards/);
  });
});

describe("the case guard", () => {
  const job = caseJobs(UNITS).jobs[0];

  it("takes the answer and prompt from the plan and the grammar from Claude, ranked by its words", () => {
    const { guarded, words } = guardCase(claudeAnswer("den Mann"), job, RANKS);
    expect(guarded.ok).toBe(true);
    const card = (guarded as { cards: DraftCard[] }).cards[0];
    expect(card).toMatchObject({
      id: "case-i-see-the-man",
      kind: "case",
      pos: "determiner",
      target: "den Mann",
      en: "I see [the] man",
      rank: 60,
      grammar: { case: "akk", gender: "m", from: "der" },
      image: null,
      audio: { word: "/deck-de/audio/case-i-see-the-man.word.mp3" },
    });
    expect(validateDraftCard(card, "de").ok).toBe(true);
    expect(words?.outside).toEqual([]);
  });

  it("refuses an example without the answer, a wrong case and a missing gender on an article", () => {
    const bad = (change: Record<string, unknown>) => guardCase({ ...claudeAnswer("den Mann"), ...change }, job, RANKS).guarded;
    expect(bad({ example: { target: "Ich sehe der Mann.", en: "x" } })).toEqual({ ok: false, kind: "invalid", fields: ["example.target"] });
    expect(bad({ case: "gen" })).toEqual({ ok: false, kind: "invalid", fields: ["grammar.case"] });
    expect(bad({ gender: null })).toEqual({ ok: false, kind: "invalid", fields: ["grammar.gender"] });
    expect(bad({ words: ["Zebra"] })).toEqual({ ok: false, kind: "invalid", fields: ["rank", "words"] });
  });
});

describe("case cards through the passes", () => {
  async function drafted() {
    const drafts = new DraftStore(mkdtempSync(path.join(tmpdir(), "cases-de-")), "de");
    const { runner, prompts } = fakeRunner();
    const summary = await draftCases(caseJobs(UNITS).jobs, RANKS, { ...options, store: drafts, runner });
    return { drafts, runner, prompts, summary };
  }

  it("drafts one call per case want into drafts/cases/, and resumes", async () => {
    const { drafts, runner, prompts, summary } = await drafted();
    expect(summary.drafted).toBe(3);
    expect(prompts[0]).toContain("Its English prompt: I see [the] man");
    expect(drafts.deckProblems()).toEqual([]);
    const group = JSON.parse(readFileSync(path.join(drafts.casesDir, "case-i-see-the-man.json"), "utf8"));
    expect(group).toMatchObject({ kind: "case", unit: "a-coffee-please", line: "case: den Mann = I see [the] man", cards: ["case-i-see-the-man"] });
    // The model's capital in `from` is lowered.
    const coffee = JSON.parse(readFileSync(path.join(drafts.cardsDir, "case-a-coffee-please.json"), "utf8"));
    expect(coffee.grammar.from).toBe("ein");
    const again = await draftCases(caseJobs(UNITS).jobs, RANKS, { ...options, store: drafts, runner });
    expect([again.drafted, again.alreadyDrafted, again.calls]).toEqual([0, 3, 0]);
  });

  it("are reviewed and tagged by unit, with the unit and want the plan's", async () => {
    const { drafts } = await drafted();
    const groups = draftedCases(drafts);
    expect(groups.map((g) => [g.kind, g.word, g.cards])).toEqual([
      ["case", "a-coffee-please", ["case-i-see-the-man", "case-a-coffee-please"]],
      ["case", "with-friends", ["case-with-a-friend"]],
    ]);
    expect(allDrafted(drafts).filter((g) => g.kind === "case")).toEqual(groups);
    expect(idProblem("case-i-see-the-man", "a-coffee-please", 60, "case", "de")).toBeNull();
    expect(idProblem("der-the", "a-coffee-please", 60, "case", "de")).toBe('must be "case-" and one to four English words');
    const card = JSON.parse(readFileSync(path.join(drafts.cardsDir, "case-with-a-friend.json"), "utf8"));
    expect(reviewPrompt(card, groups[1], [], "de")).toMatch(/^A case card of the starter path's unit with-friends/);

    const tagged = tagGroups(drafts);
    const coffee = tagged.find((g) => g.kind === "case" && g.name === "a-coffee-please")!;
    expect(coffee.label).toBe("cases a-coffee-please");
    const ctx = tagContext(tagged, UNITS, TIPS, "de");
    expect(tagPrompt(coffee, ctx)).toContain("A case card of unit a-coffee-please. Its words: der, mann.");
    // Claude's unit and want are ignored; requires and tip are its own.
    const output = {
      cards: coffee.cards.map((c) => ({ id: c.id, unit: "my-people", want: null, requires: [], tip: "tip-accusative", why: null })),
    };
    const result = guardTags(output, coffee, ctx);
    expect(result.ok && result.cards.map((t) => [t.unit, t.want])).toEqual([
      ["a-coffee-please", "case: den Mann = I see [the] man"],
      ["a-coffee-please", "case: einen Kaffee = [a] coffee, please"],
    ]);
  });
});

describe("the order", () => {
  const fixture = (id: string) => fixtureDeckDe.cards.find((c) => c.id === id)!;
  const inUnit = (card: Card, rank: number, requires: string[] = []): Card => ({ ...card, unit: "u", rank, requires });

  it("puts a unit's case cards after its word and form cards and before its phrases, whatever their rank", () => {
    const cards = [
      inUnit(fixture("phrase-how-are-you"), 1),
      inUnit(fixture("case-i-see-the-man"), 2, ["mann-man"]),
      inUnit(fixture("mann-man"), 60),
      inUnit(fixture("haus-house"), 300),
    ];
    const order = pathOrder(cards, [{ id: "u", cap: 12 }]);
    expect(order.problems).toEqual([]);
    expect(order.cards.map((c) => c.id)).toEqual(["mann-man", "haus-house", "case-i-see-the-man", "phrase-how-are-you"]);
  });
});
