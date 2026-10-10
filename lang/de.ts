import type { LangConfig } from "./types";

/**
 * German (docs/german.md). The mascot, the icons and the voice are placeholders:
 * the mascot and icons are the Spanish concha's until DE14 makes the German
 * lead's under /mascot-de/, and the voice is `coral` until Courtney picks one in
 * DE11's ear test (`npm run voice-test -- --lang de`).
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
  // Placeholder until DE14: the concha's files.
  mascot: {
    idle: { clip: "/mascot/idle.mp4", poster: "/mascot/idle.webp" },
    celebrate: { clip: "/mascot/celebrate.mp4", poster: "/mascot/celebrate.webp" },
    still: "/mascot/concha.webp",
  },
  // Placeholder until DE14: the concha's icons.
  icons: { version: "2", icon192: "/icon-192.png", icon512: "/icon-512.png", apple: "/apple-touch-icon.png" },
  // DE11: the model and instruction the ear test used. `voice` is a placeholder until Courtney picks one of
  // coral, marin, sage and cedar on the test page (docs/german.md, "Decided in DE11").
  voice: {
    model: "gpt-4o-mini-tts",
    voice: "coral",
    instructions:
      "Sprich klares Hochdeutsch, wie man es in Deutschland spricht. Sprich deutlich und in natürlichem Tempo, wie eine Lehrkraft, die eine Vokabelkarte vorliest.",
  },
};
