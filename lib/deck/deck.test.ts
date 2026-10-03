import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import raw from "./fixture.json";
import { fixtureCard, fixtureDeck } from "./fixture";
import { clearDeckCache, fetchDeck, loadDeck } from "./load";
import { DeckError, parseDeck, validateCard, validateDeck } from "./validate";

type Loose = Record<string, unknown>;

/** A deep copy of a fixture card, with changes applied, as untyped data. */
function card(id: string, change: (c: Loose) => void = () => {}): Loose {
  const copy = structuredClone(fixtureCard(id)) as unknown as Loose;
  change(copy);
  return copy;
}

function errorsFor(input: unknown): string[] {
  const result = validateCard(input);
  return result.ok ? [] : result.errors;
}

describe("fixture deck", () => {
  it("is accepted by the validator", () => {
    const result = validateDeck(raw);
    expect(result.ok ? [] : result.errors).toEqual([]);
  });

  it("has 12 cards, each accepted on its own", () => {
    expect(fixtureDeck.cards).toHaveLength(12);
    for (const c of fixtureDeck.cards) expect(errorsFor(c)).toEqual([]);
  });

  it("covers every variety the ticket lists", () => {
    const cards = fixtureDeck.cards;
    const nouns = cards.filter((c) => c.pos === "noun");
    const verbs = cards.filter((c) => c.pos === "verb");

    // A regular noun, and one whose gender is not what its ending suggests.
    expect(fixtureCard("casa-house")).toMatchObject({ es: "la casa", grammar: { gender: "f" } });
    expect(fixtureCard("problema-problem")).toMatchObject({ es: "el problema", grammar: { gender: "m" } });
    // A regular and an irregular verb.
    expect(verbs.map((c) => c.grammar.irregular).sort()).toEqual([false, true]);
    expect(cards.some((c) => c.pos === "adjective")).toBe(true);
    expect(cards.some((c) => c.pos === "adverb")).toBe(true);
    // Three glue words, none illustrated.
    const glue = cards.filter((c) => c.kind === "glue");
    expect(glue).toHaveLength(3);
    expect(glue.every((c) => c.image === null && /\[.+\]/.test(c.en))).toBe(true);
    // A two-meaning pair: one Spanish word, two cards, two different prompts.
    const pair = nouns.filter((c) => c.es === "el tiempo");
    expect(pair).toHaveLength(2);
    expect(new Set(pair.map((c) => c.en)).size).toBe(2);
    // A Spain footnote.
    expect(cards.filter((c) => c.spain !== null).map((c) => c.spain)).toEqual(["el coche"]);
  });

  it("has a placeholder file for every image and audio path", () => {
    const paths = fixtureDeck.cards.flatMap((c) => [c.image, c.audio.word, c.audio.sentence]);
    const missing = paths.filter((p) => p !== null && !existsSync(join(process.cwd(), "public", p)));
    expect(missing).toEqual([]);
    expect(paths.filter((p) => p !== null)).toHaveLength(9 + 24);
  });
});

describe("validateCard rejects", () => {
  it("a value that is not an object", () => {
    for (const bad of [null, "casa", 3, []]) expect(validateCard(bad).ok).toBe(false);
  });

  it.each([
    "id", "rank", "kind", "pos", "es", "en", "hint", "grammar", "example", "spain", "trick", "image", "audio",
  ])("a card missing %s", (field) => {
    // Without an id the card is reported as "card ?".
    const name = field === "id" ? "?" : "casa-house";
    expect(errorsFor(card("casa-house", (c) => delete c[field]))).toContain(`card ${name}.${field}: missing`);
  });

  it("an unknown field", () => {
    expect(errorsFor(card("casa-house", (c) => (c.notes = "x")))).toEqual(["card casa-house.notes: unknown field"]);
  });

  it.each([
    ["an id that is not a slug", "id", "Casa House"],
    ["a rank of zero", "rank", 0],
    ["a fractional rank", "rank", 1.5],
    ["a rank given as text", "rank", "95"],
    ["an unknown kind", "kind", "filler"],
    ["an unknown part of speech", "pos", "article"],
    ["an empty Spanish answer", "es", " "],
    ["an empty prompt", "en", ""],
    ["an empty hint (should be null)", "hint", ""],
    ["a numeric Spain alternative", "spain", 1],
    ["an empty trick", "trick", ""],
    ["an example that is plain text", "example", "Mi casa es pequeña."],
    ["an example with no English", "example", { es: "Mi casa es pequeña." }],
    ["audio as a single path", "audio", "/deck/audio/casa.wav"],
    ["audio with no sentence clip", "audio", { word: "/deck/audio/casa.wav" }],
  ])("%s", (_name, field, value) => {
    const errors = errorsFor(card("casa-house", (c) => (c[field] = value)));
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.every((e) => e.includes(`.${field}`))).toBe(true);
  });

  it("a content card with no image", () => {
    expect(errorsFor(card("casa-house", (c) => (c.image = null)))).toEqual([
      "card casa-house.image: is required for a content card",
    ]);
  });

  it("a glue card with an image", () => {
    expect(errorsFor(card("de-of", (c) => (c.image = "/deck/img/de.svg")))).toEqual([
      "card de-of.image: must be null for a glue card",
    ]);
  });

  it("a glue prompt without exactly one marked target", () => {
    for (const en of ["the house of Maria", "[the] house [of] Maria", "the house [of Maria", "the house [] Maria"]) {
      expect(errorsFor(card("de-of", (c) => (c.en = en)))).toHaveLength(1);
    }
  });

  it("a content prompt with square brackets", () => {
    expect(errorsFor(card("casa-house", (c) => (c.en = "[house]")))).toHaveLength(1);
  });

  describe("grammar that does not match the part of speech", () => {
    it("a noun with no grammar, a bad gender, a bad article, or the article missing from es", () => {
      expect(errorsFor(card("casa-house", (c) => (c.grammar = null)))).toHaveLength(1);
      expect(errorsFor(card("casa-house", (c) => (c.grammar = { gender: "x", article: "la" })))).toHaveLength(1);
      expect(errorsFor(card("casa-house", (c) => (c.grammar = { gender: "f", article: "una" })))).toHaveLength(1);
      expect(errorsFor(card("casa-house", (c) => (c.es = "casa")))).toEqual([
        'card casa-house.es: a noun must start with its article "la"',
      ]);
    });

    it("a noun carrying verb grammar", () => {
      const verbGrammar = fixtureCard("ir-go").grammar;
      expect(errorsFor(card("casa-house", (c) => (c.grammar = verbGrammar))).length).toBeGreaterThan(0);
    });

    it("an adjective with no feminine form", () => {
      expect(errorsFor(card("bueno-good", (c) => (c.grammar = {})))).toEqual([
        "card bueno-good.grammar.feminine: missing",
      ]);
    });

    it("a verb with an incomplete strip or no irregular flag", () => {
      expect(
        errorsFor(card("ir-go", (c) => (c.grammar = { present: { yo: "voy", tu: "vas" }, irregular: true }))),
      ).toEqual(["card ir-go.grammar.present.el: missing"]);
      expect(
        errorsFor(card("ir-go", (c) => (c.grammar = { present: { yo: "voy", tu: "vas", el: "va" } }))),
      ).toEqual(["card ir-go.grammar.irregular: missing"]);
      expect(
        errorsFor(card("ir-go", (c) => (c.grammar = { present: { yo: "voy", tu: "vas", el: "va" }, irregular: "yes" }))),
      ).toHaveLength(1);
    });

    it("an adverb or a glue word with grammar", () => {
      expect(errorsFor(card("ahora-now", (c) => (c.grammar = { feminine: "ahora" })))).toHaveLength(1);
      expect(errorsFor(card("de-of", (c) => (c.grammar = {})))).toHaveLength(1);
    });
  });

  it("reports every problem, not just the first", () => {
    const errors = errorsFor(card("casa-house", (c) => Object.assign(c, { rank: -1, trick: "", image: null })));
    expect(errors).toHaveLength(3);
  });
});

describe("validateDeck rejects", () => {
  const deckWith = (cards: unknown, version: unknown = 1) => validateDeck({ version, cards });
  const errorsOf = (result: ReturnType<typeof validateDeck>) => (result.ok ? [] : result.errors);

  it("a deck that is not an object, or has no card list or version", () => {
    expect(validateDeck([]).ok).toBe(false);
    expect(validateDeck({ version: 1 }).ok).toBe(false);
    expect(deckWith("none").ok).toBe(false);
    expect(deckWith([], 0).ok).toBe(false);
    expect(validateDeck({ cards: [] }).ok).toBe(false);
  });

  it("a malformed card, naming it", () => {
    const errors = errorsOf(deckWith([card("casa-house"), card("de-of", (c) => (c.rank = 0))]));
    expect(errors).toEqual(["card de-of.rank: must be a whole number, 1 or more"]);
  });

  it("two cards with the same id", () => {
    const twin = card("casa-house", (c) => (c.en = "home"));
    expect(errorsOf(deckWith([card("casa-house"), twin]))).toEqual(["card casa-house.id: duplicate id"]);
  });

  it("two cards with the same prompt and hint, since the prompt would have two answers", () => {
    const clash = card("tiempo-weather", (c) => Object.assign(c, { en: "Time", hint: "clock, duration" }));
    const errors = errorsOf(deckWith([card("tiempo-time"), clash]));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("same prompt as card tiempo-time");
  });

  it("but accepts the same prompt told apart by a hint", () => {
    const ser = card("tiempo-time", (c) => Object.assign(c, { id: "ser-be", en: "to be", hint: "identity" }));
    const estar = card("tiempo-weather", (c) => Object.assign(c, { id: "estar-be", en: "to be", hint: "state, place" }));
    expect(deckWith([ser, estar]).ok).toBe(true);
  });
});

describe("parseDeck", () => {
  it("returns a valid deck and throws a DeckError for an invalid one", () => {
    expect(parseDeck(raw).cards).toHaveLength(12);
    expect(() => parseDeck({ version: 1, cards: [{}] })).toThrow(DeckError);
  });
});

describe("deck loader", () => {
  afterEach(clearDeckCache);

  const respond = (body: unknown, status = 200) => {
    const calls: string[] = [];
    const fetchImpl = async (url: string) => {
      calls.push(url);
      return { ok: status < 400, status, json: async () => body };
    };
    return { calls, fetchImpl };
  };

  it("fetches the deck file, validates it and indexes cards by id", async () => {
    const { calls, fetchImpl } = respond(raw);
    const deck = await fetchDeck(fetchImpl);
    expect(calls).toEqual(["/deck/deck.json"]);
    expect(deck.cards).toHaveLength(12);
    expect(deck.byId.get("lo-him")?.es).toBe("lo");
  });

  it("throws on a failed request or an invalid deck", async () => {
    await expect(fetchDeck(respond(null, 404).fetchImpl)).rejects.toThrow("404");
    await expect(fetchDeck(respond({ version: 1, cards: [{ id: "x" }] }).fetchImpl)).rejects.toThrow(DeckError);
  });

  it("loadDeck fetches once, and retries after a failure", async () => {
    const bad = respond(null, 500);
    await expect(loadDeck(bad.fetchImpl)).rejects.toThrow("500");
    const good = respond(raw);
    const [a, b] = await Promise.all([loadDeck(good.fetchImpl), loadDeck(good.fetchImpl)]);
    expect(a).toBe(b);
    expect(good.calls).toHaveLength(1);
  });
});
