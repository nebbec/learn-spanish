// Keeps art and audio on the device, so cards show and play with no connection.
// See docs/design.md, "Installable app".
//
// The files go into a cache of their own, which the service worker reads but
// never writes or deletes (public/sw.js). The page fills it: a few Learn batches
// ahead plus every seen card as a matter of course, and the whole deck when
// "Download everything" is pressed in settings.

import type { Card } from "@/lib/deck/types";
import { DEFAULT_BATCH_SIZE, learnQueue, type CardStates } from "@/lib/queues";
import { isSeen } from "@/lib/scheduler";

/** The cache that holds art and audio. Its name must not start with the worker's shell prefix. */
export const MEDIA_CACHE = "learn-spanish-media";

/** How many Learn batches of art and audio are kept ahead of the next unseen card. */
export const BATCHES_AHEAD = 3;

/** How many files are fetched at once. */
const PARALLEL = 6;

/** The part of the browser's `Cache` this module uses. Tests pass a pretend one. */
export interface MediaCache {
  match(url: string): Promise<Response | undefined>;
  put(url: string, response: Response): Promise<void>;
}

export interface MediaCaches {
  open(name: string): Promise<MediaCache>;
}

export type MediaFetch = (url: string) => Promise<Response>;

/** A card's files: its still, if it has one, and its two clips. */
export function cardMedia(card: Card): string[] {
  return [...(card.image ? [card.image] : []), card.audio.word, card.audio.sentence];
}

function mediaOf(cards: readonly Card[]): string[] {
  return [...new Set(cards.flatMap(cardMedia))];
}

/** Every file the deck names, each once, in deck order. */
export function deckMedia(cards: readonly Card[]): string[] {
  return mediaOf(cards);
}

/**
 * The files to keep without being asked: those of the next `batchesAhead` Learn
 * batches, soonest first, then those of every seen card.
 */
export function wantedMedia(
  cards: readonly Card[],
  states: CardStates,
  batchesAhead: number = BATCHES_AHEAD,
  batchSize: number = DEFAULT_BATCH_SIZE,
): string[] {
  const ahead = learnQueue(cards, states).slice(0, Math.max(0, batchesAhead * batchSize));
  const seen = cards.filter((card) => isSeen(states.get(card.id)));
  return mediaOf([...ahead, ...seen]);
}

/** Runs `work` over `items`, a few at a time. */
async function inParallel<T>(items: readonly T[], work: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const item = items[next];
      next += 1;
      await work(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(PARALLEL, items.length) }, worker));
}

export interface StoreProgress {
  /** Files dealt with so far: already stored, newly stored or failed. */
  done: number;
  total: number;
  /** Files that could not be fetched. They are tried again on the next run. */
  failed: number;
}

export interface StoreOptions {
  caches: MediaCaches;
  fetch: MediaFetch;
  /** Called after each file. */
  onProgress?: (progress: StoreProgress) => void;
}

/**
 * Stores each file that is not stored yet. A file that cannot be fetched is
 * counted and skipped, so one bad file or a dropped connection does not stop
 * the rest. Never throws for a failed file.
 */
export async function storeMedia(urls: readonly string[], options: StoreOptions): Promise<StoreProgress> {
  const cache = await options.caches.open(MEDIA_CACHE);
  const progress: StoreProgress = { done: 0, total: urls.length, failed: 0 };

  await inParallel(urls, async (url) => {
    try {
      if (!(await cache.match(url))) {
        const response = await options.fetch(url);
        // Only a whole file is kept: not an error page, and not part of a file.
        if (response.status !== 200) throw new Error(`${url} returned ${response.status}`);
        await cache.put(url, response);
      }
    } catch {
      progress.failed += 1;
    }
    progress.done += 1;
    options.onProgress?.({ ...progress });
  });

  return progress;
}

export interface MediaStatus {
  /** How many of the files are stored. */
  stored: number;
  total: number;
  /** The size of the stored files together. */
  bytes: number;
}

/** How many of `urls` are on the device, and how much room they take. */
export async function mediaStatus(urls: readonly string[], caches: MediaCaches): Promise<MediaStatus> {
  const cache = await caches.open(MEDIA_CACHE);
  const status: MediaStatus = { stored: 0, total: urls.length, bytes: 0 };
  await inParallel(urls, async (url) => {
    const response = await cache.match(url);
    if (!response) return;
    const size = (await response.blob()).size;
    status.stored += 1;
    status.bytes += size;
  });
  return status;
}

/** A size for people: "640 KB", "1.2 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
