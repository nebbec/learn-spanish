// Deck loader for the app. The deck is a static file under public/, so the
// service worker can cache it and a deck revision needs no code change.

import type { Card, Deck } from "./types";
import { parseDeck } from "./validate";

export const DECK_URL = "/deck/deck.json";

export interface LoadedDeck extends Deck {
  /** Look a card up by id. */
  byId: ReadonlyMap<string, Card>;
}

export function indexDeck(deck: Deck): LoadedDeck {
  return { ...deck, byId: new Map(deck.cards.map((card) => [card.id, card])) };
}

type Fetch = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

let cached: Promise<LoadedDeck> | null = null;

/** Fetches and validates the deck without caching. Throws on a failed request or an invalid deck. */
export async function fetchDeck(fetchImpl: Fetch = fetch, url: string = DECK_URL): Promise<LoadedDeck> {
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`Could not load the deck: ${url} returned ${response.status}`);
  return indexDeck(parseDeck(await response.json()));
}

/** The deck, fetched once per page load. A failed load is not cached, so a later call retries. */
export function loadDeck(fetchImpl?: Fetch): Promise<LoadedDeck> {
  if (!cached) {
    cached = fetchDeck(fetchImpl).catch((error) => {
      cached = null;
      throw error;
    });
  }
  return cached;
}

/** For tests. */
export function clearDeckCache() {
  cached = null;
}
