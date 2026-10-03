import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { fixtureDeck } from "@/lib/deck/fixture";
import { validateDeck } from "@/lib/deck/validate";
import type { CallResult, DraftRequest, Runner } from "./claude";
import { buildDeck, deckText, holdBackForTips } from "./deck-build";
import { draftedWords, reviewCards } from "./reviewing";
import { fakeReviewer, options, setup, usage } from "./review-fixture";
import {
  deckTip,
  draftTips,
  guardTip,
  parseTipFile,
  TIP_SCHEMA,
  TIP_SYSTEM_PROMPT,
  tipFileText,
  tipJobs,
  tipPrompt,
  TipStore,
  tipsForDeck,
  type TipJob,
  type TipOptions,
} from "./tips";
import { readTips, readUnits, type TipEntry, type Unit } from "./units";

const ROOT = path.join(__dirname, "..", "..");

const tipList: TipEntry[] = [
  { id: "tip-no-pronoun", title: "Spanish drops I and you", about: "The ending says who." },
  { id: "tip-two-to-be", title: "Two verbs for to be", about: "Ser for what, estar for how and where." },
  { id: "tip-past", title: "Talking about the past", about: "Fue, tuve and the like." },
];

const units: Unit[] = [
  { id: "me-and-you", title: "Me and you", goal: "say hello.", tip: null, wants: ["yo", "tú"], payoff: [] },
  { id: "who-i-am", title: "Who I am", goal: "say who you are.", tip: "tip-no-pronoun", wants: ["ser: I am (soy)"], payoff: [] },
  { id: "where-i-am", title: "Where I am", goal: "say where you are.", tip: "tip-two-to-be", wants: ["estar: I am (estoy)"], payoff: [] },
];

/** A good answer for any tip: four sentences and two examples. */
const goodAnswer = () => ({
  body: ["First sentence.", "Second: with a colon inside.", "Third sentence.", "Fourth sentence."],
  examples: [
    { es: "Soy Ana.", en: "I'm Ana." },
    { es: "¿Eres de México?", en: "Are you from Mexico?" },
  ],
});

function fakeDrafter(answer: (request: DraftRequest) => unknown = goodAnswer) {
  const requests: DraftRequest[] = [];
  const runner: Runner = async (request) => {
    requests.push(request);
    return { ok: true, output: answer(request), usage } satisfies CallResult;
  };
  return { runner, requests };
}

function tipOptions(store: TipStore, runner: Runner, print: string[] = []): TipOptions {
  return { store, runner, via: "cli", model: "claude-opus-5-5", effort: "medium", print: (l) => print.push(l), sleep: async () => {} };
}

const newStore = () => new TipStore(path.join(mkdtempSync(path.join(tmpdir(), "learn-spanish-tips-test-")), "tips"));

/** Sets a tip file's status line, and replaces whole lines, as a person would. */
function edit(store: TipStore, id: string, status: string, replace: Array<[RegExp, string]> = []) {
  let text = readFileSync(store.file(id), "utf8").replace("status: pending", `status: ${status}`);
  for (const [from, to] of replace) text = text.replace(from, to);
  writeFileSync(store.file(id), text);
}

describe("tip jobs and the prompt", () => {
  it("make one job per tip of the committed list, in order, each placed by its unit", () => {
    const list = readTips(ROOT);
    const plan = readUnits(ROOT);
    const jobs = tipJobs(list, plan);
    expect(jobs.map((j) => j.id)).toEqual(list.map((t) => t.id));
    for (const job of jobs) {
      const at = plan.findIndex((u) => u.tip === job.id);
      expect(job.unit?.number ?? null).toBe(at >= 0 ? at + 1 : null);
      expect(job.known).toEqual((at >= 0 ? plan.slice(0, at + 1) : plan).flatMap((u) => u.wants));
    }
    expect(jobs.find((j) => j.id === "tip-past")?.unit).toBeNull();
  });

  it("give Claude the brief, the unit, the words met so far and the other tips' titles", () => {
    const [, twoToBe, past] = tipJobs(tipList, units);
    const prompt = tipPrompt(twoToBe);
    expect(prompt).toContain('Tip 2 of 3: "Two verbs for to be"');
    expect(prompt).toContain("The brief: Ser for what, estar for how and where.");
    expect(prompt).toContain('unit 3 of the starter path, "Where I am". The unit\'s goal: now you can say where you are.');
    for (const want of ["yo", "tú", "ser: I am (soy)", "estar: I am (estoy)"]) expect(prompt).toContain(`- ${want}`);
    expect(prompt).toContain("- Spanish drops I and you");
    expect(prompt).not.toContain("The ending says who.");
    expect(tipPrompt(past)).toContain("after the starter path");
    expect(TIP_SYSTEM_PROMPT).toContain("three to five");
    expect(Object.keys((TIP_SCHEMA as { properties: object }).properties)).toEqual(["body", "examples"]);
  });
});

describe("the tip guard", () => {
  const job = tipJobs(tipList, units)[0];
  const fields = (output: unknown) => {
    const guarded = guardTip(output, job);
    return guarded.ok ? [] : guarded.fields;
  };

  it("takes a good answer, keeping the tip list's title", () => {
    const guarded = guardTip(goodAnswer(), job);
    expect(guarded.ok && guarded.cards[0]).toMatchObject({ id: "tip-no-pronoun", title: "Spanish drops I and you" });
  });

  it("refuses a short or long body, a sentence reading as a key line, too few or many examples, a bar and repeats", () => {
    const answer = goodAnswer();
    expect(guardTip({ body: "one" }, job)).toMatchObject({ ok: false, kind: "shape" });
    expect(fields({ ...answer, body: ["One.", "Two."] })).toEqual(["body"]);
    expect(fields({ ...answer, body: ["1.", "2.", "3.", "4.", "5.", "6."] })).toEqual(["body"]);
    expect(fields({ ...answer, body: ["One.", "Example: soy.", "Three."] })).toEqual(["body"]);
    expect(fields({ ...answer, body: ["One.", "Two\nlines.", "Three."] })).toEqual(["body"]);
    expect(fields({ ...answer, examples: answer.examples.slice(0, 1) })).toEqual(["examples"]);
    expect(fields({ ...answer, examples: [...answer.examples, ...answer.examples] })).toEqual(["examples", "examples.es"]);
    expect(fields({ ...answer, examples: [{ es: "Soy | Ana.", en: "I'm Ana." }, answer.examples[1]] })).toEqual(["examples.es"]);
    expect(fields({ ...answer, examples: [{ es: "Soy Ana.", en: "" }, answer.examples[1]] })).toEqual(["examples.en"]);
  });
});

describe("tip files", () => {
  const job: TipJob = tipJobs(tipList, units)[1];
  const draft = { id: job.id, title: job.title, ...goodAnswer() };
  const file = tipFileText(job, draft, { draftedAt: "2026-10-03T00:00:00.000Z", model: "claude-opus-5-5", via: "cli", effort: "medium" });

  it("read back as drafted: pending, the title, the body lines and the examples", () => {
    expect(parseTipFile(file)).toEqual({ status: "pending", title: job.title, body: draft.body, examples: draft.examples, errors: [] });
    expect(file).toContain("# The brief from content/tips.json: Ser for what, estar for how and where.");
  });

  it("read a person's corrections: any case of key, a changed title, a merged body line, a third example", () => {
    const edited = file
      .replace("status: pending", "Status: Approve")
      .replace(/^title: .*$/m, "Title: Ser and estar")
      .replace("Third sentence.\nFourth sentence.", "Third and fourth.")
      .replace(/^(example: ¿Eres.*)$/m, "$1\nexample:  Estoy aquí.  |  I'm here. ");
    const parsed = parseTipFile(edited);
    expect(parsed).toMatchObject({ status: "approve", title: "Ser and estar", errors: [] });
    expect(parsed.body).toEqual(["First sentence.", "Second: with a colon inside.", "Third and fourth."]);
    expect(parsed.examples[2]).toEqual({ es: "Estoy aquí.", en: "I'm here." });
    expect(deckTip(job.id, parsed)).toEqual({
      id: "tip-two-to-be",
      title: "Ser and estar",
      body: "First sentence. Second: with a colon inside. Third and fourth.",
      examples: [
        { es: "Soy Ana.", en: "I'm Ana.", audio: "/deck/audio/tip-two-to-be.1.mp3" },
        { es: "¿Eres de México?", en: "Are you from Mexico?", audio: "/deck/audio/tip-two-to-be.2.mp3" },
        { es: "Estoy aquí.", en: "I'm here.", audio: "/deck/audio/tip-two-to-be.3.mp3" },
      ],
    });
  });

  it("name each problem by line or key, never by its text", () => {
    const errors = (text: string) => parseTipFile(text).errors;
    const lineOf = (start: string) => `line ${file.split("\n").findIndex((l) => l.startsWith(start)) + 1}`;
    expect(errors(file.replace("status: pending", "status: approved"))).toEqual([`${lineOf("status:")}: status must be pending or approve`]);
    expect(errors(file.replace("status: pending\n", ""))).toEqual(["no status line"]);
    expect(errors(file.replace(/^title: .*$/m, "title:"))).toEqual(["no title"]);
    expect(errors(file.replace(/^title: .*$/m, "title: A\ntitle: B"))).toEqual([`line ${Number(lineOf("title:").slice(5)) + 1}: a second title line`]);
    expect(errors(file.replace("example: Soy Ana. | I'm Ana.", "example: Soy Ana."))).toEqual([
      expect.stringMatching(/^line \d+: an example reads "example: Spanish \| English"$/),
      "1 examples, not two or three",
    ]);
    expect(errors(file.replace(/^(?!#)[A-Z].*\.$/gm, ""))).toEqual(["no body"]);
    const four = file.replace(/^(example: ¿Eres.*)$/m, "$1\n$1\n$1");
    expect(errors(four)).toEqual(["4 examples, not two or three"]);
  });
});

describe("npm run tips", () => {
  const jobs = tipJobs(tipList, units);

  it("drafts one file per tip with the fake runner, resumes with no calls, and --redo replaces", async () => {
    const store = newStore();
    const { runner, requests } = fakeDrafter();
    const printed: string[] = [];
    const summary = await draftTips(jobs, tipOptions(store, runner, printed));
    expect(summary).toMatchObject({ words: 3, drafted: 3, failed: 0, calls: 3 });
    expect(requests.map((r) => r.prompt)).toEqual(jobs.map(tipPrompt));
    expect(requests.every((r) => r.system === TIP_SYSTEM_PROMPT && r.schema === TIP_SCHEMA)).toBe(true);
    expect(printed).toEqual(["tip-no-pronoun: tip-no-pronoun", "tip-two-to-be: tip-two-to-be", "tip-past: tip-past"]);
    for (const job of jobs) {
      expect(parseTipFile(readFileSync(store.file(job.id), "utf8"))).toMatchObject({ status: "pending", title: job.title, errors: [] });
    }
    const log = readFileSync(store.logFile, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    expect(log.map((l) => [l.tip, l.ok])).toEqual([["tip-no-pronoun", true], ["tip-two-to-be", true], ["tip-past", true]]);
    expect(JSON.stringify(log)).not.toContain("First sentence");

    const again = fakeDrafter();
    expect(await draftTips(jobs, tipOptions(store, again.runner))).toMatchObject({ alreadyDrafted: 3, calls: 0 });

    edit(store, "tip-past", "approve");
    await draftTips(jobs.slice(2), { ...tipOptions(store, again.runner), redo: true });
    expect(again.requests).toHaveLength(1);
    expect(store.read("tip-past")?.status).toBe("pending");
  });

  it("asks again after a refused answer and keeps the refused one aside", async () => {
    const store = newStore();
    let call = 0;
    const { runner } = fakeDrafter(() => (++call === 1 ? { ...goodAnswer(), body: ["Only one."] } : goodAnswer()));
    const summary = await draftTips(jobs.slice(0, 1), tipOptions(store, runner));
    expect(summary).toMatchObject({ drafted: 1, calls: 2, failedCalls: 1 });
    expect(existsSync(path.join(store.failedDir, "tip-no-pronoun-1.json"))).toBe(true);
    expect(store.ids()).toEqual(["tip-no-pronoun"]);
  });
});

describe("tips in the deck build", () => {
  async function drafted() {
    const store = newStore();
    await draftTips(tipJobs(tipList, units), tipOptions(store, fakeDrafter().runner));
    return store;
  }

  it("ship approved tips only, in list order, and list the others and every problem", async () => {
    const store = await drafted();
    expect(tipsForDeck(store, tipList)).toMatchObject({ tips: [], pending: ["tip-no-pronoun", "tip-two-to-be", "tip-past"] });

    edit(store, "tip-past", "approve");
    edit(store, "tip-no-pronoun", "approve");
    edit(store, "tip-two-to-be", "approve", [[/^example: Soy Ana.*$/m, ""]]);
    writeFileSync(store.file("tip-stray"), "status: pending\n");
    const result = tipsForDeck(store, [...tipList, { id: "tip-el-la", title: "El or la", about: "Gender." }]);
    expect(result.tips.map((t) => t.id)).toEqual(["tip-no-pronoun", "tip-past"]);
    expect(result).toMatchObject({
      pending: [],
      notDrafted: ["tip-el-la"],
      problems: ["tip-two-to-be: 1 examples, not two or three", "tip-stray: not in content/tips.json"],
    });
  });

  it("hold back every card naming a tip that is not shipped", () => {
    const cards = fixtureDeck.cards;
    const named = cards.filter((c) => c.tip === "tip-verb-endings").map((c) => c.id);
    expect(named).toEqual(["ir-form-yo", "ir-form-tu"]);
    expect(holdBackForTips(cards, [])).toEqual({ kept: cards.filter((c) => c.tip === null), heldBack: named });
    expect(holdBackForTips(cards, fixtureDeck.tips)).toEqual({ kept: cards, heldBack: [] });
  });

  it("put approved tips in the deck, valid, and count a revised tip as a new version", async () => {
    const env = setup();
    await reviewCards(draftedWords(env.drafts), options(env.drafts, env.store, fakeReviewer().runner));
    const store = await drafted();
    edit(store, "tip-two-to-be", "approve");

    const first = buildDeck(env.drafts, env.store, null, { tips: tipsForDeck(store, tipList).tips });
    expect(first.deck?.tips.map((t) => t.id)).toEqual(["tip-two-to-be"]);
    expect(first.heldBack).toEqual([]);
    expect(validateDeck(first.deck).ok).toBe(true);

    const same = buildDeck(env.drafts, env.store, first.deck, { tips: tipsForDeck(store, tipList).tips });
    expect(same.changed).toBe(false);
    expect(deckText(same.deck!)).toBe(deckText(first.deck!));

    edit(store, "tip-two-to-be", "approve", [[/^title: .*$/m, "title: Ser and estar"]]);
    const revised = buildDeck(env.drafts, env.store, first.deck, { tips: tipsForDeck(store, tipList).tips });
    expect(revised).toMatchObject({ changed: true, deck: { version: 2 } });
    expect(revised.deck?.tips[0].title).toBe("Ser and estar");
  });
});
