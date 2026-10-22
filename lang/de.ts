import type { LangConfig } from "./types";

/**
 * German (docs/german.md). The mascot and the icons are placeholders:
 * the mascot and icons are the Spanish concha's until DE14 makes the German
 * lead's under /mascot-de/. The voice is `sage`, Courtney's pick in DE11's ear test.
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
  // Placeholder until DE14: the concha's files.
  mascot: {
    idle: { webm: "/mascot/idle.webm", hevc: "/mascot/idle.mov", poster: "/mascot/idle.webp" },
    celebrate: { webm: "/mascot/celebrate.webm", hevc: "/mascot/celebrate.mov", poster: "/mascot/celebrate.webp" },
    still: "/mascot/concha.webp",
  },
  // Placeholder until DE14: the concha's icons.
  icons: { version: "2", icon192: "/icon-192.png", icon512: "/icon-512.png", apple: "/apple-touch-icon.png" },
  // DE11: Courtney's pick by ear, sage, with the model and instruction the ear test used (docs/german.md, "Decided in DE11").
  voice: {
    model: "gpt-4o-mini-tts",
    voice: "sage",
    instructions:
      "Sprich klares Hochdeutsch, wie man es in Deutschland spricht. Sprich deutlich und in natürlichem Tempo, wie eine Lehrkraft, die eine Vokabelkarte vorliest.",
  },
};
