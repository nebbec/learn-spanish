// The language a content script works on (DE5): `--lang de` (default `es`) picks
// the config in lang/ and, from it, every folder the scripts read and write.
// Spanish keeps the paths it always had, so a run with no flag is unchanged.
//
// The rules are in docs/german.md under "Content scripts", "Decided in DE5".

import path from "node:path";
import { LANG_CODES, LANGS, type LangCode, type LangConfig } from "../../lang/index.ts";

export { LANG_CODES, LANGS, type LangCode, type LangConfig };

/** The value of `--lang`: `es` when left out, and an unknown code is refused. */
export function parseLang(value: string | undefined): LangCode {
  if (value === undefined || value === "") return "es";
  if (!(LANG_CODES as readonly string[]).includes(value)) {
    throw new Error(`--lang is ${LANG_CODES.join(" or ")}, not "${value}"`);
  }
  return value as LangCode;
}

/** The parseArgs option every content script takes. */
export const LANG_OPTION = { lang: { type: "string", default: "es" } } as const;

/** Every file and folder a content script reads or writes for one language, as absolute paths. */
export interface ContentPaths {
  lang: LangCode;
  config: LangConfig;
  /** `content/` for Spanish, `content/de/` for German. */
  content: string;
  wordList: string;
  units: string;
  tipList: string;
  drafts: string;
  review: string;
  tags: string;
  tips: string;
  deck: string;
  /** content/path.md: the computed order for a person to read. */
  pathFile: string;
  audioTakes: string;
  /** The listening page `npm run audio -- --check` writes. */
  flaggedClips: string;
  /** The language's art files: cast.tsv, review.tsv, stills, contact sheets, the mascot's takes. */
  art: string;
  /** Shared by both languages: the model sheets and style.md (docs/german.md, "Art"). */
  sharedArt: string;
  /** Downloads and caches, shared by both languages: their files are named per language or by a hash. */
  cache: string;
  public: string;
  /** The deck the app serves: `public/deck` or `public/deck-de`. */
  publicDeck: string;
  /** The deck's URL path with a trailing slash: `/deck/` or `/deck-de/`. */
  deckUrl: string;
  /** The test deck of this language's cards: lib/deck/fixture.json or fixture-de.json. */
  fixture: string;
}

export function contentPaths(root: string, lang: LangCode = "es"): ContentPaths {
  const config = LANGS[lang];
  const content = path.join(root, config.contentDir);
  return {
    lang,
    config,
    content,
    wordList: path.join(content, "word-list.tsv"),
    units: path.join(content, "units.json"),
    tipList: path.join(content, "tips.json"),
    drafts: path.join(content, "drafts"),
    review: path.join(content, "review"),
    tags: path.join(content, "tags"),
    tips: path.join(content, "tips"),
    deck: path.join(content, "deck.json"),
    pathFile: path.join(content, "path.md"),
    audioTakes: path.join(content, "audio-takes.json"),
    flaggedClips: path.join(content, "flagged-clips.html"),
    art: path.join(content, "art"),
    sharedArt: path.join(root, "content", "art"),
    cache: path.join(root, "content", ".cache"),
    public: path.join(root, "public"),
    publicDeck: path.join(root, config.publicDeckDir),
    deckUrl: config.deckPath,
    fixture: path.join(root, "lib", "deck", lang === "es" ? "fixture.json" : `fixture-${lang}.json`),
  };
}
