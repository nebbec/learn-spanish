import { describe, expect, it } from "vitest";
import { fixtureCard, fixtureDeck } from "@/lib/deck/fixture";
import { rateCard, type CardState } from "@/lib/scheduler";
import {
  MEDIA_CACHE,
  cardMedia,
  deckMedia,
  formatBytes,
  mediaStatus,
  storeMedia,
  wantedMedia,
  type MediaCaches,
  type StoreProgress,
} from "./media";

const cards = fixtureDeck.cards;
const NOW = Date.UTC(2026, 9, 2, 9, 0, 0);

const seen = (...ids: string[]) =>
  new Map<string, CardState>(ids.map((id) => [id, rateCard(undefined, id, "good", NOW)]));

/** A cache store kept in a Map, and a server that can be switched off or lose a file. */
function device(files: Record<string, string>) {
  const stores = new Map<string, Map<string, Response>>();
  const state = { online: true, requests: [] as string[] };
  const caches: MediaCaches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name)!;
      return {
        match: async (url) => store.get(url)?.clone(),
        put: async (url, response) => void store.set(url, response),
      };
    },
  };
  const fetch = async (url: string) => {
    state.requests.push(url);
    if (!state.online) throw new TypeError("Failed to fetch");
    const body = files[url];
    return body === undefined ? new Response("Not found", { status: 404 }) : new Response(body, { status: 200 });
  };
  const stored = () => [...(stores.get(MEDIA_CACHE)?.keys() ?? [])];
  return { caches, fetch, state, stored };
}

describe("which files", () => {
  it("lists a content card's still and two clips, and a glue card's two clips", () => {
    const casa = fixtureCard("casa-house");
    expect(cardMedia(casa)).toEqual([casa.image, casa.audio.word, casa.audio.sentence]);
    const de = fixtureCard("de-of");
    expect(de.image).toBeNull();
    expect(cardMedia(de)).toEqual([de.audio.word, de.audio.sentence]);
  });

  it("lists every file in the deck once", () => {
    const all = deckMedia(cards);
    expect(new Set(all).size).toBe(all.length);
    // 9 content cards with a still (the form cards share ir-go's), and two clips for each of the 16 cards.
    expect(all).toHaveLength(9 + 32);
  });

  it("wants the next Learn batches, soonest first, and nothing beyond them", () => {
    // One batch of three ahead: the deck file's first three cards (two form cards share ir-go's still).
    const wanted = wantedMedia(cards, new Map(), 1, 3);
    expect(wanted).toEqual([...new Set(["ir-form-yo", "ir-form-tu", "casa-house"].flatMap((id) => cardMedia(fixtureCard(id))))]);
    // The next three: phrase-going-home (two clips, no still), bueno-good and ahora-now (three files each).
    expect(wantedMedia(cards, new Map(), 2, 3)).toHaveLength(wanted.length + 8);
    expect(wantedMedia(cards, new Map(), 0, 3)).toEqual([]);
  });

  it("wants every seen card as well as the batches ahead", () => {
    const states = seen("ir-form-yo", "ir-form-tu", "casa-house", "phrase-going-home", "carro-car");
    const wanted = wantedMedia(cards, states, 1, 3);
    // Ahead: the next three unseen cards. Seen: all five, however far down the deck.
    const ahead = ["bueno-good", "ahora-now", "phrase-thats-great"];
    const seenIds = ["ir-form-yo", "ir-form-tu", "casa-house", "phrase-going-home", "carro-car"];
    const expected = new Set([...ahead, ...seenIds].flatMap((id) => cardMedia(fixtureCard(id))));
    expect([...wanted].sort()).toEqual([...expected].sort());
    expect(wanted.slice(0, 3)).toEqual(cardMedia(fixtureCard("bueno-good")));
  });

  it("wants the whole deck when the batches ahead cover it", () => {
    expect([...wantedMedia(cards, new Map())].sort()).toEqual([...deckMedia(cards)].sort());
  });
});

describe("storing", () => {
  const files = { "/deck/img/a.svg": "<svg/>", "/deck/audio/a.word.wav": "12345", "/deck/audio/a.sentence.wav": "1234567890" };
  const urls = Object.keys(files);

  it("stores each file under its path and reports progress after each", async () => {
    const d = device(files);
    const seenProgress: StoreProgress[] = [];
    const result = await storeMedia(urls, { ...d, onProgress: (p) => seenProgress.push(p) });

    expect(result).toEqual({ done: 3, total: 3, failed: 0 });
    expect(seenProgress.map((p) => p.done)).toEqual([1, 2, 3]);
    expect(d.stored().sort()).toEqual([...urls].sort());
  });

  it("does not fetch a file that is already stored", async () => {
    const d = device(files);
    await storeMedia(urls.slice(0, 2), d);
    d.state.requests.length = 0;

    const result = await storeMedia(urls, d);
    expect(d.state.requests).toEqual([urls[2]]);
    expect(result).toEqual({ done: 3, total: 3, failed: 0 });
  });

  it("skips a missing file and stores the rest", async () => {
    const d = device(files);
    const result = await storeMedia([...urls, "/deck/img/gone.svg"], d);
    expect(result).toEqual({ done: 4, total: 4, failed: 1 });
    expect(d.stored()).not.toContain("/deck/img/gone.svg");
    expect(d.stored()).toHaveLength(3);
  });

  it("stores nothing with no connection, and catches up on the next run", async () => {
    const d = device(files);
    d.state.online = false;
    expect(await storeMedia(urls, d)).toEqual({ done: 3, total: 3, failed: 3 });
    expect(d.stored()).toEqual([]);

    d.state.online = true;
    expect(await storeMedia(urls, d)).toEqual({ done: 3, total: 3, failed: 0 });
    expect(d.stored()).toHaveLength(3);
  });

  it("stores many more files than it fetches at once", async () => {
    const many = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`/deck/audio/${i}.wav`, "x"]));
    const d = device(many);
    expect(await storeMedia(Object.keys(many), d)).toEqual({ done: 40, total: 40, failed: 0 });
    expect(d.stored()).toHaveLength(40);
  });

  it("counts the stored files and adds up their size", async () => {
    const d = device(files);
    expect(await mediaStatus(urls, d.caches)).toEqual({ stored: 0, total: 3, bytes: 0 });
    await storeMedia(urls.slice(1), d);
    expect(await mediaStatus(urls, d.caches)).toEqual({ stored: 2, total: 3, bytes: 15 });
  });
});

describe("formatBytes", () => {
  it("writes sizes for people", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(900)).toBe("900 B");
    expect(formatBytes(40 * 1024)).toBe("40 KB");
    expect(formatBytes(1.25 * 1024 * 1024)).toBe("1.3 MB");
    expect(formatBytes(75 * 1024 * 1024)).toBe("75.0 MB");
  });
});
