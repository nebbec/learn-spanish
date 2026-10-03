// The deck build: every drafted card that passed review, plus every flagged
// card a person approved (with their corrections), in Learn order, up to a
// size: the first `size` cards in Learn order, counting a card that still waits
// for a decision, so approving it later never pushes a card out. Checked by
// the deck validator and written to content/deck.json. An id in the previous
// build must still be there, so a rebuild can never rename or drop a card that
// progress may be keyed on. Approved tips (L4) ship beside the cards, and a
// card naming any other tip is held back until its tip is approved.
//
// Nothing here prints card text: only ids, field names and counts.
//
// The rules are in docs/design.md under "Content pipeline", "Decided in E3".

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { DECK_FORMAT, type Card, type Deck, type DeckTip, type DraftCard } from "@/lib/deck/types";
import { validateDeck, validateDraftCard } from "@/lib/deck/validate";
import { learnQueue } from "@/lib/queues";
import { audioPaths } from "./audio.mjs";
import { cardFromDecision, readDecision } from "./decisions";
import type { DraftStore } from "./drafting";
import { allDrafted, cardHash, idProblem, readDraftCard, type ReviewStore } from "./reviewing";

export interface DeckBuild {
  /** The deck to write, or null when it must not be written (see `problems` and `dropped`). */
  deck: Deck | null;
  /** Cards in the deck: passed review, approved by a person as drafted, approved with corrections. */
  passed: string[];
  approved: string[];
  corrected: string[];
  waiting: string[];
  rejected: string[];
  /** Drafted cards with no review of their current draft: run `npm run review`. */
  notReviewed: string[];
  /** "id: what is wrong", by line number or field name. Such a card is left out. */
  problems: string[];
  /** Problems the deck validator found across cards ("id.field"). The deck is not written. */
  deckProblems: string[];
  /** Ids in the previous build that this one lacks. The deck is not written unless allowed. */
  dropped: string[];
  /** True when the cards differ from the previous build. */
  changed: boolean;
  /** Drafted cards past the first `size` in Learn order, left for a later batch. */
  beyondSize: string[];
  /** Cards among the first `size` that name a tip not shipped (not approved, or not drafted): left out until it is. */
  heldBack: string[];
}

/**
 * Leaves out every card naming a tip the deck does not ship. Such a card keeps its place among the first `size`,
 * as a card waiting for a decision does, so approving the tip later never pushes another card out.
 */
export function holdBackForTips(cards: Card[], tips: DeckTip[]): { kept: Card[]; heldBack: string[] } {
  const shipped = new Set(tips.map((t) => t.id));
  const held = (card: Card) => card.tip !== null && !shipped.has(card.tip);
  return { kept: cards.filter((c) => !held(c)), heldBack: cards.filter(held).map((c) => c.id) };
}

/** The order Learn shows a new learner: glue and content queues by rank, two content cards per glue card. */
export function learnOrder(cards: Card[]): Card[] {
  return learnQueue(cards, new Map());
}

/**
 * A drafted card with the learning path's fields, all empty for now: the tag pass (L5)
 * and the ordering build (L6) fill them. They come last, after the drafted fields.
 */
export function deckCard(draft: DraftCard): Card {
  return { ...draft, unit: null, requires: [], tip: null, why: null };
}

export function readDeckFile(file: string): Deck | null {
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Deck) : null;
}

export function deckText(deck: Deck): string {
  return `${JSON.stringify(deck, null, 2)}\n`;
}

export function buildDeck(
  drafts: DraftStore,
  reviews: ReviewStore,
  previous: Deck | null,
  {
    allowDrop = false,
    takes = {},
    size = Infinity,
    tips = [],
  }: {
    allowDrop?: boolean;
    takes?: Record<string, number>;
    size?: number;
    /** The approved tips, in the order they are met (`tipsForDeck` in tips.ts). */
    tips?: DeckTip[];
  } = {},
): DeckBuild {
  const build: DeckBuild = {
    deck: null,
    passed: [],
    approved: [],
    corrected: [],
    waiting: [],
    rejected: [],
    notReviewed: [],
    problems: [],
    deckProblems: [],
    dropped: [],
    changed: false,
    beyondSize: [],
    heldBack: [],
  };
  /** The cards for the deck, by drafted id: an approved card may carry a corrected id. */
  const cards = new Map<string, Card>();
  /** Every drafted card, waiting ones included: they fix which cards are the first `size`. */
  const drafted: Card[] = [];

  for (const word of allDrafted(drafts)) {
    for (const id of word.cards) {
      const draft = readDraftCard(drafts, id);
      if (!draft) continue;
      drafted.push(deckCard(draft));
      const review = reviews.get(id);
      if (!review || review.draft !== cardHash(draft)) {
        build.notReviewed.push(id);
        continue;
      }
      if (!review.flagged) {
        cards.set(id, deckCard(draft));
        build.passed.push(id);
        continue;
      }
      const decision = readDecision(reviews, id);
      if (!decision || decision.draft !== review.draft || decision.decision === "pending") {
        build.waiting.push(id);
        continue;
      }
      if (decision.errors.length) {
        build.problems.push(...decision.errors.map((e) => `${id}: ${e}`));
        continue;
      }
      if (decision.decision === "reject") {
        build.rejected.push(id);
        continue;
      }
      const card = cardFromDecision(draft, decision.fields);
      const validation = validateDraftCard(card);
      const fields = validation.ok ? [] : validation.errors.map((e) => e.replace(/^card [^.:]*\.?/, "").split(":")[0] || "card");
      if (idProblem(String((card as { id: unknown }).id), word.word, word.rank, word.kind)) fields.push("id");
      if (fields.length) {
        build.problems.push(`${id}: ${[...new Set(fields)].join(", ")}`);
        continue;
      }
      cards.set(id, deckCard(card as DraftCard));
      build.approved.push(id);
      if (!isDeepStrictEqual(card, draft)) build.corrected.push(id);
    }
  }

  // The first `size` in Learn order among the cards not rejected, waiting ones
  // included, so approving a waiting card later never pushes another card out.
  const inOrder = learnOrder(drafted.filter((c) => !build.rejected.includes(c.id)));
  const first = new Set(inOrder.slice(0, size).map((c) => c.id));
  build.beyondSize = inOrder.slice(size).map((c) => c.id);
  const { kept, heldBack } = holdBackForTips(
    [...cards].filter(([id]) => first.has(id)).map(([, card]) => card),
    tips,
  );
  build.heldBack = heldBack;
  // Clip paths carry a hash of the clip's text and take (G2), so a corrected sentence names a new clip.
  const ordered = learnOrder(kept.map((card) => ({ ...card, audio: audioPaths(card, takes) })));
  // A revised tip is a new deck revision too.
  const changed =
    !previous || JSON.stringify([previous.tips ?? [], previous.cards]) !== JSON.stringify([tips, ordered]);
  const version = !previous ? 1 : changed ? previous.version + 1 : previous.version;
  // Units join the deck in L6.
  const deck: Deck = { format: DECK_FORMAT, version, units: [], tips, cards: ordered };
  build.changed = changed;

  const validation = validateDeck(deck);
  if (!validation.ok) build.deckProblems = validation.errors.map((e) => e.replace(/^card /, "").split(":")[0]);
  const ids = new Set(ordered.map((c) => c.id));
  build.dropped = (previous?.cards ?? []).map((c) => c.id).filter((id) => !ids.has(id));

  if (!build.deckProblems.length && (allowDrop || !build.dropped.length)) build.deck = deck;
  return build;
}

/** Media paths in the deck with no file under `publicDir` yet. Art comes in F2; `npm run audio` makes the clips. */
export function missingMedia(deck: Deck, publicDir: string): { missing: number; total: number } {
  const paths = [
    ...deck.cards.flatMap((c) => [c.image, c.audio.word, c.audio.sentence]),
    ...deck.tips.flatMap((t) => t.examples.map((e) => e.audio)),
  ].filter((p): p is string => !!p);
  const missing = paths.filter((p) => !existsSync(path.join(publicDir, p))).length;
  return { missing, total: paths.length };
}
