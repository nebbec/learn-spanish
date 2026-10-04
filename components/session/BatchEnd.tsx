import type { ReactNode } from "react";
import { RATING_BUTTONS } from "@/components/card";
import { Confetti, Mascot, useMotion } from "@/components/motion";
import type { SessionSummary } from "./useSession";

export interface BatchEndProps {
  title: string;
  summary: SessionSummary;
  /** A line under the title, e.g. how many cards are left. */
  children?: ReactNode;
  /** Shown between the title and the summary, e.g. a unit's payoff. */
  payoff?: ReactNode;
  /** Starts another batch. Leave out when there is nothing more to study. */
  onAnother?: () => void;
  anotherLabel?: string;
  /** Extra controls above the buttons, e.g. Practice's Reverse toggle. */
  actions?: ReactNode;
  onMenu: () => void;
}

const SOFT: Record<string, string> = {
  good: "bg-good-soft text-good",
  nearly: "bg-nearly-soft text-nearly",
  again: "bg-again-soft text-again",
};

/**
 * The screen after the last card of a batch: a summary and the choice of
 * another batch or the menu. Goes inside `BatchFrame`. The celebration is the
 * mascot's celebration loop and a fall of confetti.
 */
export function BatchEnd({ title, summary, children, payoff, onAnother, anotherLabel = "Another batch", actions, onMenu }: BatchEndProps) {
  const motion = useMotion();
  return (
    <div data-testid="batch-end" className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center-safe gap-5 overflow-y-auto rounded-card border-2 border-line bg-surface p-6 text-center shadow-card">
        <Confetti />
        <div
          data-testid="mascot-slot"
          data-move={motion ? "celebrate" : undefined}
          aria-hidden="true"
          className="size-36 shrink-0"
        >
          <Mascot pose="celebrate" />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-prompt font-bold">{title}</h1>
          {children && <p className="text-lg text-ink-soft">{children}</p>}
        </div>
        {payoff}
        <dl className="grid w-full grid-cols-3 gap-2">
          {[...RATING_BUTTONS].reverse().map(({ rating, label }) => (
            <div key={rating} className={`flex flex-col-reverse rounded-button p-3 ${SOFT[rating]}`}>
              <dt className="text-sm font-bold leading-tight">{label}</dt>
              <dd data-testid={`summary-${rating}`} className="font-display text-prompt font-bold">
                {summary[rating]}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="flex flex-col gap-2">
        {actions}
        {onAnother && (
          <button
            type="button"
            data-testid="another-batch"
            onClick={onAnother}
            className="min-h-14 rounded-button bg-brand px-4 py-3 font-display text-xl font-bold text-on-brand"
          >
            {anotherLabel}
          </button>
        )}
        <button
          type="button"
          data-testid="to-menu"
          onClick={onMenu}
          className="min-h-14 rounded-button border-2 border-line bg-surface px-4 py-3 font-display text-xl font-bold text-brand"
        >
          Menu
        </button>
      </div>
    </div>
  );
}
