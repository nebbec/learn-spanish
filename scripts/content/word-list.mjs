// Builds content/word-list.tsv: the most common Spanish words in dictionary
// form, ranked by how often they are spoken in film and TV subtitles.
//
//   node scripts/content/word-list.mjs [--size 1200] [--top 50] [--explain 0]
//
// --top N prints the first N words for a spot check (words only, no cards).
// --explain N prints how each of the N most frequent forms was counted.
//
// The three sources are downloaded once into content/.cache (not committed),
// pinned to a commit and checked against a SHA-256. Sources and licences are
// in docs/design.md under "Content pipeline".

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildWordList, parseDicStems, parseFrequency, parseLemmaPairs } from "./lemmatize.mjs";
import { DROP, OVERRIDES } from "./overrides.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CACHE = path.join(ROOT, "content", ".cache");
const OUT = path.join(ROOT, "content", "word-list.tsv");

export const SOURCES = {
  frequency: {
    file: "es_50k.txt",
    url: "https://raw.githubusercontent.com/hermitdave/FrequencyWords/525f9b560de45753a5ea01069454e72e9aa541c6/content/2018/es/es_50k.txt",
    sha256: "dcff3ad4316192f4dc4ff7d26e637c6ff314ef1ca0f3f720c5649018a71056c0",
  },
  lemmas: {
    file: "lemmatization-es.txt",
    url: "https://raw.githubusercontent.com/michmech/lemmatization-lists/943c9d5f04ed714d9a76970fdb00437e94bb9afb/lemmatization-es.txt",
    sha256: "6d3638c27bd9f6ee326e69c8ea7d04e9be589b1a8aaa376d307e5a9db6e94129",
  },
  dictionary: {
    file: "es_MX.dic",
    url: "https://raw.githubusercontent.com/LibreOffice/dictionaries/762abe74008b94b2ff06db6f4024b59a8254c467/es/es_MX.dic",
    sha256: "44ce35af220962c68f97962776639bef271f7d90a85ba924b539a36e33315f82",
  },
};

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(process.argv[i + 1]);
}

async function source({ file, url, sha256 }) {
  const local = path.join(CACHE, file);
  let bytes;
  if (existsSync(local)) {
    bytes = readFileSync(local);
  } else {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
  }
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== sha256) throw new Error(`${file}: SHA-256 is ${actual}, expected ${sha256}`);
  if (!existsSync(local)) {
    mkdirSync(CACHE, { recursive: true });
    writeFileSync(local, bytes);
  }
  return bytes.toString("utf8");
}

const size = arg("size", 1200);
const top = arg("top", 50);
const explain = arg("explain", 0);

const [frequencyText, lemmaText, dicText] = await Promise.all([
  source(SOURCES.frequency),
  source(SOURCES.lemmas),
  source(SOURCES.dictionary),
]);

const { entries, resolved, stats } = buildWordList({
  frequencies: parseFrequency(frequencyText),
  lemmaMap: parseLemmaPairs(lemmaText),
  dic: parseDicStems(dicText),
  overrides: OVERRIDES,
  drop: DROP,
  size,
});

const header = [
  "# The most common Spanish words in dictionary form, most common first.",
  "# Written by scripts/content/word-list.mjs; do not edit by hand.",
  "# count: occurrences in the OpenSubtitles 2018 Spanish frequency list (FrequencyWords, Hermit Dave, CC BY-SA 4.0),",
  "# summed over the forms listed. Lemmas from lemmatization-lists (Michal Mechura, ODbL 1.0); words checked",
  "# against the es_MX Hunspell dictionary (RLA-ES, GPL 3 / LGPL 3 / MPL 1.1). This file is CC BY-SA 4.0.",
  "rank\tword\tcount\tforms",
];
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
