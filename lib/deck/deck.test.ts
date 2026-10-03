import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import raw from "./fixture.json";
import { fixtureCard, fixtureDeck } from "./fixture";
import { clearDeckCache, fetchDeck, loadDeck } from "./load";
import { DeckError, parseDeck, validateCard, validateDeck, validateDraftCard, validateDraftCards } from "./validate";

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

  it("has 16 cards, each accepted on its own", () => {
    expect(fixtureDeck.cards).toHaveLength(16);
    for (const c of fixtureDeck.cards) expect(errorsFor(c)).toEqual([]);
  });

  it("covers every variety the ticket lists", () => {
    const cards = fixtureDeck.cards;
    const nouns = cards.filter((c) => c.pos === "noun");
    // Verb cards other than form cards, which repeat their verb's grammar.
    const verbs = cards.flatMap((c) => (c.pos === "verb" && c.kind === "content" ? [c] : []));

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

  it("covers the learning path: two form cards, two phrase cards, two units and a tip", () => {
    const cards = fixtureDeck.cards;
    const forms = cards.filter((c) => c.kind === "form");
    const phrases = cards.filter((c) => c.kind === "phrase");
    expect(forms.map((c) => c.id)).toEqual(["ir-form-yo", "ir-form-tu"]);
    expect(phrases.map((c) => c.id)).toEqual(["phrase-going-home", "phrase-thats-great"]);
    // A form card reuses its verb's still and grammar strip.
    for (const form of forms) {
      expect(form).toMatchObject({ pos: "verb", image: fixtureCard("ir-go").image, grammar: fixtureCard("ir-go").grammar });
    }
    expect(phrases.every((c) => c.pos === "phrase" && c.image === null && c.grammar === null)).toBe(true);
    expect(fixtureDeck.units.map((u) => u.id)).toEqual(["where-i-go", "good-things"]);
    expect(fixtureDeck.tips.map((t) => t.id)).toEqual(["tip-verb-endings"]);
    // Each path field is used at least once.
    expect(cards.filter((c) => c.unit !== null).length).toBeGreaterThan(0);
    expect(cards.filter((c) => c.requires.length > 0).map((c) => c.id)).toEqual(["phrase-going-home", "phrase-thats-great"]);
    expect(cards.filter((c) => c.tip !== null).map((c) => c.id)).toEqual(["ir-form-yo", "ir-form-tu"]);
    expect(cards.filter((c) => c.why !== null).map((c) => c.id)).toEqual(["ir-form-tu"]);
    // Form and phrase cards may have no trick.
    expect(cards.filter((c) => c.trick === null).length).toBeGreaterThan(0);
  });

  it("has a placeholder file for every image and audio path", () => {
    const paths = [
      ...fixtureDeck.cards.flatMap((c) => [c.image, c.audio.word, c.audio.sentence]),
      ...fixtureDeck.tips.flatMap((t) => t.examples.map((e) => e.audio)),
    ];
    const missing = paths.filter((p) => p !== null && !existsSync(join(process.cwd(), "public", p)));
    expect(missing).toEqual([]);
    // Stills for 9 content and 2 form cards, two clips for each of 16 cards, one per tip example.
    expect(paths.filter((p) => p !== null)).toHaveLength(11 + 32 + 2);
  });
});

describe("validateCard rejects", () => {
  it("a value that is not an object", () => {
    for (const bad of [null, "casa", 3, []]) expect(validateCard(bad).ok).toBe(false);
  });

  it.each([
    "id", "rank", "kind", "pos", "es", "en", "hint", "grammar", "example", "spain", "trick", "image", "audio",
    "unit", "requires", "tip", "why",
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
    ["an empty unit (should be null)", "unit", ""],
    ["requires that is not a list", "requires", "ir-go"],
    ["requires holding something other than ids", "requires", [3]],
    ["a tip given as a number", "tip", 1],
    ["an empty contrast line (should be null)", "why", ""],
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
  const deckWith = (cards: unknown, version: unknown = 1) =>
    validateDeck({ format: 2, version, units: raw.units, tips: raw.tips, cards });
  const errorsOf = (result: ReturnType<typeof validateDeck>) => (result.ok ? [] : result.errors);

  it("a deck that is not an object, or has no card list or version", () => {
    expect(validateDeck([]).ok).toBe(false);
    expect(validateDeck({ version: 1 }).ok).toBe(false);
    expect(deckWith("none").ok).toBe(false);
    expect(deckWith([], 0).ok).toBe(false);
    expect(validateDeck({ cards: [] }).ok).toBe(false);
  });

  it("a deck in format 1, with no units or tips", () => {
    const errors = errorsOf(validateDeck({ version: 1, cards: [] }));
    expect(errors).toEqual(["deck.format: missing", "deck.units: missing", "deck.tips: missing"]);
    expect(errorsOf(validateDeck({ ...raw, format: 1 }))).toEqual(["deck.format: must be 2"]);
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

describe("form and phrase cards", () => {
  it("accept the id rule's forms, haber's hay included", () => {
    const hay = card("ir-form-yo", (c) =>
      Object.assign(c, {
        id: "haber-form-hay",
        es: "hay",
        en: "there is",
        grammar: { present: { yo: "he", tu: "has", el: "ha" }, irregular: true },
      }),
    );
    expect(errorsFor(hay)).toEqual([]);
    expect(errorsFor(card("ir-form-tu", (c) => Object.assign(c, { id: "ir-form-el", es: "va" })))).toEqual([]);
    expect(errorsFor(card("phrase-going-home", (c) => (c.id = "phrase-im-going-home-now")))).toEqual([]);
  });

  it.each([
    ["a person that is not yo, tu or el", "ir-form-we"],
    ["no -form-", "ir-yo"],
    ["hay on a verb other than haber", "ir-form-hay"],
    ["the infinitive's id", "ir-go"],
  ])("reject a form id with %s", (_name, id) => {
    expect(errorsFor(card("ir-form-yo", (c) => (c.id = id)))).toEqual([
      'card ' + id + '.id: a form card\'s id must be "<verb>-form-<yo|tu|el>" or "haber-form-hay"',
    ]);
  });

  it.each([
    ["no English words", "phrase"],
    ["five English words", "phrase-i-am-going-home-now"],
    ["no phrase- prefix", "going-home"],
  ])("reject a phrase id with %s", (_name, id) => {
    expect(errorsFor(card("phrase-going-home", (c) => (c.id = id)))).toEqual([
      `card ${id}.id: a phrase card's id must be "phrase-" and one to four English words`,
    ]);
  });

  it("reject a content or glue card with a form or phrase id", () => {
    expect(errorsFor(card("ir-go", (c) => (c.id = "ir-form-yo")))).toEqual([
      "card ir-form-yo.id: a content card cannot have a form or phrase id",
    ]);
    expect(errorsFor(card("de-of", (c) => (c.id = "phrase-of")))).toEqual([
      "card phrase-of.id: a glue card cannot have a form or phrase id",
    ]);
  });

  it("reject a form card with no image, or not a verb", () => {
    expect(errorsFor(card("ir-form-yo", (c) => (c.image = null)))).toEqual([
      "card ir-form-yo.image: is required for a form card",
    ]);
    const noun = card("ir-form-yo", (c) => Object.assign(c, { pos: "noun", es: "el voy", grammar: { gender: "m", article: "el" } }));
    expect(errorsFor(noun)).toEqual(['card ir-form-yo.pos: must be "verb" for a form card']);
  });

  it("reject a form card whose answer is not its own form in the strip", () => {
    expect(errorsFor(card("ir-form-yo", (c) => (c.es = "vas")))).toEqual([
      "card ir-form-yo.es: must be the yo form in grammar.present",
    ]);
  });

  it("reject a phrase card with an image, with grammar, or another part of speech", () => {
    expect(errorsFor(card("phrase-going-home", (c) => (c.image = "/deck/img/casa-house.svg")))).toEqual([
      "card phrase-going-home.image: must be null for a phrase card",
    ]);
    expect(errorsFor(card("phrase-going-home", (c) => (c.grammar = { feminine: "x" })))).toEqual([
      'card phrase-going-home.grammar: must be null for pos "phrase"',
    ]);
    expect(errorsFor(card("phrase-going-home", (c) => (c.pos = "other")))).toEqual([
      'card phrase-going-home.pos: must be "phrase" for a phrase card',
    ]);
  });

  it("reject the phrase part of speech on a word card", () => {
    expect(errorsFor(card("ahora-now", (c) => (c.pos = "phrase")))).toEqual([
      'card ahora-now.pos: cannot be "phrase" for a content card',
    ]);
  });

  it("reject a phrase prompt with square brackets", () => {
    expect(errorsFor(card("phrase-going-home", (c) => (c.en = "I'm going [home]")))).toEqual([
      "card phrase-going-home.en: a phrase prompt must not contain square brackets",
    ]);
  });

  it("allow no trick, which content and glue cards must have", () => {
    expect(errorsFor(card("ir-form-tu", (c) => (c.trick = null)))).toEqual([]);
    expect(errorsFor(card("casa-house", (c) => (c.trick = null)))).toEqual([
      "card casa-house.trick: must be a non-empty string",
    ]);
    expect(errorsFor(card("de-of", (c) => (c.trick = null)))).toEqual(["card de-of.trick: must be a non-empty string"]);
  });
});

describe("draft cards", () => {
  const draft = (id: string) => {
    const { unit, requires, tip, why, ...rest } = card(id);
    void [unit, requires, tip, why];
    return rest;
  };

  it("are cards without the learning path's fields, of any kind", () => {
    for (const id of ["casa-house", "de-of", "ir-form-yo", "phrase-going-home"]) {
      expect(validateDraftCard(draft(id))).toMatchObject({ ok: true });
    }
    expect(validateDraftCard(card("casa-house"))).toMatchObject({ ok: false });
    expect(validateDraftCard({ ...draft("ir-form-yo"), es: "vas" })).toMatchObject({ ok: false });
  });

  it("are checked together for duplicate ids and prompts", () => {
    expect(validateDraftCards([draft("casa-house"), draft("de-of")]).ok).toBe(true);
    const twin = { ...draft("tiempo-weather"), en: "time", hint: "clock, duration" };
    const result = validateDraftCards([draft("tiempo-time"), twin, draft("tiempo-time")]);
    expect(result.ok ? [] : result.errors).toEqual([
      "card tiempo-weather.en: same prompt as card tiempo-time; add a hint so each has one answer",
      "card tiempo-time.id: duplicate id",
      "card tiempo-time.en: same prompt as card tiempo-time; add a hint so each has one answer",
    ]);
  });
});

describe("validateDeck checks the learning path", () => {
  const errorsWith = (change: (deck: Loose) => void) => {
    const deck = structuredClone(raw) as unknown as Loose;
    change(deck);
    const result = validateDeck(deck);
    return result.ok ? [] : result.errors;
  };
  const cardsOf = (deck: Loose) => deck.cards as Loose[];
  const byId = (deck: Loose, id: string) => cardsOf(deck).find((c) => c.id === id)!;

  it("a unit or tip the deck does not have", () => {
    expect(errorsWith((d) => (byId(d, "casa-house").unit = "my-house"))).toEqual([
      'card casa-house.unit: no unit "my-house" in the deck',
    ]);
    expect(errorsWith((d) => (byId(d, "ir-form-yo").tip = "tip-two-to-be"))).toEqual([
      'card ir-form-yo.tip: no tip "tip-two-to-be" in the deck',
    ]);
  });

  it("requires naming a card that is not in the deck, comes later, is itself or is listed twice", () => {
    expect(errorsWith((d) => (byId(d, "phrase-thats-great").requires = ["bueno-bad"]))).toEqual([
      'card phrase-thats-great.requires: no card "bueno-bad" in the deck',
    ]);
    expect(errorsWith((d) => (byId(d, "ir-form-yo").requires = ["ir-form-tu"]))).toEqual([
      'card ir-form-yo.requires: "ir-form-tu" must come earlier in the file',
    ]);
    expect(errorsWith((d) => (byId(d, "ir-form-yo").requires = ["ir-form-yo"]))).toEqual([
      "card ir-form-yo.requires: a card cannot require itself",
    ]);
    expect(errorsWith((d) => (byId(d, "phrase-thats-great").requires = ["bueno-good", "bueno-good"]))).toEqual([
      'card phrase-thats-great.requires: "bueno-good" is listed twice',
    ]);
  });

  it("the card order: moving a phrase before what it requires breaks the deck", () => {
    const errors = errorsWith((d) => {
      const cards = cardsOf(d);
      const phrase = cards.findIndex((c) => c.id === "phrase-going-home");
      cards.unshift(...cards.splice(phrase, 1));
    });
    expect(errors).toEqual([
      'card phrase-going-home.requires: "ir-form-yo" must come earlier in the file',
      'card phrase-going-home.requires: "casa-house" must come earlier in the file',
    ]);
  });

  it("units: unique slug ids and a title and goal", () => {
    const units = (d: Loose) => d.units as Loose[];
    expect(errorsWith((d) => (units(d)[1].id = "where-i-go"))).toEqual([
      "unit where-i-go.id: duplicate id",
      'card bueno-good.unit: no unit "good-things" in the deck',
      'card ahora-now.unit: no unit "good-things" in the deck',
      'card phrase-thats-great.unit: no unit "good-things" in the deck',
    ]);
    expect(errorsWith((d) => (units(d)[0].id = "Where I go"))).toContain("unit Where I go.id: must be a lower-case slug");
    expect(errorsWith((d) => delete units(d)[0].goal)).toEqual(["unit where-i-go.goal: missing"]);
    expect(errorsWith((d) => (d.units = {}))).toEqual(["deck.units: must be an array"]);
  });

  it("tips: tip- ids, unique, a body and two or three examples with audio", () => {
    const tip = (d: Loose) => (d.tips as Loose[])[0];
    const examples = (d: Loose) => tip(d).examples as Loose[];
    expect(errorsWith((d) => (d.tips = [tip(d), tip(d)]))).toEqual(["tip tip-verb-endings.id: duplicate id"]);
    expect(errorsWith((d) => (tip(d).id = "verb-endings"))).toContain(
      'tip verb-endings.id: must be "tip-" and lower-case words',
    );
    expect(errorsWith((d) => (tip(d).body = ""))).toEqual(["tip tip-verb-endings.body: must be a non-empty string"]);
    expect(errorsWith((d) => examples(d).pop())).toEqual([
      "tip tip-verb-endings.examples: must be a list of two or three examples",
    ]);
    expect(errorsWith((d) => examples(d).push(examples(d)[0], examples(d)[0]))).toHaveLength(1);
    expect(errorsWith((d) => delete examples(d)[1].audio)).toEqual(["tip tip-verb-endings.examples.1.audio: missing"]);
  });
});

describe("parseDeck", () => {
  it("returns a valid deck and throws a DeckError for an invalid one", () => {
    expect(parseDeck(raw).cards).toHaveLength(16);
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
    expect(deck.cards).toHaveLength(16);
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
