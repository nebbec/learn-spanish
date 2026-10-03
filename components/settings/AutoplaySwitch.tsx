"use client";

import { setMuted, useMuted } from "@/components/audio";

/**
 * "Play audio by itself": the settings side of the batch frame's mute button. One
 * switch, kept on this device. See "Hear it, say it" in docs/design.md.
 */
export function AutoplaySwitch() {
  const on = !useMuted();
  return (
    <section
      aria-labelledby="sound-heading"
      className="flex flex-col gap-3 rounded-card border-2 border-line bg-surface p-6 shadow-card"
    >
      <h2 id="sound-heading" className="font-display text-2xl font-bold">
        Sound
      </h2>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        data-testid="autoplay-switch"
        onClick={() => setMuted(on)}
        className={`flex min-h-14 items-center justify-between rounded-button border-2 px-4 py-2 text-left font-bold ${
          on ? "border-brand bg-brand-soft" : "border-line bg-paper"
        }`}
      >
        <span className="flex flex-col">
          <span>Play audio by itself</span>
          <span className="text-sm font-normal text-ink-soft">
            The word plays when a new card or an answer opens. The buttons always play.
          </span>
        </span>
        <span>{on ? "On" : "Off"}</span>
      </button>
    </section>
  );
}
