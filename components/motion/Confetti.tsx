"use client";

import type { CSSProperties } from "react";
import { useMotion } from "./motion";

const COLOURS = ["bg-brand", "bg-sun", "bg-good", "bg-again", "bg-nearly"];
const PIECES = 14;

/**
 * The batch-end celebration: a burst of paper falling once behind the summary.
 * Decoration only, so it is hidden from screen readers and from taps, and it
 * is not drawn at all with reduced motion on.
 */
export function Confetti() {
  const motion = useMotion();
  if (!motion) return null;
  return (
    <div data-testid="confetti" aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: PIECES }, (_, i) => (
        <span
          key={i}
          data-confetti=""
          className={`absolute top-0 block h-3 w-2 rounded-sm opacity-0 ${COLOURS[i % COLOURS.length]}`}
          style={
            {
              // Spread across the width, out of step with each other, without randomness.
              left: `${((i * 37) % 100) * 0.92 + 2}%`,
              animationDelay: `${(i % 7) * 90}ms`,
              "--confetti-turn": `${i % 2 ? 540 : -420}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
