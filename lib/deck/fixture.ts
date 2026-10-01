// The 12-card fixture deck, for tests and for building screens before the
// content pipeline exists. It is the same file the app serves at DECK_URL
// until H1 replaces it with the real deck.

import raw from "@/public/deck/deck.json";
import { indexDeck, type LoadedDeck } from "./load";
import { parseDeck } from "./validate";

export const fixtureDeck: LoadedDeck = indexDeck(parseDeck(raw));

/** A fixture card by id. Throws if the id is not in the fixture. */
export function fixtureCard(id: string) {
  const card = fixtureDeck.byId.get(id);
  if (!card) throw new Error(`No fixture card "${id}"`);
  return card;
}
