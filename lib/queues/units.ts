// Units in Learn: which cards the next Learn batch takes. In the starter path a batch is
// one unit; after it, batches are cut by size. See "Units in Learn" and "Decided in L12"
// in docs/design.md.
//
// Like the tips, this is worked out from progress with no store of its own: how far the
// learner has got is the furthest place in the path holding a seen card.

import type { Card, DeckUnit } from "@/lib/deck/types";
import { isSeen } from "@/lib/scheduler";
import type { CardStates } from "./queues";

/** Where the next Learn batch comes from. */
export interface LearnCut {
  /** The starter unit the batch studies, or null once the starter path is behind. */
  unit: DeckUnit | null;
  /** Cards added to units the learner had already finished. They lead the batch. */
  added: Card[];
  /** The batch's cards in the order shown: `added`, then the unit's or the frequency phase's. */
  cards: Card[];
}

/** A card's place among the units: its unit's index, or -1 in the frequency phase. */
function placeOf(units: readonly DeckUnit[]): (card: Card) => number {
  const index = new Map(units.map((unit, i) => [unit.id, i]));
  return (card) => (card.unit === null ? -1 : (index.get(card.unit) ?? -1));
}

/**
 * The next Learn batch's cards. The learner has got as far as the latest unit holding a
 * seen card, or past every unit once a frequency-phase card is seen. The batch is the
 * unseen cards of the earliest unit from there on that has any, whatever their number;
 * with no such unit, the first `batchSize` unseen frequency-phase cards. Unseen cards of
 * units before that point were added after the learner finished them: up to `batchSize`
 * of them lead the batch. Every list keeps the deck file's order.
 */
export function learnCut(
  cards: readonly Card[],
  states: CardStates,
  units: readonly DeckUnit[],
  batchSize: number,
): LearnCut {
  const place = placeOf(units);
  const size = Math.max(0, batchSize);
  const seen = (card: Card) => isSeen(states.get(card.id));

  let reached = -1;
  for (const card of cards) {
    if (!seen(card)) continue;
    const at = place(card);
    reached = Math.max(reached, at === -1 ? units.length : at);
  }
  const from = Math.max(0, reached);

  const unseen = cards.filter((card) => !seen(card));
  const added = unseen.filter((card) => place(card) !== -1 && place(card) < from).slice(0, size);
  const current = units.findIndex((unit, i) => i >= from && unseen.some((card) => card.unit === unit.id));
  if (current !== -1) {
    const unit = units[current];
    return { unit, added, cards: [...added, ...unseen.filter((card) => card.unit === unit.id)] };
  }
  const frequency = unseen.filter((card) => place(card) === -1).slice(0, Math.max(0, size - added.length));
  return { unit: null, added, cards: [...added, ...frequency] };
}

/** "Unit 3 · How and where I am": the unit's number in the path and its title. */
export function unitName(units: readonly DeckUnit[], unit: DeckUnit): string {
  return `Unit ${units.findIndex((other) => other.id === unit.id) + 1} · ${unit.title}`;
}

/** The unit a card belongs to, if the deck lists it. */
export function unitOf(units: readonly DeckUnit[], card: Card): DeckUnit | undefined {
  return card.unit === null ? undefined : units.find((unit) => unit.id === card.unit);
}

/** Whether every card of the unit has been seen. */
export function isUnitComplete(unit: DeckUnit, cards: readonly Card[], states: CardStates): boolean {
  return cards.every((card) => card.unit !== unit.id || isSeen(states.get(card.id)));
}

/** The unit's phrase cards in deck order: what its batch end says the learner can now say. */
export function unitPhrases(unit: DeckUnit, cards: readonly Card[]): Card[] {
  return cards.filter((card) => card.unit === unit.id && card.kind === "phrase");
}
