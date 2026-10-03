import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { DraftCard } from "@/lib/deck/types";
import type { CallResult, DraftRequest, Runner } from "./claude";
import { DraftStore, withMedia, writeJson } from "./drafting";
import { setup, testCards, usage, words } from "./review-fixture";
import { cardHash } from "./reviewing";
import {
  checkTags,
  guardTags,
  TAG_SCHEMA,
  TAG_SYSTEM_PROMPT,
  tagCards,
  tagContext,
  tagGroups,
  tagProblems,
  tagPrompt,
  TagStore,
  WHY_MAX,
  type Tag,
  type TagContext,
  type TagFile,
  type TagGroup,
  type TagOptions,
} from "./tagging";
import { readTips, readUnits, type TipEntry, type Unit } from "./units";

const ROOT = path.join(__dirname, "..", "..");

const units: Unit[] = [
  {
    id: "home",
    title: "Home",
    goal: "talk about your house.",
    tip: "tip-el-la",
    wants: ["casa", "phrase: mi casa = my house", "tener: I have (tengo)"],
    payoff: ["Good house"],
  },
  { id: "later", title: "Later", goal: "say what is good.", tip: null, wants: ["bueno"], payoff: [] },
];

const tips: TipEntry[] = [
  { id: "tip-el-la", title: "Every noun is el or la", about: "Learn the article with the noun." },
  { id: "tip-por-para", title: "Por and para", about: "Two words for for." },
];

const base = { hint: null, spain: null, trick: null };
const tenerForm = withMedia({
  ...base,
  id: "tener-form-yo",
  rank: 13,
  kind: "form",
  pos: "verb",
  es: "tengo",
  en: "I have",
  grammar: { present: { yo: "tengo", tu: "tienes", el: "tiene" }, irregular: true },
  image: "/deck/img/tener-have.webp",
  example: { es: "Tengo una casa.", en: "I have a house." },
}) as unknown as DraftCard;
const phrase = (id: string, es: string, en: string, rank: number) =>
  withMedia({ ...base, id, rank, kind: "phrase", pos: "phrase", es, en, grammar: null, example: { es: `${es}.`, en: `${en}.` } }) as unknown as DraftCard;
const myHouse = phrase("phrase-my-house", "mi casa", "my house", 90);
const goodHouse = phrase("phrase-good-house", "buena casa", "good house", 90);

/** The review fixture's five word cards, tener's yo form card and the home unit's two phrase cards. */
function world() {
  const { dir, drafts } = setup();
  drafts.saveGroup("form", "tener", [tenerForm], { rank: 13, word: "tener", verb: "tener", source: "tener-have" });
  drafts.saveGroup("phrase", myHouse.id, [myHouse], {
    rank: 90,
    word: "home",
    unit: "home",
    order: 0,
    source: "chunk",
    line: "phrase: mi casa = my house",
    words: [{ word: "mi", rank: 20 }, { word: "casa", rank: 90 }],
    outside: [],
  });
  drafts.saveGroup("phrase", goodHouse.id, [goodHouse], {
    rank: 90,
    word: "home",
    unit: "home",
    order: 1,
    source: "payoff",
    line: "Good house",
    words: [{ word: "bueno", rank: 39 }, { word: "casa", rank: 90 }],
    outside: [],
  });
  const groups = tagGroups(drafts);
  const ctx = tagContext(groups, units, tips);
  const store = new TagStore(path.join(dir, "tags"));
  return { dir, drafts, groups, ctx, store };
}

/** What the fake tagger answers for each card; anything not listed is in no unit and needs nothing. */
const GOOD: Record<string, Partial<Tag>> = {
  "casa-house": { unit: "home", want: "casa", tip: "tip-el-la" },
  "tener-form-yo": { unit: "home", want: "tener: I have (tengo)", why: "Use tengo for what you have." },
  "bueno-good": { unit: "later", want: "bueno" },
  // Claude's unit and want for a phrase card are replaced by the plan's.
  "phrase-my-house": { unit: "later", want: null },
  "phrase-good-house": { requires: ["bueno-good", "casa-house"] },
};

/** The ids of the cards a request asks about: the JSON lines after "Tag these cards". */
const askedIds = (prompt: string) =>
  prompt
    .slice(prompt.indexOf("Tag these cards"))
    .split("\n")
    .filter((line) => line.startsWith("{"))
    .map((line) => (JSON.parse(line) as DraftCard).id);

const answer = (table: Record<string, Partial<Tag>>) => (request: DraftRequest) => ({
  cards: askedIds(request.prompt).map((id) => ({ id, unit: null, want: null, requires: [], tip: null, why: null, ...table[id] })),
});

function fakeTagger(respond: (request: DraftRequest) => unknown = answer(GOOD)) {
  const requests: DraftRequest[] = [];
  const runner: Runner = async (request) => {
    requests.push(request);
    return { ok: true, output: respond(request), usage } satisfies CallResult;
  };
  return { runner, requests };
}

function options(store: TagStore, runner: Runner, extra: Partial<TagOptions> = {}): TagOptions {
  return { store, runner, via: "cli", model: "claude-opus-5-5", effort: "medium", print: () => {}, sleep: async () => {}, ...extra };
}

const group = (groups: TagGroup[], label: string) => groups.find((g) => g.label === label)!;

describe("tag groups and the prompt", () => {
  it("make one group per drafted word, verb and unit, with each phrase card's place in the plan", () => {
    const { groups } = world();
    expect(groups.map((g) => [g.label, g.cards.map((c) => c.id)])).toEqual([
      ["#2 de", ["de-of"]],
      ["#13 tener", ["tener-have", "tener-have-to"]],
      ["#39 bueno", ["bueno-good"]],
      ["#90 casa", ["casa-house"]],
      ["forms tener", ["tener-form-yo"]],
      ["phrases home", ["phrase-my-house", "phrase-good-house"]],
    ]);
    expect(group(groups, "phrases home").phrases).toEqual({
      "phrase-my-house": { unit: "home", want: "phrase: mi casa = my house", words: ["mi", "casa"] },
      "phrase-good-house": { unit: "home", want: null, words: ["bueno", "casa"] },
    });
  });

  it("give the plan, the tips and every card first, the same in every call, then the group's cards without media", () => {
    const { groups, ctx } = world();
    const prompts = groups.map((g) => tagPrompt(g, ctx));
    const prefix = (p: string) => p.slice(0, p.indexOf("Tag these cards"));
    expect(new Set(prompts.map(prefix)).size).toBe(1);
    const head = prefix(prompts[0]);
    expect(head).toContain('Unit 1: home, "Home". Now you can talk about your house. Introduces tip: tip-el-la. Holds at most 12 cards.');
    expect(head).toContain("  - tener: I have (tengo)");
    expect(head).toContain("  - Good house");
    expect(head).toContain("- tip-por-para: Por and para. Two words for for.");
    for (const card of ctx.cards) expect(head).toContain(`- ${card.id} | `);
    expect(head).toContain("- tener-have | to have (own) | tener");

    const tener = prompts[1];
    expect(tener).toContain('The cards of the word "tener" (rank 13 in the frequency list)');
    expect(askedIds(tener)).toEqual(["tener-have", "tener-have-to"]);
    expect(tener.slice(tener.indexOf("Tag these cards"))).not.toContain("/deck/");

    const phrases = prompts[5];
    expect(phrases).toContain("each one's unit is fixed");
    expect(phrases).toContain("A survival chunk of unit home. Its words: mi, casa.");
    expect(phrases).toContain("A payoff phrase of unit home. Its words: bueno, casa.");
    expect(prompts[4]).toContain('The form cards of the verb "tener"');
  });

  it("ask for unit, want, requires, tip and why per card, and say how to choose each", () => {
    const item = (TAG_SCHEMA.properties as { cards: { items: { required: string[] } } }).cards.items;
    expect(item.required).toEqual(["id", "unit", "want", "requires", "tip", "why"]);
    for (const words of ["survival chunk", "requires nothing", "pronoun", "earliest unit", "at least its first", "ser and estar", `under ${WHY_MAX} characters`]) {
      expect(TAG_SYSTEM_PROMPT).toContain(words);
    }
  });

  it("build from the committed drafts and plan: every drafted card in one group", () => {
    const drafts = new DraftStore(path.join(ROOT, "content", "drafts"));
    const groups = tagGroups(drafts);
    const ctx = tagContext(groups, readUnits(ROOT), readTips(ROOT));
    expect(ctx.cards.map((c) => c.id).sort()).toEqual(drafts.cards().map((c) => c.id).sort());
    expect(new Set(ctx.cards.map((c) => c.id)).size).toBe(ctx.cards.length);
    expect(tagPrompt(groups[0], ctx)).toContain("Unit 18:");
  });
});

describe("a tag run with the fake tagger", () => {
  it("writes one tag per card for its draft, one call per group, with the phrase cards' places from the plan", async () => {
    const { groups, ctx, store } = world();
    const { runner, requests } = fakeTagger();
    const print: string[] = [];
    const summary = await tagCards(groups, ctx, options(store, runner, { print: (l) => print.push(l) }));
    expect(summary).toMatchObject({ words: 6, drafted: 6, failed: 0, cards: 8, calls: 6 });
    expect(requests.every((r) => r.system === TAG_SYSTEM_PROMPT && r.schema === TAG_SCHEMA)).toBe(true);
    expect(print).toContain("phrases home: phrase-my-house, phrase-good-house");

    const tag = store.read("casa-house")!;
    expect(tag).toMatchObject({ id: "casa-house", unit: "home", want: "casa", requires: [], tip: "tip-el-la", group: "#90 casa", via: "cli" });
    expect(tag.draft).toBe(cardHash(ctx.cards.find((c) => c.id === "casa-house")!));
    expect(tag.taggedAt).toMatch(/^\d{4}-/);
    expect(Object.keys(JSON.parse(readFileSync(store.file("casa-house"), "utf8")))).not.toContain("draftedAt");
    expect(store.read("phrase-my-house")).toMatchObject({ unit: "home", want: "phrase: mi casa = my house" });
    expect(store.read("phrase-good-house")).toMatchObject({ unit: "home", want: null, requires: ["bueno-good", "casa-house"] });
    expect(store.read("de-of")).toMatchObject({ unit: null, want: null, requires: [], tip: null, why: null });
    expect(store.read("tener-form-yo")).toMatchObject({ why: "Use tengo for what you have." });

    const usageLines = readFileSync(store.logFile, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    expect(usageLines.map((l) => l.word ?? `${l.group} ${l.name}`)).toEqual(["de", "tener", "bueno", "casa", "form tener", "phrase home"]);

    expect(checkTags(store, ctx)).toEqual({ tagged: 8, untagged: [], stale: [], problems: [] });
  });

  it("resumes with no calls, retags everything with --redo, and retags only a redrafted card's group", async () => {
    const { dir, drafts, ctx, store, groups } = world();
    await tagCards(groups, ctx, options(store, fakeTagger().runner));

    const again = fakeTagger();
    const resumed = await tagCards(groups, ctx, options(store, again.runner));
    expect(again.requests).toHaveLength(0);
    expect(resumed.alreadyDrafted).toBe(6);

    const redo = fakeTagger();
    await tagCards(groups, ctx, options(store, redo.runner, { redo: true }));
    expect(redo.requests).toHaveLength(6);

    // bueno is redrafted with a new example: its tag is for an earlier draft until bueno is tagged again.
    const [bueno] = testCards().bueno;
    drafts.saveWord(words.bueno, [{ ...bueno, example: { es: "Es bueno.", en: "It's good." } }], null, { via: "cli" });
    const fresh = new DraftStore(path.join(dir, "drafts"));
    const groups2 = tagGroups(fresh);
    const ctx2 = tagContext(groups2, units, tips);
    expect(checkTags(store, ctx2)).toMatchObject({ tagged: 7, stale: ["bueno-good"] });
    const after = fakeTagger();
    await tagCards(groups2, ctx2, options(store, after.runner));
    expect(after.requests.map((r) => askedIds(r.prompt))).toEqual([["bueno-good"]]);
    expect(checkTags(store, ctx2)).toMatchObject({ tagged: 8, stale: [] });
  });

  it("asks again when the checks refuse an answer, and keeps the refused one aside", async () => {
    const { groups, ctx, store } = world();
    let calls = 0;
    const { runner, requests } = fakeTagger((request) => {
      calls++;
      return answer(calls === 1 ? { "casa-house": { requires: ["casa-house"] } } : GOOD)(request);
    });
    const casa = [group(groups, "#90 casa")];
    const summary = await tagCards(casa, ctx, options(store, runner));
    expect(requests).toHaveLength(2);
    expect(summary).toMatchObject({ drafted: 1, failedCalls: 1 });
    expect(existsSync(path.join(store.failedDir, "0090-1.json"))).toBe(true);
    expect(store.read("casa-house")!.requires).toEqual([]);
    const log = readFileSync(store.logFile, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    expect(log[0]).toMatchObject({ ok: false, error: "invalid", fields: ["requires"] });
  });
});

describe("the checks", () => {
  const guard = (ctx: TagContext, g: TagGroup, cards: unknown[]) => guardTags({ cards }, g, ctx);
  const one = (id: string, tag: Partial<Record<keyof Tag, unknown>>) => ({ id, unit: null, want: null, requires: [], tip: null, why: null, ...tag });

  it("refuse an unknown or missing card, an unknown required id, a card requiring itself or one card twice", () => {
    const { groups, ctx } = world();
    const tener = group(groups, "#13 tener");
    const fields = (cards: unknown[]) => {
      const result = guard(ctx, tener, cards);
      return result.ok ? [] : result.fields;
    };
    expect(fields([one("tener-have", {}), one("tener-have-to", { requires: ["tener-have"] })])).toEqual([]);
    expect(fields([one("tener-have", {})])).toEqual(["cards"]);
    expect(fields([one("tener-have", {}), one("tener-have", {}), one("tener-have-to", {})])).toEqual(["id"]);
    expect(fields([one("tener-have", {}), one("tener-have-to", {}), one("casa-house", {})])).toEqual(["id"]);
    expect(fields([one("tener-have", { requires: ["nope-none"] }), one("tener-have-to", {})])).toEqual(["requires"]);
    expect(fields([one("tener-have", { requires: ["tener-have"] }), one("tener-have-to", {})])).toEqual(["requires"]);
    expect(fields([one("tener-have", { requires: ["de-of", "de-of"] }), one("tener-have-to", {})])).toEqual(["requires"]);
    expect(fields([one("tener-have", { requires: "de-of" }), one("tener-have-to", {})])).toEqual(["requires"]);
    expect(guardTags({ tags: [] }, tener, ctx)).toEqual({ ok: false, kind: "shape", fields: [] });
  });

  it("refuse a unit or tip not in the plan, and a want that is not the unit's", () => {
    const { groups, ctx } = world();
    const casa = group(groups, "#90 casa");
    const fields = (tag: Partial<Tag>) => {
      const result = guard(ctx, casa, [one("casa-house", tag)]);
      return result.ok ? [] : result.fields;
    };
    expect(fields({ unit: "home", want: "casa", tip: "tip-el-la" })).toEqual([]);
    expect(fields({ unit: "home", want: null })).toEqual([]);
    expect(fields({ unit: "nowhere" })).toEqual(["unit"]);
    expect(fields({ tip: "tip-nope" })).toEqual(["tip"]);
    expect(fields({ unit: "later", want: "casa" })).toEqual(["want"]);
    expect(fields({ unit: null, want: "casa" })).toEqual(["want"]);
    expect(fields({ unit: " home ", want: "casa", tip: "" })).toEqual([]);
  });

  it("take a why line of one short line, a blank one as none, and refuse a long or broken one", () => {
    const { groups, ctx } = world();
    const casa = group(groups, "#90 casa");
    const result = (tag: Partial<Record<keyof Tag, unknown>>) => guard(ctx, casa, [one("casa-house", tag)]);
    const ok = result({ why: "  Use casa for the building you live in.  " });
    expect(ok.ok && ok.cards[0].why).toBe("Use casa for the building you live in.");
    const blank = result({ why: " " });
    expect(blank.ok && blank.cards[0].why).toBeNull();
    expect(result({ why: "x".repeat(WHY_MAX + 1) })).toMatchObject({ ok: false, fields: ["why"] });
    expect(result({ why: "Two\nlines." })).toMatchObject({ ok: false, fields: ["why"] });
    const ids = new Set(ctx.cards.map((c) => c.id));
    // A tag stored before L9 has no why: it counts as none.
    const old = { id: "casa-house", unit: null, want: null, requires: [], tip: null } as unknown as Tag;
    expect(tagProblems(old, ids, ctx.units, ctx.tips)).toEqual([]);
  });

  it("name each problem with a stored tag by id, including a tag for a card no longer drafted, which a run deletes", async () => {
    const { groups, ctx, store } = world();
    await tagCards(groups, ctx, options(store, fakeTagger().runner));
    const edit = (id: string, change: Partial<TagFile>) => writeJson(store.file(id), { ...store.read(id), ...change });
    edit("casa-house", { unit: "gone", tip: "tip-gone" });
    edit("de-of", { requires: ["de-of", "nope-none"] });
    writeFileSync(store.file("old-card"), JSON.stringify({ id: "old-card", unit: null, want: null, requires: [], tip: null }));

    const check = checkTags(store, ctx);
    expect(check.tagged).toBe(6);
    expect(check.problems).toEqual([
      "de-of: requires itself",
      "de-of: requires nope-none, which is not a drafted card",
      "casa-house: unit gone is not in content/units.json",
      "casa-house: tip tip-gone is not in content/tips.json",
      "old-card: no drafted card",
    ]);
    expect(tagProblems(store.read("casa-house")!, new Set(), units, tips).map((p) => p.field)).toEqual(["unit", "tip"]);

    expect(store.prune(new Set(ctx.cards.map((c) => c.id)))).toEqual(["old-card"]);
    // A tag the checks refuse is tagged again on the next run.
    const again = fakeTagger();
    await tagCards(groups, ctx, options(store, again.runner));
    expect(again.requests.map((r) => askedIds(r.prompt))).toEqual([["de-of"], ["casa-house"]]);
    expect(checkTags(store, ctx)).toEqual({ tagged: 8, untagged: [], stale: [], problems: [] });
    expect(readdirSync(store.dir).filter((f) => f.endsWith(".json"))).toHaveLength(8);
  });
});
