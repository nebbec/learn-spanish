"use client";

import { useEffect, useState } from "react";
import { loadDeck, type Card } from "@/lib/deck";
import {
  browserCaches,
  deckMedia,
  formatBytes,
  mediaStatus,
  storeMedia,
  type MediaCaches,
  type MediaFetch,
  type MediaStatus,
  type StoreProgress,
} from "@/lib/media";

const files = (count: number) => `${count} ${count === 1 ? "file" : "files"}`;

export interface DownloadEverythingProps {
  /** Loads the deck's cards. Defaults to the app's deck; tests pass their own. */
  loadCards?: () => Promise<readonly Card[]>;
  /** Defaults to the browser's cache store. Null means the browser has none. */
  caches?: MediaCaches | null;
  fetch?: MediaFetch;
}

type State =
  | { step: "loading" }
  | { step: "unavailable" }
  | { step: "idle"; urls: string[]; status: MediaStatus; failed: number }
  | { step: "downloading"; urls: string[]; progress: StoreProgress };

/**
 * "Download everything for offline": stores the art and audio of the whole
 * deck, showing how far it has got, how many files are on the device and how
 * much room they take.
 */
export function DownloadEverything({ loadCards, caches, fetch: fetchImpl }: DownloadEverythingProps) {
  const [state, setState] = useState<State>({ step: "loading" });
  const store = caches === undefined ? browserCaches() : caches;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!store) throw new Error("No cache store");
      const cards = loadCards ? await loadCards() : (await loadDeck()).cards;
      const urls = deckMedia(cards);
      const status = await mediaStatus(urls, store);
      if (!cancelled) setState({ step: "idle", urls, status, failed: 0 });
    })().catch(() => {
      if (!cancelled) setState({ step: "unavailable" });
    });
    return () => {
      cancelled = true;
    };
  }, [store, loadCards]);

  async function download(urls: string[]) {
    if (!store) return;
    setState({ step: "downloading", urls, progress: { done: 0, total: urls.length, failed: 0 } });
    // Asks the browser not to clear the files when the device runs short of room. It may say no.
    void navigator.storage?.persist?.().catch(() => false);
    try {
      const result = await storeMedia(urls, {
        caches: store,
        fetch: fetchImpl ?? ((url) => fetch(url)),
        onProgress: (progress) => setState({ step: "downloading", urls, progress }),
      });
      setState({ step: "idle", urls, status: await mediaStatus(urls, store), failed: result.failed });
    } catch {
      setState({ step: "unavailable" });
    }
  }

  return (
    <section
      aria-labelledby="download-heading"
      className="flex flex-col gap-3 rounded-card border-2 border-line bg-surface p-6 shadow-card"
    >
      <h2 id="download-heading" className="font-display text-2xl font-bold">
        Offline
      </h2>
      <p className="text-ink-soft">
        The pictures and sound for your next few batches, and for every card you have seen, are kept on this device
        as you go. Download everything to have the whole deck with no connection.
      </p>

      {state.step === "loading" && <p className="text-ink-soft">Checking what is on this device…</p>}

      {state.step === "unavailable" && (
        <p role="alert" data-testid="download-unavailable" className="font-bold">
          Pictures and sound cannot be stored in this browser right now.
        </p>
      )}

      {state.step === "idle" && (
        <>
          <p data-testid="media-status" className="font-bold">
            {state.status.stored === state.status.total
              ? `All ${files(state.status.total)} are on this device`
              : `${state.status.stored} of ${files(state.status.total)} on this device`}
            {" · "}
            <span data-testid="media-size">{formatBytes(state.status.bytes)}</span>
          </p>
          {state.failed > 0 && (
            <p role="alert" data-testid="download-failed" className="font-bold text-again">
              {files(state.failed)} could not be downloaded. Check your connection and try again.
            </p>
          )}
          {state.status.stored < state.status.total && (
            <button
              type="button"
              data-testid="download-all"
              onClick={() => void download(state.urls)}
              className="min-h-14 rounded-button bg-brand px-4 py-3 font-display text-xl font-bold text-on-brand"
            >
              {state.failed > 0 ? "Try again" : "Download everything"}
            </button>
          )}
        </>
      )}

      {state.step === "downloading" && (
        <div className="flex flex-col gap-2">
          <p data-testid="download-progress" aria-live="polite" className="font-bold">
            Downloading: {state.progress.done} of {files(state.progress.total)}
          </p>
          <progress
            data-testid="download-bar"
            className="h-3 w-full"
            value={state.progress.done}
            max={Math.max(1, state.progress.total)}
          />
        </div>
      )}
    </section>
  );
}
