import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DraftCard } from "@/lib/deck/types";
import { validateDraftCard } from "@/lib/deck/validate";
import type { Runner } from "./claude";
import { SYSTEM_PROMPT, withMedia } from "./drafting";
import { answerFor, fakeReviewer, options, setup, testCards, usage, words } from "./review-fixture";
import {
  cardHash,
  draftedWords,
  formatReviewSummary,
  guardReview,
  idProblem,
  REVIEW_SCHEMA,
  REVIEW_SYSTEM_PROMPT,
  reviewCards,
} from "./reviewing";

describe("id rule", () => {
  it("accepts the word without accents and one to three meaning words, with a rank suffix if one was added", () => {
    expect(idProblem("estar-be-state", "estar", 8)).toBeNull();
    expect(idProblem("que-what", "qué", 16)).toBeNull();
    expect(idProblem("que-what-16", "qué", 16)).toBeNull();
    expect(idProblem("que-how-exclamation", "qué", 16)).toBeNull();
  });

  it("refuses a bare word, another word's prefix, four meaning words and anything but lower-case slugs", () => {
    expect(idProblem("casa", "casa", 90)).toMatch(/must start with "casa-"/);
    expect(idProblem("hogar-house", "casa", 90)).toMatch(/must start/);
    expect(idProblem("casa-a-big-old-house", "casa", 90)).toMatch(/at most 3/);
    expect(idProblem("casa-House", "casa", 90)).toMatch(/lower-case/);
    expect(idProblem("casa--house", "casa", 90)).toMatch(/lower-case/);
  });
});

describe("review answer guard", () => {
  it("keeps failed checks with their problem and drops passed ones", () => {
    const guarded = guardReview(answerFor(JSON.stringify(testCards().casa[0])));
    expect(guarded).toEqual({
      ok: true,
      answer: {
        back: { es: "back-translated word", example: "back-translated sentence" },
        findings: [{ reason: "example", problem: "Problem text for house.", fix: "example.es: Una frase mejor." }],
        note: "Note text for house.",
      },
    });
  });

  it("keeps a note without making it a finding, and reads a missing or blank note as none", () => {
    const answer = answerFor(JSON.stringify(testCards().tener[0])) as Record<string, unknown>;
    expect(guardReview(answer)).toMatchObject({ ok: true, answer: { findings: [], note: "Note text: the hint is not needed." } });
    answer.note = " ";
    expect(guardReview(answer)).toMatchObject({ ok: true, answer: { note: null } });
    delete answer.note;
    expect(guardReview(answer)).toMatchObject({ ok: true, answer: { note: null } });
  });

  it("names the fields of a failed check with no problem, or a missing back-translation", () => {
    const answer = answerFor(JSON.stringify(testCards().casa[0])) as { back: { es: string }; checks: Record<string, unknown> };
    answer.back.es = " ";
    answer.checks.example = { ok: false, problem: null, fix: null };
    answer.checks.trick = { ok: "yes" };
    expect(guardReview(answer)).toEqual({ ok: false, fields: ["back.es", "checks.example", "checks.trick"] });
  });
});

describe("review prompt", () => {
  it("asks for a note, not a failed check, when a hint is right but not needed, and still fails a wrong hint", () => {
    expect(REVIEW_SYSTEM_PROMPT).toContain("A hint the prompt does not strictly need is harmless and is never a reason to fail a check.");
    expect(REVIEW_SYSTEM_PROMPT).toContain("A hint that is wrong or misleading, or that leaves more than one right answer, fails this check.");
    expect(REVIEW_SYSTEM_PROMPT).toContain("A hint that is right but not needed does not: pass the check and say so in note.");
    expect(REVIEW_SYSTEM_PROMPT).not.toMatch(/hint: present only when/);
    expect((REVIEW_SCHEMA as { required: string[] }).required).toEqual(["back", "checks", "note"]);
  });
});

describe("review run", () => {
  it("sees each card cold: the review prompt, the word and rank, the word's other prompts, and no id or media", async () => {
    const { drafts, store } = setup();
    const { runner, requests } = fakeReviewer();
    await reviewCards(draftedWords(drafts), options(drafts, store, runner));

    expect(requests).toHaveLength(5);
    for (const r of requests) {
      expect(r.system).toBe(REVIEW_SYSTEM_PROMPT);
      expect(r.schema).toBe(REVIEW_SCHEMA);
      expect(r.prompt).not.toContain(SYSTEM_PROMPT.slice(0, 80));
      expect(r.prompt).not.toMatch(/"id"|\/deck\/|"rank"/);
    }
    const haveTo = requests.find((r) => r.prompt.includes('"en": "to have to"'))!.prompt;
    expect(haveTo).toContain("Word: tener, rank 13");
    expect(haveTo).toContain('The word\'s other cards ask: "to have" (hint: own).');
    expect(requests.find((r) => r.prompt.includes('"en": "house"'))!.prompt).toContain("This is the word's only card.");
  });

  it("saves a review per card, flags any failed check, logs usage and prints only ids and check names", async () => {
    const { drafts, store } = setup();
    const { runner } = fakeReviewer();
    const printed: string[] = [];
    const summary = await reviewCards(draftedWords(drafts), options(drafts, store, runner, printed));

    expect(summary).toMatchObject({ cards: 5, passed: 3, flagged: 2, failed: 0, calls: 5, reasons: { example: 1, oneAnswer: 1 } });
    expect(store.get("casa-house")).toMatchObject({ flagged: true, rank: 90, word: "casa", draft: cardHash(testCards().casa[0]) });
    expect(store.get("bueno-good")).toMatchObject({ flagged: false, findings: [], note: null });
    expect(store.get("tener-have")).toMatchObject({ flagged: false, findings: [], note: "Note text: the hint is not needed." });
    expect(printed).toContain("#13 tener: tener-have passed");
    expect(printed).toContain("#13 tener: tener-have-to flagged (oneAnswer)");
    expect(printed).toContain("#2 de: de-of passed");

    const output = [...printed, ...formatReviewSummary(summary, "cli")].join("\n");
    for (const card of Object.values(testCards()).flat()) {
      for (const t of [card.example.es, card.example.en, card.trick]) expect(output).not.toContain(t);
    }
    expect(output).not.toContain("Problem text");
    expect(output).not.toContain("Note text");

    const log = readFileSync(store.logFile, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    expect(log).toHaveLength(5);
    expect(log[0]).toMatchObject({ ok: true, via: "cli", model: "claude-opus-5-5", output: 400, costUsd: 0.01 });
    expect(Object.keys(log[0])).toContain("id");
  });

  it("flags a card whose id breaks the rule even when the reviewer passes it", async () => {
    const cards = testCards();
    cards.casa = [withMedia({ ...cards.casa[0], id: "casa-a-big-old-house" }) as DraftCard];
    const { drafts, store } = setup(cards);
    const { runner } = fakeReviewer(() => answerFor(JSON.stringify(testCards().bueno[0])));
    await reviewCards(draftedWords(drafts, 90, 90), options(drafts, store, runner));
    expect(store.get("casa-a-big-old-house")?.findings).toEqual([
      expect.objectContaining({ reason: "id", problem: expect.stringMatching(/at most 3/) }),
    ]);
  });

  it("resumes, and reviews a card again only when its draft has changed", async () => {
    const { drafts, store } = setup();
    await reviewCards(draftedWords(drafts), options(drafts, store, fakeReviewer().runner));

    const again = fakeReviewer();
    const summary = await reviewCards(draftedWords(drafts), options(drafts, store, again.runner));
    expect(summary).toMatchObject({ alreadyReviewed: 5, calls: 0 });

    const changed = withMedia({ ...testCards().bueno[0], example: { es: "Qué bueno.", en: "How good." } }) as DraftCard;
    expect(validateDraftCard(changed).ok).toBe(true);
    drafts.saveWord(words.bueno, [changed], null, { via: "cli" });
    const third = fakeReviewer();
    await reviewCards(draftedWords(drafts), options(drafts, store, third.runner));
    expect(third.requests).toHaveLength(1);
    expect(store.get("bueno-good")?.draft).toBe(cardHash(changed));
  });

  it("retries an answer that breaks the schema and reports a card that keeps failing", async () => {
    const { drafts, store } = setup();
    const printed: string[] = [];
    const runner: Runner = async () => ({ ok: true, output: { back: {} }, usage });
    const summary = await reviewCards(draftedWords(drafts, 2, 2), { ...options(drafts, store, runner, printed), retries: 1 });
    expect(summary).toMatchObject({ failed: 1, calls: 2, failedCalls: 2 });
    expect(printed.at(-1)).toMatch(/^#2 de: de-of failed \(invalid: back\.es, back\.example, checks\.meaning/);
    expect(store.get("de-of")).toBeNull();
  });
});
