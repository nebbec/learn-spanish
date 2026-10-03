import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { DraftCard } from "@/lib/deck/types";
import { validateDeck } from "@/lib/deck/validate";
import { audioPaths } from "./audio.mjs";
import { buildDeck, deckText, type PathPlan } from "./deck-build";
import { cardFromDecision, decisionFile, decisionPath, parseDecision, refreshFlagged } from "./decisions";
import { withMedia } from "./drafting";
import { pathOrder } from "./path-order";
import { cardHash, draftedWords, readDraftCard, reviewCards, type Review, type ReviewStore } from "./reviewing";
import { TagStore, type Tag } from "./tagging";
import type { Unit } from "./units";
import { fakeReviewer, options, setup, testCards, words } from "./review-fixture";

const review = (card: DraftCard): Review => ({
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
    expect(list).toContain("Reviewer's note (not a reason to flag): Note text for house.");
    expect(list).not.toContain("tener-have ·");
    expect(readFileSync(decisionPath(store, "casa-house"), "utf8")).toContain("# Reviewer's note (not a reason to flag): Note text for house.");

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
    expect(pathOrder(cards, []).cards).toEqual(cards);
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

  it("names each card's clips as the audio script makes them, with a new path for a corrected sentence or a new take", async () => {
    const { drafts, store } = await reviewed();
    refreshFlagged(drafts, store);
    decide(store, "casa-house", "approve", { "example.es": "Mi casa es grande." });
    const deck = buildDeck(drafts, store, null).deck!;
    for (const card of deck.cards) expect(card.audio).toEqual(audioPaths(card));
    const casa = deck.cards.find((c) => c.id === "casa-house")!;
    expect(casa.audio.sentence).not.toBe(audioPaths({ ...casa, example: testCards().casa[0].example }).sentence);

    const retaken = buildDeck(drafts, store, deck, { takes: { "de-of.word": 2 } }).deck!;
    const de = (d: typeof deck) => d.cards.find((c) => c.id === "de-of")!.audio;
    expect(de(retaken).word).not.toBe(de(deck).word);
    expect(de(retaken).sentence).toBe(de(deck).sentence);
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

  it("keeps the first cards in Learn order up to the size, holding the place of a card that waits", async () => {
    const { drafts, store } = await reviewed();
    refreshFlagged(drafts, store);
    // In full Learn order: tener-have, tener-have-to (waiting), de-of, bueno-good, casa-house (waiting).
    // With no sibling spacing, so that tener-have-to sits second.
    const first = buildDeck(drafts, store, null, { size: 3, spacing: 0 });
    expect(first.deck?.cards.map((c) => c.id)).toEqual(["tener-have", "de-of"]);
    expect(first.beyondSize).toEqual(["bueno-good", "casa-house"]);

    decide(store, "tener-have-to", "approve");
    const second = buildDeck(drafts, store, first.deck, { size: 3, spacing: 0 });
    expect(second).toMatchObject({ dropped: [], beyondSize: ["bueno-good", "casa-house"] });
    expect(second.deck?.cards.map((c) => c.id)).toEqual(["tener-have", "tener-have-to", "de-of"]);

    writeFileSync(decisionPath(store, "tener-have-to"), readFileSync(decisionPath(store, "tener-have-to"), "utf8").replace("decision: approve", "decision: reject"));
    const third = buildDeck(drafts, store, null, { size: 3, spacing: 0 });
    expect(third.deck?.cards.map((c) => c.id)).toEqual(["tener-have", "bueno-good", "de-of"]);
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
    const redrafted = withMedia({ ...testCards().casa[0], example: { es: "La casa es azul.", en: "The house is blue." } }) as DraftCard;
    drafts.saveWord(words.casa, [redrafted], null, { via: "cli" });
    expect(buildDeck(drafts, store, null).notReviewed).toEqual(["casa-house"]);

    await reviewCards(draftedWords(drafts), options(drafts, store, fakeReviewer().runner));
    expect(refreshFlagged(drafts, store)).toMatchObject({ reset: ["casa-house"], waiting: ["tener-have-to", "casa-house"] });
  });
});

describe("ordering build (L6)", () => {
  const UNITS: Unit[] = [
    { id: "home", title: "Home", goal: "say where you live.", tip: null, wants: ["casa: house", "bueno: good", "nosotros: we"], payoff: [] },
  ];

  /** The test drafts and reviews, a tag store, and a plan reading it. */
  async function tagged() {
    const env = await reviewed();
    refreshFlagged(env.drafts, env.store);
    const tags = new TagStore(path.join(env.dir, "tags"));
    const plan: PathPlan = { units: UNITS, tipList: [{ id: "tip-x", title: "X", about: "x" }], tags };
    /** Writes a tag as the tag pass would, for the card's current draft. */
    const tag = (id: string, fields: Partial<Tag>) => {
      const draft = readDraftCard(env.drafts, id)!;
      const full = { id, unit: null, want: null, requires: [], tip: null, ...fields };
      writeFileSync(tags.file(id), JSON.stringify({ ...full, draft: cardHash(draft), group: "test", via: "cli", model: "m", effort: "e", taggedAt: "t" }));
    };
    // casa and bueno make unit "home" (bueno after casa, which it requires); de-of needs casa too.
    tag("casa-house", { unit: "home", want: "casa: house" });
    tag("bueno-good", { unit: "home", want: "bueno: good", requires: ["casa-house"] });
    tag("de-of", { requires: ["casa-house"] });
    return { ...env, plan, tag };
  }
  const idsOf = (deck: { cards: { id: string }[] } | null) => deck?.cards.map((c) => c.id);

  it("orders by the tags: units first in requires order, then the frequency phase with sibling spacing", async () => {
    const { drafts, store, plan } = await tagged();
    decide(store, "casa-house", "approve");
    decide(store, "tener-have-to", "approve");
    const build = buildDeck(drafts, store, null, { plan });
    expect(idsOf(build.deck)).toEqual(["casa-house", "bueno-good", "tener-have", "de-of", "tener-have-to"]);
    expect(build.deck?.units).toEqual([{ id: "home", title: "Home", goal: "say where you live." }]);
    expect(build.deck?.cards.find((c) => c.id === "bueno-good")).toMatchObject({ unit: "home", requires: ["casa-house"], tip: null, why: null });
    expect(build.notTagged).toEqual(["tener-have", "tener-have-to"]);
    expect(validateDeck(build.deck).ok).toBe(true);
    // Spacing 0 lets tener-have-to follow its first meaning straight away.
    expect(idsOf(buildDeck(drafts, store, null, { plan, spacing: 0 }).deck)).toEqual(["casa-house", "bueno-good", "tener-have", "tener-have-to", "de-of"]);
  });

  it("holds back a card whose requires are not all in the deck, keeping its place in the count", async () => {
    const { drafts, store, plan } = await tagged();
    // casa-house waits for a decision, so bueno-good and de-of, which require it, wait too.
    const build = buildDeck(drafts, store, null, { plan, size: 4 });
    expect(build.heldForRequires).toEqual(["bueno-good", "de-of"]);
    expect(idsOf(build.deck)).toEqual(["tener-have"]);
    expect(build.deck?.units).toEqual([]);
    expect(build.beyondSize).toEqual(["tener-have-to"]);

    // A card requiring a rejected card is held back too.
    decide(store, "casa-house", "reject");
    expect(buildDeck(drafts, store, null, { plan }).heldForRequires).toEqual(["bueno-good", "de-of"]);
  });

  it("holds back a card whose tip is not shipped, and the cards that require it", async () => {
    const { drafts, store, plan, tag } = await tagged();
    decide(store, "casa-house", "approve");
    tag("casa-house", { unit: "home", want: "casa: house", tip: "tip-x" });
    const build = buildDeck(drafts, store, null, { plan });
    expect(build.heldBack).toEqual(["casa-house"]);
    expect(build.heldForRequires).toEqual(["bueno-good", "de-of"]);
  });

  it("follows a corrected id from its tags and from the cards that require it", async () => {
    const { drafts, store, plan } = await tagged();
    decide(store, "casa-house", "approve", { id: "casa-home" });
    const build = buildDeck(drafts, store, null, { plan });
    expect(idsOf(build.deck)?.slice(0, 2)).toEqual(["casa-home", "bueno-good"]);
    expect(build.deck?.cards[0].unit).toBe("home");
    expect(build.deck?.cards[1].requires).toEqual(["casa-home"]);
  });

  it("refuses to write a deck when the requires go round in a circle", async () => {
    const { drafts, store, plan, tag } = await tagged();
    tag("casa-house", { unit: "home", want: "casa: house", requires: ["bueno-good"] });
    const build = buildDeck(drafts, store, null, { plan });
    expect(build).toMatchObject({ deck: null, pathText: "", orderProblems: ["requires go round in a circle: casa-house > bueno-good > casa-house"] });
  });

  it("uses no tag made for an earlier draft or failing the checks", async () => {
    const { drafts, store, plan, tag } = await tagged();
    tag("tener-have", { unit: "nowhere" });
    writeFileSync(plan.tags.file("bueno-good"), readFileSync(plan.tags.file("bueno-good"), "utf8").replace(/"draft":"[^"]*"/, '"draft":"old"'));
    expect(buildDeck(drafts, store, null, { plan }).notTagged).toEqual(["tener-have", "tener-have-to", "bueno-good"]);
  });

  it("keeps every card already in the deck, joins new cards from the top of the order, and writes the computed order", async () => {
    const { drafts, store, plan } = await tagged();
    decide(store, "casa-house", "approve");
    // Before tagging: tener-have, de-of, bueno-good are the first three (tener-have-to is spaced off).
    const untagged = buildDeck(drafts, store, null, { size: 3 }).deck!;
    expect(idsOf(untagged)).toEqual(["tener-have", "de-of", "bueno-good"]);

    // Tagged, casa-house heads the order, but the three cards in the deck already fill the size, and
    // two of them now require it: held back, they would be dropped, so nothing is written.
    const grown = buildDeck(drafts, store, untagged, { plan, size: 3 });
    expect(grown).toMatchObject({ dropped: ["de-of", "bueno-good"], heldForRequires: ["bueno-good", "de-of"] });
    expect(grown.deck).toBeNull();
    // Room for one more: casa-house joins, and the deck is written in the new order.
    const bigger = buildDeck(drafts, store, untagged, { plan, size: 4 });
    expect(idsOf(bigger.deck)).toEqual(["casa-house", "bueno-good", "tener-have", "de-of"]);
    expect(bigger.deck?.version).toBe(2);
    expect(bigger.beyondSize).toEqual(["tener-have-to"]);
  });

  it("gives the same deck file and path.md on a rebuild with nothing changed", async () => {
    const { drafts, store, plan } = await tagged();
    decide(store, "casa-house", "approve");
    const first = buildDeck(drafts, store, null, { plan });
    const again = buildDeck(drafts, store, first.deck, { plan });
    expect(again.changed).toBe(false);
    expect(deckText(again.deck!)).toBe(deckText(first.deck!));
    expect(again.pathText).toBe(first.pathText);
  });

  it("writes path.md with the unit, its unmatched wants, and why a card is not in the deck", async () => {
    const { drafts, store, plan } = await tagged();
    const text = buildDeck(drafts, store, null, { plan }).pathText;
    expect(text).toContain("## Unit 1 · Home (`home`)\n\nNow you can say where you live.\n\n1. `casa-house` · house → la casa · *not in the deck: waiting for your decision*\n");
    expect(text).toContain("2. `bueno-good` · good → bueno · *not in the deck: a card it requires is not in the deck*\n");
    expect(text).toContain("Wants no drafted card fills:\n\n- nosotros: we\n");
    expect(text).not.toContain("- casa: house");
    expect(text).toContain("## Frequency phase\n\n3. `tener-have` · to have (own) → tener\n");
  });
});
