// The shape of a language config (docs/german.md, "The language config"). One
// file per language, lang/es.ts and lang/de.ts, chosen at build time by
// NEXT_PUBLIC_LANG (lang/index.ts).

export const LANG_CODES = ["es", "de"] as const;
export type LangCode = (typeof LANG_CODES)[number];

/** A loop of the hero mascot and its poster (first frame). */
export interface MascotLoop {
  clip: string;
  poster: string;
}

export interface LangConfig {
  code: LangCode;
  /** BCP 47 tag for `lang` attributes on text in the language being learned. */
  tag: string;
  /** The language's name in English, for the screens: "Spanish". */
  language: string;
  /** The app's name: the manifest, `<title>`, the menu's heading and the install prompt. */
  appName: string;
  /** The name under the home-screen icon. */
  shortName: string;
  description: string;
  /**
   * Prefix of every name the app keeps on the device: the Dexie database, the
   * `localStorage` keys, the service worker's caches and the media cache
   * (`storageNames` in lang/index.ts spells them out).
   */
  storage: string;
  /** URL path the deck is served under, with a trailing slash: `/deck/deck.json` and its media. */
  deckPath: string;
  /** Repo folder the content scripts read and write with `--lang` (scripts/content/script-lang.ts). */
  contentDir: string;
  /** Repo folder under public/ the deck the app serves is published to, with its audio and own stills. */
  publicDeckDir: string;
  /** The hero mascot's files, under public/. */
  mascot: { idle: MascotLoop; celebrate: MascotLoop; still: string };
  /** App icons, under public/. Raise `version` when the files change, so installed copies fetch them again. */
  icons: { version: string; icon192: string; icon512: string; apple: string };
  /** The speech voice, read by `npm run audio` (`voiceOf` in scripts/content/audio.mjs). Changing it gives every clip a new path. */
  voice: { model: string; voice: string; instructions: string };
}
