// Runtime validator for cards and decks. No dependencies, so the content
// pipeline scripts and the app can both use it.

import { ARTICLES, CARD_KINDS, PARTS_OF_SPEECH, type Card, type Deck } from "./types";

export type Validation<T> = { ok: true; value: T } | { ok: false; errors: string[] };

const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const BRACKETED = /\[[^\[\]]+\]/g;

const CARD_FIELDS = [
  "id",
  "rank",
  "kind",
  "pos",
  "es",
  "en",
  "hint",
  "grammar",
  "example",
  "spain",
  "trick",
  "image",
  "audio",
];

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

function checkGrammar(c: Checker, card: Rec) {
  if (!("grammar" in card) || !PARTS_OF_SPEECH.includes(card.pos as never)) return;
  const { pos, grammar } = card;

  if (pos !== "noun" && pos !== "verb" && pos !== "adjective") {
    if (grammar !== null) c.fail("grammar", `must be null for pos "${pos}"`);
    return;
  }
  if (!isRecord(grammar)) {
    c.fail("grammar", `must be an object for pos "${pos}"`);
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
      } else if (isText(card.es) && !card.es.startsWith(`${grammar.article} `)) {
        c.fail("es", `a noun must start with its article "${grammar.article}"`);
      }
    }
  } else if (pos === "adjective") {
    c.fields(grammar, ["feminine"], "grammar");
    c.text(grammar, "feminine", "grammar");
  } else {
    c.fields(grammar, ["present", "irregular"], "grammar");
    c.textRecord(grammar, "present", ["yo", "tu", "el"], "grammar");
    if ("irregular" in grammar && typeof grammar.irregular !== "boolean") {
      c.fail("grammar.irregular", "must be true or false");
    }
  }
}

function checkCard(input: unknown, path: string): string[] {
  const c = new Checker(path);
  if (!isRecord(input)) {
    c.fail("", "must be an object");
    return c.errors;
  }
  c.fields(input, CARD_FIELDS);

  if ("id" in input && !(typeof input.id === "string" && ID_PATTERN.test(input.id))) {
    c.fail("id", "must be a lower-case slug (a-z, 0-9, hyphens)");
  }
  if ("rank" in input && !(Number.isInteger(input.rank) && (input.rank as number) >= 1)) {
    c.fail("rank", "must be a whole number, 1 or more");
  }
  const kindOk = CARD_KINDS.includes(input.kind as never);
  if ("kind" in input && !kindOk) c.fail("kind", `must be one of ${CARD_KINDS.join(", ")}`);
  if ("pos" in input && !PARTS_OF_SPEECH.includes(input.pos as never)) {
    c.fail("pos", `must be one of ${PARTS_OF_SPEECH.join(", ")}`);
  }
  for (const key of ["es", "en", "trick"]) c.text(input, key);
  c.textOrNull(input, "hint");
  c.textOrNull(input, "spain");
  c.textOrNull(input, "image");
  c.textRecord(input, "example", ["es", "en"]);
  c.textRecord(input, "audio", ["word", "sentence"]);
  checkGrammar(c, input);

  if (kindOk && isText(input.en)) {
    const targets = input.en.match(BRACKETED)?.length ?? 0;
    const strayBrackets = input.en.replace(BRACKETED, "").match(/[\[\]]/) !== null;
    if (input.kind === "glue" && (targets !== 1 || strayBrackets)) {
      c.fail("en", "a glue prompt must mark exactly one target in [square brackets]");
    }
    if (input.kind === "content" && (targets !== 0 || strayBrackets)) {
      c.fail("en", "a content prompt must not contain square brackets");
    }
  }
  if (kindOk && "image" in input) {
    if (input.kind === "glue" && input.image !== null) {
      c.fail("image", "must be null for a glue card");
    }
    if (input.kind === "content" && input.image === null) {
      c.fail("image", "is required for a content card");
    }
  }
  return c.errors;
}

/** The prompt as the user reads it. Two cards with the same prompt would have two right answers. */
function promptKey(card: Rec): string {
  return `${String(card.en).trim().toLowerCase()}|${String(card.hint ?? "").trim().toLowerCase()}`;
}

export function validateCard(input: unknown): Validation<Card> {
  const id = isRecord(input) && typeof input.id === "string" ? input.id : "?";
  const errors = checkCard(input, `card ${id}`);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as Card };
}

/** Validates every card, plus the rules that span cards: unique ids and unique prompts. */
export function validateDeck(input: unknown): Validation<Deck> {
  if (!isRecord(input)) return { ok: false, errors: ["deck: must be an object"] };
  const c = new Checker("deck");
  c.fields(input, ["version", "cards"]);
  if ("version" in input && !(Number.isInteger(input.version) && (input.version as number) >= 1)) {
    c.fail("version", "must be a whole number, 1 or more");
  }
  const errors = c.errors;
  if (!("cards" in input)) return { ok: false, errors };
  if (!Array.isArray(input.cards)) {
    c.fail("cards", "must be an array");
    return { ok: false, errors };
  }

  const ids = new Set<string>();
  const prompts = new Map<string, string>();
  input.cards.forEach((card: unknown, index) => {
    const id = isRecord(card) && typeof card.id === "string" ? card.id : `#${index}`;
    const cardErrors = checkCard(card, `card ${id}`);
    errors.push(...cardErrors);
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

  return errors.length ? { ok: false, errors } : { ok: true, value: input as unknown as Deck };
}

export class DeckError extends Error {
  constructor(public errors: string[]) {
    super(`Invalid deck (${errors.length} problems):\n${errors.slice(0, 20).join("\n")}`);
    this.name = "DeckError";
  }
}

/** Returns the deck, or throws a DeckError listing what is wrong with it. */
export function parseDeck(input: unknown): Deck {
  const result = validateDeck(input);
  if (!result.ok) throw new DeckError(result.errors);
  return result.value;
}
