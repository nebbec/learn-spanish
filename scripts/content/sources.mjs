// The word list's three sources (E1), downloaded once into content/.cache (not
// committed), pinned to a commit and checked against a SHA-256. Used by
// word-list.mjs, and by the known-words check (L7), which reads the lemma list.
// Sources and licences are in docs/design.md under "Content pipeline".

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const CACHE = path.join(ROOT, "content", ".cache");

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

/**
 * German's (DE6), from the same three projects at the same commits: FrequencyWords' 2018 German list
 * (CC BY-SA 4.0), lemmatization-lists' German file (ODbL 1.0) and LibreOffice's de_DE (frami) Hunspell
 * dictionary (GPL 2 or GPL 3), which is ISO-8859-1, not UTF-8. Licences are in docs/german.md under "Word list".
 */
export const SOURCES_DE = {
  frequency: {
    file: "de_50k.txt",
    url: "https://raw.githubusercontent.com/hermitdave/FrequencyWords/525f9b560de45753a5ea01069454e72e9aa541c6/content/2018/de/de_50k.txt",
    sha256: "d9e50546fd7e8b6fe6542a2b33c51d1331092b2a3916ec09f80d97856068705b",
  },
  lemmas: {
    file: "lemmatization-de.txt",
    url: "https://raw.githubusercontent.com/michmech/lemmatization-lists/943c9d5f04ed714d9a76970fdb00437e94bb9afb/lemmatization-de.txt",
    sha256: "b64233a770c6a0945a5f1df7390e93e2a41936a58fc4a2e70abab0c7dc381d75",
  },
  dictionary: {
    file: "de_DE_frami.dic",
    url: "https://raw.githubusercontent.com/LibreOffice/dictionaries/762abe74008b94b2ff06db6f4024b59a8254c467/de/de_DE_frami.dic",
    sha256: "4ca3c958b0e5545910999bc246f668840bf8ede3df8e5e6790d05edd5a586c38",
    encoding: "latin1",
  },
};

/** Each language's sources (DE5, German's since DE6). */
export const SOURCES_BY_LANG = { es: SOURCES, de: SOURCES_DE };

/**
 * One source's text: read from the cache, or downloaded into it, and checked against its SHA-256. Decoded as
 * UTF-8 unless the source names another `encoding`.
 */
export async function source({ file, url, sha256, encoding = "utf8" }, cache = CACHE) {
  const local = path.join(cache, file);
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
    mkdirSync(cache, { recursive: true });
    writeFileSync(local, bytes);
  }
  return bytes.toString(encoding);
}
