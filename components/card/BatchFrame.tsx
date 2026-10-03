"use client";

import { useEffect, type ReactNode } from "react";
import { MuteButton } from "@/components/audio";

export interface BatchFrameProps {
  /** Cards in the batch. Grows by one when a red brings a card back. */
  total: number;
  /** Zero-based position of the card on screen. Equal to `total` once the batch is finished. */
  index: number;
  /** Shows a close button when given. */
  onClose?: () => void;
  /** A line under the bar naming what the batch studies, e.g. "Unit 3 · How and where I am". */
  title?: string;
  children: ReactNode;
}

/**
 * The Stories-style frame around a batch: a segmented bar with one segment per
 * card, and the card below it. Fills the screen and turns off overscroll, so a
 * swipe down reveals the card instead of pulling the page to refresh. The mute
 * button is always in the top bar.
 */
export function BatchFrame({ total, index, onClose, title, children }: BatchFrameProps) {
  // Pull-to-refresh is decided by the root element, not by this container.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.overscrollBehavior;
    root.style.overscrollBehavior = "none";
    return () => {
      root.style.overscrollBehavior = previous;
    };
  }, []);

  return (
    <div data-testid="batch-frame" className="fixed inset-0 overflow-hidden overscroll-none bg-paper">
      <div className="mx-auto flex h-full max-w-md flex-col gap-4 p-4">
        <header className="flex items-center gap-3">
          <SegmentedBar total={total} index={index} />
          <MuteButton />
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-my-2 grid size-10 shrink-0 place-items-center rounded-button text-2xl font-bold leading-none text-ink-soft"
            >
              <span aria-hidden="true">×</span>
            </button>
          )}
        </header>
        {title && (
          <p data-testid="batch-title" className="-mt-2 truncate text-center text-sm font-bold text-ink-soft">
            {title}
          </p>
        )}
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}

function SegmentedBar({ total, index }: { total: number; index: number }) {
  const shown = Math.min(index + 1, total);
  return (
    <div
      role="progressbar"
      aria-label={`Card ${shown} of ${total}`}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={shown}
      className="flex h-2 flex-1 gap-1"
    >
      {Array.from({ length: total }, (_, i) => {
        const state = i < index ? "done" : i === index ? "current" : "upcoming";
        return (
          <span
            key={i}
            data-segment={state}
            className={`flex-1 rounded-full ${
              state === "done" ? "bg-brand" : state === "current" ? "bg-sun" : "bg-line"
            }`}
          />
        );
      })}
    </div>
  );
}
