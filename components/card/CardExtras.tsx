"use client";

import { useEffect, useRef, useState } from "react";
import type { Card } from "@/lib/deck";
import { localStore, type LocalStore } from "@/lib/store";

/** The part of the store the note field and the report button use. */
export type ExtrasStore = Pick<LocalStore, "getNote" | "saveNote" | "addReport">;

export interface CardExtrasProps {
  card: Card;
  /** Defaults to the app's shared store. Tests pass their own. */
  store?: ExtrasStore;
}

/**
 * The note field with its "suggest a trick" button, and the "something's off"
 * report. Goes inside `Reveal` as its children. Unlike the rest of
 * `components/card`, it reads and writes the local store itself.
 */
export function CardExtras({ card, store }: CardExtrasProps) {
  // Keyed on the card, so moving to the next card starts from that card's own note.
  return <Extras key={card.id} card={card} store={store ?? localStore()} />;
}

function Extras({ card, store }: { card: Card; store: ExtrasStore }) {
  return (
    <div data-testid="card-extras" className="flex w-full flex-col gap-3 text-left">
      <NoteField card={card} store={store} />
      <ReportButton card={card} store={store} />
    </div>
  );
}

/** The note with the trick added: on its own line after any text already there, and never twice. */
export function withTrick(note: string, trick: string): string {
  if (note.includes(trick)) return note;
  return note.trim() ? `${note.trimEnd()}\n${trick}` : trick;
}

function NoteField({ card, store }: { card: Card; store: ExtrasStore }) {
  const [text, setText] = useState("");
  /** True once the user has changed the note, so a slow load cannot overwrite what they typed. */
  const edited = useRef(false);
  /** Saves run one after another, so the last thing typed is the last thing written. */
  const saving = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    store
      .getNote(card.id)
      .then((note) => {
        if (!cancelled && !edited.current && note) setText(note.text);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [card.id, store]);

  function change(next: string) {
    edited.current = true;
    setText(next);
    saving.current = saving.current.then(() => store.saveNote(card.id, next)).catch(() => {});
  }

  const noteId = `note-${card.id}`;
  // Form and phrase cards may have no trick.
  const { trick } = card;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={noteId} className="text-sm font-bold uppercase tracking-wide text-ink-soft">
          My note
        </label>
        {trick !== null && (
          <button
            type="button"
            data-testid="suggest-trick"
            onClick={() => change(withTrick(text, trick))}
            className="min-h-11 rounded-button px-2 text-sm font-bold text-ink underline underline-offset-4"
          >
            Suggest a trick
          </button>
        )}
      </div>
      <textarea
        id={noteId}
        data-testid="note"
        value={text}
        onChange={(event) => change(event.target.value)}
        rows={3}
        placeholder="Anything that helps you remember"
        className="w-full rounded-button border-2 border-line bg-paper p-3 text-base"
      />
    </div>
  );
}

function ReportButton({ card, store }: { card: Card; store: ExtrasStore }) {
  const [stage, setStage] = useState<"closed" | "open" | "sending" | "sent" | "failed">("closed");
  const [comment, setComment] = useState("");

  if (stage === "closed" || stage === "sent") {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          data-testid="report-open"
          onClick={() => setStage("open")}
          className="min-h-11 rounded-button px-2 text-sm font-bold text-ink-soft underline"
        >
          Something&apos;s off
        </button>
        {stage === "sent" && (
          <span data-testid="report-sent" role="status" className="text-sm text-ink-soft">
            Thanks, reported.
          </span>
        )}
      </div>
    );
  }

  async function send() {
    setStage("sending");
    try {
      await store.addReport(card.id, comment);
      setComment("");
      setStage("sent");
    } catch {
      setStage("failed");
    }
  }

  const commentId = `report-${card.id}`;
  return (
    <div className="flex flex-col gap-2 rounded-button border-2 border-line p-3">
      <label htmlFor={commentId} className="text-sm font-bold">
        What&apos;s wrong with this card? <span className="font-normal text-ink-soft">(optional)</span>
      </label>
      <textarea
        id={commentId}
        data-testid="report-comment"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        rows={2}
        className="w-full rounded-button border-2 border-line bg-paper p-3 text-base"
      />
      {stage === "failed" && (
        <p data-testid="report-failed" role="alert" className="text-sm font-bold text-again">
          That didn&apos;t save. Try again.
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          data-testid="report-send"
          disabled={stage === "sending"}
          onClick={send}
          className="min-h-11 rounded-button bg-brand px-4 font-bold text-on-brand disabled:opacity-60"
        >
          Send report
        </button>
        <button
          type="button"
          data-testid="report-cancel"
          onClick={() => setStage("closed")}
          className="min-h-11 rounded-button px-4 font-bold text-ink-soft"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
