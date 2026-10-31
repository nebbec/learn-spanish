import type { LangConfig } from "./types";

/**
 * German (docs/german.md). The mascot and icons are the Brezel's, under /mascot-de/ (DE14).
 * The voice is `sage`, Courtney's pick in DE11's ear test.
 */
export const de: LangConfig = {
  code: "de",
  tag: "de",
  language: "German",
  appName: "Learn German",
  shortName: "German",
  description: "The 1,000 most common German words, most common first.",
  storage: "learn-german",
  deckPath: "/deck-de/",
  contentDir: "content/de",
  publicDeckDir: "public/deck-de",
  // Draft lines for the menu (U3's three states), for Courtney to confirm; their clips (U4) are named by the keys.
  greetings: { hola: "Hallo!", vamos: "Los geht's!", "muy-bien": "Sehr gut!" },
  // DE14: the Brezel, made by `npm run mascot -- --lang de` and `node scripts/make-icons.mjs --lang de`.
  mascot: {
    idle: { webm: "/mascot-de/idle.webm", hevc: "/mascot-de/idle.mov", poster: "/mascot-de/idle.webp" },
    celebrate: { webm: "/mascot-de/celebrate.webm", hevc: "/mascot-de/celebrate.mov", poster: "/mascot-de/celebrate.webp" },
    still: "/mascot-de/brezel.webp",
  },
  // Raised from the concha's "2" so German copies installed before DE14 fetch the Brezel.
  icons: { version: "3", icon192: "/mascot-de/icon-192.png", icon512: "/mascot-de/icon-512.png", apple: "/mascot-de/apple-touch-icon.png" },
  // DE11: Courtney's pick by ear, sage, with the model and instruction the ear test used (docs/german.md, "Decided in DE11").
  voice: {
    model: "gpt-4o-mini-tts",
    voice: "sage",
    instructions:
      "Sprich klares Hochdeutsch, wie man es in Deutschland spricht. Sprich deutlich und in natürlichem Tempo, wie eine Lehrkraft, die eine Vokabelkarte vorliest.",
  },
};
