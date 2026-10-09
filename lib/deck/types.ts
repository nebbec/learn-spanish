// Card and deck types. See docs/design.md, "Card data" and "Learning path", and
// docs/german.md, "Card data" (deck format 3: `target`, `regional`, `lang`, German
// grammar and the `case` kind).

import type { LangCode } from "../../lang/types";

export type { LangCode } from "../../lang/types";

/** `form` and `phrase` came with the learning path (deck format 2); `case` with German (format 3), German only. */
export const CARD_KINDS = ["content", "glue", "form", "phrase", "case"] as const;
export type CardKind = (typeof CARD_KINDS)[number];

/** The kinds a deck of each language may hold. */
export const KINDS_BY_LANG: Readonly<Record<LangCode, readonly CardKind[]>> = {
  es: ["content", "glue", "form", "phrase"],
  de: ["content", "glue", "form", "phrase", "case"],
};

/** The kinds the draft pass writes from the word list, one word at a time. */
export const WORD_CARD_KINDS = ["content", "glue"] as const;

/** Part-of-speech groups. Each one is a slice of the wheel, in this order. */
export const PARTS_OF_SPEECH = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "preposition",
  "conjunction",
  "determiner",
  "other",
  "phrase",
] as const;
export type PartOfSpeech = (typeof PARTS_OF_SPEECH)[number];

/** The parts of speech a word card can have: every one but `phrase`, which only a phrase card has. */
export const WORD_PARTS_OF_SPEECH = PARTS_OF_SPEECH.filter((pos) => pos !== "phrase");

/** The parts of speech a case card can have. */
export const CASE_PARTS_OF_SPEECH = ["determiner", "pronoun"] as const;

/** Spanish articles. */
export const ARTICLES = ["el", "la", "los", "las"] as const;
export type Article = (typeof ARTICLES)[number];

/** German articles, by the gender each goes with. */
export const GERMAN_ARTICLES = { m: "der", f: "die", n: "das" } as const;
export type GermanGender = keyof typeof GERMAN_ARTICLES;
export type GermanArticle = (typeof GERMAN_ARTICLES)[GermanGender];

/** Spanish nouns. `target` already starts with the article; gender is stored separately (el agua is feminine). */
export interface NounGrammar {
  gender: "m" | "f";
  article: Article;
}

/** German nouns. `target` starts with the article, which matches the gender (der Tisch). */
export interface GermanNounGrammar {
  gender: GermanGender;
  article: GermanArticle;
  /** The plural with its article ("die Tische"), or null for a noun with none in common use. Shown, never rated. */
  plural: string | null;
}

/** Spanish adjectives. `target` is the masculine form; the reveal shows "target / feminine". */
export interface AdjectiveGrammar {
  feminine: string;
}

/** Spanish verbs. Bare present-tense forms for the strip "yo voy · tú vas · él va". */
export interface VerbGrammar {
  present: { yo: string; tu: string; el: string };
  irregular: boolean;
}

/** German verbs. Bare present-tense forms for "ich rufe an · du rufst an · er ruft an", split when separable. */
export interface GermanVerbGrammar {
  present: { ich: string; du: string; er: string };
  /** Irregular in the present or the Perfekt participle (a strong or mixed verb). */
  irregular: boolean;
  separable: boolean;
  /** The one unrated Perfekt line: "hat angerufen", "ist gegangen". */
  perfekt: { aux: "haben" | "sein"; participle: string };
}

export const CASES = ["akk", "dat"] as const;
export type GrammaticalCase = (typeof CASES)[number];

/** A case card's grammar: the line "Akkusativ · masculine: der → den". */
export interface CaseGrammar {
  case: GrammaticalCase;
  /** Null only on a pronoun case card (du → dich), which has no gender to name. */
  gender: GermanGender | "pl" | null;
  /** The nominative the answer changes from: "der", "ein", "mein", "du". */
  from: string;
}

export interface CardExample {
  /** The sentence in the language being learned. */
  target: string;
  en: string;
}

export interface CardAudio {
  word: string;
  sentence: string;
}

/** A regional footnote: what Spain (for Spanish) or Austria or Switzerland (for German) says instead. */
export interface Regional {
  where: string;
  text: string;
}

/** Where a regional footnote may point, per language. */
export const REGIONS: Readonly<Record<LangCode, readonly string[]>> = {
  es: ["Spain"],
  de: ["Austria", "Switzerland"],
};

interface CardBase {
  /**
   * Stable slug, e.g. `estar-be-state`. Progress is keyed on this. A form card's is
   * `<verb>-form-<person>` (or `haber-form-hay`); a phrase card's is `phrase-` and one to
   * four English words; a case card's `case-` and one to four English words.
   */
  id: string;
  /** Frequency rank of the word. Two meanings of one word share a rank; a phrase takes its rarest word's. */
  rank: number;
  kind: CardKind;
  /**
   * The answer in the language being learned, as displayed (with article for nouns).
   * A Spanish form card's is its form (`soy`); a German one's has its pronoun (`ich bin`).
   */
  target: string;
  /** The English prompt. Glue and case cards mark the target in square brackets. */
  en: string;
  hint: string | null;
  example: CardExample;
  /** The regional footnote, or null. */
  regional: Regional | null;
  /** Null only on form, phrase and case cards. */
  trick: string | null;
  /** Path to the character still. Required for content and form cards (a form card's is its verb's), null otherwise. */
  image: string | null;
  audio: CardAudio;
}

/** The grammar each language gives a part of speech. */
interface GrammarByLang {
  es: { noun: NounGrammar; verb: VerbGrammar; adjective: AdjectiveGrammar; case: never };
  de: { noun: GermanNounGrammar; verb: GermanVerbGrammar; adjective: null; case: CaseGrammar };
}

type DraftCardIn<L extends LangCode> = CardBase &
  (
    | { pos: "noun"; grammar: GrammarByLang[L]["noun"] }
    | { pos: "verb"; grammar: GrammarByLang[L]["verb"] }
    | { pos: "adjective"; grammar: GrammarByLang[L]["adjective"] }
    | { pos: "determiner" | "pronoun"; grammar: GrammarByLang[L]["case"] | null }
    | { pos: Exclude<PartOfSpeech, "noun" | "verb" | "adjective" | "determiner" | "pronoun">; grammar: null }
  );

/**
 * A card as the draft pass writes it, before the learning path tags it.
 * `grammar` depends on the language and `pos`: narrow on `card.pos` (and the
 * grammar's shape, or the deck's `lang`) to read it.
 */
export type DraftCard<L extends LangCode = LangCode> = L extends LangCode ? DraftCardIn<L> : never;

/** The fields the learning path adds to a card in the deck. */
export interface PathFields {
  /** The unit id, or null in the frequency phase. */
  unit: string | null;
  /** Ids of cards that must come before this one, all earlier in the deck file. Often empty. */
  requires: string[];
  /** The tip this card depends on, or null. */
  tip: string | null;
  /** A one-line contrast with a near neighbour, or null. */
  why: string | null;
}

/** A card in the deck. */
export type Card<L extends LangCode = LangCode> = DraftCard<L> & PathFields;

/** A unit of the starter path, as the app shows it. */
export interface DeckUnit {
  id: string;
  title: string;
  /** Completes "Now you can …". */
  goal: string;
}

export interface TipExample {
  /** The example in the language being learned. */
  target: string;
  en: string;
  /** Path to the example's clip. */
  audio: string;
}

/** A short, unrated concept screen. */
export interface DeckTip {
  id: string;
  title: string;
  /** Three to five plain sentences. */
  body: string;
  /** Two or three. */
  examples: TipExample[];
}

/**
 * The deck file's format. 3 since German (`target`, `regional`, `lang`); 2 had the
 * learning path's units, tips and path fields; 1 had none of them.
 */
export const DECK_FORMAT = 3;

export interface Deck<L extends LangCode = LangCode> {
  format: typeof DECK_FORMAT;
  /** The language the deck teaches. The app refuses a deck that is not its build's language. */
  lang: L;
  /** Deck revision. Goes up when cards are added or corrected; ids never change. */
  version: number;
  /** The starter path's units, in order. */
  units: DeckUnit[];
  tips: DeckTip[];
  /** In Learn order. */
  cards: Card<L>[];
}
