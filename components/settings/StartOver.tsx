"use client";

import { useState } from "react";
import { localStore, type LocalStore } from "@/lib/store";
import { requestSync } from "@/lib/sync";

export interface StartOverProps {
  /** Defaults to the app's shared store. Tests pass their own. */
  store?: Pick<LocalStore, "startOver">;
  /** The time the reset is recorded at. Defaults to now. */
  clock?: () => number;
  /**
   * Called once the reset is stored. Defaults to `requestSync`, so the reset reaches
   * the account's other devices (L16).
   */
  onDone?: () => void;
}

type Step = "idle" | "confirming" | "working" | "done" | "failed";

/**
 * "Start over": after a confirmation, records a reset, so nothing counts as seen and
 * Learn starts again at the first card. Notes and reports are kept. See "Reset" in
 * docs/design.md.
 */
export function StartOver({ store, clock = Date.now, onDone = requestSync }: StartOverProps) {
  const [step, setStep] = useState<Step>("idle");

  async function startOver() {
    setStep("working");
    try {
      await (store ?? localStore()).startOver(clock());
    } catch {
      setStep("failed");
      return;
    }
    setStep("done");
    onDone();
  }

  return (
    <section
      aria-labelledby="start-over-heading"
      className="flex flex-col gap-3 rounded-card border-2 border-line bg-surface p-6 shadow-card"
    >
      <h2 id="start-over-heading" className="font-display text-2xl font-bold">
        Start over
      </h2>
      <p className="text-ink-soft">
        Go back to the first card, with nothing seen and nothing memorized. Your notes are kept.
      </p>

      {step === "confirming" || step === "working" ? (
        <div role="alertdialog" aria-labelledby="start-over-confirm" className="flex flex-col gap-3">
          <p id="start-over-confirm" className="font-bold">
            Start over from the first card? Your progress goes back to zero, here and on any device you sync with.
          </p>
          <button
            type="button"
            data-testid="start-over-confirm"
            disabled={step === "working"}
            onClick={() => void startOver()}
            className="min-h-14 rounded-button bg-again px-4 py-3 font-display text-xl font-bold text-on-again"
          >
            Yes, start over
          </button>
          <button
            type="button"
            data-testid="start-over-cancel"
            disabled={step === "working"}
            onClick={() => setStep("idle")}
            className="min-h-14 rounded-button border-2 border-line bg-paper px-4 py-3 font-bold"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          data-testid="start-over"
          onClick={() => setStep("confirming")}
          className="min-h-14 rounded-button border-2 border-again bg-paper px-4 py-3 font-display text-xl font-bold text-again"
        >
          Start over
        </button>
      )}

      {step === "done" && (
        <p role="status" data-testid="start-over-done" className="font-bold">
          Done. Learn starts again at the first card.
        </p>
      )}
      {step === "failed" && (
        <p role="alert" data-testid="start-over-failed" className="font-bold text-again">
          Could not start over. Try again.
        </p>
      )}
    </section>
  );
}
