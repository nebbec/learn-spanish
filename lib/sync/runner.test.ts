import type { SupabaseClient } from "@supabase/supabase-js";
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { AUTH_STORAGE_KEY, memoryStorage } from "@/lib/auth";
import { LocalStore, type Review } from "@/lib/store";
import {
  FakeRemote,
  LAST_SYNC_KEY,
  SyncRequestError,
  SyncRunner,
  isNetworkFailure,
  type SyncResult,
  type SyncRunnerOptions,
} from "@/lib/sync";

const T0 = Date.UTC(2026, 0, 1);
/** The runner only hands the client to the remote factory, so any object will do. */
const client = {} as SupabaseClient;

let storage: ReturnType<typeof memoryStorage>;
let store: LocalStore;
/** One server per account. */
let servers: Map<string, FakeRemote>;
let online: boolean;

function signIn(userId: string) {
  storage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ refresh_token: "r", user: { id: userId, email: `${userId}@x.test` } }));
}
function signOut() {
  storage.removeItem(AUTH_STORAGE_KEY);
}
function server(userId: string): FakeRemote {
  if (!servers.has(userId)) servers.set(userId, new FakeRemote());
  return servers.get(userId)!;
}
function runner(options: Partial<SyncRunnerOptions> = {}): SyncRunner {
  return new SyncRunner({
    store,
    client,
    storage,
    remote: (_client, userId) => server(userId),
    online: () => online,
    clock: () => T0,
    ...options,
  });
}
const rate = (cardId: string, timestamp = T0) =>
  store.appendReview({ cardId, direction: "forward", rating: "good", section: "learn", timestamp });
const ids = (rows: { id: string }[]) => rows.map((r) => r.id).sort();

beforeEach(() => {
  storage = memoryStorage();
  store = new LocalStore({ indexedDB: new IDBFactory(), IDBKeyRange, deviceId: "device-a" });
  servers = new Map();
  online = true;
});

describe("SyncRunner", () => {
  it("does nothing in a build without Supabase", async () => {
    const r = runner({ client: null });
    await r.run();
    expect(r.getStatus().phase).toBe("unavailable");
  });

  it("does not sync while signed out, and counts what is waiting", async () => {
    await rate("casa-house");
    const r = runner();
    expect(r.getStatus().phase).toBe("signed-out");
    await r.run();
    expect(r.getStatus()).toEqual({ phase: "signed-out", lastSyncedAt: null, pending: 1 });
    expect(servers.size).toBe(0);
  });

  it("uploads everything recorded before signing in, and remembers when", async () => {
    await rate("casa-house");
    await store.saveNote("casa-house", "kasa", T0);
    await store.addReport("ir-go", "typo", T0);
    signIn("user-1");
    const r = runner();
    expect(r.getStatus().phase).toBe("idle");
    const results: SyncResult[] = [];
    r.onResult((result) => results.push(result));

    await r.run();
    expect(r.getStatus()).toEqual({ phase: "synced", lastSyncedAt: T0, pending: 0 });
    expect(results[0].uploaded).toEqual({ reviews: 1, notes: 1, reports: 1 });
    expect(server("user-1").reviews).toHaveLength(1);
    // A new runner, as after a reload, starts from the saved time.
    expect(runner().getStatus()).toEqual({ phase: "synced", lastSyncedAt: T0, pending: 0 });
    expect(JSON.parse(storage.getItem(LAST_SYNC_KEY)!)).toEqual({ userId: "user-1", at: T0 });
  });

  it("waits for a connection without calling the server", async () => {
    signIn("user-1");
    await rate("casa-house");
    online = false;
    const r = runner();
    await r.run();
    expect(r.getStatus()).toEqual({ phase: "offline", lastSyncedAt: null, pending: 1 });
    expect(server("user-1").calls).toEqual([]);

    online = true;
    await r.run();
    expect(r.getStatus().phase).toBe("synced");
    expect(r.getStatus().pending).toBe(0);
  });

  it("tells a lost connection from a refused request", async () => {
    signIn("user-1");
    await rate("casa-house");
    const r = runner();
    server("user-1").offline = true;
    await r.run();
    // FakeRemote's errors are not network failures, so with the browser online it is a failure...
    expect(r.getStatus()).toMatchObject({ phase: "failed", pending: 1 });
    // ...and with the browser gone offline meanwhile it is offline.
    let asked = 0;
    const offline = runner({ online: () => asked++ === 0 });
    await offline.run();
    expect(offline.getStatus().phase).toBe("offline");

    expect(isNetworkFailure(new TypeError("Failed to fetch"))).toBe(true);
    expect(isNetworkFailure(new SyncRequestError("uploading reviews: TypeError: Failed to fetch", ""))).toBe(true);
    expect(isNetworkFailure(new SyncRequestError("uploading reviews: permission denied", "42501"))).toBe(false);
  });

  it("runs once more, not once per call, when asked during a sync", async () => {
    signIn("user-1");
    const r = runner();
    await Promise.all([r.run(), r.run(), r.run()]);
    expect(server("user-1").calls.filter((c) => c === "pullReviews")).toHaveLength(2);
    await r.run();
    expect(server("user-1").calls.filter((c) => c === "pullReviews")).toHaveLength(3);
  });

  it("reports status changes to subscribers", async () => {
    signIn("user-1");
    const r = runner();
    const seen: string[] = [];
    const stop = r.subscribe(() => seen.push(r.getStatus().phase));
    await r.run();
    stop();
    await r.run();
    expect(seen).toEqual(["syncing", "synced"]);
  });
});

describe("a second account on the same device", () => {
  it("gets everything on the device, and the first account keeps its rows", async () => {
    // Device A syncs with user 1, including a review made on another of user 1's devices.
    await rate("casa-house", T0);
    await server("user-1").pushReviews([
      { id: crypto.randomUUID(), cardId: "ir-go", direction: "forward", rating: "nearly", timestamp: T0 + 1, section: "practice", deviceId: "device-b" },
    ]);
    signIn("user-1");
    await runner().run();
    const all: Review[] = await store.getReviews();
    expect(all).toHaveLength(2);
    expect(await store.getSyncAccount()).toBe("user-1");

    // Signing out alone changes nothing on the device.
    signOut();
    const r = runner();
    await r.run();
    expect(r.getStatus()).toMatchObject({ phase: "signed-out", pending: 0 });

    // Signing in as user 2 uploads every row on the device to user 2.
    signIn("user-2");
    await rate("de-of", T0 + 2);
    await r.run();
    expect(r.getStatus()).toMatchObject({ phase: "synced", pending: 0 });
    expect(ids(server("user-2").reviews)).toEqual(ids(await store.getReviews()));
    expect(server("user-2").reviews).toHaveLength(3);
    expect(server("user-1").reviews).toHaveLength(2);
    expect(await store.getSyncAccount()).toBe("user-2");

    // Back to user 1: the device's rows go up again; user 1 gains only the new one.
    signIn("user-1");
    await r.run();
    expect(server("user-1").reviews).toHaveLength(3);
    expect(r.getStatus().lastSyncedAt).toBe(T0);
  });

  it("does not reset for the account it already synced with", async () => {
    await rate("casa-house");
    expect(await store.bindSyncAccount("user-1")).toBe(false);
    await store.markSynced({ reviews: await store.getReviews() });
    expect(await store.bindSyncAccount("user-1")).toBe(false);
    expect((await store.listUnsynced()).reviews).toHaveLength(0);
    expect(await store.bindSyncAccount("user-2")).toBe(true);
    expect((await store.listUnsynced()).reviews).toHaveLength(1);
  });
});
