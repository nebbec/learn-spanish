"use client";

import { Fragment } from "react";
import { LANG } from "@/lang";
import type { CaseGrammar, Card, GermanNounGrammar, GermanVerbGrammar, NounGrammar, VerbGrammar } from "@/lib/deck";
import { FORM_ID, GERMAN_FORM_ID } from "@/lib/deck/validate";

// The grammar under the answer on the intro and the reveal. Spanish: docs/design.md,
// "Reveal" and "Decided in L13"; German: docs/german.md, "What the cards look like"
// and "Decided in DE4". The strip is chosen by the grammar's own shape, so one
// component draws both languages' cards whatever the build.

/** A strip's person: the key in `present` and the pronoun shown before the form. */
type Person = { person: string; label: string };

const SPANISH_PERSONS: readonly Person[] = [
  { person: "yo", label: "yo" },
  { person: "tu", label: "tú" },
  { person: "el", label: "él" },
];

const GERMAN_PERSONS: readonly Person[] = [
  { person: "ich", label: "ich" },
  { person: "du", label: "du" },
  { person: "er", label: "er" },
];

export type FormPerson = "yo" | "tu" | "el" | "ich" | "du" | "er";

/**
 * The person a form card drills (`ser-form-tu` → `tu`, `sein-form-ich` → `ich`), or null:
 * any other card, and `haber-form-hay`, whose form is not in the strip.
 */
export function formPerson(card: Card): FormPerson | null {
  if (card.kind !== "form") return null;
  const person = (FORM_ID.exec(card.id) ?? GERMAN_FORM_ID.exec(card.id))?.[1];
  return (person as FormPerson | undefined) ?? null;
}

const GENDER_NAMES = { m: "masculine", f: "feminine", n: "neuter", pl: "plural" } as const;

const CASE_NAMES = { akk: "Akkusativ", dat: "Dativ" } as const;

/** The Perfekt's helper verb as the strip's er form says it: "hat angerufen", "ist gegangen". */
const PERFEKT_AUX = { haben: "hat", sein: "ist" } as const;

/**
 * The word of a case card's answer that `from` turned into: the one sharing the longest
 * start with it (`der` → `den` in "den Mann", `ein` → `einem` in "mit einem Freund"), or
 * the whole answer when it is one word (`du` → `dich`, `er` → `ihn`) or no word shares a
 * first letter.
 */
export function caseChange(target: string, from: string): string {
  const words = target.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return target;
  const shared = (word: string) => {
    const a = word.toLowerCase();
    const b = from.toLowerCase();
    let n = 0;
    while (n < a.length && n < b.length && a[n] === b[n]) n++;
    return n;
  };
  let best = { word: target, n: 0 };
  for (const word of words) {
    const n = shared(word);
    if (n > best.n) best = { word, n };
  }
  return best.word;
}

/**
 * Spanish noun: article and gender. German noun: the answer and its plural. Spanish
 * adjective: both endings. Verb: three present-tense forms (split for a German separable
 * verb), the irregular and separable chips, and for German the Perfekt line; a form card's
 * own form is highlighted. Case card: the case line. Nothing otherwise.
 */
export function GrammarStrip({ card }: { card: Card }) {
  if (card.pos === "noun") {
    return "plural" in card.grammar ? (
      <GermanNounStrip target={card.target} grammar={card.grammar} />
    ) : (
      <SpanishNounStrip grammar={card.grammar} />
    );
  }
  if (card.pos === "adjective" && card.grammar) {
    return (
      <p data-testid="grammar" data-variant="adjective" lang={LANG.tag} className="font-bold">
        {card.target} / {card.grammar.feminine}
      </p>
    );
  }
  if (card.pos === "verb") {
    const own = formPerson(card);
    if ("ich" in card.grammar.present) return <GermanVerbStrip grammar={card.grammar as GermanVerbGrammar} own={own} />;
    const grammar = card.grammar as VerbGrammar;
    return (
      <p data-testid="grammar" data-variant="verb" className={STRIP_CLASS}>
        <Forms persons={SPANISH_PERSONS} present={grammar.present} own={own} />
        {grammar.irregular && <Chip testId="irregular">Irregular</Chip>}
      </p>
    );
  }
  if ((card.pos === "determiner" || card.pos === "pronoun") && card.grammar) {
    return <CaseLine target={card.target} grammar={card.grammar} />;
  }
  return null;
}

const STRIP_CLASS = "flex flex-wrap items-center justify-center gap-x-2 gap-y-1";

function SpanishNounStrip({ grammar }: { grammar: NounGrammar }) {
  return (
    <p data-testid="grammar" data-variant="noun" className="font-bold">
      <span lang={LANG.tag}>{grammar.article}</span>
      <span className="font-normal text-ink-soft">
        {" · "}
        {GENDER_NAMES[grammar.gender]}
      </span>
    </p>
  );
}

/** "der Tisch · die Tische", or "der Januar · no plural". The plural is shown, never rated. */
function GermanNounStrip({ target, grammar }: { target: string; grammar: GermanNounGrammar }) {
  return (
    <p data-testid="grammar" data-variant="noun" className="font-bold">
      <span lang={LANG.tag} className="whitespace-nowrap">
        {target}
      </span>
      <span className="font-normal text-ink-soft">{" · "}</span>
      {grammar.plural ? (
        <span data-testid="plural" lang={LANG.tag} className="whitespace-nowrap">
          {grammar.plural}
        </span>
      ) : (
        <span data-testid="plural" className="font-normal text-ink-soft">
          no plural
        </span>
      )}
    </p>
  );
}

/** "ich rufe an · du rufst an · er ruft an" with its chips, then "Perfekt: hat angerufen". */
function GermanVerbStrip({ grammar, own }: { grammar: GermanVerbGrammar; own: FormPerson | null }) {
  const { aux, participle } = grammar.perfekt;
  return (
    <>
      <p data-testid="grammar" data-variant="verb" className={STRIP_CLASS}>
        <Forms persons={GERMAN_PERSONS} present={grammar.present} own={own} />
        {(grammar.irregular || grammar.separable) && (
          <span className="flex gap-1">
            {grammar.irregular && <Chip testId="irregular">Irregular</Chip>}
            {grammar.separable && <Chip testId="separable">Separable</Chip>}
          </span>
        )}
      </p>
      <p data-testid="perfekt" className="-mt-2 text-ink-soft">
        Perfekt:{" "}
        <span lang={LANG.tag} className="font-bold text-ink">
          {PERFEKT_AUX[aux]} {participle}
        </span>
      </p>
    </>
  );
}

/** "Akkusativ · masculine: der → den", or for a pronoun "Akkusativ: du → dich". */
function CaseLine({ target, grammar }: { target: string; grammar: CaseGrammar }) {
  return (
    <p data-testid="grammar" data-variant="case" className="text-ink-soft">
      <span data-testid="case" className="font-bold text-ink">
        {CASE_NAMES[grammar.case]}
      </span>
      {grammar.gender && ` · ${GENDER_NAMES[grammar.gender]}`}
      {": "}
      <span lang={LANG.tag} className="whitespace-nowrap font-bold text-ink">
        {grammar.from} → <mark className="rounded-chip bg-sun px-1 text-ink">{caseChange(target, grammar.from)}</mark>
      </span>
    </p>
  );
}

/** The three persons with their forms, each kept on one line; the card's own is highlighted. */
function Forms({ persons, present, own }: { persons: readonly Person[]; present: Record<string, string>; own: FormPerson | null }) {
  return (
    <span lang={LANG.tag} className="font-bold">
      {persons.map(({ person, label }, i) => (
        <Fragment key={person}>
          {i > 0 && " · "}
          {person === own ? (
            <mark data-testid="own-form" className="whitespace-nowrap rounded-chip bg-sun px-1 text-ink">
              {label} {present[person]}
            </mark>
          ) : (
            <span className="whitespace-nowrap">{`${label} ${present[person]}`}</span>
          )}
        </Fragment>
      ))}
    </span>
  );
}

function Chip({ testId, children }: { testId: string; children: string }) {
  return (
    <span
      data-testid={testId}
      className="rounded-chip bg-sun px-2 py-0.5 text-sm font-bold uppercase tracking-wide text-ink"
    >
      {children}
    </span>
  );
}
