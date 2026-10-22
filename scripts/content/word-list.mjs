// Builds content/word-list.tsv: the most common Spanish words in dictionary
// form, ranked by how often they are spoken in film and TV subtitles; with
// --lang de, content/de/word-list.tsv for German (DE6).
//
//   npm run word-list -- [--size 1200] [--top 50] [--explain 0] [--lang de]
//
// --top N prints the first N words for a spot check (words only, no cards).
// --explain N prints how each of the N most frequent forms was counted.
//
// The three sources are downloaded once into content/.cache (not committed),
// pinned to a commit and checked against a SHA-256. Sources and licences are
// in docs/design.md under "Content pipeline" (Spanish) and docs/german.md under
// "Word list" (German).

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { candidatesDe, lemmaSpellings, parseDicWords, spellingIn } from "./lemmatize-de.mjs";
import { buildWordList, candidates, parseDicStems, parseFrequency, parseLemmaPairs } from "./lemmatize.mjs";
import { DROP, OVERRIDES } from "./overrides.mjs";
import { DROP_DE, OVERRIDES_DE, SPELLINGS_DE } from "./overrides-de.mjs";
import { contentPaths, parseLang } from "./script-lang.ts";
import { source, SOURCES_BY_LANG } from "./sources.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const langAt = process.argv.indexOf("--lang");
const lang = parseLang(langAt === -1 ? undefined : process.argv[langAt + 1]);
const OUT = contentPaths(ROOT, lang).wordList;
const SOURCES = SOURCES_BY_LANG[lang];

/** Each language's rules and the file's opening lines (sources and licences). */
const RULES = {
  es: {
    parseDic: parseDicStems,
    resolve: candidates,
    written: () => (lemma) => lemma,
    overrides: OVERRIDES,
    drop: DROP,
    header: [
      "# The most common Spanish words in dictionary form, most common first.",
      "# Written by scripts/content/word-list.mjs; do not edit by hand.",
      "# count: occurrences in the OpenSubtitles 2018 Spanish frequency list (FrequencyWords, Hermit Dave, CC BY-SA 4.0),",
      "# summed over the forms listed. Lemmas from lemmatization-lists (Michal Mechura, ODbL 1.0); words checked",
      "# against the es_MX Hunspell dictionary (RLA-ES, GPL 3 / LGPL 3 / MPL 1.1). This file is CC BY-SA 4.0.",
    ],
  },
  de: {
    parseDic: parseDicWords,
    resolve: candidatesDe,
    written: (dic, lemmaText) => spellingIn(dic, lemmaSpellings(lemmaText), new Map(Object.entries(SPELLINGS_DE))),
    overrides: OVERRIDES_DE,
    drop: DROP_DE,
    header: [
      "# The most common German words in dictionary form, most common first; nouns with their capital, no article.",
      "# Written by scripts/content/word-list.mjs --lang de; do not edit by hand.",
      "# count: occurrences in the OpenSubtitles 2018 German frequency list (FrequencyWords, Hermit Dave, CC BY-SA 4.0),",
      "# summed over the forms listed. Lemmas from lemmatization-lists (Michal Mechura, ODbL 1.0); words checked",
      "# against the de_DE (frami) Hunspell dictionary (igerman98, Bjorn Jacke, GPL 2 / GPL 3). This file is CC BY-SA 4.0.",
    ],
  },
};
const rules = RULES[lang];

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(process.argv[i + 1]);
}

const size = arg("size", 1200);
const top = arg("top", 50);
const explain = arg("explain", 0);

const [frequencyText, lemmaText, dicText] = await Promise.all([
  source(SOURCES.frequency),
  source(SOURCES.lemmas),
  source(SOURCES.dictionary),
]);

const dic = rules.parseDic(dicText);
const { entries, resolved, stats } = buildWordList({
  frequencies: parseFrequency(frequencyText),
  lemmaMap: parseLemmaPairs(lemmaText),
  dic,
  overrides: rules.overrides,
  drop: rules.drop,
  size,
  resolve: rules.resolve,
  written: rules.written(dic, lemmaText),
});

const header = [...rules.header, "rank\tword\tcount\tforms"];
const lines = entries.map((e) => `${e.rank}\t${e.word}\t${e.count}\t${e.forms.slice(0, 8).join(" ")}`);
mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, [...header, ...lines].join("\n") + "\n");

console.log(
  `forms ${stats.forms}, dropped ${stats.droppedForms}, shared ${stats.sharedForms}; ` +
    `lemmas ${stats.lemmas}, kept ${stats.keptLemmas}, rejected ${stats.rejectedLemmas}; ` +
    `written ${entries.length} to ${path.relative(ROOT, OUT)}`,
);
if (explain > 0) {
  const shown = resolved.slice(0, explain).flatMap(({ form, to }) => {
    if (!to) return [`${form}>-`];
    const names = Array.isArray(to) ? to : Object.keys(to);
    if (names.length === 1 && names[0] === form) return [];
    return [`${form}>${names.join("|")}`];
  });
  console.log(`explain (${shown.length} of the top ${explain} forms not counted as themselves):`);
  console.log(shown.join(" "));
}
if (top > 0) {
  console.log(`top ${Math.min(top, entries.length)}:`);
  console.log(entries.slice(0, top).map((e) => `${e.rank} ${e.word}`).join(", "));
}
