// Card and deck types. See docs/design.md, "Card data" and "Learning path".

/** `form` and `phrase` came with the learning path (deck format 2). */
export const CARD_KINDS = ["content", "glue", "form", "phrase"] as const;
export type CardKind = (typeof CARD_KINDS)[number];

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
  /**
   * Stable slug, e.g. `estar-be-state`. Progress is keyed on this. A form card's is
   * `<verb>-form-<yo|tu|el>` or `haber-form-hay`; a phrase card's is `phrase-` and one to four English words.
   */
  id: string;
  /** Frequency rank of the Spanish word. Two meanings of one word share a rank; a phrase takes its rarest word's. */
  rank: number;
  kind: CardKind;
  /** The Spanish answer as displayed (with article for nouns). A form card's is its form (`soy`). */
  es: string;
  /** The English prompt. Glue cards mark the target in square brackets. */
  en: string;
  hint: string | null;
  example: CardExample;
  /** Spain-only alternative, or null. */
  spain: string | null;
  /** Null only on form and phrase cards. */
  trick: string | null;
  /** Path to the character still. Required for content and form cards (a form card's is its verb's), null otherwise. */
  image: string | null;
  audio: CardAudio;
}

/**
 * A card as the draft pass writes it, before the learning path tags it.
 * `grammar` depends on `pos`: narrow on `card.pos` to read it.
 */
export type DraftCard = CardBase &
  (
    | { pos: "noun"; grammar: NounGrammar }
    | { pos: "verb"; grammar: VerbGrammar }
    | { pos: "adjective"; grammar: AdjectiveGrammar }
    | { pos: Exclude<PartOfSpeech, "noun" | "verb" | "adjective">; grammar: null }
  );

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
export type Card = DraftCard & PathFields;

/** A unit of the starter path, as the app shows it. */
export interface DeckUnit {
  id: string;
  title: string;
  /** Completes "Now you can …". */
  goal: string;
}

export interface TipExample {
  es: string;
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

/** The deck file's format. 2 since the learning path; format 1 had no units, tips or path fields. */
export const DECK_FORMAT = 2;

export interface Deck {
  format: typeof DECK_FORMAT;
  /** Deck revision. Goes up when cards are added or corrected; ids never change. */
  version: number;
  /** The starter path's units, in order. */
  units: DeckUnit[];
  tips: DeckTip[];
  /** In Learn order. */
  cards: Card[];
}
