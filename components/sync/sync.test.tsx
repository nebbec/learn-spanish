// @vitest-environment jsdom
import type { SupabaseClient } from "@supabase/supabase-js";
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { until } from "@/components/testing";
import { AUTH_STORAGE_KEY, memoryStorage } from "@/lib/auth";
import { LocalStore } from "@/lib/store";
import { FakeRemote, SYNCED_EVENT, SyncRunner } from "@/lib/sync";
import { AutoSync, SyncPanel, SyncStatusLine, describeSync } from "./index";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// next/link needs a router; a plain link is enough here.
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const T0 = Date.UTC(2026, 9, 3, 9, 0, 0);

type AuthListener = (event: string) => void;

let host: HTMLDivElement;
let root: Root;
let storage: ReturnType<typeof memoryStorage>;
let store: LocalStore;
let remote: FakeRemote;
let online: boolean;
let authListeners: Set<AuthListener>;
/** Only `auth.onAuthStateChange` is used by AutoSync; the runner hands the client to its remote factory. */
let client: SupabaseClient;

const q = (testId: string) => host.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
const pulls = () => remote.calls.filter((c) => c === "pullReviews").length;

function signIn() {
  storage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ refresh_token: "r", user: { id: "user-1", email: "c@x.test" } }));
}
function runner() {
  return new SyncRunner({ store, client, storage, remote: () => remote, online: () => online, clock: () => T0 });
}
function mount(node: React.ReactNode) {
  act(() => root.render(node));
}

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  storage = memoryStorage();
  store = new LocalStore({ indexedDB: new IDBFactory(), IDBKeyRange, deviceId: "device-a" });
  remote = new FakeRemote();
  online = true;
  authListeners = new Set();
  client = {
    auth: {
      onAuthStateChange: (listener: AuthListener) => {
        authListeners.add(listener);
        return { data: { subscription: { unsubscribe: () => authListeners.delete(listener) } } };
      },
    },
  } as unknown as SupabaseClient;
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  store.close();
});

describe("AutoSync", () => {
  it("syncs on opening, on sign-in, when a connection returns and when the app comes back into view", async () => {
    signIn();
    const r = runner();
    mount(<AutoSync runner={r} client={client} keepMedia={() => {}} />);
    await until(() => pulls() === 1, "the sync on opening");

    act(() => authListeners.forEach((listener) => listener("SIGNED_IN")));
    await until(() => pulls() === 2, "the sync on sign-in");
    act(() => authListeners.forEach((listener) => listener("TOKEN_REFRESHED")));

    act(() => void window.dispatchEvent(new Event("online")));
    await until(() => pulls() === 3, "the sync when the connection returns");

    act(() => void document.dispatchEvent(new Event("visibilitychange")));
    await until(() => pulls() === 4, "the sync on coming back into view");
    await until(() => r.getStatus().phase === "synced", "the last sync to finish");
    // A refreshed token did not start a sync of its own.
    expect(pulls()).toBe(4);

    act(() => root.unmount());
    root = createRoot(host);
    act(() => void window.dispatchEvent(new Event("online")));
    expect(authListeners.size).toBe(0);
    expect(pulls()).toBe(4);
  });

  it("tells the screens and stores media when another device's reviews arrive", async () => {
    signIn();
    await remote.pushReviews([
      { id: crypto.randomUUID(), cardId: "ir-go", direction: "forward", rating: "good", timestamp: T0, section: "learn", deviceId: "device-b" },
    ]);
    let synced = 0;
    let kept = 0;
    const onSynced = () => (synced += 1);
    window.addEventListener(SYNCED_EVENT, onSynced);
    mount(<AutoSync runner={runner()} client={client} keepMedia={() => (kept += 1)} />);
    await until(() => synced === 1 && kept === 1, "the screens and media to be told");
    window.removeEventListener(SYNCED_EVENT, onSynced);
    expect((await store.getReviews()).map((r) => r.cardId)).toEqual(["ir-go"]);
  });

  it("tells the screens when another device's reset arrives, so the menu drops its progress", async () => {
    signIn();
    await store.appendReview({ cardId: "ir-go", direction: "forward", rating: "good", section: "learn", timestamp: T0 });
    await remote.pushResets([{ id: crypto.randomUUID(), resetAt: T0 + 1000, deviceId: "device-b" }]);
    let synced = 0;
    const onSynced = () => (synced += 1);
    window.addEventListener(SYNCED_EVENT, onSynced);
    mount(<AutoSync runner={runner()} client={client} keepMedia={() => undefined} />);
    await until(() => synced === 1, "the screens to be told");
    window.removeEventListener(SYNCED_EVENT, onSynced);
    expect(await store.getReviewsSinceReset()).toEqual([]);
  });
});

describe("sync status", () => {
  it("in settings: asks to sign in, then shows the last sync and offers Sync now", async () => {
    await store.appendReview({ cardId: "ir-go", direction: "forward", rating: "good", section: "learn", timestamp: T0 });
    const r = runner();
    mount(<SyncPanel runner={r} clock={() => T0} />);
    await act(() => r.run());
    expect(q("sync-status")!.textContent).toBe("Progress is kept on this device only. Sign in to back it up.");
    expect(q("sync-now")).toBeNull();

    signIn();
    online = false;
    await act(() => r.run());
    expect(q("sync-status")!.textContent).toBe("Offline. 1 change will upload when you reconnect.");

    online = true;
    act(() => q("sync-now")!.click());
    await until(() => q("sync-status")?.dataset.phase === "synced", "the sync to finish");
    expect(q("sync-status")!.textContent).toBe("Synced just now.");
    expect(remote.reviews).toHaveLength(1);
  });

  it("on the menu: links to settings while signed out, and shows nothing without Supabase", async () => {
    mount(<SyncStatusLine runner={runner()} />);
    await until(() => q("sync-status"), "the status line");
    expect(q("sync-status")!.querySelector("a")!.getAttribute("href")).toBe("/settings");

    mount(<SyncStatusLine runner={new SyncRunner({ store, client: null, storage })} />);
    await until(() => !q("sync-status"), "the line to go");
  });

  it("describes every phase", () => {
    const at = T0 - 5 * 60_000;
    expect(describeSync({ phase: "synced", lastSyncedAt: at, pending: 0 }, T0)).toBe("Synced 5 min ago.");
    expect(describeSync({ phase: "synced", lastSyncedAt: at, pending: 2 }, T0)).toBe(
      "Synced 5 min ago. 2 changes waiting to upload.",
    );
    expect(describeSync({ phase: "offline", lastSyncedAt: at, pending: 0 }, T0)).toBe(
      "Offline. Everything on this device is backed up.",
    );
    expect(describeSync({ phase: "failed", lastSyncedAt: null, pending: 1 }, T0)).toBe(
      "Sync failed; it will try again. 1 change waiting to upload.",
    );
    expect(describeSync({ phase: "idle", lastSyncedAt: null, pending: 0 }, T0)).toBe("Not synced yet.");
    expect(describeSync({ phase: "syncing", lastSyncedAt: null, pending: 0 }, T0)).toBe("Syncing…");
    expect(describeSync({ phase: "unavailable", lastSyncedAt: null, pending: 0 }, T0)).toBeNull();
  });
});
