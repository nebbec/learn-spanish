"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

/**
 * `localStorage` key for the mute switch: "1" when muted. Missing means not muted,
 * so audio plays by itself until the learner turns it off. See "Hear it, say it"
 * in docs/design.md.
 */
export const MUTED_KEY = "learn-spanish.muted";

const listeners = new Set<() => void>();

/** The switch as last set on this page, for when storage refuses the write. */
let memory = false;

/** True when clips should not play by themselves. Storage that cannot be read falls back to the switch as set on this page. */
export function isMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTED_KEY) === "1";
  } catch {
    return memory;
  }
}

/**
 * Turns clips playing by themselves off or on, on this device. Muting also stops
 * a clip that is playing. Buttons still play when tapped.
 */
export function setMuted(muted: boolean) {
  memory = muted;
  try {
    if (muted) window.localStorage.setItem(MUTED_KEY, "1");
    else window.localStorage.removeItem(MUTED_KEY);
  } catch {
    // Private windows can refuse storage; the switch then lasts until the page is left.
  }
  if (muted) stopClip();
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Another tab of the app changed the switch.
  const onStorage = (event: StorageEvent) => {
    if (event.key === MUTED_KEY || event.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** The mute switch, kept in step across every component showing it. False on the server. */
export function useMuted(): boolean {
  return useSyncExternalStore(subscribe, isMuted, () => false);
}

/** The clip playing now, if any: one clip plays at a time. */
let current: HTMLAudioElement | null = null;

/** Plays one deck clip, stopping any other. Playback can be refused (no clip cached while offline, or no tap yet); that is not an error worth showing. */
export function playClip(src: string) {
  stopClip();
  const clip = new Audio(src);
  current = clip;
  void Promise.resolve(clip.play()).catch(() => {});
}

/** Stops the clip playing now, if any. */
export function stopClip() {
  const clip = current;
  current = null;
  if (!clip) return;
  try {
    clip.pause();
  } catch {
    // Nothing to stop.
  }
}

/**
 * Plays `src` once when the component mounts, and again whenever `src` changes,
 * unless muted. The intro and the reveal use it for the word clip.
 */
export function useAutoplay(src: string, play: (src: string) => void) {
  const played = useRef<string | null>(null);
  const playRef = useRef(play);
  useEffect(() => {
    playRef.current = play;
  });
  useEffect(() => {
    // Strict mode runs effects twice on mount; the clip still plays once.
    if (played.current === src) return;
    played.current = src;
    if (!isMuted()) playRef.current(src);
  }, [src]);
}
