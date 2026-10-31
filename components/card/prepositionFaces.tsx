"use client";

import { Fragment } from "react";
import { LANG } from "@/lang";
import type { Card, PrepositionGrammar } from "@/lib/deck";
import { splitGluePrompt } from "./gluePrompt";

// The pieces of the pair and gap cards' faces (German only). See docs/german.md,
// "Verbs with prepositions" and "Decided in DE20".

/** The grammar of a pair or gap card, or null for any other card. */
export function prepositionGrammar(card: Card): PrepositionGrammar | null {
  if ((card.kind !== "pair" && card.kind !== "gap") || card.pos !== "preposition" || !card.grammar) return null;
  return card.grammar;
}

/** The clip the intro and reveal play by themselves: a gap card's sentence, every other card's word. */
export function autoplayClip(card: Card): string {
  return card.kind === "gap" ? card.audio.sentence : card.audio.word;
}

/** One blank line for each word blanked: `auf die` is two, `zum` one. Screen readers hear "blank". */
export function Blanks({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Fragment key={i}>
          {i > 0 && " "}
          <span
            data-testid="blank"
            role="img"
            aria-label="blank"
            className="inline-block h-[1em] w-[2.2em] border-b-[3px] border-ink align-baseline"
          />
        </Fragment>
      ))}
    </>
  );
}

/** How many blank lines a gap shows: one per word of the blanked span. */
export function blankCount(span: string): number {
  return span.split(/\s+/).filter(Boolean).length;
}

/** A pair card's front: the verb with its own objects and a blank, `warten ___`, `gratulieren jemandem ___`. */
export function PairPrompt({ grammar }: { grammar: PrepositionGrammar }) {
  return (
    <span data-testid="prompt" lang={LANG.tag} className="font-display text-prompt font-bold">
      {grammar.verb}
      {grammar.objects && ` ${grammar.objects}`} <Blanks count={1} />
    </span>
  );
}

/**
 * A gap card's sentence. `blank`: the blanked span as blank lines (the front). Otherwise the span
 * filled in and highlighted (the reveal, the intro and the Reverse front).
 */
export function GapSentence({ sentence, blank, className, testId }: { sentence: string; blank: boolean; className: string; testId: string }) {
  const { before, target, after } = splitGluePrompt(sentence);
  return (
    <span data-testid={testId} lang={LANG.tag} className={className}>
      {before}
      {blank ? (
        <Blanks count={blankCount(target)} />
      ) : (
        <mark data-testid="gap-fill" className="rounded-chip bg-sun px-1 text-ink">
          {target}
        </mark>
      )}
      {after}
    </span>
  );
}
