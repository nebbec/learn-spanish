// G1 voice test: the same 20 tricky words (and 4 example sentences) from each
// candidate text-to-speech provider, laid out on one page that plays them
// unlabelled for a blind listening test.
//
//   npm run voice-test                 generate missing clips, then write the page
//   npm run voice-test -- --voices azure|google|elevenlabs
//                                      list the Latin American female voices on offer
//
// A provider runs only when its key is in .env.local (see .env.example), so the
// test holds whichever providers have keys. Clips and the page go in
// content/.cache/voice-test (not committed). A clip already there is not made
// again; delete a provider's folder to redo it, for example after changing its voice.
// Prints counts only.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { OPENAI_INSTRUCTIONS } from "./content/audio.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "content", ".cache", "voice-test");

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
    async speak(text, voice) {
      return post(
        "https://api.openai.com/v1/audio/speech",
        JSON.stringify({ model: "gpt-4o-mini-tts", voice, input: text, instructions: OPENAI_INSTRUCTIONS, response_format: "mp3" }),
        { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      );
    },
  },
};

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

function ready(name) {
  return PROVIDERS[name].keys.every((k) => process.env[k]);
}

function clipPath(name, item) {
  return path.join(OUT, name, `${String(item.n).padStart(2, "0")}.mp3`);
}

async function generate(name) {
  const provider = PROVIDERS[name];
  const voice = provider.voice();
  mkdirSync(path.join(OUT, name), { recursive: true });
  writeFileSync(path.join(OUT, name, "voice.txt"), `${voice}\n`);
  let made = 0;
  let failed = 0;
  for (const item of ITEMS) {
    const file = clipPath(name, item);
    if (existsSync(file)) continue;
    try {
      writeFileSync(file, await provider.speak(item.text, voice));
      made++;
    } catch (err) {
      failed++;
      if (failed === 1) console.log(`  ${name} item ${item.n} failed: ${err.message}`);
    }
  }
  const have = ITEMS.filter((item) => existsSync(clipPath(name, item))).length;
  console.log(`${name} (${voice}): ${made} made, ${failed} failed, ${have} of ${ITEMS.length} on disk`);
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

function writePage() {
  const names = Object.keys(PROVIDERS).filter((name) =>
    ITEMS.every((item) => existsSync(clipPath(name, item))),
  );
  if (!names.length) {
    console.log("page not written: no provider has every clip");
    return;
  }
  const voices = Object.fromEntries(names.map((name) => [name, readFileSync(path.join(OUT, name, "voice.txt"), "utf8").trim()]));
  const items = ITEMS.map((item) => ({
    ...item,
    clips: shuffled(names, item.n * 7919).map((name) => ({
      who: name,
      src: `data:audio/mpeg;base64,${readFileSync(clipPath(name, item)).toString("base64")}`,
    })),
  }));
  const template = readFileSync(path.join(ROOT, "scripts", "voice-test.html"), "utf8");
  const page = template.replace("/*DATA*/null", JSON.stringify({ items, voices }));
  writeFileSync(path.join(OUT, "index.html"), page);
  console.log(`page: content/.cache/voice-test/index.html, ${names.length} providers, ${(page.length / 1e6).toFixed(1)} MB`);
}

const args = process.argv.slice(2);
const list = args.indexOf("--voices");
if (list >= 0) {
  const name = args[list + 1];
  const provider = PROVIDERS[name];
  if (!provider?.voices) throw new Error("--voices takes azure, google or elevenlabs");
  const missing = provider.keys.filter((k) => !process.env[k] && k !== "ELEVENLABS_VOICE_ID");
  if (missing.length) throw new Error(`missing ${missing.join(", ")} in .env.local`);
  for (const line of await provider.voices()) console.log(line);
} else {
  const names = Object.keys(PROVIDERS).filter(ready);
  const skipped = Object.keys(PROVIDERS).filter((name) => !ready(name));
  if (skipped.length) console.log(`skipped, no key: ${skipped.join(", ")}`);
  for (const name of names) await generate(name);
  writePage();
}
