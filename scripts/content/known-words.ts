// The known-words check (L7): an example sentence may use only the words of
// cards earlier in the learning path's order, the card's own words, names and
// numbers, and a few other words: in the starter path at most one, which must
// be an obvious cognate; in the frequency phase up to two, of any kind.
//
// Each word of `example.es` is mapped to its lemmas with E1's lemma list
// (lemmatization-lists, read from content/.cache), and counts against the
// limit when none of its lemmas is known. A card makes known the words of its
// `es`, the forms in its grammar (the present-tense strip, the feminine) and
// their lemmas. Pure functions apart from `loadLemmas`; nothing here prints.
//
// The rules are in docs/design.md under "Learning path", "Example sentences
// use known words" and "Decided in L7".

import path from "node:path";
import type { Card, DraftCard } from "@/lib/deck/types";
import { cliticLemmas, normalize, parseLemmaPairs, stripAccents } from "./lemmatize.mjs";
import { source, SOURCES } from "./sources.mjs";

/** Other words an example may use: one obvious cognate in the starter path, any two in the frequency phase. */
export const STARTER_OTHER_WORDS = 1;
export const FREQUENCY_OTHER_WORDS = 2;

/** Number words, which an example may use freely, as it may digits. "un" and "una" are articles, so not here. */
export const NUMBER_WORDS = new Set(
  (
    "cero uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince dieciséis diecisiete " +
    "dieciocho diecinueve veinte veintiuno veintidós veintitrés treinta cuarenta cincuenta sesenta setenta ochenta " +
    "noventa cien ciento doscientos trescientos quinientos mil millón millones"
  ).split(" "),
);

/** E1's lemma list: each word form's possible lemmas, and every lemma. */
export interface Lemmas {
  map: Map<string, Set<string>>;
  set: Set<string>;
}

export function lemmasFrom(text: string): Lemmas {
  const map = parseLemmaPairs(text) as Map<string, Set<string>>;
  const set = new Set<string>();
  for (const lemmas of map.values()) for (const l of lemmas) set.add(l);
  return { map, set };
}

/** Reads the lemma list from content/.cache, downloading it there once (SHA-256 checked). */
export async function loadLemmas(root: string): Promise<Lemmas> {
  return lemmasFrom(await source(SOURCES.lemmas, path.join(root, "content", ".cache")));
}

/** A word in lower case and its lemmas: from the list, and a verb with pronouns attached (verte, dímelo). */
export function wordLemmas(word: string, lemmas: Lemmas): string[] {
  const w = normalize(word);
  const out = new Set([w, ...(lemmas.map.get(w) ?? [])]);
  for (const verb of (cliticLemmas(w, lemmas.map, lemmas.set) as string[] | null) ?? []) out.add(verb);
  return [...out];
}

interface Token {
  word: string;
  /** First word of a sentence (after ¿ or ¡ too), so a capital letter says nothing. */
  first: boolean;
}

/** The words of a sentence, letters only: digits and punctuation are dropped. */
export function tokens(text: string): Token[] {
  const out: Token[] = [];
  const re = /\p{L}+/gu;
  let last = 0;
  let first = true;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const between = text.slice(last, m.index);
    if (out.length && /[.!?…:]/.test(between)) first = true;
    out.push({ word: m[0], first });
    first = false;
    last = m.index + m[0].length;
  }
  return out;
}

/** The words a card makes known: its `es`, its grammar's forms, and their lemmas. */
export function cardWords(card: Pick<DraftCard, "es" | "grammar">, lemmas: Lemmas): Set<string> {
  const words = tokens(card.es).map((t) => t.word);
  const g = card.grammar as Record<string, unknown> | null;
  if (g && typeof g.feminine === "string") words.push(...tokens(g.feminine).map((t) => t.word));
  if (g && g.present && typeof g.present === "object") {
    for (const form of Object.values(g.present as Record<string, string>)) words.push(...tokens(form).map((t) => t.word));
  }
  return new Set(words.flatMap((w) => wordLemmas(w, lemmas)));
}

/**
 * An unknown word that is an obvious cognate: it appears in the English translation as it is, without its accents,
 * without a final vowel (problema, música), or with -ción as -tion and -dad as -ty.
 */
export function isCognate(word: string, english: string): boolean {
  const en = new Set(tokens(english).map((t) => normalize(t.word)));
  const w = stripAccents(normalize(word)) as string;
  const forms = [w, w.replace(/[aeo]$/, ""), w.replace(/ción$/, "tion").replace(/cion$/, "tion"), w.replace(/dad$/, "ty")];
  return forms.some((f) => f.length > 2 && en.has(f));
}

export interface ExampleCheck {
  ok: boolean;
  /** True in the starter path (a card with a unit): one other word, a cognate. */
  starter: boolean;
  /** Other words that are not cognates, as written in the sentence. */
  unknown: string[];
  /** Other words that are obvious cognates. */
  cognates: string[];
}

/**
 * Checks one example against the words known before its card (plus the card's own). A capitalised word that is not
 * the first of a sentence is a name, and so is a first word whose lower case has no lemma in the list and is unknown.
 */
export function checkExample(
  card: Pick<Card, "es" | "grammar" | "example" | "unit">,
  known: ReadonlySet<string>,
  lemmas: Lemmas,
): ExampleCheck {
  const own = cardWords(card, lemmas);
  const isKnown = (w: string) => wordLemmas(w, lemmas).some((l) => known.has(l) || own.has(l));
  const unknown: string[] = [];
  const cognates: string[] = [];
  for (const { word, first } of tokens(card.example.es)) {
    const lower = normalize(word);
    if (NUMBER_WORDS.has(lower) || isKnown(word)) continue;
    const capital = word !== lower;
    if (capital && (!first || (!lemmas.map.has(lower) && !lemmas.set.has(lower)))) continue;
    (isCognate(word, card.example.en) ? cognates : unknown).push(word);
  }
  const starter = card.unit !== null;
  const others = unknown.length + cognates.length;
  const ok = starter ? unknown.length === 0 && others <= STARTER_OTHER_WORDS : others <= FREQUENCY_OTHER_WORDS;
  return { ok, starter, unknown: [...new Set(unknown)], cognates: [...new Set(cognates)] };
}

/** Checks every card's example in the learning path's order, each against the cards before it. */
export function checkExamples(order: readonly Card[], lemmas: Lemmas): Map<string, ExampleCheck> {
  const known = new Set<string>();
  const checks = new Map<string, ExampleCheck>();
  for (const card of order) {
    checks.set(card.id, checkExample(card, known, lemmas));
    for (const w of cardWords(card, lemmas)) known.add(w);
  }
  return checks;
}

/** The lemmas known before a card in the order (its own not included), or null when it is not in the order. */
export function knownBefore(order: readonly Card[], id: string, lemmas: Lemmas): Set<string> | null {
  const at = order.findIndex((c) => c.id === id);
  if (at === -1) return null;
  return new Set(order.slice(0, at).flatMap((c) => [...cardWords(c, lemmas)]));
}

/** The words of the cards before one in the order, as written on them (`es` and grammar forms), each once. */
export function wordsBefore(order: readonly Card[], id: string): string[] {
  const at = order.findIndex((c) => c.id === id);
  const words = new Set<string>();
  for (const card of order.slice(0, Math.max(0, at))) {
    for (const t of tokens(card.es)) words.add(normalize(t.word));
    const g = card.grammar as Record<string, unknown> | null;
    if (g && typeof g.feminine === "string") words.add(normalize(g.feminine));
    if (g && g.present && typeof g.present === "object") {
      for (const form of Object.values(g.present as Record<string, string>)) words.add(normalize(form));
    }
  }
  return [...words];
}

/** One line for a person or a reviewer: which words of the example are not met yet. Card text, so never printed. */
export function exampleProblem(check: ExampleCheck): string {
  const words = [...check.unknown, ...check.cognates].join(", ");
  return check.starter
    ? `The example uses words not met before this card: ${words}. In the starter path it may use only earlier cards' words, its own, names, numbers and at most one obvious cognate.`
    : `The example uses words not met before this card: ${words}. In the frequency phase it may use at most two words not met yet.`;
}
