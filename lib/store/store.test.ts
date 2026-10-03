import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import Dexie from "dexie";
import { DB_NAME, LocalStore, getDeviceId, type CardStateRow } from "@/lib/store";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

let idb: IDBFactory;
let store: LocalStore;

/** A second connection to the same in-memory database, as after a page reload. */
function reopen(): LocalStore {
  return new LocalStore({ indexedDB: idb, IDBKeyRange, deviceId: "device-a" });
}

beforeEach(() => {
  idb = new IDBFactory();
  store = reopen();
});

describe("reviews", () => {
  it("appends a review with an id, device id, timestamp and unsynced flag", async () => {
    const before = Date.now();
    const review = await store.appendReview({
      cardId: "casa-house",
      direction: "forward",
      rating: "good",
      section: "learn",
    });

    expect(review.id).toMatch(UUID);
    expect(review.deviceId).toBe("device-a");
    expect(review.synced).toBe(0);
    expect(review.timestamp).toBeGreaterThanOrEqual(before);
    expect(await store.getReviews()).toEqual([review]);
  });

  it("returns reviews oldest first, whatever order they were stored in", async () => {
    const base = { cardId: "ir-go", direction: "forward", section: "practice" } as const;
    await store.appendReview({ ...base, rating: "again", timestamp: 300 });
    await store.appendReview({ ...base, rating: "good", timestamp: 100 });
    await store.appendReview({ ...base, rating: "nearly", timestamp: 200 });

    const reviews = await store.getReviews();
    expect(reviews.map((r) => r.timestamp)).toEqual([100, 200, 300]);
    expect(reviews.map((r) => r.rating)).toEqual(["good", "nearly", "again"]);
  });

  it("breaks timestamp ties by id", async () => {
    const base = { cardId: "ir-go", direction: "forward", rating: "good", section: "learn" } as const;
    for (let i = 0; i < 5; i++) await store.appendReview({ ...base, timestamp: 50 });

    const ids = (await store.getReviews()).map((r) => r.id);
    expect(ids).toEqual([...ids].sort());
  });

  it("filters by card and by direction", async () => {
    const base = { rating: "good", section: "practice" } as const;
    await store.appendReview({ ...base, cardId: "casa-house", direction: "forward", timestamp: 1 });
    await store.appendReview({ ...base, cardId: "casa-house", direction: "reverse", timestamp: 2 });
    await store.appendReview({ ...base, cardId: "de-of", direction: "forward", timestamp: 3 });

    expect((await store.getReviews({ cardId: "casa-house" })).map((r) => r.timestamp)).toEqual([1, 2]);
    expect((await store.getReviews({ direction: "forward" })).map((r) => r.timestamp)).toEqual([1, 3]);
    expect(
      (await store.getReviews({ cardId: "casa-house", direction: "reverse" })).map((r) => r.timestamp),
    ).toEqual([2]);
    expect(await store.getReviews({ cardId: "nothing" })).toEqual([]);
  });

  it("keeps reviews across a reopen", async () => {
    const review = await store.appendReview({
      cardId: "casa-house",
      direction: "forward",
      rating: "again",
      section: "learn",
    });
    store.close();

    expect(await reopen().getReviews()).toEqual([review]);
  });
});

describe("card state", () => {
  interface State extends CardStateRow {
    stability: number;
  }

  it("stores and reads state per card", async () => {
    await store.putCardState<State>({ cardId: "casa-house", stability: 3 });
    await store.putCardState<State>({ cardId: "casa-house", stability: 9 });
    await store.putCardState<State>({ cardId: "de-of", stability: 1 });

    expect(await store.getCardState<State>("casa-house")).toEqual({ cardId: "casa-house", stability: 9 });
    expect(await store.getCardState("missing")).toBeUndefined();
    expect(await store.getAllCardStates()).toHaveLength(2);
  });

  it("replaces the whole cache after a replay", async () => {
    await store.putCardState<State>({ cardId: "casa-house", stability: 3 });
    await store.replaceCardStates<State>([{ cardId: "ir-go", stability: 5 }]);

    expect(await store.getAllCardStates()).toEqual([{ cardId: "ir-go", stability: 5 }]);
  });
});

describe("notes", () => {
  it("saves one note per card, the later save overwriting the earlier", async () => {
    await store.saveNote("casa-house", "first", 10);
    const second = await store.saveNote("casa-house", "second", 20);

    expect(second).toEqual({ cardId: "casa-house", text: "second", updatedAt: 20, synced: 0 });
    expect(await store.getNote("casa-house")).toEqual(second);
    expect(await store.getNotes()).toHaveLength(1);
    expect(await store.getNote("de-of")).toBeUndefined();
  });

  it("keeps a note across a reopen", async () => {
    const note = await store.saveNote("casa-house", "sounds like 'casa'");
    store.close();

    expect(await reopen().getNote("casa-house")).toEqual(note);
  });
});

describe("reports", () => {
  it("adds reports with and without a comment", async () => {
    const bare = await store.addReport("lo-him", undefined, 1);
    const blank = await store.addReport("lo-him", "   ", 2);
    const commented = await store.addReport("ir-go", " wrong example ", 3);

    expect(bare.id).toMatch(UUID);
    expect(bare.comment).toBeNull();
    expect(blank.comment).toBeNull();
    expect(commented.comment).toBe("wrong example");
    expect(await store.getReports()).toEqual([bare, blank, commented]);
  });
});

describe("unsynced rows", () => {
  it("lists nothing in an empty store", async () => {
    expect(await store.listUnsynced()).toEqual({ reviews: [], notes: [], reports: [] });
  });

  it("lists new rows, and drops them once marked synced", async () => {
    const review = await store.appendReview({
      cardId: "casa-house",
      direction: "forward",
      rating: "good",
      section: "learn",
      timestamp: 1,
    });
    const note = await store.saveNote("casa-house", "a note", 2);
    const report = await store.addReport("casa-house", "typo", 3);

    const unsynced = await store.listUnsynced();
    expect(unsynced).toEqual({ reviews: [review], notes: [note], reports: [report] });

    await store.markSynced(unsynced);

    expect(await store.listUnsynced()).toEqual({ reviews: [], notes: [], reports: [] });
    expect((await store.getReviews())[0].synced).toBe(1);
    expect((await store.getNote("casa-house"))?.synced).toBe(1);
    expect((await store.getReports())[0].synced).toBe(1);
  });

  it("marks only the rows it is given", async () => {
    const base = { cardId: "ir-go", direction: "forward", rating: "good", section: "learn" } as const;
    const first = await store.appendReview({ ...base, timestamp: 1 });
    const second = await store.appendReview({ ...base, timestamp: 2 });

    await store.markSynced({ reviews: [first] });

    expect((await store.listUnsynced()).reviews).toEqual([second]);
  });

  it("makes a synced note unsynced again when it is edited", async () => {
    await store.saveNote("casa-house", "first", 10);
    await store.markSynced(await store.listUnsynced());

    const edited = await store.saveNote("casa-house", "second", 20);

    expect((await store.listUnsynced()).notes).toEqual([edited]);
  });

  it("leaves a note unsynced if it was edited while the upload was in flight", async () => {
    await store.saveNote("casa-house", "first", 10);
    const uploading = await store.listUnsynced();
    const edited = await store.saveNote("casa-house", "second", 20);

    await store.markSynced(uploading);

    expect((await store.listUnsynced()).notes).toEqual([edited]);
  });
});

describe("device id", () => {
  it("is stable between calls and used when no id is given", async () => {
    const id = getDeviceId();
    expect(id).toMatch(UUID);
    expect(getDeviceId()).toBe(id);

    const anonymous = new LocalStore({ indexedDB: idb, IDBKeyRange, name: "other" });
    const review = await anonymous.appendReview({
      cardId: "casa-house",
      direction: "forward",
      rating: "good",
      section: "learn",
    });
    expect(review.deviceId).toBe(id);
  });
});

describe("resets", () => {
  const base = { cardId: "casa-house", direction: "forward", section: "learn" } as const;

  it("counts only the reviews made after the latest reset, and keeps the rest stored", async () => {
    await store.appendReview({ ...base, rating: "good", timestamp: 100 });
    await store.appendReview({ ...base, rating: "again", timestamp: 200 });
    expect(await store.getReviewsSinceReset()).toHaveLength(2);

    const reset = await store.startOver(200);
    expect(reset).toMatchObject({ resetAt: 200, deviceId: "device-a", synced: 0 });
    expect(reset.id).toMatch(UUID);
    // A review at the reset's own time is dropped too.
    expect(await store.getReviewsSinceReset()).toEqual([]);

    const after = await store.appendReview({ ...base, rating: "nearly", timestamp: 300 });
    expect(await store.getReviewsSinceReset()).toEqual([after]);
    expect(await store.getReviewsSinceReset({ cardId: "ir-go" })).toEqual([]);
    expect(await store.getReviews()).toHaveLength(3);

    await store.startOver(400);
    expect(await reopen().getReviewsSinceReset()).toEqual([]);
    expect((await reopen().getResets()).map((r) => r.resetAt)).toEqual([200, 400]);
  });

  it("empties the card-state cache and keeps notes and reports", async () => {
    await store.putCardState({ cardId: "casa-house" });
    await store.saveNote("casa-house", "a note");
    await store.addReport("casa-house", "odd");
    await store.startOver();
    expect(await store.getAllCardStates()).toEqual([]);
    expect((await store.getNote("casa-house"))?.text).toBe("a note");
    expect(await store.getReports()).toHaveLength(1);
  });
});

describe("upgrade", () => {
  it("opens a version 2 database with its reviews kept and no resets", async () => {
    const old = new Dexie(DB_NAME, { indexedDB: idb, IDBKeyRange });
    old.version(2).stores({
      reviews: "id, cardId, timestamp, synced",
      card_state: "cardId",
      notes: "cardId, synced",
      reports: "id, cardId, synced",
      sync_state: "key",
    });
    await old.table("reviews").add({
      id: "r1", cardId: "casa-house", direction: "forward", rating: "good",
      timestamp: 100, section: "learn", deviceId: "device-a", synced: 1,
    });
    old.close();

    const upgraded = reopen();
    expect(await upgraded.getResets()).toEqual([]);
    expect((await upgraded.getReviewsSinceReset()).map((r) => r.id)).toEqual(["r1"]);
  });
});
