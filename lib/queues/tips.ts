// Tips in the app: when a tip screen joins a Learn batch, and which tips are reached.
// See "Tips" and "Decided in L11" in docs/design.md.
//
// "Shown once" is worked out from progress, with no store of its own: a tip is shown
// while no card naming it has been seen, and reached once one has.

import type { Card, DeckTip } from "@/lib/deck/types";
import { isSeen } from "@/lib/scheduler";
import type { CardStates } from "./queues";

/** The tip a card names, if the deck ships it. */
export function tipOf(tips: readonly DeckTip[], card: Card): DeckTip | undefined {
  return card.tip === null ? undefined : tips.find((tip) => tip.id === card.tip);
}

/** Whether a card naming the tip has been seen. */
export function isTipReached(tip: DeckTip, cards: readonly Card[], states: CardStates): boolean {
  return cards.some((card) => card.tip === tip.id && isSeen(states.get(card.id)));
}

/** Every tip reached, in the deck's order: the Tips list. */
export function reachedTips(tips: readonly DeckTip[], cards: readonly Card[], states: CardStates): DeckTip[] {
  return tips.filter((tip) => isTipReached(tip, cards, states));
}
