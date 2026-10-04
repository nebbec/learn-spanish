"use client";

// A bottom sheet over a scrim: the menu's sheet and its Practice options. See
// docs/design.md, "Menu", "Decided in U1" and "Decided in U3".

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { useMotion } from "@/components/motion";
import { ChevronIcon } from "./icons";

export interface SheetProps {
  /** Test id of the sheet's panel; its scrim takes the same with `-scrim`. */
  testId: string;
  /** Names the sheet for screen readers when it has no heading. */
  label?: string;
  /** The id of the sheet's heading, when it has one. */
  labelledBy?: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Rises from the bottom of the screen, white with rounded top corners. Tapping
 * the scrim or the handle, or pressing Escape, closes it. Focus moves into the
 * sheet when it opens and back to whatever opened it when it closes.
 */
export function Sheet({ testId, label, labelledBy, onClose, children }: SheetProps) {
  const motion = useMotion();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel.current?.focus();
    return () => opener?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-20"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div
        data-testid={`${testId}-scrim`}
        data-enter={motion ? "scrim" : undefined}
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-scrim"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-labelledby={labelledBy}
        tabIndex={-1}
        data-testid={testId}
        data-enter={motion ? "sheet" : undefined}
        className="absolute inset-x-0 bottom-0 mx-auto flex max-w-md flex-col gap-1 rounded-t-sheet bg-surface px-5 pt-2.5 pb-8.5 text-ink shadow-sheet outline-none"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="-mt-2.5 grid h-7 shrink-0 place-items-center"
        >
          <span className="h-1.25 w-10 rounded-full bg-line" />
        </button>
        {children}
      </div>
    </div>
  );
}

/** A thin line between groups of rows. */
export function SheetDivider() {
  return <div className="my-2 h-px shrink-0 bg-line" />;
}

/** A row's icon in its quiet tile. */
export function SheetIcon({ children }: { children: ReactNode }) {
  return <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-quiet">{children}</span>;
}

/** A row's title and the line under it. */
export function SheetText({ title, detail }: { title: string; detail: ReactNode }) {
  return (
    <span className="flex min-w-0 grow flex-col gap-px">
      <span className="text-base font-bold">{title}</span>
      <span className="text-[0.8125rem] text-ink-soft">{detail}</span>
    </span>
  );
}

/** A row that goes somewhere: icon, title and line, and a chevron. */
export function SheetLink({
  href,
  testId,
  icon,
  title,
  detail,
}: {
  href: string;
  testId: string;
  icon: ReactNode;
  title: string;
  detail: ReactNode;
}) {
  return (
    <Link href={href} data-testid={testId} className="flex min-h-15 items-center gap-3.5">
      <SheetIcon>{icon}</SheetIcon>
      <SheetText title={title} detail={detail} />
      <span className="text-ink-soft">
        <ChevronIcon />
      </span>
    </Link>
  );
}
