// The 16-card fixture deck, for tests: twelve word cards, and since L2 two form
// cards, two phrase cards, two units and a tip. The app served it at DECK_URL until
// 2026-10-03, when the real deck took its place; its art and clips stay in
// public/deck.
//
// Since DE3 there is a German fixture too (`fixtureDeckDe`, lib/deck/fixture-de.json):
// nouns of three genders, a strong and a separable verb, an adjective, a glue card,
// a form card, a phrase card, two case cards, a regional footnote, a unit and a tip.
// Its media paths are placeholders, apart from two Spanish stills reused by meaning.

import raw from "./fixture.json";
import rawDe from "./fixture-de.json";
import { indexDeck, type LoadedDeck } from "./load";
import type { Card } from "./types";
import { parseDeck } from "./validate";

export const fixtureDeck: LoadedDeck = indexDeck(parseDeck(raw, "es"));

export const fixtureDeckDe: LoadedDeck = indexDeck(parseDeck(rawDe, "de"));

/** A fixture card by id. Throws if the id is not in the fixture. */
export function fixtureCard(id: string): Card<"es"> {
  const card = fixtureDeck.byId.get(id);
  if (!card) throw new Error(`No fixture card "${id}"`);
  return card as Card<"es">;
}

/** A German fixture card by id. Throws if the id is not in the German fixture. */
export function fixtureCardDe(id: string): Card<"de"> {
  const card = fixtureDeckDe.byId.get(id);
  if (!card) throw new Error(`No German fixture card "${id}"`);
  return card as Card<"de">;
}
