// Shared test fixtures for the review pass and the deck build: five small
// drafted cards and a fake reviewer, so no test calls Claude.

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Card } from "@/lib/deck/types";
import type { CallResult, DraftRequest, Runner } from "./claude";
import { DraftStore, withMedia, type WordEntry } from "./drafting";
import { CHECKS, ReviewStore, type ReviewOptions } from "./reviewing";

export const words: Record<string, WordEntry> = {
  de: { rank: 2, word: "de", forms: ["de"] },
  tener: { rank: 13, word: "tener", forms: ["tengo", "tener"] },
  bueno: { rank: 39, word: "bueno", forms: ["bueno", "buena"] },
  casa: { rank: 90, word: "casa", forms: ["casa"] },
};

const base = { hint: null, spain: null, trick: "A made-up trick for the test." };

export function testCards(): Record<string, Card[]> {
  const card = (c: { id: string; kind: string } & Record<string, unknown>) => withMedia({ ...base, ...c }) as unknown as Card;
  return {
    de: [card({ id: "de-of", rank: 2, kind: "glue", pos: "preposition", es: "de", en: "the house [of] Maria", grammar: null, example: { es: "Es la casa de María.", en: "It is Maria's house." } })],
    tener: [
      card({ id: "tener-have", rank: 13, kind: "content", pos: "verb", es: "tener", en: "to have", hint: "own", grammar: { present: { yo: "tengo", tu: "tienes", el: "tiene" }, irregular: true }, example: { es: "Tengo un perro.", en: "I have a dog." } }),
      card({ id: "tener-have-to", rank: 13, kind: "content", pos: "verb", es: "tener", en: "to have to", hint: "tener que", grammar: { present: { yo: "tengo", tu: "tienes", el: "tiene" }, irregular: true }, example: { es: "Tengo que irme.", en: "I have to go." } }),
    ],
    bueno: [card({ id: "bueno-good", rank: 39, kind: "content", pos: "adjective", es: "bueno", en: "good", grammar: { feminine: "buena" }, example: { es: "Es un buen día.", en: "It's a good day." } })],
    casa: [card({ id: "casa-house", rank: 90, kind: "content", pos: "noun", es: "la casa", en: "house", grammar: { gender: "f", article: "la" }, example: { es: "Mi casa es pequeña.", en: "My house is small." } })],
  };
}

/** The prompts the fake reviewer finds fault with, and the check that fails. */
const FAULTS: Record<string, string> = { house: "example", "to have to": "oneAnswer" };
/** The prompts the fake reviewer writes a note on: a note never flags a card. */
const NOTES: Record<string, string> = { "to have": "Note text: the hint is not needed.", house: "Note text for house." };

export function answerFor(prompt: string) {
  const card = JSON.parse(prompt.slice(prompt.indexOf("{"))) as Card;
  const fault = FAULTS[card.en];
  return {
    back: { es: "back-translated word", example: "back-translated sentence" },
    checks: Object.fromEntries(
      CHECKS.map((name) => [
        name,
        name === fault
          ? { ok: false, problem: `Problem text for ${card.en}.`, fix: "example.es: Una frase mejor." }
          : { ok: true, problem: null, fix: null },
      ]),
    ),
    note: NOTES[card.en] ?? null,
  };
}

export const usage = { input: 3, output: 400, cacheRead: 2000, cacheWrite: 0, costUsd: 0.01, durationMs: 5000, models: ["claude-opus-5-5"] };

export function fakeReviewer(answer: (prompt: string) => unknown = answerFor) {
  const requests: DraftRequest[] = [];
  const runner: Runner = async (request) => {
    requests.push(request);
    return { ok: true, output: answer(request.prompt), usage } satisfies CallResult;
  };
  return { runner, requests };
}

export function setup(cards = testCards()) {
  const dir = mkdtempSync(path.join(tmpdir(), "learn-spanish-review-test-"));
  const drafts = new DraftStore(path.join(dir, "drafts"));
  for (const [word, list] of Object.entries(cards)) drafts.saveWord(words[word], list, null, { via: "cli" });
  const store = new ReviewStore(path.join(dir, "review"));
  return { dir, drafts, store };
}

export function options(drafts: DraftStore, store: ReviewStore, runner: Runner, print: string[] = []): ReviewOptions {
  return {
    drafts,
    store,
    runner,
    via: "cli",
    model: "claude-opus-5-5",
    effort: "medium",
    print: (line) => print.push(line),
    sleep: async () => {},
  };
}
