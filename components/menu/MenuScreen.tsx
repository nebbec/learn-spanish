"use client";

import { useEffect, useState, type ReactNode } from "react";
import { loadDeck, type Card, type DeckUnit } from "@/lib/deck";
import type { CardStates } from "@/lib/queues";
import { replayReviews, type ReviewEvent } from "@/lib/scheduler";
import { localStore, type Review } from "@/lib/store";
import { SYNCED_EVENT } from "@/lib/sync";
import { Menu } from "./Menu";

type Loaded =
  | { status: "loading" }
  | { status: "failed" }
  | {
      status: "ready";
      cards: readonly Card[];
      units: readonly DeckUnit[];
      states: CardStates;
      reviews: ReviewEvent[];
      now: number;
    };

export interface MenuScreenProps {
  /** Goes to a Practice link when a slice of the wheel is tapped. */
  onNavigate: (href: string) => void;
  /** Defaults to the app's shared store. Tests pass their own. */
  store?: { getReviewsSinceReset(): Promise<Review[]> };
  /** Defaults to the deck the app serves. Tests pass their own cards and units. */
  loadDeck?: () => Promise<{ cards: readonly Card[]; units: readonly DeckUnit[] }>;
  clock?: () => number;
  /** Passed to the menu: the sync status line. */
  status?: ReactNode;
}


/** Loads the deck and the progress on this device, then draws the menu. */
export function MenuScreen({ onNavigate, store, loadDeck: load = loadDeck, clock = Date.now, status }: MenuScreenProps) {
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    // Card state comes from replaying the reviews, not from the card_state cache,
    // so it is right even if a cache write was lost.
    const refresh = () => {
      Promise.all([load(), (store ?? localStore()).getReviewsSinceReset()])
        .then(([{ cards, units }, reviews]) => {
          if (!cancelled) {
            setLoaded({ status: "ready", cards, units, states: replayReviews(reviews), reviews, now: clock() });
          }
        })
        .catch(() => {
          // A failed refresh keeps the menu already on screen.
          if (!cancelled) setLoaded((current) => (current.status === "ready" ? current : { status: "failed" }));
        });
    };
    refresh();

    // Cards fall due while the menu sits open or in the background, and the browser can
    // bring the page back without mounting it again, so the counts are taken afresh.
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("pageshow", refresh);
    // A sync can bring in reviews from another device.
    window.addEventListener(SYNCED_EVENT, refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener(SYNCED_EVENT, refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [store, load, clock]);

  if (loaded.status === "ready") {
    return (
      <Menu
        cards={loaded.cards}
        units={loaded.units}
        states={loaded.states}
        reviews={loaded.reviews}
        now={loaded.now}
        onNavigate={onNavigate}
        status={status}
      />
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6 text-center">
      {loaded.status === "loading" ? (
        <p className="text-lg text-ink-soft">Loading…</p>
      ) : (
        <>
          <p role="alert" className="text-lg font-bold">
            The cards could not be loaded.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-14 rounded-button bg-brand px-4 py-3 font-display text-xl font-bold text-on-brand"
          >
            Try again
          </button>
        </>
      )}
    </main>
  );
}
