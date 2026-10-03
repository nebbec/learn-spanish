// G2: the pure parts of making a card's two clips. Which text each clip speaks,
// the path it is stored under, and turning the speech API's raw samples into a
// small MP3 at an even loudness. The network and the files are in make-audio.mjs.

import { createHash } from "node:crypto";
import { Mp3Encoder } from "@breezystack/lamejs";

export const OPENAI_INSTRUCTIONS =
  "Habla en español latinoamericano neutro, con acento mexicano. Pronuncia con claridad y a ritmo natural, como una profesora que lee una tarjeta de vocabulario.";

/** The voice chosen in G1. Changing any field gives every clip a new path. */
export const VOICE = { model: "gpt-4o-mini-tts", voice: "coral", instructions: OPENAI_INSTRUCTIONS };

/**
 * How a clip is finished. The API gives 24 kHz 16-bit mono samples; they are
 * trimmed, brought to `lufs` (but never past `peakDb`), and encoded as constant
 * bitrate MP3. Changing any field gives every clip a new path.
 */
export const ENCODING = {
  sampleRate: 24000,
  kbps: 48,
  lufs: -18,
  peakDb: -1.5,
  silenceDb: -35,
  padMs: 80,
  fadeMs: 5,
};

/** The text each clip speaks: the Spanish as the reveal shows it, and the example sentence. */
export function clipTexts(card) {
  return { word: card.es, sentence: card.example.es };
}

function hash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

/**
 * The take of a clip: 1 unless `takes` (content/audio-takes.json, written by
 * `--redo`) says a person asked for it to be spoken again.
 */
function take(takes, card, clip) {
  return takes[`${card.id}.${clip}`] ?? 1;
}

/** The name of the API's raw answer for a clip in the download cache. */
export function rawKey(card, clip, takes = {}) {
  const t = take(takes, card, clip);
  return hash({ text: clipTexts(card)[clip], ...VOICE, ...(t > 1 && { take: t }) }).slice(0, 16);
}

/**
 * The card's `audio` field. A path carries a hash of what made the clip, so a
 * corrected sentence, a new voice or a redone take gets a new path: the app never
 * refreshes a stored file (design.md, Installable app), so a changed clip must
 * not reuse one.
 */
export function audioPaths(card, takes = {}) {
  const texts = clipTexts(card);
  const path = (clip) => {
    const t = take(takes, card, clip);
    const made = { text: texts[clip], ...VOICE, ...ENCODING, ...(t > 1 && { take: t }) };
    return `/deck/audio/${card.id}.${clip}.${hash(made).slice(0, 8)}.mp3`;
  };
  return { word: path("word"), sentence: path("sentence") };
}

/** 16-bit little-endian samples to floats from -1 to 1. */
export function pcmToFloat(buffer) {
  const count = Math.floor(buffer.length / 2);
  const out = new Float32Array(count);
  for (let i = 0; i < count; i++) out[i] = buffer.readInt16LE(i * 2) / 32768;
  return out;
}

function biquad(samples, b0, b1, b2, a0, a1, a2) {
  const out = new Float32Array(samples.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i];
    const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    out[i] = y;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
  }
  return out;
}

/** The ITU-R BS.1770 K-weighting filter, worked out for any sample rate as pyloudnorm does. */
function kWeight(samples, rate) {
  const shelfW = (2 * Math.PI * 1500) / rate;
  const A = 10 ** (4 / 40);
  const shelfAlpha = Math.sin(shelfW) / (2 * Math.SQRT1_2);
  const cs = Math.cos(shelfW);
  const sq = 2 * Math.sqrt(A) * shelfAlpha;
  const shelved = biquad(
    samples,
    A * (A + 1 + (A - 1) * cs + sq),
    -2 * A * (A - 1 + (A + 1) * cs),
    A * (A + 1 + (A - 1) * cs - sq),
    A + 1 - (A - 1) * cs + sq,
    2 * (A - 1 - (A + 1) * cs),
    A + 1 - (A - 1) * cs - sq,
  );
  const passW = (2 * Math.PI * 38) / rate;
  const passAlpha = Math.sin(passW) / (2 * 0.5);
  const cp = Math.cos(passW);
  return biquad(shelved, (1 + cp) / 2, -(1 + cp), (1 + cp) / 2, 1 + passAlpha, -2 * cp, 1 - passAlpha);
}

/**
 * Integrated loudness in LUFS (ITU-R BS.1770-4): K-weighted, in 400 ms blocks
 * overlapping by 75%, gated at -70 LUFS and then 10 LU under the ungated mean.
 * A clip shorter than one block is measured as one block. -Infinity when silent.
 */
export function loudness(samples, rate) {
  const weighted = kWeight(samples, rate);
  const size = Math.min(weighted.length, Math.round(rate * 0.4));
  const step = Math.max(1, Math.round(rate * 0.1));
  const blocks = [];
  for (let start = 0; start + size <= weighted.length && size > 0; start += step) {
    let sum = 0;
    for (let i = start; i < start + size; i++) sum += weighted[i] * weighted[i];
    blocks.push(sum / size);
  }
  const lufs = (power) => -0.691 + 10 * Math.log10(power);
  const mean = (list) => list.reduce((a, b) => a + b, 0) / list.length;
  const loud = blocks.filter((p) => lufs(p) > -70);
  if (!loud.length) return -Infinity;
  const relative = lufs(mean(loud)) - 10;
  const kept = loud.filter((p) => lufs(p) > relative);
  return lufs(mean(kept));
}

/** The largest sample, in dB below full scale. */
export function peakDb(samples) {
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  return 20 * Math.log10(peak);
}

/**
 * Cuts the quiet before the first sound and after the last, keeping `padMs` on
 * each side and fading the ends so a cut never clicks. Quiet is a 10 ms window
 * more than `silenceDb` under the clip's loudest window.
 */
export function trimSilence(samples, rate, { silenceDb, padMs, fadeMs } = ENCODING) {
  const win = Math.max(1, Math.round(rate * 0.01));
  const levels = [];
  for (let start = 0; start < samples.length; start += win) {
    let sum = 0;
    const end = Math.min(samples.length, start + win);
    for (let i = start; i < end; i++) sum += samples[i] * samples[i];
    levels.push(10 * Math.log10(sum / (end - start) || 1e-12));
  }
  const loudest = Math.max(...levels);
  const first = levels.findIndex((l) => l > loudest + silenceDb);
  const last = levels.findLastIndex((l) => l > loudest + silenceDb);
  const pad = Math.round((rate * padMs) / 1000);
  const out = samples.slice(Math.max(0, first * win - pad), Math.min(samples.length, (last + 1) * win + pad));
  const fade = Math.min(Math.round((rate * fadeMs) / 1000), Math.floor(out.length / 2));
  for (let i = 0; i < fade; i++) {
    out[i] *= i / fade;
    out[out.length - 1 - i] *= i / fade;
  }
  return out;
}

/** Floats to a constant bitrate mono MP3. */
export function encodeMp3(samples, rate, kbps) {
  const ints = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) ints[i] = Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767);
  const encoder = new Mp3Encoder(1, rate, kbps);
  const parts = [];
  for (let i = 0; i < ints.length; i += 1152) parts.push(encoder.encodeBuffer(ints.subarray(i, i + 1152)));
  parts.push(encoder.flush());
  return Buffer.concat(parts.map((p) => Buffer.from(p.buffer, p.byteOffset, p.length)));
}

/**
 * The API's raw 16-bit samples to a finished MP3. Returns the file and what was
 * done: its length, the loudness before, the gain applied, and `limited` when the
 * peak ceiling kept the clip quieter than the target. Throws on a silent clip.
 */
export function finishClip(pcm, encoding = ENCODING) {
  const { sampleRate: rate } = encoding;
  const trimmed = trimSilence(pcmToFloat(pcm), rate, encoding);
  const before = loudness(trimmed, rate);
  if (!Number.isFinite(before)) throw new Error("silent clip");
  const wanted = encoding.lufs - before;
  const gainDb = Math.min(wanted, encoding.peakDb - peakDb(trimmed));
  const gain = 10 ** (gainDb / 20);
  const leveled = trimmed.map((s) => s * gain);
  return {
    mp3: encodeMp3(leveled, rate, encoding.kbps),
    seconds: trimmed.length / rate,
    lufs: before,
    gainDb,
    limited: gainDb < wanted - 0.05,
  };
}

/** Lower case, no accents or punctuation: for comparing a transcript with a clip's text. */
export function normalizeSpoken(text) {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * The files in public/deck/audio that no deck names: a redone take's old clip, a
 * corrected card's old clips, or the fixture's tones. A deck names its cards' clips and
 * its tips' example clips. `--prune` passes both the app's deck and content/deck.json,
 * so pruning after one never deletes the other's.
 */
export function orphanClips(files, decks) {
  const named = new Set(
    decks.flatMap((deck) => [
      ...deck.cards.flatMap((card) => Object.values(card.audio)),
      ...(deck.tips ?? []).flatMap((tip) => tip.examples.map((example) => example.audio)),
    ]),
  );
  return files.filter((name) => !named.has(`/deck/audio/${name}`));
}

/**
 * The clips a person should hear (G3): every clip the transcriber flagged; every
 * word clip more than twice as long as the median word clip (`long`), as a pause
 * or an extra sound there passes the transcriber; and every clip said again with
 * `--redo`, since a new take the checks pass has still not been heard. `clips`
 * are `{ name, clip, url, text, seconds }` in deck order, `clip` being "word" or
 * "sentence"; `heard` maps a clip's url to its transcript.
 */
export function clipsToHear(clips, heard, takes) {
  const words = clips.filter((c) => c.clip === "word").map((c) => c.seconds).sort((a, b) => a - b);
  const median = words.length ? words[Math.floor(words.length / 2)] : Infinity;
  return clips.flatMap((clip) => {
    if (!(clip.url in heard)) return [];
    const flagged = normalizeSpoken(heard[clip.url]) !== normalizeSpoken(clip.text);
    const long = clip.clip === "word" && clip.seconds > 2 * median;
    const take = takes[clip.name] ?? 1;
    return flagged || long || take > 1 ? [{ ...clip, heard: heard[clip.url], flagged, long, median, take }] : [];
  });
}
