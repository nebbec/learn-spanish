import type { LangConfig } from "./types";

/**
 * Spanish: the names the app has always used, so nothing stored on a phone that
 * already has the app is lost (docs/german.md, "Decided in DE1").
 */
export const es: LangConfig = {
  code: "es",
  tag: "es",
  language: "Spanish",
  appName: "Learn Spanish",
  shortName: "Spanish",
  description: "The 1,000 most common Spanish words, most common first.",
  storage: "learn-spanish",
  deckPath: "/deck/",
  contentDir: "content",
  publicDeckDir: "public/deck",
  mascot: {
    idle: { clip: "/mascot/idle.mp4", poster: "/mascot/idle.webp" },
    celebrate: { clip: "/mascot/celebrate.mp4", poster: "/mascot/celebrate.webp" },
    still: "/mascot/concha.webp",
  },
  icons: { version: "2", icon192: "/icon-192.png", icon512: "/icon-512.png", apple: "/apple-touch-icon.png" },
  regionalLabel: "Spain",
  // G1's choice, read by scripts/content/audio.mjs (DE5). Its fields are part of every clip's hash, in this order.
  voice: {
    model: "gpt-4o-mini-tts",
    voice: "coral",
    instructions:
      "Habla en español latinoamericano neutro, con acento mexicano. Pronuncia con claridad y a ritmo natural, como una profesora que lee una tarjeta de vocabulario.",
  },
};
