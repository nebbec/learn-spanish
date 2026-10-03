// The deck build: every drafted card that passed review, plus every flagged
// card a person approved (with their corrections), in Learn order, checked by
// the deck validator and written to content/deck.json. An id in the previous
// build must still be there, so a rebuild can never rename or drop a card that
// progress may be keyed on.
//
// Nothing here prints card text: only ids, field names and counts.
//
// The rules are in docs/design.md under "Content pipeline", "Decided in E3".

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import type { Card, Deck } from "@/lib/deck/types";
import { validateCard, validateDeck } from "@/lib/deck/validate";
import { learnQueue } from "@/lib/queues";
import { audioPaths } from "./audio.mjs";
import { cardFromDecision, readDecision } from "./decisions";
import type { DraftStore } from "./drafting";
import { cardHash, draftedWords, idProblem, readDraftCard, type ReviewStore } from "./reviewing";

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
}

/** The order Learn shows a new learner: glue and content queues by rank, two content cards per glue card. */
export function learnOrder(cards: Card[]): Card[] {
  return learnQueue(cards, new Map());
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
  { allowDrop = false, takes = {} }: { allowDrop?: boolean; takes?: Record<string, number> } = {},
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
  };
  const cards: Card[] = [];

  for (const word of draftedWords(drafts)) {
    for (const id of word.cards) {
      const draft = readDraftCard(drafts, id);
      if (!draft) continue;
      const review = reviews.get(id);
      if (!review || review.draft !== cardHash(draft)) {
        build.notReviewed.push(id);
        continue;
      }
      if (!review.flagged) {
        cards.push(draft);
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
      const validation = validateCard(card);
      const fields = validation.ok ? [] : validation.errors.map((e) => e.replace(/^card [^.:]*\.?/, "").split(":")[0] || "card");
      if (idProblem(String((card as { id: unknown }).id), word.word, word.rank)) fields.push("id");
      if (fields.length) {
        build.problems.push(`${id}: ${[...new Set(fields)].join(", ")}`);
        continue;
      }
      cards.push(card as Card);
      build.approved.push(id);
      if (!isDeepStrictEqual(card, draft)) build.corrected.push(id);
    }
  }

  // Clip paths carry a hash of the clip's text and take (G2), so a corrected sentence names a new clip.
  const ordered = learnOrder(cards.map((card) => ({ ...card, audio: audioPaths(card, takes) })));
  const changed = !previous || JSON.stringify(previous.cards) !== JSON.stringify(ordered);
  const deck: Deck = { version: !previous ? 1 : changed ? previous.version + 1 : previous.version, cards: ordered };
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
  const paths = deck.cards.flatMap((c) => [c.image, c.audio.word, c.audio.sentence]).filter((p): p is string => !!p);
  const missing = paths.filter((p) => !existsSync(path.join(publicDir, p))).length;
  return { missing, total: paths.length };
}
