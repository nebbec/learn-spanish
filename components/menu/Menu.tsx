"use client";

// The menu: the wheel, Learn and Practice with their counts, and the Practice options.
// See docs/design.md, "Menu". Presentational: progress in, links out.

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Wheel } from "@/components/Wheel";
import type { Card, PartOfSpeech } from "@/lib/deck";
import { progressStats } from "@/lib/progress";
import { practiceHref, strugglingCardIds, type CardStates, type PracticeMode } from "@/lib/queues";
import { ROUTES } from "@/lib/routes";
import { isDue, type ReviewEvent } from "@/lib/scheduler";

export interface MenuProps {
  /** The whole deck. */
  cards: readonly Card[];
  /** Card state for every seen card. */
  states: CardStates;
  /** Every stored review. Read for the struggling count. */
  reviews: readonly ReviewEvent[];
  /** The time the due count is taken at, in epoch milliseconds. */
  now: number;
  /** Called with the Practice link for a tapped slice of the wheel. */
  onNavigate: (href: string) => void;
  /** The sync status line, drawn under the header. */
  status?: ReactNode;
}

const optionClass =
  "flex min-h-14 flex-col items-center justify-center rounded-button border-2 border-line bg-surface px-2 py-2 text-center font-bold";

export function Menu({ cards, states, reviews, now, onNavigate, status }: MenuProps) {
  // Reverse combines with every way into Practice, so it is a switch that changes the links.
  const [reverse, setReverse] = useState(false);

  const stats = progressStats(cards, states);
  const unseen = stats.total - stats.seen;
  const due = cards.filter((card) => isDue(states.get(card.id), now)).length;
  const strugglingIds = strugglingCardIds(reviews);
  const struggling = cards.filter((card) => strugglingIds.has(card.id)).length;

  const href = (mode?: PracticeMode, pos?: PartOfSpeech) => practiceHref({ mode, pos, reverse });

  return (
    <main data-testid="menu" className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* F3 puts the hero mascot here. */}
          <div data-testid="mascot-slot" aria-hidden="true" className="size-12 shrink-0 rounded-full bg-sun" />
          <h1 className="font-display text-prompt font-bold">Learn Spanish</h1>
        </div>
        <Link href={ROUTES.settings} data-testid="menu-settings" className="font-bold text-brand">
          Settings
        </Link>
      </header>
      {status}

      <section aria-label="Progress" className="flex flex-col items-center gap-1">
        <Wheel stats={stats} onSliceTap={(pos) => onNavigate(href(undefined, pos))} className="w-full" />
        <p className="text-center text-ink-soft">
          <span data-testid="menu-memorized">{stats.memorized}</span> memorized ·{" "}
          <span data-testid="menu-seen">{stats.seen}</span> seen of {stats.total}. Tap a slice to practise it.
        </p>
      </section>

      <nav aria-label="Study" className="flex flex-col gap-3">
        <Link
          href={ROUTES.learn}
          data-testid="menu-learn"
          className="flex flex-col items-center rounded-button bg-brand p-4 text-center text-on-brand"
        >
          <span className="font-display text-2xl font-bold">Learn</span>
          <span>
            <span data-testid="menu-unseen">{unseen}</span> new {unseen === 1 ? "card" : "cards"} left
          </span>
        </Link>
        <Link
          href={href()}
          data-testid="menu-practice"
          className="flex flex-col items-center rounded-button border-2 border-brand bg-brand-soft p-4 text-center text-ink"
        >
          <span className="font-display text-2xl font-bold">Practice</span>
          <span>
            <span data-testid="menu-due">{due}</span> due
          </span>
        </Link>

        <div className="grid grid-cols-3 gap-3">
          <Link href={href("shuffle")} data-testid="menu-shuffle" className={optionClass}>
            Shuffle
          </Link>
          <Link href={href("in-order")} data-testid="menu-in-order" className={optionClass}>
            In order
          </Link>
          <Link href={href("struggling")} data-testid="menu-struggling" className={optionClass}>
            <span>Struggling</span>
            <span className="text-sm font-normal text-ink-soft">
              <span data-testid="menu-struggling-count">{struggling}</span> {struggling === 1 ? "card" : "cards"}
            </span>
          </Link>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={reverse}
          data-testid="menu-reverse"
          onClick={() => setReverse((on) => !on)}
          className={`flex min-h-14 items-center justify-between rounded-button border-2 px-4 py-2 text-left font-bold ${
            reverse ? "border-brand bg-brand-soft" : "border-line bg-surface"
          }`}
        >
          <span className="flex flex-col">
            <span>Reverse</span>
            <span className="text-sm font-normal text-ink-soft">Practise with the Spanish shown first</span>
          </span>
          <span>{reverse ? "On" : "Off"}</span>
        </button>
      </nav>
    </main>
  );
}
