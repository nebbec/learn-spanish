"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PracticeSession } from "@/components/session";
import { loadDeck, type Card, type DeckTip } from "@/lib/deck";
import { parsePracticeParams, practiceHref, type CardStates } from "@/lib/queues";
import { ROUTES } from "@/lib/routes";
import { replayReviews, type ReviewEvent } from "@/lib/scheduler";
import { localStore } from "@/lib/store";
import { requestSync } from "@/lib/sync";

type Loaded =
  | { status: "loading" }
  | { status: "failed" }
  | { status: "ready"; cards: Card[]; tips: DeckTip[]; states: CardStates; reviews: ReviewEvent[] };

/** Loads the deck and the progress on this device, then runs Practice with the options in the URL. */
export function PracticeScreen() {
  const router = useRouter();
  const { mode, pos, reverse } = parsePracticeParams(useSearchParams());
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    // Card state comes from replaying the reviews, not from the card_state cache,
    // so it is right even if a cache write was lost.
    Promise.all([loadDeck(), localStore().getReviews()])
      .then(([deck, reviews]) => {
        if (!cancelled) setLoaded({ status: "ready", cards: deck.cards, tips: deck.tips, states: replayReviews(reviews), reviews });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ status: "failed" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loaded.status === "ready") {
    return (
      <PracticeSession
        // A different option is a different queue, so the sitting starts again.
        // Reverse is not in the key: it does not change the queue.
        key={`${mode}:${pos ?? ""}`}
        cards={loaded.cards}
        tips={loaded.tips}
        states={loaded.states}
        reviews={loaded.reviews}
        mode={mode}
        pos={pos}
        reverse={reverse}
        onReverseChange={(next) => window.history.replaceState(null, "", practiceHref({ mode, pos, reverse: next }))}
        onExit={() => router.push(ROUTES.menu)}
        onBatchEnd={requestSync}
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
