"use client";

import { useSyncExternalStore } from "react";

/** The four moves every character shares. The keyframes are in `app/globals.css`. */
export type Move = "pop" | "wiggle" | "jump" | "droop";

/**
 * How long each move runs, in milliseconds. The same numbers are in
 * `app/globals.css`; `motion.test.tsx` checks the two agree.
 */
export const MOVE_MS: Record<Move, number> = { pop: 400, wiggle: 500, jump: 450, droop: 500 };

const REDUCED = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const query = window.matchMedia(REDUCED);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** False when the reader asked for reduced motion, and wherever that cannot be asked. */
function motionAllowed() {
  return typeof window !== "undefined" && !!window.matchMedia && !window.matchMedia(REDUCED).matches;
}

/**
 * Whether the app may move things. Components set `data-move` and `data-enter`
 * only when this is true, and the stylesheet animates those only outside
 * reduced motion, so the setting is respected twice over.
 */
export function useMotion(): boolean {
  return useSyncExternalStore(subscribe, motionAllowed, () => false);
}
