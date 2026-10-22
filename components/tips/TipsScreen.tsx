"use client";

// The Tips list at /tips: every tip reached, in the order they are met. A tip is reached
// once a card naming it has been seen. See "Tips" in docs/design.md.

import Link from "next/link";
import { useEffect, useState } from "react";
import { TipBody } from "@/components/card";
import { loadDeck, type Card, type DeckTip } from "@/lib/deck";
import { reachedTips } from "@/lib/queues";
import { ROUTES } from "@/lib/routes";
import { replayReviews } from "@/lib/scheduler";
import { localStore, type Review } from "@/lib/store";

type Loaded = { status: "loading" } | { status: "failed" } | { status: "ready"; tips: DeckTip[] };

export interface TipsScreenProps {
  /** Defaults to the app's shared store. Tests pass their own. */
  store?: { getReviewsSinceReset(): Promise<Review[]> };
  /** Defaults to the deck the app serves. */
  loadTips?: () => Promise<{ cards: readonly Card[]; tips: readonly DeckTip[] }>;
  /** Plays a clip, given its path. */
  onPlay?: (src: string) => void;
}

/** Loads the deck and the progress on this device, then lists the tips reached. */
export function TipsScreen({ store, loadTips = loadDeck, onPlay }: TipsScreenProps) {
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadTips(), (store ?? localStore()).getReviewsSinceReset()])
      .then(([deck, reviews]) => {
        if (!cancelled) setLoaded({ status: "ready", tips: reachedTips(deck.tips, deck.cards, replayReviews(reviews)) });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ status: "failed" });
      });
    return () => {
      cancelled = true;
    };
  }, [store, loadTips]);

  return (
    <main data-testid="tips" className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-6">
      <Link href={ROUTES.menu} className="font-bold text-ink">
        ← Menu
      </Link>
      <h1 className="font-display text-prompt font-bold">Tips</h1>
      {loaded.status === "loading" ? (
        <p className="text-lg text-ink-soft">Loading…</p>
      ) : loaded.status === "failed" ? (
        <p role="alert" className="text-lg font-bold">
          The tips could not be loaded.
        </p>
      ) : loaded.tips.length === 0 ? (
        <p data-testid="tips-empty" className="text-lg text-ink-soft">
          No tips yet. Each one shows up in Learn just before the card that needs it, and stays here after.
        </p>
      ) : (
        <ol className="flex flex-col gap-4">
          {loaded.tips.map((tip) => (
            <li
              key={tip.id}
              data-testid="tips-item"
              data-tip-id={tip.id}
              className="flex flex-col gap-3 rounded-card border-2 border-line bg-surface p-5 shadow-card"
            >
              <TipBody tip={tip} onPlay={onPlay} />
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
