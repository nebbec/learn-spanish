"use client";

// The menu, the app's home page: the mascot and her line, the wheel, Learn, and Practice
// with its options in a sheet. See docs/design.md, "Menu" ("Decided in U1" and "Decided in U3").
// Presentational: progress in, links out.

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Mascot } from "@/components/motion";
import { Wheel } from "@/components/Wheel";
import type { Card, DeckUnit, PartOfSpeech } from "@/lib/deck";
import { GREETING_TEXT, menuGreeting, progressStats } from "@/lib/progress";
import {
  DEFAULT_BATCH_SIZE,
  learnCut,
  practiceHref,
  strugglingCardIds,
  unitName,
  type CardStates,
  type PracticeMode,
} from "@/lib/queues";
import { ROUTES } from "@/lib/routes";
import { isDue, type ReviewEvent } from "@/lib/scheduler";
import {
  InOrderIcon,
  MenuIcon,
  ReverseIcon,
  SettingsIcon,
  ShuffleIcon,
  SlidersIcon,
  StrugglingIcon,
  TipsIcon,
} from "./icons";
import { Sheet, SheetDivider, SheetIcon, SheetLink, SheetText } from "./Sheet";

export interface MenuProps {
  /** The whole deck. */
  cards: readonly Card[];
  /** The starter path's units. While one has unseen cards, the Learn button names it. */
  units?: readonly DeckUnit[];
  /** Card state for every seen card. */
  states: CardStates;
  /** Every stored review. Read for the struggling count. */
  reviews: readonly ReviewEvent[];
  /** The time the due count is taken at, in epoch milliseconds. */
  now: number;
  /** Called with the Practice link for a tapped petal of the wheel. */
  onNavigate: (href: string) => void;
  /** The sync status line, drawn at the foot of the menu sheet. */
  status?: ReactNode;
  /** Puts a dot on the menu button, since the status line is out of sight in the sheet. */
  syncFailed?: boolean;
}

type OpenSheet = "menu" | "practice" | null;

export function Menu({ cards, units = [], states, reviews, now, onNavigate, status, syncFailed = false }: MenuProps) {
  // Reverse combines with every way into Practice, so it is a switch that changes the links.
  // It starts off each time the menu opens.
  const [reverse, setReverse] = useState(false);
  const [sheet, setSheet] = useState<OpenSheet>(null);
  const close = () => setSheet(null);

  const stats = progressStats(cards, states);
  const unseen = stats.total - stats.seen;
  // The batch size does not matter here: only the unit is read.
  const unit = learnCut(cards, states, units, DEFAULT_BATCH_SIZE).unit;
  const due = cards.filter((card) => isDue(states.get(card.id), now)).length;
  const strugglingIds = strugglingCardIds(reviews);
  const struggling = cards.filter((card) => strugglingIds.has(card.id)).length;
  const greeting = menuGreeting(cards, units, states, now);

  const href = (mode?: PracticeMode, pos?: PartOfSpeech) => practiceHref({ mode, pos, reverse });

  return (
    <>
      <main
        data-testid="menu"
        inert={sheet !== null}
        className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pt-3 pb-7.5"
      >
        <header className="flex h-11 shrink-0 justify-end">
          <button
            type="button"
            data-testid="menu-open"
            aria-label={syncFailed ? "Menu, sync failed" : "Menu"}
            aria-haspopup="dialog"
            aria-expanded={sheet === "menu"}
            onClick={() => setSheet("menu")}
            className="relative grid size-11 place-items-center rounded-full text-ink"
          >
            <MenuIcon />
            {syncFailed && (
              <span
                data-testid="menu-sync-dot"
                className="absolute top-2 right-2 size-2.5 rounded-full border-2 border-surface bg-again"
              />
            )}
          </button>
        </header>

        <div className="mt-1 flex shrink-0 flex-col items-center gap-0.5">
          <div data-testid="mascot-slot" aria-hidden="true" className="size-[clamp(112px,21.4dvh,180px)]">
            <Mascot pose="idle" />
          </div>
          <h1
            data-testid="menu-greeting"
            data-greeting={greeting}
            lang="es"
            className="font-display text-greeting font-extrabold tracking-[-0.01em]"
          >
            {GREETING_TEXT[greeting]}
          </h1>
        </div>

        <section aria-label="Progress" className="mt-4.5 shrink-0">
          <Wheel stats={stats} onSliceTap={(pos) => onNavigate(href(undefined, pos))} />
        </section>

        <div className="min-h-3 grow" />

        <nav aria-label="Study" className="flex shrink-0 flex-col gap-2.5">
          <Link
            href={ROUTES.learn}
            data-testid="menu-learn"
            className="flex h-17 flex-col items-center justify-center gap-px rounded-cta bg-brand text-on-brand"
          >
            <span className="text-xl font-extrabold">Learn</span>
            <span className="text-sm font-semibold opacity-85">
              {unit ? (
                <span data-testid="menu-unit">{unitName(units, unit)}</span>
              ) : (
                <>
                  <span data-testid="menu-unseen">{unseen}</span> new {unseen === 1 ? "card" : "cards"} left
                </>
              )}
            </span>
          </Link>

          <div className="flex gap-2.5">
            <Link
              href={href()}
              data-testid="menu-practice"
              className="flex h-14 min-w-0 grow items-center justify-center gap-2 rounded-tile border-[1.5px] border-edge bg-surface px-2"
            >
              <span className="text-[1.0625rem] font-extrabold">Practice</span>
              <span data-testid="menu-due" data-count={due} className="truncate text-sm font-semibold text-ink-soft">
                {due > 0 ? `${due} due` : stats.seen > 0 ? "Nothing due" : "Nothing due yet"}
              </span>
              {reverse && (
                <span
                  data-testid="menu-reverse-tag"
                  className="shrink-0 rounded-full bg-ink px-2 py-0.75 text-xs font-bold text-surface"
                >
                  Reverse on
                </span>
              )}
            </Link>
            <button
              type="button"
              data-testid="practice-options"
              aria-label="Practice options"
              aria-haspopup="dialog"
              aria-expanded={sheet === "practice"}
              onClick={() => setSheet("practice")}
              className="grid size-14 shrink-0 place-items-center rounded-tile border-[1.5px] border-edge bg-surface"
            >
              <SlidersIcon />
            </button>
          </div>
        </nav>
      </main>

      {sheet === "menu" && (
        <Sheet testId="menu-sheet" label="Menu" onClose={close}>
          <SheetLink
            href={ROUTES.tips}
            testId="menu-tips"
            icon={<TipsIcon />}
            title="Tips"
            detail="Every tip you have reached"
          />
          <SheetLink
            href={ROUTES.settings}
            testId="menu-settings"
            icon={<SettingsIcon />}
            title="Settings"
            detail="Sign-in, audio, batch size, offline"
          />
          {/* The status line draws nothing when sync is not set up, and its rule goes with it. */}
          <div className="mt-2 border-t border-line pt-2 empty:hidden">{status}</div>
        </Sheet>
      )}

      {sheet === "practice" && (
        <Sheet testId="practice-sheet" labelledBy="practice-options-heading" onClose={close}>
          <h2 id="practice-options-heading" className="mb-1.5 text-[1.1875rem] font-extrabold">
            Practice options
          </h2>
          <SheetLink
            href={href("shuffle")}
            testId="menu-shuffle"
            icon={<ShuffleIcon />}
            title="Shuffle"
            detail="Seen cards in random order"
          />
          <SheetLink
            href={href("in-order")}
            testId="menu-in-order"
            icon={<InOrderIcon />}
            title="In order"
            detail="Seen cards, most common first"
          />
          <SheetLink
            href={href("struggling")}
            testId="menu-struggling"
            icon={<StrugglingIcon />}
            title="Struggling"
            detail={
              <>
                <span data-testid="menu-struggling-count">{struggling}</span> {struggling === 1 ? "card" : "cards"}{" "}
                with a recent red
              </>
            }
          />
          <SheetDivider />
          <div className="flex min-h-15 items-center gap-3.5">
            <SheetIcon>
              <ReverseIcon />
            </SheetIcon>
            <SheetText title="Reverse" detail="Spanish shown first, everywhere in Practice" />
            <button
              type="button"
              role="switch"
              aria-checked={reverse}
              aria-label="Reverse"
              data-testid="menu-reverse"
              onClick={() => setReverse((on) => !on)}
              className={`relative h-8 w-13 shrink-0 rounded-full ${reverse ? "bg-brand" : "bg-edge"}`}
            >
              <span
                className={`absolute top-0.75 size-6.5 rounded-full bg-surface shadow-[0_1px_3px_rgb(0_0_0/0.2)] motion-safe:transition-[left] ${
                  reverse ? "left-5.75" : "left-0.75"
                }`}
              />
            </button>
          </div>
        </Sheet>
      )}
    </>
  );
}
