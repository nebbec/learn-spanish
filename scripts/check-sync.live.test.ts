// D6's check against the real Supabase project: two devices signed in as the
// same user rate cards with no connection, reconnect and sync, and end with the
// same reviews, card state and notes. Then one of them signs into a second
// account, which gets everything on that device.
//
// Each device is a LocalStore over its own in-memory IndexedDB and a browser
// client over its own storage, run through the app's SyncRunner and
// SupabaseRemote. Users are made with the secret key and signed in with the
// code the admin API returns, so no email is sent. They are deleted at the end.
// Run: npm run check:sync (reads .env.local; see .env.example)

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAuthClient, memoryStorage, signOut, verifyCode } from "@/lib/auth";
import { rateCard, replayReviews, type CardState } from "@/lib/scheduler";
import { LocalStore, type Rating, type RemoteReview } from "@/lib/store";
import { SyncRunner } from "@/lib/sync";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const secret = process.env.SUPABASE_SECRET_KEY!;
if (!url || !publishable || !secret) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY in .env.local");
}

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const HOUR = 60 * 60 * 1000;
const BASE = Date.now() - 72 * HOUR;

interface Device {
  name: string;
  store: LocalStore;
  client: SupabaseClient;
  runner: SyncRunner;
  storage: ReturnType<typeof memoryStorage>;
  /** While true every request fails as it does with no connection. */
  net: { down: boolean };
}

const users: { id: string; email: string }[] = [];

async function makeUser(): Promise<{ id: string; email: string }> {
  const email = `sync-check-${crypto.randomUUID()}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw new Error(`creating a test user: ${error.message}`);
  const user = { id: data.user.id, email };
  users.push(user);
  return user;
}

/** Signs a device's client in with the code the email would carry. */
async function signIn(device: Device, user: { id: string; email: string }): Promise<void> {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: user.email });
  if (error) throw new Error(`making a code: ${error.message}`);
  const account = await verifyCode(device.client, user.email, data.properties.email_otp);
  expect(account.userId).toBe(user.id);
}

function makeDevice(name: string, online?: () => boolean): Device {
  const storage = memoryStorage();
  const net = { down: false };
  const fetchImpl: typeof fetch = (input, init) =>
    net.down ? Promise.reject(new TypeError("Failed to fetch")) : fetch(input, init);
  const client = createAuthClient({ url, key: publishable, storage, fetch: fetchImpl });
  const store = new LocalStore({ indexedDB: new IDBFactory(), IDBKeyRange, deviceId: crypto.randomUUID() });
  const runner = new SyncRunner({ store, client, storage, online: online ?? (() => !net.down) });
  return { name, store, client, runner, storage, net };
}

/** Rates a card the way a session does: the review, then the cached card state. */
async function rate(device: Device, cardId: string, rating: Rating, timestamp: number): Promise<void> {
  await device.store.appendReview({ cardId, direction: "forward", rating, section: "practice", timestamp });
  const prev = await device.store.getCardState<CardState>(cardId);
  await device.store.putCardState(rateCard(prev, cardId, rating, timestamp));
}

async function reviewsOf(device: Device): Promise<RemoteReview[]> {
  return (await device.store.getReviews()).map(({ id, cardId, direction, rating, timestamp, section, deviceId }) => ({
    id,
    cardId,
    direction,
    rating,
    timestamp,
    section,
    deviceId,
  }));
}
async function cardStatesOf(device: Device): Promise<CardState[]> {
  return (await device.store.getAllCardStates<CardState>()).sort((a, b) => (a.cardId < b.cardId ? -1 : 1));
}
async function notesOf(device: Device) {
  return (await device.store.getNotes()).map(({ cardId, text, updatedAt }) => ({ cardId, text, updatedAt }));
}
async function serverCount(table: "reviews" | "notes" | "card_reports", userId: string): Promise<number> {
  const { count, error } = await admin.from(table).select("*", { count: "exact", head: true }).eq("user_id", userId);
  if (error) throw new Error(`counting ${table}: ${error.message}`);
  return count ?? -1;
}
async function pending(device: Device): Promise<number> {
  const { reviews, notes, reports } = await device.store.listUnsynced();
  return reviews.length + notes.length + reports.length;
}

let first: { id: string; email: string };
let second: { id: string; email: string };
let a: Device;
let b: Device;
/** Every rating, in the order they were made: [device, card, rating, hours after BASE]. */
let script: [Device, string, Rating, number][];

beforeAll(async () => {
  first = await makeUser();
  second = await makeUser();
  a = makeDevice("A");
  b = makeDevice("B");
  await signIn(a, first);
  await signIn(b, first);
  script = [
    [a, "casa-house", "good", 0],
    [b, "ir-go", "again", 0.5],
    [a, "ir-go", "nearly", 1],
    [b, "casa-house", "good", 24],
    [b, "de-of", "good", 24.2],
    [a, "casa-house", "again", 30],
    [b, "ir-go", "good", 40],
    [a, "de-of", "nearly", 48],
    [b, "casa-house", "good", 60],
    [a, "hablar-speak", "good", 61],
    [b, "tiempo-time", "again", 62],
  ];
}, 60_000);

afterAll(async () => {
  for (const device of [a, b]) {
    device?.client.auth.stopAutoRefresh();
    device?.store.close();
  }
  for (const user of users) {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    expect(error, `deleting test user ${user.email}`).toBeNull();
  }
  // Deleting a user removes their rows.
  for (const user of users) expect(await serverCount("reviews", user.id)).toBe(0);
}, 60_000);

describe("two devices signed in as one user", () => {
  it("rate cards with no connection and keep everything on the device", async () => {
    a.net.down = true;
    b.net.down = true;
    for (const [device, cardId, rating, hours] of script) await rate(device, cardId, rating, BASE + hours * HOUR);
    await a.store.saveNote("casa-house", "kasa: a house in a case", BASE + 2 * HOUR);
    await a.store.saveNote("ir-go", "voy, vas, va", BASE + 3 * HOUR);
    await b.store.saveNote("casa-house", "la casa (edited on B)", BASE + 50 * HOUR);
    await b.store.addReport("de-of", "sync check report", BASE + 51 * HOUR);

    // The browser knows it is offline: no request is made.
    await a.runner.run();
    await b.runner.run();
    // A: 5 ratings and 2 notes. B: 6 ratings, a note and a report.
    expect(a.runner.getStatus()).toMatchObject({ phase: "offline", pending: 7 });
    expect(b.runner.getStatus()).toMatchObject({ phase: "offline", pending: 8 });

    // The browser thinks it is online but requests fail: still offline, nothing marked uploaded.
    const fooled = new SyncRunner({ store: a.store, client: a.client, storage: a.storage, online: () => true });
    await fooled.run();
    expect(fooled.getStatus().phase).toBe("offline");
    expect(await pending(a)).toBe(7);
    expect(await serverCount("reviews", first.id)).toBe(0);
  }, 60_000);

  it("converge on the same reviews, card state and notes after both reconnect", async () => {
    a.net.down = false;
    b.net.down = false;
    await a.runner.run();
    await b.runner.run();
    await a.runner.run();
    for (const device of [a, b]) {
      expect(device.runner.getStatus(), device.name).toMatchObject({ phase: "synced", pending: 0 });
      expect(await pending(device), device.name).toBe(0);
    }

    const byId = (x: RemoteReview, y: RemoteReview) => (x.id < y.id ? -1 : 1);
    const reviewsA = (await reviewsOf(a)).sort(byId);
    const reviewsB = (await reviewsOf(b)).sort(byId);
    expect(reviewsA).toHaveLength(script.length);
    expect(reviewsB).toEqual(reviewsA);

    const statesA = await cardStatesOf(a);
    expect(statesA).toHaveLength(5);
    expect(await cardStatesOf(b)).toEqual(statesA);
    const replayed = [...replayReviews(reviewsA).values()].sort((x, y) => (x.cardId < y.cardId ? -1 : 1));
    expect(statesA).toEqual(replayed);

    const notesA = (await notesOf(a)).sort((x, y) => (x.cardId < y.cardId ? -1 : 1));
    expect(notesA.map((n) => n.text)).toEqual(["la casa (edited on B)", "voy, vas, va"]);
    expect((await notesOf(b)).sort((x, y) => (x.cardId < y.cardId ? -1 : 1))).toEqual(notesA);

    expect(await serverCount("reviews", first.id)).toBe(script.length);
    expect(await serverCount("notes", first.id)).toBe(2);
    expect(await serverCount("card_reports", first.id)).toBe(1);
  }, 60_000);

  it("a rating made later on one device reaches the other on its next sync", async () => {
    await rate(b, "hablar-speak", "again", BASE + 70 * HOUR);
    await b.runner.run();
    await a.runner.run();
    expect((await reviewsOf(a)).length).toBe(script.length + 1);
    expect(await cardStatesOf(a)).toEqual(await cardStatesOf(b));
  }, 60_000);
});

describe("a second account on the same device", () => {
  it("gets everything on the device, and the first account keeps its rows", async () => {
    await signOut(a.client);
    await a.runner.run();
    expect(a.runner.getStatus().phase).toBe("signed-out");

    await signIn(a, second);
    await a.runner.run();
    expect(a.runner.getStatus()).toMatchObject({ phase: "synced", pending: 0 });
    expect(await a.store.getSyncAccount()).toBe(second.id);
    expect(await serverCount("reviews", second.id)).toBe(script.length + 1);
    expect(await serverCount("notes", second.id)).toBe(2);
    expect(await serverCount("reviews", first.id)).toBe(script.length + 1);
  }, 60_000);
});
