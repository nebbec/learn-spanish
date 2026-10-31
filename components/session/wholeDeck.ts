"use client";

import { useSyncExternalStore } from "react";
import { NAMES } from "@/lang";

/**
 * `localStorage` key for the Whole deck switch (`learn-spanish.whole-deck` in Spanish): "1"
 * when on. Missing means off, so Practice keeps to seen cards until the learner turns it on.
 * Unlike Reverse it stays as set. See "Whole deck" in docs/design.md.
 */
export const WHOLE_DECK_KEY = NAMES.wholeDeck;

const listeners = new Set<() => void>();

/** The switch as last set on this page, for when storage refuses the write. */
let memory = false;

/** True when Practice takes unseen cards too. Storage that cannot be read falls back to the switch as set on this page. */
export function isWholeDeck(): boolean {
  try {
    return window.localStorage.getItem(WHOLE_DECK_KEY) === "1";
  } catch {
    return memory;
  }
}

/** Turns the Whole deck switch on or off, on this device. */
export function setWholeDeck(on: boolean) {
  memory = on;
  try {
    if (on) window.localStorage.setItem(WHOLE_DECK_KEY, "1");
    else window.localStorage.removeItem(WHOLE_DECK_KEY);
  } catch {
    // Private windows can refuse storage; the switch then lasts until the page is left.
  }
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === WHOLE_DECK_KEY || event.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** The Whole deck switch, kept in step across every component showing it. False on the server. */
export function useWholeDeck(): boolean {
  return useSyncExternalStore(subscribe, isWholeDeck, () => false);
}
