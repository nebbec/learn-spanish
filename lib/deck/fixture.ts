// The 16-card fixture deck, for tests: twelve word cards, and since L2 two form
// cards, two phrase cards, two units and a tip. The app served it at DECK_URL until
// 2026-10-03, when the real deck took its place; its art and clips stay in
// public/deck.

import raw from "./fixture.json";
import { indexDeck, type LoadedDeck } from "./load";
import { parseDeck } from "./validate";

export const fixtureDeck: LoadedDeck = indexDeck(parseDeck(raw));

/** A fixture card by id. Throws if the id is not in the fixture. */
export function fixtureCard(id: string) {
  const card = fixtureDeck.byId.get(id);
  if (!card) throw new Error(`No fixture card "${id}"`);
  return card;
}
