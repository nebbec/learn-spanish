// Runtime validator for cards and decks. No dependencies, so the content
// pipeline scripts and the app can both use it.

import { LANG_CODES, type LangCode } from "../../lang/types";
import {
  ARTICLES,
  CARD_KINDS,
  CASE_PARTS_OF_SPEECH,
  CASES,
  DECK_FORMAT,
  GERMAN_ARTICLES,
  KINDS_BY_LANG,
  PARTS_OF_SPEECH,
  REGIONS,
  type Card,
  type Deck,
  type DraftCard,
} from "./types";

export type Validation<T> = { ok: true; value: T } | { ok: false; errors: string[] };

const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** A Spanish form card's id: `<verb>-form-<yo|tu|el>`, or `haber-form-hay`. */
export const FORM_ID = /^(?:[a-z]+-form-(yo|tu|el)|haber-form-hay)$/;
/** A German form card's id: `<verb>-form-<ich|du|er>`. */
export const GERMAN_FORM_ID = /^[a-z]+-form-(ich|du|er)$/;
/** A form card's id, per language. The group is the person. */
export const FORM_IDS: Readonly<Record<LangCode, RegExp>> = { es: FORM_ID, de: GERMAN_FORM_ID };
/** `phrase-` and one to four English words. */
export const PHRASE_ID = /^phrase(-[a-z0-9]+){1,4}$/;
/** `case-` and one to four English words of the prompt (German only). */
export const CASE_ID = /^case(-[a-z0-9]+){1,4}$/;
const TIP_ID = /^tip(-[a-z0-9]+)+$/;
const BRACKETED = /\[[^\[\]]+\]/g;

const DRAFT_CARD_FIELDS = [
  "id",
  "rank",
  "kind",
  "pos",
  "target",
  "en",
  "hint",
  "grammar",
  "example",
  "regional",
  "trick",
  "image",
  "audio",
];
/** Added to every card in the deck by the learning path. */
const PATH_FIELDS = ["unit", "requires", "tip", "why"];
const CARD_FIELDS = [...DRAFT_CARD_FIELDS, ...PATH_FIELDS];

type Rec = Record<string, unknown>;

function isRecord(v: unknown): v is Rec {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isText(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/** Collects errors for one object, checking that it has exactly the expected fields. */
class Checker {
  errors: string[] = [];
  constructor(private path: string) {}

  fail(field: string, message: string) {
    this.errors.push(`${this.path}${field ? `.${field}` : ""}: ${message}`);
  }

  fields(obj: Rec, expected: readonly string[], at = "") {
    for (const key of expected) {
      if (!(key in obj)) this.fail(at ? `${at}.${key}` : key, "missing");
    }
    for (const key of Object.keys(obj)) {
      if (!expected.includes(key)) this.fail(at ? `${at}.${key}` : key, "unknown field");
    }
  }

  text(obj: Rec, key: string, at = "") {
    if (key in obj && !isText(obj[key])) {
      this.fail(at ? `${at}.${key}` : key, "must be a non-empty string");
    }
  }

  textOrNull(obj: Rec, key: string) {
    if (key in obj && obj[key] !== null && !isText(obj[key])) {
      this.fail(key, "must be a non-empty string or null");
    }
  }

  /** An object whose fields are all non-empty strings. Returns it, or null if it is not an object. */
  textRecord(obj: Rec, key: string, expected: readonly string[], at = ""): Rec | null {
    const field = at ? `${at}.${key}` : key;
    if (!(key in obj)) return null;
    const value = obj[key];
    if (!isRecord(value)) {
      this.fail(field, "must be an object");
      return null;
    }
    this.fields(value, expected, field);
    for (const k of expected) this.text(value, k, field);
    return value;
  }
}

function checkGrammar(c: Checker, card: Rec, lang: LangCode) {
  if (!("grammar" in card) || !PARTS_OF_SPEECH.includes(card.pos as never)) return;
  const { pos, grammar } = card;
  const shaped = lang === "es" ? ["noun", "verb", "adjective"] : ["noun", "verb"];

  if (card.kind === "case" && lang === "de") {
    checkCaseGrammar(c, card);
    return;
  }
  if (!shaped.includes(pos as string)) {
    if (grammar !== null) c.fail("grammar", `must be null for pos "${pos}"`);
    return;
  }
  if (!isRecord(grammar)) {
    c.fail("grammar", `must be an object for pos "${pos}"`);
    return;
  }
  if (lang === "de") {
    checkGermanGrammar(c, card, grammar);
    return;
  }

  if (pos === "noun") {
    c.fields(grammar, ["gender", "article"], "grammar");
    if ("gender" in grammar && grammar.gender !== "m" && grammar.gender !== "f") {
      c.fail("grammar.gender", 'must be "m" or "f"');
    }
    if ("article" in grammar) {
      if (!ARTICLES.includes(grammar.article as never)) {
        c.fail("grammar.article", `must be one of ${ARTICLES.join(", ")}`);
      } else if (isText(card.target) && !card.target.startsWith(`${grammar.article} `)) {
        c.fail("target", `a noun must start with its article "${grammar.article}"`);
      }
    }
  } else if (pos === "adjective") {
    c.fields(grammar, ["feminine"], "grammar");
    c.text(grammar, "feminine", "grammar");
  } else {
    c.fields(grammar, ["present", "irregular"], "grammar");
    c.textRecord(grammar, "present", ["yo", "tu", "el"], "grammar");
    checkBoolean(c, grammar, "irregular");
  }
}

function checkBoolean(c: Checker, grammar: Rec, key: string) {
  if (key in grammar && typeof grammar[key] !== "boolean") c.fail(`grammar.${key}`, "must be true or false");
}

/** German nouns and verbs (docs/german.md, "Card data"). An adjective's grammar is null. */
function checkGermanGrammar(c: Checker, card: Rec, grammar: Rec) {
  if (card.pos === "noun") {
    c.fields(grammar, ["gender", "article", "plural"], "grammar");
    const genders = Object.keys(GERMAN_ARTICLES);
    if ("gender" in grammar && !genders.includes(grammar.gender as string)) {
      c.fail("grammar.gender", 'must be "m", "f" or "n"');
    }
    if ("article" in grammar) {
      const article = grammar.article;
      const expected = GERMAN_ARTICLES[grammar.gender as keyof typeof GERMAN_ARTICLES];
      if (!Object.values(GERMAN_ARTICLES).includes(article as never)) {
        c.fail("grammar.article", "must be one of der, die, das");
      } else if (expected && article !== expected) {
        c.fail("grammar.article", `must be "${expected}" for gender "${grammar.gender}"`);
      } else if (isText(card.target) && !card.target.startsWith(`${article} `)) {
        c.fail("target", `a noun must start with its article "${article}"`);
      }
    }
    if ("plural" in grammar && grammar.plural !== null) {
      if (!isText(grammar.plural)) c.fail("grammar.plural", "must be a non-empty string or null");
      else if (!grammar.plural.startsWith("die ")) c.fail("grammar.plural", 'must start with its article "die"');
    }
    return;
  }
  // A verb.
  c.fields(grammar, ["present", "irregular", "separable", "perfekt"], "grammar");
  const present = c.textRecord(grammar, "present", ["ich", "du", "er"], "grammar");
  checkBoolean(c, grammar, "irregular");
  checkBoolean(c, grammar, "separable");
  if (grammar.separable === true && present) {
    for (const person of ["ich", "du", "er"]) {
      if (isText(present[person]) && !present[person].trim().includes(" ")) {
        c.fail(`grammar.present.${person}`, 'a separable verb\'s form is written split ("rufe an")');
      }
    }
  }
  if ("perfekt" in grammar) {
    const perfekt = grammar.perfekt;
    if (!isRecord(perfekt)) {
      c.fail("grammar.perfekt", "must be an object");
    } else {
      c.fields(perfekt, ["aux", "participle"], "grammar.perfekt");
      if ("aux" in perfekt && perfekt.aux !== "haben" && perfekt.aux !== "sein") {
        c.fail("grammar.perfekt.aux", 'must be "haben" or "sein"');
      }
      c.text(perfekt, "participle", "grammar.perfekt");
    }
  }
}

/** A case card's grammar: `{ case, gender, from }`. Gender may be null only on a pronoun. */
function checkCaseGrammar(c: Checker, card: Rec) {
  const { grammar } = card;
  if (!isRecord(grammar)) {
    c.fail("grammar", "must be an object for a case card");
    return;
  }
  c.fields(grammar, ["case", "gender", "from"], "grammar");
  if ("case" in grammar && !CASES.includes(grammar.case as never)) c.fail("grammar.case", 'must be "akk" or "dat"');
  if ("gender" in grammar) {
    const { gender } = grammar;
    if (gender === null) {
      if (card.pos !== "pronoun") c.fail("grammar.gender", "may be null only on a pronoun");
    } else if (!["m", "f", "n", "pl"].includes(gender as string)) {
      c.fail("grammar.gender", 'must be "m", "f", "n", "pl" or null');
    }
  }
  c.text(grammar, "from", "grammar");
}

/** The rules that depend on the kind: id, part of speech, prompt, image, trick, form. */
function checkKind(c: Checker, card: Rec, lang: LangCode) {
  const { kind } = card;
  const id = typeof card.id === "string" ? card.id : "";
  if (!KINDS_BY_LANG[lang].includes(kind as never)) return;
  const formIdPattern = FORM_IDS[lang];

  if (kind === "form") {
    const form = formIdPattern.exec(id);
    if (id && !form) {
      c.fail("id", lang === "es" ? 'a form card\'s id must be "<verb>-form-<yo|tu|el>" or "haber-form-hay"' : 'a form card\'s id must be "<verb>-form-<ich|du|er>"');
    }
    if ("pos" in card && card.pos !== "verb") c.fail("pos", 'must be "verb" for a form card');
    // The reveal highlights the card's own form in its verb's strip. A German form says its pronoun.
    const person = form?.[1];
    const present = isRecord(card.grammar) && isRecord(card.grammar.present) ? card.grammar.present : null;
    if (person && present && isText(card.target) && isText(present[person])) {
      const expected = lang === "de" ? `${person} ${present[person]}` : present[person];
      if (card.target !== expected) {
        c.fail("target", lang === "de" ? `must be "${person}" and the ${person} form in grammar.present` : `must be the ${person} form in grammar.present`);
      }
    }
  } else if (kind === "phrase") {
    if (id && !PHRASE_ID.test(id)) c.fail("id", 'a phrase card\'s id must be "phrase-" and one to four English words');
    if ("pos" in card && card.pos !== "phrase") c.fail("pos", 'must be "phrase" for a phrase card');
  } else if (kind === "case") {
    if (id && !CASE_ID.test(id)) c.fail("id", 'a case card\'s id must be "case-" and one to four English words');
    if ("pos" in card && !CASE_PARTS_OF_SPEECH.includes(card.pos as never)) {
      c.fail("pos", 'must be "determiner" or "pronoun" for a case card');
    }
  } else {
    if (formIdPattern.test(id) || PHRASE_ID.test(id) || CASE_ID.test(id)) c.fail("id", `a ${kind} card cannot have a form, phrase or case id`);
    if (card.pos === "phrase") c.fail("pos", `cannot be "phrase" for a ${kind} card`);
    c.text(card, "trick");
  }
  if (kind !== "content" && kind !== "glue") c.textOrNull(card, "trick");

  if (isText(card.en)) {
    const marked = kind === "glue" || kind === "case";
    const targets = card.en.match(BRACKETED)?.length ?? 0;
    const strayBrackets = card.en.replace(BRACKETED, "").match(/[\[\]]/) !== null;
    if (marked && (targets !== 1 || strayBrackets)) {
      c.fail("en", `a ${kind} prompt must mark exactly one target in [square brackets]`);
    }
    if (!marked && (targets !== 0 || strayBrackets)) {
      c.fail("en", `a ${kind} prompt must not contain square brackets`);
    }
  }
  if ("image" in card) {
    const needsImage = kind === "content" || kind === "form";
    if (needsImage && card.image === null) c.fail("image", `is required for a ${kind} card`);
    if (!needsImage && card.image !== null) c.fail("image", `must be null for a ${kind} card`);
  }
}

/** The regional footnote: `{ where, text }` naming one of the language's regions, or null. */
function checkRegional(c: Checker, card: Rec, lang: LangCode) {
  if (!("regional" in card) || card.regional === null) return;
  const regional = c.textRecord(card, "regional", ["where", "text"]);
  if (regional && isText(regional.where) && !REGIONS[lang].includes(regional.where)) {
    c.fail("regional.where", `must be ${REGIONS[lang].join(" or ")}`);
  }
}

function checkPathFields(c: Checker, card: Rec) {
  c.textOrNull(card, "unit");
  c.textOrNull(card, "tip");
  c.textOrNull(card, "why");
  if ("requires" in card && !(Array.isArray(card.requires) && card.requires.every(isText))) {
    c.fail("requires", "must be a list of card ids");
  }
}

function checkCard(input: unknown, path: string, draft: boolean, lang: LangCode): string[] {
  const c = new Checker(path);
  if (!isRecord(input)) {
    c.fail("", "must be an object");
    return c.errors;
  }
  c.fields(input, draft ? DRAFT_CARD_FIELDS : CARD_FIELDS);

  if ("id" in input && !(typeof input.id === "string" && ID_PATTERN.test(input.id))) {
    c.fail("id", "must be a lower-case slug (a-z, 0-9, hyphens)");
  }
  if ("rank" in input && !(Number.isInteger(input.rank) && (input.rank as number) >= 1)) {
    c.fail("rank", "must be a whole number, 1 or more");
  }
  if ("kind" in input && !KINDS_BY_LANG[lang].includes(input.kind as never)) {
    c.fail("kind", CARD_KINDS.includes(input.kind as never) ? `"${input.kind}" is not a kind of a "${lang}" deck` : `must be one of ${KINDS_BY_LANG[lang].join(", ")}`);
  }
  if ("pos" in input && !PARTS_OF_SPEECH.includes(input.pos as never)) {
    c.fail("pos", `must be one of ${PARTS_OF_SPEECH.join(", ")}`);
  }
  for (const key of ["target", "en"]) c.text(input, key);
  c.textOrNull(input, "hint");
  c.textOrNull(input, "image");
  c.textRecord(input, "example", ["target", "en"]);
  c.textRecord(input, "audio", ["word", "sentence"]);
  checkRegional(c, input, lang);
  checkGrammar(c, input, lang);
  checkKind(c, input, lang);
  if (!draft) checkPathFields(c, input);
  return c.errors;
}

/** The prompt as the user reads it. Two cards with the same prompt would have two right answers. */
function promptKey(card: Rec): string {
  return `${String(card.en).trim().toLowerCase()}|${String(card.hint ?? "").trim().toLowerCase()}`;
}

function cardLabel(input: unknown, index?: number): string {
  return isRecord(input) && typeof input.id === "string" ? input.id : index === undefined ? "?" : `#${index}`;
}

/** A card in the deck, with the learning path's fields, by the rules of its deck's language (Spanish unless given). */
export function validateCard<L extends LangCode = "es">(input: unknown, lang: L = "es" as L): Validation<Card<L>> {
  const errors = checkCard(input, `card ${cardLabel(input)}`, false, lang);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as Card<L> };
}

/** A card as the draft pass writes it: every rule but the learning path's fields, which it does not have yet. */
export function validateDraftCard<L extends LangCode = "es">(input: unknown, lang: L = "es" as L): Validation<DraftCard<L>> {
  const errors = checkCard(input, `card ${cardLabel(input)}`, true, lang);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as DraftCard<L> };
}

/** Checks each card, plus the rules that span cards: unique ids and unique prompts. */
function checkCards(cards: unknown[], draft: boolean, lang: LangCode): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const prompts = new Map<string, string>();
  cards.forEach((card, index) => {
    const id = cardLabel(card, index);
    errors.push(...checkCard(card, `card ${id}`, draft, lang));
    if (!isRecord(card) || typeof card.id !== "string") return;

    if (ids.has(card.id)) errors.push(`card ${id}.id: duplicate id`);
    ids.add(card.id);

    if (isText(card.en)) {
      const key = promptKey(card);
      const other = prompts.get(key);
      if (other !== undefined) {
        errors.push(`card ${id}.en: same prompt as card ${other}; add a hint so each has one answer`);
      } else {
        prompts.set(key, card.id);
      }
    }
  });
  return errors;
}

/** Every drafted card together: each card's rules, unique ids and unique prompts. */
export function validateDraftCards<L extends LangCode = "es">(cards: unknown[], lang: L = "es" as L): Validation<DraftCard<L>[]> {
  const errors = checkCards(cards, true, lang);
  return errors.length ? { ok: false, errors } : { ok: true, value: cards as DraftCard<L>[] };
}

/** A list of entries with unique ids. Returns the ids, or null when the list is not a list. */
function checkEntries(
  c: Checker,
  deck: Rec,
  key: "units" | "tips",
  idPattern: RegExp,
  check: (entry: Rec, entryChecker: Checker) => void,
): Set<string> | null {
  if (!(key in deck)) return null;
  if (!Array.isArray(deck[key])) {
    c.fail(key, "must be an array");
    return null;
  }
  const ids = new Set<string>();
  (deck[key] as unknown[]).forEach((entry, index) => {
    const label = isRecord(entry) && typeof entry.id === "string" ? entry.id : `#${index}`;
    const ec = new Checker(`${key === "units" ? "unit" : "tip"} ${label}`);
    if (!isRecord(entry)) {
      ec.fail("", "must be an object");
    } else {
      if (!(typeof entry.id === "string" && idPattern.test(entry.id))) {
        ec.fail("id", key === "units" ? "must be a lower-case slug" : 'must be "tip-" and lower-case words');
      } else if (ids.has(entry.id)) {
        ec.fail("id", "duplicate id");
      } else {
        ids.add(entry.id);
      }
      check(entry, ec);
    }
    c.errors.push(...ec.errors);
  });
  return ids;
}

function checkUnit(unit: Rec, c: Checker) {
  c.fields(unit, ["id", "title", "goal"]);
  c.text(unit, "title");
  c.text(unit, "goal");
}

function checkTip(tip: Rec, c: Checker) {
  c.fields(tip, ["id", "title", "body", "examples"]);
  c.text(tip, "title");
  c.text(tip, "body");
  if (!("examples" in tip)) return;
  const { examples } = tip;
  if (!Array.isArray(examples) || examples.length < 2 || examples.length > 3) {
    c.fail("examples", "must be a list of two or three examples");
    return;
  }
  examples.forEach((example, index) => {
    if (!isRecord(example)) {
      c.fail(`examples.${index}`, "must be an object");
      return;
    }
    c.fields(example, ["target", "en", "audio"], `examples.${index}`);
    for (const key of ["target", "en", "audio"]) c.text(example, key, `examples.${index}`);
  });
}

/**
 * Validates every card by the rules of the deck's `lang`, plus the rules that span the deck:
 * unique ids and prompts, every `unit` and `tip` naming an entry of the deck, and every
 * `requires` naming a card earlier in the file. Given `expected`, a deck of another language is refused.
 */
export function validateDeck(input: unknown, expected?: LangCode): Validation<Deck> {
  if (!isRecord(input)) return { ok: false, errors: ["deck: must be an object"] };
  const c = new Checker("deck");
  c.fields(input, ["format", "version", "lang", "units", "tips", "cards"]);
  if ("format" in input && input.format !== DECK_FORMAT) {
    c.fail("format", `must be ${DECK_FORMAT}`);
  }
  let lang: LangCode = "es";
  if ("lang" in input) {
    if (!LANG_CODES.includes(input.lang as never)) c.fail("lang", `must be one of ${LANG_CODES.join(", ")}`);
    else lang = input.lang as LangCode;
  }
  if (expected && "lang" in input && input.lang !== expected) {
    c.fail("lang", `is "${String(input.lang)}", but this app teaches "${expected}"`);
  }
  if ("version" in input && !(Number.isInteger(input.version) && (input.version as number) >= 1)) {
    c.fail("version", "must be a whole number, 1 or more");
  }
  const units = checkEntries(c, input, "units", ID_PATTERN, checkUnit);
  const tips = checkEntries(c, input, "tips", TIP_ID, checkTip);
  const errors = c.errors;
  if (!("cards" in input)) return { ok: false, errors };
  if (!Array.isArray(input.cards)) {
    c.fail("cards", "must be an array");
    return { ok: false, errors };
  }
  const cards: unknown[] = input.cards;
  errors.push(...checkCards(cards, false, lang));

  // References: checked only once the card's own fields have the right types.
  const allIds = new Set(cards.map((card) => (isRecord(card) ? card.id : undefined)));
  const earlier = new Set<unknown>();
  cards.forEach((card, index) => {
    if (!isRecord(card)) return;
    const id = cardLabel(card, index);
    if (units && isText(card.unit) && !units.has(card.unit)) {
      errors.push(`card ${id}.unit: no unit "${card.unit}" in the deck`);
    }
    if (tips && isText(card.tip) && !tips.has(card.tip)) {
      errors.push(`card ${id}.tip: no tip "${card.tip}" in the deck`);
    }
    if (Array.isArray(card.requires)) {
      const seen = new Set<unknown>();
      for (const required of card.requires) {
        if (!isText(required)) continue;
        if (seen.has(required)) errors.push(`card ${id}.requires: "${required}" is listed twice`);
        seen.add(required);
        if (required === card.id) errors.push(`card ${id}.requires: a card cannot require itself`);
        else if (!allIds.has(required)) errors.push(`card ${id}.requires: no card "${required}" in the deck`);
        else if (!earlier.has(required)) errors.push(`card ${id}.requires: "${required}" must come earlier in the file`);
      }
    }
    earlier.add(card.id);
  });

  return errors.length ? { ok: false, errors } : { ok: true, value: input as unknown as Deck };
}

export class DeckError extends Error {
  constructor(public errors: string[]) {
    super(`Invalid deck (${errors.length} problems):\n${errors.slice(0, 20).join("\n")}`);
    this.name = "DeckError";
  }
}

/** Returns the deck, or throws a DeckError listing what is wrong with it. Given `expected`, refuses a deck of another language. */
export function parseDeck(input: unknown, expected?: LangCode): Deck {
  const result = validateDeck(input, expected);
  if (!result.ok) throw new DeckError(result.errors);
  return result.value;
}
