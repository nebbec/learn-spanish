import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Card } from "@/lib/deck/types";
import { validateDeck } from "@/lib/deck/validate";
import { buildDeck, deckText, learnOrder } from "./deck-build";
import { cardFromDecision, decisionFile, decisionPath, parseDecision, refreshFlagged } from "./decisions";
import { withMedia } from "./drafting";
import { draftedWords, reviewCards, type Review, type ReviewStore } from "./reviewing";
import { fakeReviewer, options, setup, testCards, words } from "./review-fixture";

const review = (card: Card): Review => ({
  id: card.id,
  rank: card.rank,
  word: "word",
  draft: "0000",
  flagged: true,
  findings: [{ reason: "example", problem: "A problem.", fix: null }],
  back: { es: "x", example: "y" },
  via: "cli",
  model: "claude-opus-5-5",
  effort: "medium",
  reviewedAt: "2026-10-03T00:00:00.000Z",
});

/** Sets the decision line, and replaces whole card lines, in a decision file. */
function decide(store: ReviewStore, id: string, decision: string, lines: Record<string, string> = {}) {
  const file = decisionPath(store, id);
  let text = readFileSync(file, "utf8").replace("decision: pending", `decision: ${decision}`);
  for (const [key, value] of Object.entries(lines)) text = text.replace(new RegExp(`^${key}:.*$`, "m"), `${key}: ${value}`);
  writeFileSync(file, text);
}

async function reviewed() {
  const env = setup();
  await reviewCards(draftedWords(env.drafts), options(env.drafts, env.store, fakeReviewer().runner));
  return env;
}

describe("decision files", () => {
  it("give back the same card when nothing is changed, for every part of speech", () => {
    for (const card of Object.values(testCards()).flat()) {
      const parsed = parseDecision(decisionFile(card, review(card)));
      expect(parsed).toMatchObject({ decision: "pending", errors: [] });
      expect(cardFromDecision(card, parsed.fields)).toEqual(card);
    }
  });

  it("read corrections, empty hint as none, yes or no for irregular, and media paths from a new id", () => {
    const card = testCards().tener[0];
    let text = decisionFile(card, review(card)).replace("decision: pending", "decision: Approve");
    text = text.replace(/^hint:.*$/m, "hint:").replace(/^irregular:.*$/m, "irregular: no").replace(/^id:.*$/m, "id: tener-own");
    const parsed = parseDecision(text);
    expect(parsed.decision).toBe("approve");
    expect(cardFromDecision(card, parsed.fields)).toMatchObject({
      id: "tener-own",
      hint: null,
      grammar: { irregular: false },
      audio: { word: "/deck/audio/tener-own.word.mp3" },
    });
  });

  it("report unknown lines and decisions by line number only", () => {
    const parsed = parseDecision("decision: maybe\nnote: hello there\n# fine\n");
    expect(parsed.errors).toEqual(["line 1: decision must be pending, approve or reject", 'line 2: not a "field: value" line this file knows']);
  });
});

describe("deck build", () => {
  it("writes a decision file and a readable entry per flagged card, and leaves flagged cards out until decided", async () => {
    const { drafts, store } = await reviewed();
    const counts = refreshFlagged(drafts, store);
    expect(counts).toMatchObject({ flagged: 2, waiting: ["tener-have-to", "casa-house"], approved: 0, rejected: 0, reset: [] });
    const list = readFileSync(store.flaggedFile, "utf8");
    expect(list).toContain("### casa-house · rank 90 · casa");
    expect(list).toContain("- Example sentence: Problem text for house. Suggested fix: example.es: Una frase mejor.");
    expect(list).toContain("[decisions/tener-have-to.txt](decisions/tener-have-to.txt)");

    const build = buildDeck(drafts, store, null);
    expect(build).toMatchObject({ passed: ["de-of", "tener-have", "bueno-good"], waiting: ["tener-have-to", "casa-house"], problems: [] });
    expect(validateDeck(build.deck).ok).toBe(true);
    expect(build.deck?.version).toBe(1);
  });

  it("puts approved cards in with their corrections, in Learn order, and leaves rejected ones out", async () => {
    const { drafts, store } = await reviewed();
    refreshFlagged(drafts, store);
    decide(store, "casa-house", "approve", { "example.es": "Mi casa es grande." });
    decide(store, "tener-have-to", "reject");

    const build = buildDeck(drafts, store, null);
    expect(build).toMatchObject({ approved: ["casa-house"], corrected: ["casa-house"], rejected: ["tener-have-to"], waiting: [] });
    const cards = build.deck!.cards;
    expect(cards.find((c) => c.id === "casa-house")?.example.es).toBe("Mi casa es grande.");
    // Two content cards, then a glue card: tener-have and bueno-good, then de-of, then casa-house.
    expect(cards.map((c) => c.id)).toEqual(["tener-have", "bueno-good", "de-of", "casa-house"]);
    expect(learnOrder(cards)).toEqual(cards);
    expect(refreshFlagged(drafts, store)).toMatchObject({ waiting: [], approved: 1, rejected: 1 });
  });

  it("gives the same file on a rebuild, and a new version only when the cards change", async () => {
    const { drafts, store } = await reviewed();
    refreshFlagged(drafts, store);
    const first = buildDeck(drafts, store, null).deck!;
    const again = buildDeck(drafts, store, first);
    expect(again.changed).toBe(false);
    expect(deckText(again.deck!)).toBe(deckText(first));

    decide(store, "casa-house", "approve");
    const second = buildDeck(drafts, store, first);
    expect(second).toMatchObject({ changed: true, approved: ["casa-house"], corrected: [] });
    expect(second.deck?.version).toBe(2);
  });

  it("refuses to drop an id the previous build had, unless allowed", async () => {
    const { drafts, store } = await reviewed();
    refreshFlagged(drafts, store);
    decide(store, "casa-house", "approve");
    const first = buildDeck(drafts, store, null).deck!;
    writeFileSync(decisionPath(store, "casa-house"), readFileSync(decisionPath(store, "casa-house"), "utf8").replace("decision: approve", "decision: reject"));

    const refused = buildDeck(drafts, store, first);
    expect(refused).toMatchObject({ deck: null, dropped: ["casa-house"] });
    expect(buildDeck(drafts, store, first, { allowDrop: true }).deck?.cards.map((c) => c.id)).not.toContain("casa-house");
  });

  it("leaves out an approved card its decision file breaks, naming the fields", async () => {
    const { drafts, store } = await reviewed();
    refreshFlagged(drafts, store);
    decide(store, "casa-house", "approve", { gender: "x", id: "house" });
    decide(store, "tener-have-to", "approve", { en: "to have", hint: "own" });

    const build = buildDeck(drafts, store, null);
    expect(build.problems).toEqual(["casa-house: grammar.gender, id"]);
    // The corrected prompt clashes with tener-have: the validator stops the build.
    expect(build).toMatchObject({ deck: null, deckProblems: ["tener-have-to.en"] });
  });

  it("remakes a decision file when its card is drafted again and reviewed", async () => {
    const { drafts, store } = await reviewed();
    refreshFlagged(drafts, store);
    decide(store, "casa-house", "approve");
    const redrafted = withMedia({ ...testCards().casa[0], example: { es: "La casa es azul.", en: "The house is blue." } }) as Card;
    drafts.saveWord(words.casa, [redrafted], null, { via: "cli" });
    expect(buildDeck(drafts, store, null).notReviewed).toEqual(["casa-house"]);

    await reviewCards(draftedWords(drafts), options(drafts, store, fakeReviewer().runner));
    expect(refreshFlagged(drafts, store)).toMatchObject({ reset: ["casa-house"], waiting: ["tener-have-to", "casa-house"] });
  });
});
