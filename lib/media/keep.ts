// The browser side of media caching: reads the deck and the progress on this
// device and stores the art and audio the next sittings need.

import { loadDeck } from "@/lib/deck";
import { replayReviews } from "@/lib/scheduler";
import { localStore } from "@/lib/store";
import { storeMedia, wantedMedia, type MediaCaches } from "./media";

/** The browser's cache store, or null where there is none (an insecure page, an old browser, the server). */
export function browserCaches(): MediaCaches | null {
  return typeof caches === "undefined" ? null : caches;
}

let running: Promise<void> | null = null;
let askedAgain = false;

async function keepOnce(): Promise<void> {
  const store = browserCaches();
  if (!store) return;
  const [deck, reviews] = await Promise.all([loadDeck(), localStore().getReviews()]);
  await storeMedia(wantedMedia(deck.cards, replayReviews(reviews)), { caches: store, fetch: (url) => fetch(url) });
}

/**
 * Stores the art and audio for the next few Learn batches and for every seen
 * card. Safe to call often: files already stored are skipped, and a call made
 * while one is running makes it run once more when it ends. Never throws; with
 * no connection it stores nothing and the next call tries again.
 */
export function keepMediaStored(): Promise<void> {
  if (running) {
    askedAgain = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        askedAgain = false;
        await keepOnce();
      } while (askedAgain);
    } catch {
      // The deck or the store could not be read. Nothing to do until the next call.
    } finally {
      running = null;
    }
  })();
  return running;
}
