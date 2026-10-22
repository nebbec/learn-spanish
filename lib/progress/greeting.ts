// The menu's one line under the mascot, in the language being learned (its text is the build's
// `greetings` in lang/). See docs/design.md, "Menu", "Decided in U1" and "Decided in U3".

import { LANG } from "@/lang";
import type { Card, DeckUnit } from "@/lib/deck";
import { currentUnit, isUnitComplete, type CardStates } from "@/lib/queues";
import { isDue, isSeen } from "@/lib/scheduler";

/** Which line the menu shows. The key names the line's clip too (U4). */
export type Greeting = "hola" | "vamos" | "muy-bien";

export const GREETING_TEXT: Readonly<Record<Greeting, string>> = LANG.greetings;

/**
 * ¡Hola! with nothing seen yet; ¡Muy bien! when nothing is due and the unit the
 * learner is on has no unseen card left (in the frequency phase there is no such
 * unit, so nothing due is enough); ¡Vamos! otherwise.
 */
export function menuGreeting(
  cards: readonly Card[],
  units: readonly DeckUnit[],
  states: CardStates,
  now: number,
): Greeting {
  if (!cards.some((card) => isSeen(states.get(card.id)))) return "hola";
  const due = cards.some((card) => isDue(states.get(card.id), now));
  const unit = currentUnit(cards, states, units);
  const unitLeft = unit !== null && !isUnitComplete(unit, cards, states);
  return due || unitLeft ? "vamos" : "muy-bien";
}
