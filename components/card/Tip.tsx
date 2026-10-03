"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useMotion } from "@/components/motion";
import type { DeckTip } from "@/lib/deck";
import { playClip } from "@/components/audio";
import { AudioButton } from "./Reveal";

interface TipBodyProps {
  tip: DeckTip;
  /** Plays a clip, given its path. Defaults to `playClip`. */
  onPlay?: (src: string) => void;
}

/** A tip's title, body and examples, each example with its clip. Shared by the tip screen, the sheet and `/tips`. */
export function TipBody({ tip, onPlay = playClip }: TipBodyProps) {
  return (
    <>
      <h2 data-testid="tip-title" className="font-display text-prompt font-bold">
        {tip.title}
      </h2>
      <p data-testid="tip-body" className="text-lg">
        {tip.body}
      </p>
      <ul className="flex w-full flex-col gap-2">
        {tip.examples.map((example, n) => (
          <li
            key={example.audio}
            data-testid="tip-example"
            className="flex items-center gap-2 rounded-button bg-paper p-3 text-left"
          >
            <p className="flex flex-1 flex-col gap-0.5">
              <span lang="es" className="text-lg font-bold">
                {example.es}
              </span>
              <span className="text-ink-soft">{example.en}</span>
            </p>
            <AudioButton
              label={`Play example ${n + 1}`}
              testId={`tip-play-${n + 1}`}
              onPress={() => onPlay(example.audio)}
            />
          </li>
        ))}
      </ul>
    </>
  );
}

export interface TipScreenProps extends TipBodyProps {
  /** Fired by "Got it": the batch moves on. */
  onDone: () => void;
}

/**
 * A tip as a step of a Learn batch, before the first card naming it: never rated.
 * See "Tips" in docs/design.md.
 */
export function TipScreen({ tip, onDone, onPlay }: TipScreenProps) {
  const motion = useMotion();
  return (
    <div
      data-testid="tip"
      data-tip-id={tip.id}
      data-enter={motion ? "card" : undefined}
      className="flex min-h-0 flex-1 flex-col gap-3"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain rounded-card border-2 border-line bg-surface p-5 shadow-card">
        <span className="text-sm font-bold uppercase tracking-wide text-ink-soft">Tip</span>
        <TipBody tip={tip} onPlay={onPlay} />
      </div>
      <button
        type="button"
        data-testid="tip-continue"
        onClick={onDone}
        className="min-h-16 rounded-button bg-brand px-2 py-3 font-display text-lg font-bold leading-tight text-on-brand"
      >
        Got it
      </button>
    </div>
  );
}

/**
 * The "?" on an intro or reveal of a card naming a tip. It opens the tip over the card;
 * closing it leaves the card as it was.
 */
export function TipButton({ tip, onPlay, className = "" }: TipBodyProps & { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        data-testid="tip-open"
        aria-label={`Tip: ${tip.title}`}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={`grid size-11 shrink-0 place-items-center rounded-full border-2 border-brand bg-brand-soft font-display text-xl font-bold text-brand ${className}`}
      >
        ?
      </button>
      {open && <TipSheet tip={tip} onPlay={onPlay} onClose={() => setOpen(false)} />}
    </>
  );
}

/** The tip over the card. Drawn on `document.body`, so a moving card cannot carry it. */
function TipSheet({ tip, onPlay, onClose }: TipBodyProps & { onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={tip.title}
        data-testid="tip-sheet"
        data-tip-id={tip.id}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[85dvh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-card border-2 border-line bg-surface p-5 shadow-card"
      >
        <span className="text-sm font-bold uppercase tracking-wide text-ink-soft">Tip</span>
        <TipBody tip={tip} onPlay={onPlay} />
        <button
          type="button"
          data-testid="tip-close"
          autoFocus
          onClick={onClose}
          className="min-h-14 rounded-button bg-brand px-4 py-3 font-display text-lg font-bold text-on-brand"
        >
          Close
        </button>
      </div>
    </div>,
    document.body,
  );
}
