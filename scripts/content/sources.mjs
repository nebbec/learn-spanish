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

/** One source's text: read from the cache, or downloaded into it, and checked against its SHA-256. */
export async function source({ file, url, sha256 }, cache = CACHE) {
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
  return bytes.toString("utf8");
}
