// The deck build: every drafted card that passed review, plus every flagged
// card a person approved (with their corrections), in Learn order, up to a
// size: the first `size` cards in Learn order, counting a card that still waits
// for a decision, so approving it later never pushes a card out. Checked by
// the deck validator and written to content/deck.json. An id in the previous
// build must still be there, so a rebuild can never rename or drop a card that
// progress may be keyed on. Approved tips (L4) ship beside the cards, and a
// card naming any other tip is held back until its tip is approved.
//
// Since L6 the order is the learning path's (path-order.ts), computed from the
// tag pass's tags: units, caps, `requires`, the frequency phase's interleave
// and sibling spacing. A card once in the deck stays; the size chooses which
// new cards join, from the top of the order; a card whose `requires` are not
// all in the deck is held back. The build also gives content/path.md's text.
//
// Nothing here prints card text: only ids, field names and counts.
//
// The rules are in docs/design.md under "Content pipeline", "Decided in E3",
// and "Learning path", "Decided in L6".

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { DECK_FORMAT, type Card, type Deck, type DeckTip, type DeckUnit, type DraftCard } from "@/lib/deck/types";
import { validateDeck, validateDraftCard } from "@/lib/deck/validate";
import { audioPaths, tipAudioPaths } from "./audio.mjs";
import { cardFromDecision, readDecision } from "./decisions";
import { checkExamples, type ExampleCheck, type Lemmas } from "./known-words";
import type { DraftStore } from "./drafting";
import { pathMarkdown, pathOrder, SIBLING_SPACING } from "./path-order";
import { allDrafted, cardHash, idProblem, readDraftCard, type ReviewStore } from "./reviewing";
import { tagProblems, TagStore } from "./tagging";
import { readTips, readUnits, type TipEntry, type Unit } from "./units";

/** What the learning path is computed from: the unit plan, the tip list and the tag pass's tags. */
export interface PathPlan {
  units: Unit[];
  tipList: TipEntry[];
  tags: TagStore;
}

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
  /** Cards among the first `size` that require a card not in the deck (waiting, rejected, held back): left out until it is. */
  heldForRequires: string[];
  /** Drafted cards (not rejected) with no current tag that passes the checks: placed as untagged frequency-phase cards. */
  notTagged: string[];
  /** Cards a unit's cap dropped to the frequency phase. */
  capped: string[];
  /** Why the order could not be computed (an unknown id, a cycle, a unit card before what it requires). The deck is not written. */
  orderProblems: string[];
  /** content/path.md: the computed order for a person to read (card text). Empty when the order has problems. */
  pathText: string;
  /** Every card not rejected, in the computed order (empty when the order has problems). */
  order: Card[];
  /** A card's drafted id by its id in `order`, where a decision corrected it. */
  draftIds: Map<string, string>;
  /** The known-words check of each card in `order` (L7), when the build was given the lemma list. */
  examples: Map<string, ExampleCheck>;
  /** Cards in the deck whose example uses words not met before them (L7): redraft with `npm run draft -- --examples`. */
  brokenExamples: string[];
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

/**
 * A drafted card with the learning path's fields, empty: `buildDeck` puts the tag pass's
 * tags on it. They come last, after the drafted fields.
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
    fresh = false,
    takes = {},
    size = Infinity,
    tips = [],
    plan = null,
    spacing = SIBLING_SPACING,
    lemmas = null,
  }: {
    allowDrop?: boolean;
    /** Choose the cards from the top of the order alone, as if no deck had been built (L9). Drops ids, so needs `allowDrop` to write. */
    fresh?: boolean;
    takes?: Record<string, number>;
    size?: number;
    /** The approved tips, in the order they are met (`tipsForDeck` in tips.ts). */
    tips?: DeckTip[];
    /** The unit plan, tip list and tags. Without one every card is an untagged frequency-phase card. */
    plan?: PathPlan | null;
    /** Sibling spacing (rule 4). */
    spacing?: number;
    /** E1's lemma list, for the known-words check (L7). Without it no example is checked. */
    lemmas?: Lemmas | null;
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
    heldForRequires: [],
    notTagged: [],
    capped: [],
    orderProblems: [],
    pathText: "",
    order: [],
    draftIds: new Map(),
    examples: new Map(),
    brokenExamples: [],
  };
  /** The cards for the deck, by drafted id: an approved card may carry a corrected id. */
  const cards = new Map<string, Card>();
  /** Every drafted card, waiting ones included: they hold their place in the order and the count. */
  const drafted: DraftCard[] = [];

  for (const word of allDrafted(drafts)) {
    for (const id of word.cards) {
      const draft = readDraftCard(drafts, id);
      if (!draft) continue;
      drafted.push(draft);
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

  // Tags are keyed by drafted id and name drafted ids; a corrected id takes their place.
  const rejected = new Set(build.rejected);
  const finalId = (id: string) => cards.get(id)?.id ?? id;
  const draftedIds = new Set(drafted.map((d) => d.id));
  const matched = new Map<string, Set<string>>();
  /** Cards that require a rejected card: never in the deck until tagged again. */
  const blocked = new Set<string>();
  const candidates: Card[] = [];
  for (const draft of drafted) {
    if (rejected.has(draft.id)) continue;
    const card = cards.get(draft.id) ?? deckCard(draft);
    const tag = plan?.tags.read(draft.id) ?? null;
    const current =
      tag !== null && tag.draft === cardHash(draft) && !tagProblems(tag, draftedIds, plan!.units, plan!.tipList).length;
    if (!current) {
      build.notTagged.push(draft.id);
      candidates.push(card);
      continue;
    }
    if (tag.unit && tag.want) matched.set(tag.unit, (matched.get(tag.unit) ?? new Set()).add(tag.want));
    if (tag.requires.some((r) => rejected.has(r))) blocked.add(card.id);
    const requires = tag.requires.filter((r) => !rejected.has(r)).map(finalId);
    candidates.push({ ...card, unit: tag.unit, requires, tip: tag.tip, why: tag.why ?? null });
  }

  const order = pathOrder(candidates, plan?.units ?? [], { spacing });
  if (order.problems.length) {
    build.orderProblems = order.problems;
    return build;
  }
  build.capped = order.capped;
  build.order = order.cards;
  for (const [id, card] of cards) if (card.id !== id) build.draftIds.set(card.id, id);
  if (lemmas) build.examples = checkExamples(order.cards, lemmas);

  // Growth: a card once in the deck stays; the size chooses which new cards join, from the top of
  // the order. A card waiting for a decision holds its place, so approving it later pushes no card out.
  const previousIds = new Set(fresh ? [] : (previous?.cards ?? []).map((c) => c.id));
  let room = size - order.cards.filter((c) => previousIds.has(c.id)).length;
  const chosen = order.cards.filter((c) => previousIds.has(c.id) || (room-- > 0));
  const chosenIds = new Set(chosen.map((c) => c.id));
  build.beyondSize = order.cards.filter((c) => !chosenIds.has(c.id)).map((c) => c.id);

  const ready = new Set([...cards.values()].map((c) => c.id));
  const { kept: tipKept, heldBack } = holdBackForTips(chosen.filter((c) => ready.has(c.id)), tips);
  build.heldBack = heldBack;
  // In path order a card's requires come first, so one pass holds back every card above a missing one.
  const kept: Card[] = [];
  const keptIds = new Set<string>();
  for (const card of tipKept) {
    if (blocked.has(card.id) || !card.requires.every((r) => keptIds.has(r))) {
      build.heldForRequires.push(card.id);
      continue;
    }
    kept.push(card);
    keptIds.add(card.id);
  }

  // Clip paths carry a hash of the clip's text and take (G2), so a corrected sentence names a new clip.
  const ordered = kept.map((card) => ({ ...card, audio: audioPaths(card, takes) }));
  // Tip example clips are named the same way (L8), with their takes.
  const shippedTips = tips.map((tip) => tipAudioPaths(tip, takes));
  const units: DeckUnit[] = (plan?.units ?? [])
    .filter((u) => ordered.some((c) => c.unit === u.id))
    .map(({ id, title, goal }) => ({ id, title, goal }));
  // A revised tip or unit is a new deck revision too.
  const changed =
    !previous ||
    JSON.stringify([previous.units ?? [], previous.tips ?? [], previous.cards]) !== JSON.stringify([units, shippedTips, ordered]);
  const version = !previous ? 1 : changed ? previous.version + 1 : previous.version;
  const deck: Deck = { format: DECK_FORMAT, version, units, tips: shippedTips, cards: ordered };
  build.changed = changed;

  const notes = new Map<string, string>();
  const note = (ids: string[], why: string) => ids.forEach((id) => notes.set(finalId(id), `not in the deck: ${why}`));
  note(build.notReviewed, "not reviewed yet");
  note(build.waiting, "waiting for your decision");
  note(build.problems.map((p) => p.split(":")[0]), "its decision file has a problem");
  note(build.heldBack, "its tip is not approved");
  note(build.heldForRequires, "a card it requires is not in the deck");
  note(build.beyondSize, "past the deck size");
  build.brokenExamples = kept.filter((c) => build.examples.get(c.id)?.ok === false).map((c) => c.id);
  for (const [id, check] of build.examples) {
    if (check.ok) continue;
    const words = [...check.unknown, ...check.cognates].join(", ");
    notes.set(id, [notes.get(id), `example uses words not met yet: ${words}`].filter(Boolean).join("; "));
  }
  build.pathText = pathMarkdown({ order, units: plan?.units ?? [], notes, matched });

  const validation = validateDeck(deck);
  if (!validation.ok) build.deckProblems = validation.errors.map((e) => e.replace(/^card /, "").split(":")[0]);
  const ids = new Set(ordered.map((c) => c.id));
  build.dropped = (previous?.cards ?? []).map((c) => c.id).filter((id) => !ids.has(id));

  if (!build.deckProblems.length && (allowDrop || !build.dropped.length)) build.deck = deck;
  return build;
}

/**
 * The learning path's order and known-words checks as the deck build would compute them from the files under
 * `root` (content/units.json, content/tips.json, content/tags): for the review pass and the example redraft (L7),
 * which need each card's place but not the deck itself.
 */
export function pathOnDisk(root: string, drafts: DraftStore, reviews: ReviewStore, lemmas: Lemmas): DeckBuild {
  const plan = { units: readUnits(root), tipList: readTips(root), tags: new TagStore(path.join(root, "content", "tags")) };
  return buildDeck(drafts, reviews, null, { plan, lemmas });
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
