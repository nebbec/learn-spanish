"use client";

import { useEffect } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { authClient } from "@/lib/auth";
import { keepMediaStored } from "@/lib/media";
import { SYNCED_EVENT, appSync, type SyncRunner } from "@/lib/sync";

export interface AutoSyncProps {
  /** Defaults to the app's runner. */
  runner?: SyncRunner | null;
  /** Defaults to the app's browser client. */
  client?: SupabaseClient | null;
  /** Defaults to `keepMediaStored`. */
  keepMedia?: () => unknown;
}

/**
 * Syncs when the app opens, on sign-in and sign-out, when a connection returns
 * and when the app comes back into view. Sessions ask for one after each batch
 * with `requestSync`. When a sync brings in rows from another device it tells
 * the screens (`SYNCED_EVENT`) and, for new reviews, stores those cards' art and
 * audio. Draws nothing.
 */
export function AutoSync({ runner: runnerProp, client: clientProp, keepMedia = keepMediaStored }: AutoSyncProps) {
  useEffect(() => {
    const runner = runnerProp === undefined ? appSync() : runnerProp;
    const client = clientProp === undefined ? authClient() : clientProp;
    if (!runner) return;
    const run = () => void runner.run();
    const onVisible = () => {
      if (document.visibilityState === "visible") run();
    };

    const stopResults = runner.onResult((result) => {
      if (result.downloaded.reviews > 0 || result.downloaded.notes > 0) window.dispatchEvent(new Event(SYNCED_EVENT));
      if (result.replayed) void keepMedia();
    });
    // INITIAL_SESSION is left out: the sync on opening covers it.
    const auth = client?.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") run();
    });
    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", onVisible);
    run();

    return () => {
      stopResults();
      auth?.data.subscription.unsubscribe();
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [runnerProp, clientProp, keepMedia]);

  return null;
}
