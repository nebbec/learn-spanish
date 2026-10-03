// Runs `sync` for the signed-in account and keeps a status the screens can
// show. See docs/design.md, "Sync rules" (decided in D6).

import type { SupabaseClient } from "@supabase/supabase-js";
import { authClient, storedAccount } from "@/lib/auth";
import { localStore, type LocalStore } from "@/lib/store";
import type { SyncRemote } from "./remote";
import { SupabaseRemote, SyncRequestError } from "./supabaseRemote";
import { sync, type SyncResult } from "./sync";

/** localStorage key for when this device last finished a sync, and for which account. */
export const LAST_SYNC_KEY = "learn-spanish.last-sync";

/** Fired on `window` after a sync that changed the device's reviews or notes. */
export const SYNCED_EVENT = "learn-spanish:synced";

export type SyncPhase =
  /** The build has no Supabase settings. */
  | "unavailable"
  | "signed-out"
  /** Signed in, no sync finished yet on this device. */
  | "idle"
  | "syncing"
  | "synced"
  | "offline"
  | "failed";

export interface SyncStatus {
  phase: SyncPhase;
  /** When the last sync for the signed-in account finished, in epoch milliseconds. */
  lastSyncedAt: number | null;
  /** Ratings, notes, reports and resets on this device not yet uploaded. */
  pending: number;
}

type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;

export interface SyncRunnerOptions {
  store: LocalStore;
  /** Null when the build has no Supabase settings. */
  client: SupabaseClient | null;
  /** Where the session and the last-sync time are kept. */
  storage: Storage | null;
  /** Defaults to the Supabase implementation over `client`. Tests pass a `FakeRemote`. */
  remote?: (client: SupabaseClient, userId: string) => SyncRemote;
  /** Whether the browser thinks it has a connection. Defaults to `navigator.onLine`. */
  online?: () => boolean;
  clock?: () => number;
}

const browserOnline = () => typeof navigator === "undefined" || navigator.onLine !== false;

/** True when a sync failed because the server could not be reached at all. */
export function isNetworkFailure(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  // supabase-js turns a failed fetch into an answer with an empty code.
  return error instanceof SyncRequestError && !error.code;
}

export class SyncRunner {
  private status: SyncStatus;
  private readonly listeners = new Set<() => void>();
  private readonly resultListeners = new Set<(result: SyncResult) => void>();
  private running: Promise<void> | null = null;
  private again = false;
  private readonly remote: (client: SupabaseClient, userId: string) => SyncRemote;
  private readonly online: () => boolean;
  private readonly clock: () => number;

  constructor(private readonly options: SyncRunnerOptions) {
    this.remote = options.remote ?? ((client) => new SupabaseRemote(client));
    this.online = options.online ?? browserOnline;
    this.clock = options.clock ?? Date.now;
    const userId = this.account()?.userId ?? null;
    const lastSyncedAt = this.readLastSync(userId);
    this.status = {
      phase: !options.client ? "unavailable" : !userId ? "signed-out" : lastSyncedAt ? "synced" : "idle",
      lastSyncedAt,
      pending: 0,
    };
  }

  getStatus = (): SyncStatus => this.status;

  /** For `useSyncExternalStore`: called whenever the status changes. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Called with the result of every sync that finishes. */
  onResult(listener: (result: SyncResult) => void): () => void {
    this.resultListeners.add(listener);
    return () => this.resultListeners.delete(listener);
  }

  /**
   * Syncs now if signed in and online. A call while a sync is running does not
   * start a second one at once: it makes the running one go round again, since
   * the call may be for ratings stored after it began. Never throws; the
   * outcome is in the status.
   */
  run = (): Promise<void> => {
    if (this.running) {
      this.again = true;
      return this.running;
    }
    this.running = (async () => {
      do {
        this.again = false;
        await this.once();
      } while (this.again);
    })().finally(() => {
      this.running = null;
    });
    return this.running;
  };

  private async once(): Promise<void> {
    const { client, store } = this.options;
    if (!client) return this.set({ phase: "unavailable", lastSyncedAt: null, pending: 0 });
    const account = this.account();
    const pending = await this.countPending();
    if (!account) return this.set({ phase: "signed-out", lastSyncedAt: null, pending });
    const lastSyncedAt = this.readLastSync(account.userId);
    if (!this.online()) return this.set({ phase: "offline", lastSyncedAt, pending });

    this.set({ phase: "syncing", lastSyncedAt, pending });
    try {
      await store.bindSyncAccount(account.userId);
      const result = await sync(store, this.remote(client, account.userId));
      const at = this.clock();
      this.writeLastSync(account.userId, at);
      this.set({ phase: "synced", lastSyncedAt: at, pending: await this.countPending() });
      for (const listener of this.resultListeners) listener(result);
    } catch (error) {
      const offline = !this.online() || isNetworkFailure(error);
      this.set({ phase: offline ? "offline" : "failed", lastSyncedAt, pending: await this.countPending() });
    }
  }

  private account() {
    return this.options.client ? storedAccount(this.options.storage) : null;
  }

  private async countPending(): Promise<number> {
    try {
      const { reviews, notes, reports, resets } = await this.options.store.listUnsynced();
      return reviews.length + notes.length + reports.length + resets.length;
    } catch {
      return this.status.pending;
    }
  }

  private readLastSync(userId: string | null): number | null {
    if (!userId) return null;
    try {
      const saved = JSON.parse(this.options.storage?.getItem(LAST_SYNC_KEY) ?? "null") as {
        userId?: unknown;
        at?: unknown;
      } | null;
      return saved?.userId === userId && typeof saved.at === "number" ? saved.at : null;
    } catch {
      return null;
    }
  }

  private writeLastSync(userId: string, at: number): void {
    try {
      this.options.storage?.setItem(LAST_SYNC_KEY, JSON.stringify({ userId, at }));
    } catch {
      // Storage is blocked: the time is only shown, so it can be lost.
    }
  }

  private set(status: SyncStatus): void {
    this.status = status;
    for (const listener of this.listeners) listener();
  }
}

let shared: SyncRunner | null | undefined;

/** The app's one runner, or null while rendering on the server. */
export function appSync(): SyncRunner | null {
  if (shared !== undefined) return shared;
  if (typeof window === "undefined") return null;
  let storage: Storage | null = null;
  try {
    storage = window.localStorage;
  } catch {
    storage = null;
  }
  shared = new SyncRunner({ store: localStore(), client: authClient(), storage });
  return shared;
}

/** Asks the app's runner to sync, for example after a batch. */
export function requestSync(): void {
  void appSync()?.run();
}
