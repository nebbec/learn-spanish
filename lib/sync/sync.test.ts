import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { isMemorized, isSeen, rateCard, replayReviews, type CardState } from "@/lib/scheduler";
import { LocalStore, type Rating, type RemoteReview, type Review } from "@/lib/store";
import { FakeRemote, sync, UPLOAD_CHUNK } from "@/lib/sync";

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 0, 1);

function device(deviceId: string): LocalStore {
  return new LocalStore({ indexedDB: new IDBFactory(), IDBKeyRange, deviceId });
}

/** Rates a card the way a session does: the review, then the cached card state. */
async function rate(store: LocalStore, cardId: string, rating: Rating, timestamp: number): Promise<void> {
  await store.appendReview({ cardId, direction: "forward", rating, section: "practice", timestamp });
  const prev = await store.getCardState<CardState>(cardId);
  await store.putCardState(rateCard(prev, cardId, rating, timestamp));
}

async function cardStates(store: LocalStore): Promise<CardState[]> {
  const rows = await store.getAllCardStates<CardState>();
  return rows.sort((a, b) => (a.cardId < b.cardId ? -1 : 1));
}

function withoutSynced(review: Review): RemoteReview {
  const { id, cardId, direction, rating, timestamp, section, deviceId } = review;
  return { id, cardId, direction, rating, timestamp, section, deviceId };
}

/** Everything about a device's reviews except which of them it has uploaded. */
async function reviewsOf(store: LocalStore): Promise<RemoteReview[]> {
  return (await store.getReviews()).map(withoutSynced);
}

let remote: FakeRemote;
let a: LocalStore;
let b: LocalStore;

beforeEach(() => {
  remote = new FakeRemote();
  a = device("device-a");
  b = device("device-b");
});

describe("two devices", () => {
  it("converge on identical card state after interleaved offline reviews", async () => {
    // Both devices study the same cards over three weeks without a connection,
    // their ratings alternating in time.
    const script: [LocalStore, string, Rating, number][] = [
      [a, "casa-house", "good", T0],
      [b, "ir-go", "again", T0 + 1000],
      [a, "ir-go", "nearly", T0 + 2000],
      [b, "casa-house", "good", T0 + 1 * DAY],
      [b, "de-of", "good", T0 + 1 * DAY + 500],
      [a, "casa-house", "again", T0 + 3 * DAY],
      [b, "ir-go", "good", T0 + 4 * DAY],
      [a, "de-of", "nearly", T0 + 6 * DAY],
      [b, "casa-house", "good", T0 + 9 * DAY],
      [a, "ir-go", "good", T0 + 12 * DAY],
      [a, "hablar-speak", "good", T0 + 12 * DAY + 1],
      [b, "de-of", "good", T0 + 20 * DAY],
      // The same card at the same millisecond on both devices.
      [a, "bueno-good", "good", T0 + 21 * DAY],
      [b, "bueno-good", "again", T0 + 21 * DAY],
    ];
    for (const [store, cardId, rating, at] of script) await rate(store, cardId, rating, at);

    // Before any sync each device knows only its own half.
    expect(await cardStates(a)).not.toEqual(await cardStates(b));

    await sync(a, remote);
    await sync(b, remote);
    await sync(a, remote);

    const statesA = await cardStates(a);
    expect(statesA).toEqual(await cardStates(b));
    expect(await reviewsOf(a)).toEqual(await reviewsOf(b));
    expect(await reviewsOf(a)).toHaveLength(script.length);

    // And that state is the replay of every review, not either device's own view.
    const expected = [...replayReviews(await a.getReviews()).values()];
    expect(statesA).toEqual(expected.sort((x, y) => (x.cardId < y.cardId ? -1 : 1)));
    expect(statesA.map((s) => s.cardId)).toEqual(["bueno-good", "casa-house", "de-of", "hablar-speak", "ir-go"]);
    expect(statesA.every((s) => isSeen(s))).toBe(true);
    expect(statesA.map(isMemorized)).toEqual((await cardStates(b)).map(isMemorized));

    expect((await a.listUnsynced()).reviews).toEqual([]);
    expect((await b.listUnsynced()).reviews).toEqual([]);
  });

  it("converge whichever device syncs first", async () => {
    async function run(order: "a-first" | "b-first"): Promise<CardState[]> {
      const server = new FakeRemote();
      const one = device("device-a");
      const two = device("device-b");
      await rate(one, "casa-house", "good", T0);
      await rate(two, "casa-house", "again", T0 + 2 * DAY);
      await rate(one, "casa-house", "good", T0 + 5 * DAY);
      await rate(two, "casa-house", "nearly", T0 + 9 * DAY);
      const [first, second] = order === "a-first" ? [one, two] : [two, one];
      await sync(first, server);
      await sync(second, server);
      await sync(first, server);
      expect(await cardStates(one)).toEqual(await cardStates(two));
      return cardStates(one);
    }
    expect(await run("a-first")).toEqual(await run("b-first"));
  });

  it("keep converging over several rounds of offline study", async () => {
    for (let round = 0; round < 3; round++) {
      const at = T0 + round * 7 * DAY;
      await rate(a, "casa-house", "good", at);
      await rate(b, "casa-house", round === 1 ? "again" : "good", at + DAY);
      await rate(b, "ir-go", "nearly", at + 2 * DAY);
      await rate(a, "ir-go", "good", at + 3 * DAY);
      await sync(b, remote);
      await sync(a, remote);
      await sync(b, remote);
      expect(await cardStates(a)).toEqual(await cardStates(b));
    }
    expect(await reviewsOf(a)).toHaveLength(12);
  });

  it("gives a new device the whole history", async () => {
    await rate(a, "casa-house", "good", T0);
    await rate(a, "casa-house", "good", T0 + 3 * DAY);
    await a.appendReview({ cardId: "ir-go", direction: "reverse", rating: "again", section: "practice", timestamp: T0 });
    await sync(a, remote);

    const result = await sync(b, remote);

    expect(result.downloaded.reviews).toBe(3);
    expect(result.replayed).toBe(true);
    expect(await cardStates(b)).toEqual(await cardStates(a));
    // The reverse review travels but never reaches card state.
    expect((await cardStates(b)).map((s) => s.cardId)).toEqual(["casa-house"]);
    // Downloaded rows keep the device that made them and are not sent back.
    expect((await b.getReviews()).every((r) => r.deviceId === "device-a" && r.synced === 1)).toBe(true);
  });
});

describe("upload", () => {
  it("sends unsynced reviews, notes and reports and marks them synced", async () => {
    await rate(a, "casa-house", "good", T0);
    await a.saveNote("casa-house", "casa sounds like castle", T0);
    await a.addReport("ir-go", "wrong example", T0);

    const result = await sync(a, remote);

    expect(result.uploaded).toEqual({ reviews: 1, notes: 1, reports: 1, resets: 0 });
    expect(remote.reviews.map((r) => r.cardId)).toEqual(["casa-house"]);
    expect(remote.reviews[0]).not.toHaveProperty("synced");
    expect(remote.notes).toEqual([{ cardId: "casa-house", text: "casa sounds like castle", updatedAt: T0 }]);
    expect(remote.reports).toEqual([
      { id: expect.any(String), cardId: "ir-go", comment: "wrong example", createdAt: T0 },
    ]);
    expect(await a.listUnsynced()).toEqual({ reviews: [], notes: [], reports: [], resets: [] });
  });

  it("sends nothing the second time", async () => {
    await rate(a, "casa-house", "good", T0);
    await sync(a, remote);
    const before = await cardStates(a);
    remote.calls.length = 0;

    const result = await sync(a, remote);

    expect(result.uploaded).toEqual({ reviews: 0, notes: 0, reports: 0, resets: 0 });
    expect(result.downloaded).toEqual({ reviews: 0, notes: 0, resets: 0 });
    expect(result.replayed).toBe(false);
    expect(remote.calls).toEqual(["pullResets", "pullReviews", "pullNotes"]);
    expect(remote.reviews).toHaveLength(1);
    expect(await cardStates(a)).toEqual(before);
  });

  it("keeps rows unsynced when the server cannot be reached, and sends them later", async () => {
    await rate(a, "casa-house", "good", T0);
    await a.saveNote("casa-house", "note", T0);
    remote.offline = true;

    await expect(sync(a, remote)).rejects.toThrow("offline");
    const unsynced = await a.listUnsynced();
    expect(unsynced.reviews).toHaveLength(1);
    expect(unsynced.notes).toHaveLength(1);

    remote.offline = false;
    await sync(a, remote);
    expect(remote.reviews).toHaveLength(1);
    expect(remote.notes).toHaveLength(1);
    expect((await a.listUnsynced()).reviews).toEqual([]);
  });

  it("uploads in chunks and resumes after one fails without duplicating", async () => {
    const count = UPLOAD_CHUNK * 2 + 5;
    for (let i = 0; i < count; i++) {
      await a.appendReview({
        cardId: `card-${i % 7}`,
        direction: "forward",
        rating: "good",
        section: "practice",
        timestamp: T0 + i * 1000,
      });
    }
    remote.failPushAfter = 1;

    await expect(sync(a, remote)).rejects.toThrow("refused");
    expect(remote.reviews).toHaveLength(UPLOAD_CHUNK);
    expect((await a.listUnsynced()).reviews).toHaveLength(count - UPLOAD_CHUNK);

    remote.failPushAfter = null;
    const result = await sync(a, remote);
    expect(result.uploaded.reviews).toBe(count - UPLOAD_CHUNK);
    expect(remote.reviews).toHaveLength(count);
    expect(new Set(remote.reviews.map((r) => r.id)).size).toBe(count);
  });
});

describe("download", () => {
  it("reads every page and carries on from where a failed download stopped", async () => {
    remote = new FakeRemote({ pageSize: 4 });
    for (let i = 0; i < 10; i++) await rate(a, `card-${i}`, "good", T0 + i * 1000);
    await sync(a, remote);

    // The connection drops after the first page.
    const flaky: FakeRemote = Object.create(remote);
    let pulls = 0;
    flaky.pullReviews = async (since) => {
      if (++pulls > 1) throw new Error("connection lost");
      return remote.pullReviews(since);
    };
    await expect(sync(b, flaky)).rejects.toThrow("connection lost");
    expect(await b.getReviews()).toHaveLength(4);
    expect(await b.getSyncCursor("reviews")).toBe("4");
    // The four that arrived are already in card state.
    expect(await cardStates(b)).toHaveLength(4);

    remote.calls.length = 0;
    const result = await sync(b, remote);
    expect(result.downloaded.reviews).toBe(6);
    expect(remote.calls.filter((c) => c === "pullReviews")).toHaveLength(2);
    expect(await cardStates(b)).toEqual(await cardStates(a));
  });

  it("delivers a review made long ago offline to a device that has already synced past it", async () => {
    await rate(a, "casa-house", "good", T0);
    await rate(b, "casa-house", "good", T0 + 10 * DAY);
    await sync(b, remote);
    await sync(b, remote);
    // Device A's older review reaches the server after B's newer one.
    await sync(a, remote);

    const result = await sync(b, remote);

    expect(result.downloaded.reviews).toBe(1);
    expect(await cardStates(b)).toEqual(await cardStates(a));
    expect((await cardStates(b))[0]).toEqual(
      rateCard(rateCard(undefined, "casa-house", "good", T0), "casa-house", "good", T0 + 10 * DAY),
    );
  });

  it("does not count or duplicate a device's own reviews coming back", async () => {
    await rate(a, "casa-house", "good", T0);
    const result = await sync(a, remote);

    expect(result.downloaded.reviews).toBe(0);
    expect(result.replayed).toBe(false);
    expect(await a.getReviews()).toHaveLength(1);
  });

  it("does not rebuild card state for reverse reviews alone", async () => {
    await a.appendReview({ cardId: "ir-go", direction: "reverse", rating: "good", section: "practice", timestamp: T0 });
    await sync(a, remote);

    const result = await sync(b, remote);

    expect(result.downloaded.reviews).toBe(1);
    expect(result.replayed).toBe(false);
    expect(await cardStates(b)).toEqual([]);
  });
});

describe("notes", () => {
  it("the latest edit wins, whichever device syncs first", async () => {
    for (const order of ["a-first", "b-first"] as const) {
      const server = new FakeRemote();
      const one = device("device-a");
      const two = device("device-b");
      await one.saveNote("casa-house", "older, from A", T0);
      await two.saveNote("casa-house", "newer, from B", T0 + 1000);
      const [first, second] = order === "a-first" ? [one, two] : [two, one];

      await sync(first, server);
      await sync(second, server);
      await sync(first, server);

      for (const store of [one, two]) {
        expect(await store.getNote("casa-house")).toEqual({
          cardId: "casa-house",
          text: "newer, from B",
          updatedAt: T0 + 1000,
          synced: 1,
        });
      }
      expect(server.notes).toEqual([{ cardId: "casa-house", text: "newer, from B", updatedAt: T0 + 1000 }]);
    }
  });

  it("keeps a local edit that is newer than the server's note and uploads it", async () => {
    await a.saveNote("casa-house", "first", T0);
    await sync(a, remote);
    await sync(b, remote);
    expect((await b.getNote("casa-house"))?.text).toBe("first");

    await b.saveNote("casa-house", "edited on B", T0 + 5000);
    await a.saveNote("casa-house", "edited on A, earlier", T0 + 2000);
    await sync(a, remote);
    await sync(b, remote);
    await sync(a, remote);

    expect((await a.getNote("casa-house"))?.text).toBe("edited on B");
    expect((await b.getNote("casa-house"))?.text).toBe("edited on B");
  });

  it("carries an emptied note to the other device", async () => {
    await a.saveNote("casa-house", "something", T0);
    await sync(a, remote);
    await sync(b, remote);

    await b.saveNote("casa-house", "", T0 + 1000);
    await sync(b, remote);
    await sync(a, remote);

    expect((await a.getNote("casa-house"))?.text).toBe("");
  });

  it("settles two edits at the same millisecond on the server's copy", async () => {
    await a.saveNote("casa-house", "from A", T0);
    await b.saveNote("casa-house", "from B", T0);

    await sync(a, remote);
    await sync(b, remote);
    await sync(a, remote);

    expect((await a.getNote("casa-house"))?.text).toBe("from A");
    expect((await b.getNote("casa-house"))?.text).toBe("from A");
    expect((await b.listUnsynced()).notes).toEqual([]);
  });

  it("keeps notes for different cards from both devices", async () => {
    await a.saveNote("casa-house", "A's note", T0);
    await b.saveNote("ir-go", "B's note", T0);

    await sync(a, remote);
    await sync(b, remote);
    await sync(a, remote);

    const texts = async (s: LocalStore) => (await s.getNotes()).map((n) => n.text).sort();
    expect(await texts(a)).toEqual(["A's note", "B's note"]);
    expect(await texts(b)).toEqual(["A's note", "B's note"]);
  });
});

describe("reports", () => {
  it("go up once and are not downloaded by other devices", async () => {
    await a.addReport("casa-house", null, T0);
    await sync(a, remote);
    await sync(a, remote);
    await sync(b, remote);

    expect(remote.reports).toHaveLength(1);
    expect(await b.getReports()).toEqual([]);
  });
});

describe("resets", () => {
  // The two-device check of L16: a "Start over" on one device clears progress on the
  // other once both have synced, and what either studies afterwards counts on both.
  it("a reset on one device clears progress on the other after both sync", async () => {
    await rate(a, "casa-house", "good", T0);
    await rate(b, "ir-go", "again", T0 + 1000);
    await rate(b, "de-of", "good", T0 + 2000);
    await b.saveNote("ir-go", "voy, vas, va", T0 + 3000);
    await sync(a, remote);
    await sync(b, remote);
    await sync(a, remote);
    expect((await cardStates(a)).map((s) => s.cardId)).toEqual(["casa-house", "de-of", "ir-go"]);
    expect(await cardStates(b)).toEqual(await cardStates(a));

    const reset = await a.startOver(T0 + DAY);
    expect(await cardStates(a)).toEqual([]);
    const uploaded = await sync(a, remote);
    expect(uploaded.uploaded.resets).toBe(1);
    expect(remote.resets).toEqual([{ id: reset.id, resetAt: T0 + DAY, deviceId: "device-a" }]);
    expect((await a.listUnsynced()).resets).toEqual([]);

    const result = await sync(b, remote);
    expect(result.downloaded.resets).toBe(1);
    expect(result.replayed).toBe(true);
    expect(await cardStates(b)).toEqual([]);
    expect(await b.getReviewsSinceReset()).toEqual([]);
    expect(await b.getResets()).toEqual([{ ...reset, synced: 1 }]);
    // Reviews and notes stay stored on both devices; they just no longer count.
    expect(await b.getReviews()).toHaveLength(3);
    expect((await b.getNote("ir-go"))?.text).toBe("voy, vas, va");

    // Studying after the reset counts on both devices.
    await rate(b, "hablar-speak", "good", T0 + 2 * DAY);
    await sync(b, remote);
    await sync(a, remote);
    expect((await cardStates(a)).map((s) => s.cardId)).toEqual(["hablar-speak"]);
    expect(await cardStates(a)).toEqual(await cardStates(b));
  });

  it("drops the other device's offline ratings made before the reset, and keeps later ones", async () => {
    // B studies offline on both sides of A's reset, and syncs after it.
    await rate(b, "ir-go", "good", T0);
    await rate(b, "de-of", "good", T0 + 2 * DAY);
    await a.startOver(T0 + DAY);
    await sync(a, remote);
    await sync(b, remote);
    await sync(a, remote);

    for (const store of [a, b]) {
      expect((await cardStates(store)).map((s) => s.cardId)).toEqual(["de-of"]);
    }
    const replayed = [...replayReviews(await a.getReviewsSinceReset()).values()];
    expect(await cardStates(a)).toEqual(replayed);
  });

  it("a reset arriving on its own still rebuilds card state, once", async () => {
    await rate(b, "casa-house", "good", T0);
    await sync(b, remote);
    await a.startOver(T0 + DAY);
    await sync(a, remote);
    remote.calls.length = 0;

    const result = await sync(b, remote);
    expect(result).toMatchObject({ downloaded: { reviews: 0, notes: 0, resets: 1 }, replayed: true });
    expect(await cardStates(b)).toEqual([]);

    // Nothing new the next time: no replay, and the reset is not counted again.
    const again = await sync(b, remote);
    expect(again).toMatchObject({ downloaded: { reviews: 0, notes: 0, resets: 0 }, replayed: false });
    expect(remote.resets).toHaveLength(1);
  });

  it("the latest of several resets is the one that counts", async () => {
    await rate(a, "casa-house", "good", T0);
    await rate(a, "ir-go", "good", T0 + 3 * DAY);
    await b.startOver(T0 + 2 * DAY);
    await a.startOver(T0 + DAY);
    await sync(a, remote);
    await sync(b, remote);
    await sync(a, remote);

    for (const store of [a, b]) {
      expect((await store.getResets()).map((r) => r.resetAt)).toEqual([T0 + DAY, T0 + 2 * DAY]);
      expect((await cardStates(store)).map((s) => s.cardId)).toEqual(["ir-go"]);
    }
  });

  it("go up again after the device moves to another account", async () => {
    await a.startOver(T0);
    await a.bindSyncAccount("user-1");
    await sync(a, remote);
    expect(await a.getSyncCursor("resets")).not.toBeNull();

    expect(await a.bindSyncAccount("user-2")).toBe(true);
    expect((await a.listUnsynced()).resets).toHaveLength(1);
    expect(await a.getSyncCursor("resets")).toBeNull();
  });
});

describe("the store's merge", () => {
  it("leaves a review it already has untouched, and survives a reopen", async () => {
    const idb = new IDBFactory();
    const first = new LocalStore({ indexedDB: idb, IDBKeyRange, deviceId: "device-a" });
    const mine = await first.appendReview({
      cardId: "casa-house",
      direction: "forward",
      rating: "good",
      section: "learn",
      timestamp: T0,
    });
    const other: RemoteReview = { ...withoutSynced(mine), id: "00000000-0000-4000-8000-000000000001", deviceId: "device-b" };

    const added = await first.mergeReviews([withoutSynced(mine), other, other], "7");

    expect(added.map((r) => r.id)).toEqual([other.id]);
    first.close();

    const second = new LocalStore({ indexedDB: idb, IDBKeyRange, deviceId: "device-a" });
    expect(await second.getSyncCursor("reviews")).toBe("7");
    expect(await second.getSyncCursor("notes")).toBeNull();
    expect(await second.getSyncCursor("resets")).toBeNull();
    expect((await second.getReviews()).map((r) => [r.deviceId, r.synced])).toEqual(
      expect.arrayContaining([
        ["device-a", 0],
        ["device-b", 1],
      ]),
    );
  });
});
