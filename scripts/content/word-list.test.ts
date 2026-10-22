import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildWordList,
  cliticLemmas,
  parseDicStems,
  parseFrequency,
  parseLemmaPairs,
  stripAccents,
} from "./lemmatize.mjs";
import { candidatesDe, lemmaSpellings, parseDicWords, spellingIn } from "./lemmatize-de.mjs";
import { DROP_DE, OVERRIDES_DE } from "./overrides-de.mjs";

const lemmaMap = parseLemmaPairs(
  [
    "﻿ser\tes",
    "ser\tera",
    "erar\tera",
    "ir\tfue",
    "ser\tfue",
    "ir\tvoy",
    "ir\tvamos",
    "crear\tcreo",
    "creer\tcreo",
    "creer\tcreemos",
    "crear\tcreamos",
    "casar\tcasa",
    "bueno\tbuena",
    "perder\tperdido",
    "dejar\tdeja",
    "dejar\tdejo",
    "decir\tdi",
    "dar\tdi",
    "decir\tdice",
    "dar\tda",
    "bastar\tbastan",
    "trabajo\ttrabajo",
    "trabajar\ttrabajo",
  ].join("\r\n"),
);
const dic = parseDicStems(
  [
    "12",
    "ser",
    "ir",
    "casa/LNS",
    "casar/RED",
    "bueno/GS",
    "perder/RED",
    "dejar/RED",
    "decir/RED",
    "dar/RED",
    "creer/RED",
    "crear/RED",
    "trabajo/S",
    "trabajar/RED",
    "bastante",
    "de",
    "María/S",
    "ABS",
    "oh",
  ].join("\n"),
);

type Options = Omit<Parameters<typeof buildWordList>[0], "frequencies" | "lemmaMap" | "dic">;

function build(rows: [string, number][], options: Options = {}) {
  const frequencies = parseFrequency(rows.map(([f, c]) => `${f} ${c}`).join("\n"));
  return buildWordList({ frequencies, lemmaMap, dic, ...options });
}

const words = (result: ReturnType<typeof build>) => result.entries.map((e: { word: string }) => e.word);
const countOf = (result: ReturnType<typeof build>, word: string) =>
  result.entries.find((e: { word: string }) => e.word === word)?.count;

describe("parsing", () => {
  it("reads the frequency list, lower case", () => {
    expect(parseFrequency("De 10\nQue 9\n\nbad line\n")).toEqual([
      { form: "de", count: 10 },
      { form: "que", count: 9 },
    ]);
  });

  it("reads lemma pairs with a byte-order mark and Windows line ends", () => {
    expect([...lemmaMap.get("es")!]).toEqual(["ser"]);
    expect([...lemmaMap.get("fue")!].sort()).toEqual(["ir", "ser"]);
  });

  it("keeps lower-case headwords, and notes those with a plural", () => {
    expect(dic.words.has("casa")).toBe(true);
    expect(dic.plurals.has("casa")).toBe(true);
    expect(dic.plurals.has("bastante")).toBe(false);
    expect(dic.words.has("maría")).toBe(false);
    expect(dic.words.has("abs")).toBe(false);
  });

  it("strips stress accents but keeps ñ and ü", () => {
    expect(stripAccents("déjame señor pingüino")).toBe("dejame señor pingüino");
  });
});

describe("lemmatizing", () => {
  it("sums forms into their lemma", () => {
    const result = build([
      ["es", 60],
      ["voy", 30],
      ["vamos", 20],
    ]);
    expect(result.entries).toEqual([
      { rank: 1, word: "ser", count: 60, forms: ["es"] },
      { rank: 2, word: "ir", count: 50, forms: ["voy", "vamos"] },
    ]);
  });

  it("shares a form between lemmas by their other forms' counts", () => {
    const result = build([
      ["creo", 100],
      ["creemos", 90],
      ["creamos", 10],
    ]);
    expect(countOf(result, "creer")).toBe(90 + 90);
    expect(countOf(result, "crear")).toBe(10 + 10);
  });

  it("drops lemmas the dictionary does not know", () => {
    const result = build([
      ["era", 10],
      ["es", 10],
    ]);
    expect(words(result)).toEqual(["ser"]);
    expect(countOf(result, "ser")).toBe(20);
  });

  it("keeps a noun that is also a verb form as the noun", () => {
    expect(words(build([["casa", 5]]))).toEqual(["casa"]);
    expect(words(build([["trabajo", 5]]))).toEqual(["trabajo"]);
  });

  it("counts a past participle towards its verb", () => {
    expect(words(build([["perdido", 5]]))).toEqual(["perder"]);
  });

  it("counts a feminine form towards the masculine", () => {
    expect(words(build([["buena", 5]]))).toEqual(["bueno"]);
  });

  it("keeps a dictionary word with no lemma as itself, and drops names and English", () => {
    expect(words(build([["bastante", 5], ["de", 4], ["harry", 3], ["okay", 2]]))).toEqual(["bastante", "de"]);
  });

  it("applies overrides: a word, shares, or nothing", () => {
    const result = build(
      [
        ["casa", 10],
        ["fue", 10],
        ["vos", 10],
      ],
      { overrides: { casa: "casar", fue: { ir: 0.3, ser: 0.7 }, vos: null } },
    );
    expect(Object.fromEntries(result.entries.map((e: { word: string; count: number }) => [e.word, e.count]))).toEqual({
      casar: 10,
      ser: 7,
      ir: 3,
    });
    expect(result.stats.droppedForms).toBe(1);
  });

  it("leaves out dropped words, and cuts the list to size by count then word", () => {
    const result = build(
      [
        ["oh", 9],
        ["de", 5],
        ["casa", 5],
        ["bastante", 1],
      ],
      { drop: ["oh"], size: 2 },
    );
    expect(words(result)).toEqual(["casa", "de"]);
  });
});

describe("pronouns attached to a verb", () => {
  const lemmaSet = new Set(["ir", "dejar", "decir", "dar", "bastar", "ser"]);

  it("finds the infinitive", () => {
    expect(cliticLemmas("irme", lemmaMap, lemmaSet)).toEqual(["ir"]);
    expect(cliticLemmas("decírselo", lemmaMap, lemmaSet)).toEqual(["decir"]);
  });

  it("finds an accented imperative and a short one", () => {
    expect(cliticLemmas("déjame", lemmaMap, lemmaSet)).toEqual(["dejar"]);
    expect(cliticLemmas("dímelo", lemmaMap, lemmaSet)?.sort()).toEqual(["dar", "decir"]);
    expect(cliticLemmas("dale", lemmaMap, lemmaSet)).toEqual(["dar"]);
  });

  it("leaves alone a longer word without an accent", () => {
    expect(cliticLemmas("bastante", lemmaMap, lemmaSet)).toBeNull();
  });
});

describe("content/word-list.tsv", () => {
  const file = readFileSync(path.join(__dirname, "..", "..", "content", "word-list.tsv"), "utf8");
  const rows = file
    .split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .slice(1)
    .map((line) => line.split("\t"));

  it("has about 1,200 ranked, distinct words, most common first", () => {
    expect(rows.length).toBe(1200);
    rows.forEach(([rank], i) => expect(Number(rank)).toBe(i + 1));
    expect(new Set(rows.map((r) => r[1])).size).toBe(rows.length);
    for (let i = 1; i < rows.length; i++) expect(Number(rows[i][2])).toBeLessThanOrEqual(Number(rows[i - 1][2]));
  });

  it("starts with the words every frequency list starts with", () => {
    const top = rows.slice(0, 50).map((r) => r[1]);
    for (const word of ["de", "que", "no", "el", "un", "ser", "estar", "haber", "tener", "ir", "hacer", "poder"]) {
      expect(top).toContain(word);
    }
  });
});

describe("German's rules (DE6)", () => {
  // A made-up de_DE dictionary: nouns capitalised, the -mann of compounds (flag o), a verb and its noun.
  const dicDe = parseDicWords(
    [
      "12",
      "# comment",
      "Mann/SEPTm",
      "mann/SEPTozm",
      "Tag/EPSTm",
      "Hast/m",
      "essen/BDI",
      "Essen/Sm",
      "zeit",
      "Zeit/Pm",
      "gut/AU",
      "sein/A",
      "ist",
      "haben/DIW",
      "tagen/DI",
      "müssen/DI",
      "Peter/SM",
    ].join("\n"),
  );
  const lemmaTextDe = [
    "﻿sein\tist",
    "sein\tbin",
    "haben\thast",
    "Hast\tHasten",
    "Tag\tTage",
    "Tag\tTages",
    "tagen\ttag",
    "tagen\ttagt",
    "gut\tgute",
    "Mann\tMänner",
    "Zeit\tZeiten",
    "müssen\tmußte",
  ].join("\r\n");
  const lemmaMapDe = parseLemmaPairs(lemmaTextDe);

  function buildDe(rows: [string, number][], options: Options = {}) {
    const frequencies = parseFrequency(rows.map(([f, c]) => `${f} ${c}`).join("\n"));
    const written = spellingIn(dicDe, lemmaSpellings(lemmaTextDe), new Map([["zeit", "Zeit"]]));
    return buildWordList({ frequencies, lemmaMap: lemmaMapDe, dic: dicDe, resolve: candidatesDe, written, ...options });
  }

  it("reads capitalised headwords as words, and leaves out parts of compounds", () => {
    expect(dicDe.words.has("mann")).toBe(true);
    expect(dicDe.spelling.get("mann")).toBe("Mann");
    expect(dicDe.spelling.get("essen")).toBe("essen");
    expect(dicDe.spelling.get("zeit")).toBe("zeit");
    expect(lemmaSpellings(lemmaTextDe).get("zeit")).toBe("Zeit");
  });

  it("sends a verb form to its verb, even when the dictionary lists it as a headword", () => {
    expect(words(buildDe([["ist", 50], ["bin", 20]]))).toEqual(["sein"]);
  });

  it("shares a form that is a lemma itself by frequency: Tag stays Tag, hast goes to haben", () => {
    const result = buildDe([
      ["tag", 100],
      ["tage", 40],
      ["tages", 10],
      ["tagt", 1],
      ["hast", 80],
      ["haben", 200],
    ]);
    expect(words(result)).toEqual(["haben", "Tag", "tagen"]);
    expect(countOf(result, "haben")).toBe(280);
  });

  it("sends a declined adjective to its base, and finds a reform spelling under ß", () => {
    expect(words(buildDe([["gute", 5]]))).toEqual(["gut"]);
    expect(words(buildDe([["musste", 5]]))).toEqual(["müssen"]);
  });

  it("writes nouns with their capital, by hand where the dictionary also has a lower-case word", () => {
    expect(buildDe([["männer", 5], ["zeit", 4], ["essen", 3]]).entries.map((e: { word: string }) => e.word)).toEqual([
      "Mann",
      "Zeit",
      "essen",
    ]);
  });

  it("applies German's overrides: articles fold, pronoun forms stay, names are dropped", () => {
    const result = buildWordList({
      frequencies: parseFrequency("die 9\nden 8\nmich 7\nsie 6\npeter 5"),
      lemmaMap: parseLemmaPairs("der\tdie\nder\tden\nich\tmich\nich\tsie"),
      dic: parseDicWords("3\nder/P\nmich\nsie\nPeter/SM"),
      overrides: OVERRIDES_DE,
      drop: DROP_DE,
      resolve: candidatesDe,
    });
    expect(Object.fromEntries(result.entries.map((e: { word: string; count: number }) => [e.word, e.count]))).toEqual({
      der: 17,
      mich: 7,
      sie: 6,
    });
  });
});

describe("content/de/word-list.tsv", () => {
  const file = readFileSync(path.join(__dirname, "..", "..", "content", "de", "word-list.tsv"), "utf8");
  const rows = file
    .split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .slice(1)
    .map((line) => line.split("\t"));
  const list = rows.map((r) => r[1]);

  it("has 1,200 ranked, distinct words, most common first", () => {
    expect(rows.length).toBe(1200);
    rows.forEach(([rank], i) => expect(Number(rank)).toBe(i + 1));
    expect(new Set(list).size).toBe(rows.length);
    for (let i = 1; i < rows.length; i++) expect(Number(rows[i][2])).toBeLessThanOrEqual(Number(rows[i - 1][2]));
  });

  it("folds the articles and keeps the pronoun forms a learner says", () => {
    const forms = (word: string) => rows.find((r) => r[1] === word)![3].split(" ");
    expect(forms("der")).toEqual(expect.arrayContaining(["die", "das", "den", "dem", "des"]));
    expect(forms("ein")).toEqual(expect.arrayContaining(["eine", "einen", "einem", "einer"]));
    for (const word of ["die", "das", "den", "dem", "eine", "einen", "keine", "meine"]) expect(list).not.toContain(word);
    for (const word of ["mich", "mir", "dich", "dir", "ihn", "ihm", "uns", "euch"]) expect(list).toContain(word);
  });

  it("starts with the words every German list starts with, nouns with their capital", () => {
    const top = list.slice(0, 120);
    for (const word of ["der", "ein", "sein", "haben", "ich", "du", "nicht", "werden", "können", "gehen", "Mann", "Zeit"]) {
      expect(top).toContain(word);
    }
    expect(list).not.toContain("mann");
  });
});
