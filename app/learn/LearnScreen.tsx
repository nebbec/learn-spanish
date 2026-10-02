"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LearnSession } from "@/components/session";
import { loadDeck, type Card } from "@/lib/deck";
import type { CardStates } from "@/lib/queues";
import { ROUTES } from "@/lib/routes";
import { replayReviews } from "@/lib/scheduler";
import { localStore } from "@/lib/store";

type Loaded = { status: "loading" } | { status: "failed" } | { status: "ready"; cards: Card[]; states: CardStates };

/** Loads the deck and the progress on this device, then runs Learn. */
export function LearnScreen() {
  const router = useRouter();
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    // Card state comes from replaying the reviews, not from the card_state cache,
    // so it is right even if a cache write was lost.
    Promise.all([loadDeck(), localStore().getReviews()])
      .then(([deck, reviews]) => {
        if (!cancelled) setLoaded({ status: "ready", cards: deck.cards, states: replayReviews(reviews) });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ status: "failed" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loaded.status === "ready") {
    return <LearnSession cards={loaded.cards} states={loaded.states} onExit={() => router.push(ROUTES.menu)} />;
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
