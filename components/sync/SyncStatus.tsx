"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ROUTES } from "@/lib/routes";
import { appSync, type SyncRunner, type SyncStatus } from "@/lib/sync";

const SERVER_STATUS: SyncStatus = { phase: "idle", lastSyncedAt: null, pending: 0 };
const noRunner = { subscribe: () => () => {}, getStatus: () => SERVER_STATUS };


/** The runner's status, redrawn as it changes. `ready` is false on the server and in the first render. */
export function useSyncStatus(runnerProp?: SyncRunner | null): { status: SyncStatus; ready: boolean } {
  // False on the server and while hydrating, so the page drawn on both sides matches.
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false);
  const runner = hydrated ? (runnerProp === undefined ? appSync() : runnerProp) : null;
  const source = runner ?? noRunner;
  const status = useSyncExternalStore(source.subscribe, source.getStatus, () => SERVER_STATUS);
  return { status, ready: runner !== null };
}

const subscribeNever = () => () => {};

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** "just now", "5 min ago", or a date and time. */
export function formatSyncTime(at: number, now: number): string {
  const minutes = Math.floor((now - at) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  return `on ${new Date(at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`;
}

/** One sentence for the status, or null when there is nothing to say. */
export function describeSync(status: SyncStatus, now: number): string | null {
  const { phase, pending, lastSyncedAt } = status;
  const waiting = pending > 0 ? ` ${plural(pending, "change")} waiting to upload.` : "";
  switch (phase) {
    case "unavailable":
      return null;
    case "signed-out":
      return "Progress is kept on this device only. Sign in to back it up.";
    case "idle":
      return "Not synced yet.";
    case "syncing":
      return "Syncing…";
    case "synced":
      return `Synced ${lastSyncedAt === null ? "" : formatSyncTime(lastSyncedAt, now)}.`.replace(" .", ".") + waiting;
    case "offline":
      return pending > 0
        ? `Offline. ${plural(pending, "change")} will upload when you reconnect.`
        : "Offline. Everything on this device is backed up.";
    case "failed":
      return "Sync failed; it will try again." + waiting;
  }
}

/** Re-renders once a minute, so "5 min ago" keeps up. */
function useNow(clock: () => number): number {
  const [now, setNow] = useState(clock);
  useEffect(() => {
    const timer = setInterval(() => setNow(clock()), 60_000);
    return () => clearInterval(timer);
  }, [clock]);
  return now;
}

export interface SyncStatusProps {
  /** Defaults to the app's runner. */
  runner?: SyncRunner | null;
  clock?: () => number;
}

/** The menu's sync line. Signed out, it links to settings. */
export function SyncStatusLine({ runner, clock = Date.now }: SyncStatusProps) {
  const { status, ready } = useSyncStatus(runner);
  const now = useNow(clock);
  const text = ready ? describeSync(status, now) : null;
  if (!text) return null;
  return (
    <p data-testid="sync-status" data-phase={status.phase} className="text-center text-sm text-ink-soft" aria-live="polite">
      {status.phase === "signed-out" ? (
        <Link href={ROUTES.settings} className="font-bold text-brand">
          Progress is on this device only. Sign in to back it up.
        </Link>
      ) : (
        text
      )}
    </p>
  );
}

/** The settings section: the status and a Sync now button. */
export function SyncPanel({ runner: runnerProp, clock = Date.now }: SyncStatusProps) {
  const { status, ready } = useSyncStatus(runnerProp);
  const now = useNow(clock);
  if (!ready || status.phase === "unavailable") return null;
  const runner = runnerProp ?? appSync();
  const canSync = status.phase !== "signed-out" && status.phase !== "syncing";
  return (
    <section
      aria-labelledby="sync-heading"
      className="flex flex-col gap-3 rounded-card border-2 border-line bg-surface p-6 shadow-card"
    >
      <h2 id="sync-heading" className="font-display text-2xl font-bold">
        Sync
      </h2>
      <p data-testid="sync-status" data-phase={status.phase} aria-live="polite">
        {describeSync(status, now)}
      </p>
      {status.phase !== "signed-out" && (
        <button
          type="button"
          data-testid="sync-now"
          disabled={!canSync}
          onClick={() => void runner?.run()}
          className="min-h-11 self-start font-bold text-brand underline-offset-4 hover:underline disabled:text-ink-soft disabled:no-underline"
        >
          Sync now
        </button>
      )}
    </section>
  );
}
