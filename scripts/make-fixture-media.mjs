// Writes placeholder art for every card in public/deck/deck.json: an SVG
// showing the English prompt. A card whose clips are still .wav also gets two
// short tones (word, sentence); `npm run audio` replaces them with real clips.
// Run with: node scripts/make-fixture-media.mjs
// Prints counts only. F2 replaces the SVGs with real stills.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const deck = JSON.parse(readFileSync(join(publicDir, "deck", "deck.json"), "utf8"));

const COLOURS = ["#ffd166", "#06d6a0", "#8ecae6", "#f4a261", "#cdb4db", "#ffafcc"];

function escapeXml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function placeholderSvg(card, index) {
  const fill = COLOURS[index % COLOURS.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="${escapeXml(card.en)}">
  <rect width="400" height="400" rx="48" fill="${fill}"/>
  <circle cx="200" cy="170" r="90" fill="#fff" opacity="0.85"/>
  <circle cx="170" cy="155" r="12" fill="#2b2d42"/>
  <circle cx="230" cy="155" r="12" fill="#2b2d42"/>
  <path d="M160 195 Q200 235 240 195" fill="none" stroke="#2b2d42" stroke-width="8" stroke-linecap="round"/>
  <text x="200" y="330" text-anchor="middle" font-family="sans-serif" font-size="40" font-weight="700" fill="#2b2d42">${escapeXml(card.en)}</text>
</svg>
`;
}

/** A mono 8-bit 8 kHz WAV: a sine tone with a short fade in and out. */
function toneWav(seconds, hz) {
  const rate = 8000;
  const count = Math.round(seconds * rate);
  const buffer = Buffer.alloc(44 + count);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + count, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate, 28); // bytes per second
  buffer.writeUInt16LE(1, 32); // block align
  buffer.writeUInt16LE(8, 34); // bits per sample
  buffer.write("data", 36);
  buffer.writeUInt32LE(count, 40);
  const fade = rate * 0.02;
  for (let i = 0; i < count; i++) {
    const envelope = Math.min(1, i / fade, (count - 1 - i) / fade);
    const sample = Math.sin((2 * Math.PI * hz * i) / rate) * 0.4 * envelope;
    buffer.writeUInt8(Math.round(128 + sample * 127), 44 + i);
  }
  return buffer;
}

function write(urlPath, contents) {
  const file = join(publicDir, urlPath);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, contents);
}

let images = 0;
let clips = 0;
deck.cards.forEach((card, index) => {
  if (card.image) {
    write(card.image, placeholderSvg(card, index));
    images++;
  }
  if (!card.audio.word.endsWith(".wav")) return;
  write(card.audio.word, toneWav(0.3, 660));
  write(card.audio.sentence, toneWav(0.9, 440));
  clips += 2;
});

console.log(`cards: ${deck.cards.length}, images: ${images}, audio clips: ${clips}`);
