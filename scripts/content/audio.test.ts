import { describe, expect, it } from "vitest";
import { fixtureCard } from "@/lib/deck/fixture";
import {
  ENCODING,
  audioPaths,
  clipTexts,
  clipsToHear,
  finishClip,
  loudness,
  normalizeSpoken,
  orphanClips,
  peakDb,
  pcmToFloat,
  trimSilence,
} from "./audio.mjs";

const RATE = ENCODING.sampleRate;

function tone(seconds: number, amplitude: number, hz = 1000, rate = RATE) {
  return Float32Array.from({ length: Math.round(seconds * rate) }, (_, i) => amplitude * Math.sin((2 * Math.PI * hz * i) / rate));
}

function silence(seconds: number) {
  return new Float32Array(Math.round(seconds * RATE));
}

function join(...parts: Float32Array[]) {
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

function pcm(samples: Float32Array) {
  const buffer = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2));
  return buffer;
}

describe("loudness", () => {
  it("measures a full-scale 1 kHz sine at -3.01 LUFS, at the API's rate and at 48 kHz", () => {
    expect(loudness(tone(2, 1), RATE)).toBeCloseTo(-3.01, 1);
    expect(loudness(tone(2, 1, 1000, 48000), 48000)).toBeCloseTo(-3.01, 1);
  });

  it("falls by 20 LU when the amplitude falls by 20 dB", () => {
    expect(loudness(tone(2, 0.1), RATE)).toBeCloseTo(-23.01, 1);
  });

  it("leaves out silence, so a longer pause does not make a clip quieter", () => {
    const short = loudness(join(silence(0.5), tone(1, 0.5), silence(0.5)), RATE);
    expect(loudness(join(silence(3), tone(1, 0.5), silence(3)), RATE)).toBeCloseTo(short, 2);
  });

  it("measures a clip shorter than one block, and calls silence -Infinity", () => {
    expect(loudness(tone(0.2, 1), RATE)).toBeCloseTo(-3.01, 0);
    expect(loudness(silence(1), RATE)).toBe(-Infinity);
  });
});

describe("trimSilence", () => {
  it("cuts the quiet at both ends, keeping the padding, and fades the ends", () => {
    const out = trimSilence(join(silence(1), tone(0.5, 0.5), silence(1)), RATE);
    const kept = 0.5 + (2 * ENCODING.padMs) / 1000;
    expect(out.length / RATE).toBeGreaterThan(kept - 0.02);
    expect(out.length / RATE).toBeLessThan(kept + 0.02);
    expect(out[0]).toBe(0);
  });

  it("keeps a quiet sound that sits between louder ones", () => {
    const clip = join(silence(0.5), tone(0.3, 0.5), tone(0.3, 0.05), tone(0.3, 0.5), silence(0.5));
    expect(trimSilence(clip, RATE).length / RATE).toBeGreaterThan(0.9);
  });
});

describe("finishClip", () => {
  it("brings quiet and loud speech to the same loudness", () => {
    for (const amplitude of [0.02, 0.3]) {
      const out = finishClip(pcm(join(silence(0.5), tone(1, amplitude, 300), silence(0.5))));
      expect(out.limited).toBe(false);
      expect(out.lufs + out.gainDb).toBeCloseTo(ENCODING.lufs, 1);
    }
  });

  it("stops short of the target when the peak would pass the ceiling", () => {
    // Quiet speech with one loud burst: reaching the target would clip the burst.
    // The quiet part is loud enough not to be trimmed as silence.
    const clip = join(tone(1, 0.03, 300), tone(0.02, 0.9, 300), tone(1, 0.03, 300));
    const out = finishClip(pcm(clip));
    expect(out.limited).toBe(true);
    expect(peakDb(pcmToFloat(pcm(clip))) + out.gainDb).toBeCloseTo(ENCODING.peakDb, 1);
  });

  it("encodes a constant bitrate MP3 of the expected size", () => {
    const out = finishClip(pcm(tone(2, 0.3, 300)));
    expect(out.mp3[0]).toBe(0xff);
    expect(out.mp3[1] & 0xe0).toBe(0xe0);
    expect(out.mp3.length).toBeGreaterThan((ENCODING.kbps * 1000 * out.seconds) / 8 - 500);
    expect(out.mp3.length).toBeLessThan((ENCODING.kbps * 1000 * out.seconds) / 8 + 1000);
  });

  it("refuses a silent clip", () => {
    expect(() => finishClip(pcm(silence(1)))).toThrow("silent");
  });
});

describe("audioPaths", () => {
  const casa = fixtureCard("casa-house");

  it("speaks the Spanish as the reveal shows it, and the example sentence", () => {
    expect(clipTexts(casa)).toEqual({ word: casa.es, sentence: casa.example.es });
  });

  it("gives each clip its own MP3 path named after the card, the same on every run", () => {
    const paths = audioPaths(casa);
    expect(paths.word).toMatch(/^\/deck\/audio\/casa-house\.word\.[0-9a-f]{8}\.mp3$/);
    expect(paths.sentence).toMatch(/^\/deck\/audio\/casa-house\.sentence\.[0-9a-f]{8}\.mp3$/);
    expect(audioPaths({ ...casa })).toEqual(paths);
  });

  it("gives a corrected sentence a new path and leaves the word's alone", () => {
    const fixed = audioPaths({ ...casa, example: { ...casa.example, es: "Mi casa es tu casa." } });
    expect(fixed.word).toBe(audioPaths(casa).word);
    expect(fixed.sentence).not.toBe(audioPaths(casa).sentence);
  });
});

describe("normalizeSpoken", () => {
  it("ignores case, accents and punctuation, as a transcript differs in those", () => {
    expect(normalizeSpoken("¿Dónde está la calle?")).toBe("donde esta la calle");
    expect(normalizeSpoken("El pingüino.")).toBe(normalizeSpoken("el pinguino"));
  });
});

describe("orphanClips", () => {
  const card = (id: string, word: string, sentence: string) => ({ id, audio: { word, sentence } });
  const app = { cards: [card("casa-house", "/deck/audio/casa-house.word.aaaa.mp3", "/deck/audio/casa-house.sentence.bbbb.mp3")] };
  const content = { cards: [card("ir-go", "/deck/audio/ir-go.word.cccc.mp3", "/deck/audio/ir-go.sentence.dddd.mp3")] };

  it("keeps every clip that either deck names and returns the rest", () => {
    const files = [
      "casa-house.word.aaaa.mp3",
      "casa-house.sentence.bbbb.mp3",
      "ir-go.word.cccc.mp3",
      "ir-go.word.0ld0.mp3",
      "ir-go.sentence.dddd.mp3",
      "casa-house.word.wav",
    ];
    expect(orphanClips(files, [app, content])).toEqual(["ir-go.word.0ld0.mp3", "casa-house.word.wav"]);
  });

  it("would delete the other deck's clips if given one deck, which is why --prune passes both", () => {
    expect(orphanClips(["ir-go.word.cccc.mp3"], [app])).toEqual(["ir-go.word.cccc.mp3"]);
  });
});

describe("clipsToHear", () => {
  const clips = [
    { name: "ir-go.word", clip: "word", url: "/deck/audio/ir-go.word.1.mp3", text: "ir", seconds: 0.5 },
    { name: "ir-go.sentence", clip: "sentence", url: "/deck/audio/ir-go.sentence.1.mp3", text: "Voy a la tienda.", seconds: 2.4 },
    { name: "y-and.word", clip: "word", url: "/deck/audio/y-and.word.2.mp3", text: "y", seconds: 0.6 },
    { name: "mirar-look.word", clip: "word", url: "/deck/audio/mirar-look.word.1.mp3", text: "mirar", seconds: 2.0 },
    { name: "casa-house.word", clip: "word", url: "/deck/audio/casa-house.word.1.mp3", text: "la casa", seconds: 0.8 },
  ];
  const heard = {
    "/deck/audio/ir-go.word.1.mp3": "Ich",
    "/deck/audio/ir-go.sentence.1.mp3": "¡Voy a la tienda!",
    "/deck/audio/y-and.word.2.mp3": "Y.",
    "/deck/audio/mirar-look.word.1.mp3": "Mirar.",
    "/deck/audio/casa-house.word.1.mp3": "La casa.",
  };

  it("lists a flagged clip, a word clip over twice the median word's length and a redone take, in deck order", () => {
    const list = clipsToHear(clips, heard, { "y-and.word": 2 });
    expect(list.map((c: { name: string; flagged: boolean; long: boolean; take: number }) => [c.name, c.flagged, c.long, c.take])).toEqual([
      ["ir-go.word", true, false, 1],
      ["y-and.word", false, false, 2],
      ["mirar-look.word", false, true, 1],
    ]);
    expect(list[0].heard).toBe("Ich");
    expect(list[2].median).toBe(0.8);
  });

  it("leaves out a clip that was never transcribed", () => {
    expect(clipsToHear(clips, {}, { "y-and.word": 2 })).toEqual([]);
  });
});
