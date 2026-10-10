// G1 voice test: the same 20 tricky words (and 4 example sentences) from each
// candidate text-to-speech provider, laid out on one page that plays them
// unlabelled for a blind listening test. DE11 added German: the same page for a
// German set, with three or four OpenAI voices as the candidates.
//
//   npm run voice-test                 generate missing clips, then write the page
//   npm run voice-test -- --voices azure|google|elevenlabs
//                                      list the Latin American female voices on offer
//   npm run voice-test -- --lang de [--candidates coral,marin,sage,cedar]
//                                      German: OpenAI voices, each speaking with the model
//                                      and instruction of lang/de.ts, so only the voice differs
//
// A provider runs only when its key is in .env.local (see .env.example), so the
// test holds whichever providers have keys. Clips and the page go in
// content/.cache/voice-test (Spanish) or content/.cache/voice-test-de (German), not
// committed. A clip already there is not made again; delete a candidate's folder to
// redo it, for example after changing its voice or the instruction.
// Prints counts only.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { voiceOf } from "./content/audio.mjs";
import { parseLang } from "./content/script-lang.ts";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Where a language's clips and page go. Spanish keeps G1's folder. */
export function outDir(lang) {
  return path.join(ROOT, "content", ".cache", lang === "es" ? "voice-test" : `voice-test-${lang}`);
}

// Each word is written as the reveal shows it, so nouns carry their article.
// What each one tests is in the second column.
export const ITEMS = [
  ["el perro", "trilled rr"],
  ["pero", "tapped r, against perro"],
  ["la calle", "ll as y, not the Argentine sh"],
  ["la ciudad", "c as s, soft final d"],
  ["y", "the word, not the letter's name"],
  ["el jugo", "j; Latin American word (Spain: zumo)"],
  ["la guerra", "silent u after g, rr"],
  ["el pingüino", "ü is spoken"],
  ["el niño", "ñ"],
  ["México", "x as j"],
  ["el examen", "x as ks"],
  ["el agua", "el before a stressed a; soft g"],
  ["hablar", "silent h, soft b"],
  ["el árbol", "written stress"],
  ["está", "stress on the last syllable"],
  ["el país", "two syllables: pa-ís"],
  ["creer", "double e"],
  ["el huevo", "hue as we"],
  ["el reloj", "initial r trilled, final j soft"],
  ["trabajar", "soft b, j"],
  ["¿Dónde está la calle principal?", "question intonation"],
  ["Mi perro come mucho, pero no engorda.", "rr against r in one sentence"],
  ["Ayer trabajé hasta las ocho.", "past tense, natural pace"],
  ["Quiero un jugo de naranja, por favor.", "linking between words"],
].map(([text, tests], i) => ({ n: i + 1, text, tests }));

// German (docs/german.md, "Audio"): the ich- and ach-sounds, ü and ö, final
// devoicing, ei and ie, sp and st, long compounds, a separable verb, and der, die
// and das, as the reveal shows each word (nouns with their article).
export const ITEMS_DE = [
  ["ich", "ich-sound"],
  ["das Buch", "ach-sound after u"],
  ["acht", "ach-sound after a"],
  ["das Mädchen", "ä, and -chen with the ich-sound"],
  ["die Tür", "long ü"],
  ["fünf", "short ü"],
  ["schön", "long ö"],
  ["zwölf", "short ö, zw as ts-v"],
  ["der Tag", "final g devoiced to k"],
  ["der Hund", "final d devoiced to t"],
  ["die Zeit", "ei as in eye, z as ts"],
  ["vier", "ie as a long i, v as f"],
  ["spielen", "sp as shp"],
  ["die Straße", "st as sht, ß"],
  ["der Mann, die Frau, das Kind", "der, die and das kept apart"],
  ["zwanzig", "final -ig as -ich"],
  ["das Eichhörnchen", "ei, ch and ö together"],
  ["die Geburtstagsfeier", "long compound, stress on the first part"],
  ["anrufen", "separable verb, stress on an"],
  ["Entschuldigung", "sch, -ung, stress on schul"],
  ["Ich rufe dich morgen an.", "separable verb split in a sentence"],
  ["Sprechen Sie Englisch?", "question intonation, Sie"],
  ["Wir möchten zwei Brötchen und einen Kaffee, bitte.", "linking between words, ö"],
  ["Am Sonntag fahren wir mit dem Zug nach München.", "w as v, ü, ch, natural pace"],
].map(([text, tests], i) => ({ n: i + 1, text, tests }));

/** German's candidates when `--candidates` is left out: OpenAI voices, the placeholder first. */
export const GERMAN_CANDIDATES = ["coral", "marin", "sage", "cedar"];

/** One call to OpenAI's speech API, with a language's model and instruction from lang/. */
async function openaiSpeak(text, voice, { model, instructions }) {
  return post(
    "https://api.openai.com/v1/audio/speech",
    JSON.stringify({ model, voice, input: text, instructions, response_format: "mp3" }),
    { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
  );
}

const PROVIDERS = {
  azure: {
    keys: ["AZURE_SPEECH_KEY", "AZURE_SPEECH_REGION"],
    voice: () => process.env.AZURE_TTS_VOICE || "es-MX-DaliaNeural",
    async speak(text, voice) {
      const lang = voice.split("-").slice(0, 2).join("-");
      const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}"><voice name="${voice}">${escapeXml(text)}</voice></speak>`;
      return post(`https://${process.env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, ssml, {
        "Ocp-Apim-Subscription-Key": process.env.AZURE_SPEECH_KEY,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3",
        "User-Agent": "learn-spanish-voice-test",
      });
    },
    async voices() {
      const res = await fetch(`https://${process.env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/voices/list`, {
        headers: { "Ocp-Apim-Subscription-Key": process.env.AZURE_SPEECH_KEY },
      });
      const list = await json(res);
      return list
        .filter((v) => isLatinAmerican(v.Locale) && v.Gender === "Female")
        .map((v) => `${v.ShortName}  ${v.VoiceType ?? ""}`);
    },
  },
  google: {
    keys: ["GOOGLE_TTS_API_KEY"],
    voice: () => process.env.GOOGLE_TTS_VOICE || "es-US-Chirp3-HD-Kore",
    async speak(text, voice) {
      const res = await post(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_TTS_API_KEY}`,
        JSON.stringify({
          input: { text },
          voice: { languageCode: voice.split("-").slice(0, 2).join("-"), name: voice },
          audioConfig: { audioEncoding: "MP3" },
        }),
        { "Content-Type": "application/json" },
      );
      return Buffer.from(JSON.parse(res.toString()).audioContent, "base64");
    },
    async voices() {
      const res = await fetch(`https://texttospeech.googleapis.com/v1/voices?key=${process.env.GOOGLE_TTS_API_KEY}`);
      const { voices } = await json(res);
      return voices
        .filter((v) => v.languageCodes.some(isLatinAmerican) && v.ssmlGender === "FEMALE")
        .map((v) => v.name);
    },
  },
  elevenlabs: {
    keys: ["ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID"],
    voice: () => process.env.ELEVENLABS_VOICE_ID,
    async speak(text, voice) {
      return post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`,
        JSON.stringify({ text, model_id: process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2" }),
        { "xi-api-key": process.env.ELEVENLABS_API_KEY, "Content-Type": "application/json" },
      );
    },
    async voices() {
      const res = await fetch("https://api.elevenlabs.io/v1/shared-voices?page_size=100&language=es&gender=female", {
        headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY },
      });
      const { voices } = await json(res);
      return voices
        .filter((v) => !/spain|peninsular|castilian|argentin/i.test(`${v.accent} ${v.description}`))
        .map((v) => `${v.voice_id}  ${v.name} (${v.accent}, ${v.use_case})`);
    },
  },
  openai: {
    keys: ["OPENAI_API_KEY"],
    voice: () => process.env.OPENAI_TTS_VOICE || "coral",
    speak: (text, voice) => openaiSpeak(text, voice, voiceOf("es")),
  },
};

/**
 * The candidates of a test, by name: Spanish's are the providers above, German's one
 * OpenAI voice each, all with lang/de.ts's model and instruction.
 *
 * @param {string} lang
 * @param {string[]} [voices]
 * @returns {Record<string, { keys: string[], voice: () => string | undefined, label?: string, speak: (text: string, voice: string) => Promise<Buffer> }>}
 */
export function candidatesFor(lang, voices = GERMAN_CANDIDATES) {
  if (lang === "es") return PROVIDERS;
  return Object.fromEntries(
    voices.map((name) => [
      name,
      {
        keys: ["OPENAI_API_KEY"],
        voice: () => name,
        label: `${voiceOf(lang).model} ${name}`,
        speak: (text, voice) => openaiSpeak(text, voice, voiceOf(lang)),
      },
    ]),
  );
}

function isLatinAmerican(locale) {
  return locale.startsWith("es-") && locale !== "es-ES";
}

function escapeXml(text) {
  return text.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);
}

async function post(url, body, headers) {
  const res = await fetch(url, { method: "POST", body, headers });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}

async function json(res) {
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

function clipPath(out, name, item) {
  return path.join(out, name, `${String(item.n).padStart(2, "0")}.mp3`);
}

async function generate({ out, items, candidates }, name) {
  const provider = candidates[name];
  const voice = provider.voice();
  mkdirSync(path.join(out, name), { recursive: true });
  writeFileSync(path.join(out, name, "voice.txt"), `${provider.label ?? voice}\n`);
  let made = 0;
  let failed = 0;
  for (const item of items) {
    const file = clipPath(out, name, item);
    if (existsSync(file)) continue;
    try {
      writeFileSync(file, await provider.speak(item.text, voice));
      made++;
    } catch (err) {
      failed++;
      if (failed === 1) console.log(`  ${name} item ${item.n} failed: ${err.message}`);
    }
  }
  const have = items.filter((item) => existsSync(clipPath(out, name, item))).length;
  console.log(`${name} (${voice}): ${made} made, ${failed} failed, ${have} of ${items.length} on disk`);
}

// Letters are shuffled per item with a fixed seed, so a provider is not always A
// and rerunning the script gives the same page.
function shuffled(list, seed) {
  const out = [...list];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function writePage({ lang, out, items, candidates }) {
  const names = Object.keys(candidates).filter((name) =>
    items.every((item) => existsSync(clipPath(out, name, item))),
  );
  if (!names.length) {
    console.log("page not written: no candidate has every clip");
    return;
  }
  const voices = Object.fromEntries(names.map((name) => [name, readFileSync(path.join(out, name, "voice.txt"), "utf8").trim()]));
  const pageItems = items.map((item) => ({
    ...item,
    clips: shuffled(names, item.n * 7919).map((name) => ({
      who: name,
      src: `data:audio/mpeg;base64,${readFileSync(clipPath(out, name, item)).toString("base64")}`,
    })),
  }));
  const title = lang === "es" ? "Voice test" : `${LANG_NAMES[lang]} voice test`;
  const template = readFileSync(path.join(ROOT, "scripts", "voice-test.html"), "utf8");
  const page = template.replace("/*DATA*/null", JSON.stringify({ title, lang, items: pageItems, voices }));
  writeFileSync(path.join(out, "index.html"), page);
  console.log(`page: ${path.relative(ROOT, path.join(out, "index.html"))}, ${names.length} candidates, ${(page.length / 1e6).toFixed(1)} MB`);
}

const LANG_NAMES = { es: "Spanish", de: "German" };

async function main() {
  const args = process.argv.slice(2);
  const option = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const lang = parseLang(option("--lang"));
  const list = args.indexOf("--voices");
  if (list >= 0) {
    if (lang !== "es") throw new Error("--voices lists Spanish voices of other providers; German's candidates are OpenAI voices (--candidates)");
    const name = args[list + 1];
    const provider = PROVIDERS[name];
    if (!provider?.voices) throw new Error("--voices takes azure, google or elevenlabs");
    const missing = provider.keys.filter((k) => !process.env[k] && k !== "ELEVENLABS_VOICE_ID");
    if (missing.length) throw new Error(`missing ${missing.join(", ")} in .env.local`);
    for (const line of await provider.voices()) console.log(line);
    return;
  }
  const picked = option("--candidates")?.split(",").map((v) => v.trim()).filter(Boolean);
  if (picked && lang === "es") throw new Error("--candidates is for German (--lang de)");
  const test = {
    lang,
    out: outDir(lang),
    items: lang === "es" ? ITEMS : ITEMS_DE,
    candidates: candidatesFor(lang, picked ?? GERMAN_CANDIDATES),
  };
  const ready = (name) => test.candidates[name].keys.every((k) => process.env[k]);
  const names = Object.keys(test.candidates).filter(ready);
  const skipped = Object.keys(test.candidates).filter((name) => !ready(name));
  if (skipped.length) console.log(`skipped, no key: ${skipped.join(", ")}`);
  for (const name of names) await generate(test, name);
  writePage(test);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
