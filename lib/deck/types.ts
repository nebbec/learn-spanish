// Card and deck types. See docs/design.md, "Card data".

export const CARD_KINDS = ["content", "glue"] as const;
export type CardKind = (typeof CARD_KINDS)[number];

/** Part-of-speech groups. Each one is a slice of the wheel. */
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
] as const;
export type PartOfSpeech = (typeof PARTS_OF_SPEECH)[number];

export const ARTICLES = ["el", "la", "los", "las"] as const;
export type Article = (typeof ARTICLES)[number];

/** Nouns. `es` already starts with the article; gender is stored separately (el agua is feminine). */
export interface NounGrammar {
  gender: "m" | "f";
  article: Article;
}

/** Adjectives. `es` is the masculine form; the reveal shows "es / feminine". */
export interface AdjectiveGrammar {
  feminine: string;
}

/** Verbs. Bare present-tense forms for the strip "yo voy · tú vas · él va". */
export interface VerbGrammar {
  present: { yo: string; tu: string; el: string };
  irregular: boolean;
}

export interface CardExample {
  es: string;
  en: string;
}

export interface CardAudio {
  word: string;
  sentence: string;
}

interface CardBase {
  /** Stable slug, e.g. `estar-be-state`. Progress is keyed on this. */
  id: string;
  /** Frequency rank of the Spanish word. Two meanings of one word share a rank. */
  rank: number;
  kind: CardKind;
  /** The Spanish answer as displayed (with article for nouns). */
  es: string;
  /** The English prompt. Glue cards mark the target in square brackets. */
  en: string;
  hint: string | null;
  example: CardExample;
  /** Spain-only alternative, or null. */
  spain: string | null;
  trick: string;
  /** Path to the character still. Null for glue cards, required for content cards. */
  image: string | null;
  audio: CardAudio;
}

/** `grammar` depends on `pos`: narrow on `card.pos` to read it. */
export type Card = CardBase &
  (
    | { pos: "noun"; grammar: NounGrammar }
    | { pos: "verb"; grammar: VerbGrammar }
    | { pos: "adjective"; grammar: AdjectiveGrammar }
    | { pos: Exclude<PartOfSpeech, "noun" | "verb" | "adjective">; grammar: null }
  );

export interface Deck {
  /** Deck revision. Goes up when cards are added or corrected; ids never change. */
  version: number;
  cards: Card[];
}
