"use client";

import { setMuted, useMuted } from "./audio";

/**
 * The mute button in the batch frame's top bar: a speaker, crossed out when muted.
 * Muting stops a playing clip and stops clips playing by themselves; the audio
 * buttons still play when tapped. The same switch as "Play audio by itself" in settings.
 */
export function MuteButton() {
  const muted = useMuted();
  return (
    <button
      type="button"
      data-testid="mute"
      aria-label="Mute"
      aria-pressed={muted}
      title={muted ? "Sound off: tap to let clips play by themselves" : "Stop clips playing by themselves"}
      onClick={() => setMuted(!muted)}
      className={`-my-2 grid size-10 shrink-0 place-items-center rounded-button ${muted ? "text-again" : "text-ink-soft"}`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
        {muted ? (
          <path d="M16 9.5l5 5M21 9.5l-5 5" />
        ) : (
          <path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" />
        )}
      </svg>
    </button>
  );
}
