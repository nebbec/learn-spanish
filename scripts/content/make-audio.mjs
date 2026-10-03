// G2: makes the word and sentence clips for every card in a deck file, with the
// voice chosen in G1, and points each card's `audio` at them. A phrase card's word
// clip speaks the whole phrase; each tip example gets a clip too, named
// <tip id>.<n> (L8), and the tip's examples are pointed at them.
//
//   npm run audio                       every card in public/deck/deck.json
//   npm run audio -- --deck FILE        another deck file
//   npm run audio -- --limit N          only the first N cards by rank, and no tips (a trial run)
//   npm run audio -- --check            also transcribe each clip back, flag mismatches and write
//                                       content/flagged-clips.html, the page for hearing them
//                                       (with any word clip over twice the median word's length)
//   npm run audio -- --redo ID.CLIP,... speak these clips again (e.g. lo-him.word, or tip-past.2 for a
//                                       tip's second example), as a new take
//   npm run audio -- --prune            delete clips in public/deck/audio that neither the app's
//                                       deck, content/deck.json nor the test fixture names
//
// A clip whose file exists is not made again, so a failed run resumes where it
// stopped. The speech API's raw answers are kept in content/.cache/audio (not
// committed), so a change to ENCODING re-encodes without calling the API again.
// A redone take is counted in content/audio-takes.json, which is committed, since
// the take is part of the clip's path. Needs OPENAI_API_KEY in .env.local. Prints counts and card ids only; flagged
// clips, with what the transcriber heard, go in content/.cache/audio/flagged.tsv, and
// they and every redone take are listed on content/flagged-clips.html (G3), which
// plays them from public/deck/audio for a person to hear.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ENCODING,
  VOICE,
  audioPaths,
  clipTexts,
  clipsToHear,
  finishClip,
  loudness,
  normalizeSpoken,
  orphanClips,
  pcmToFloat,
  rawKey,
  tipAudioPaths,
} from "./audio.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PUBLIC = path.join(ROOT, "public");
const CACHE = path.join(ROOT, "content", ".cache", "audio");
const TAKES = path.join(ROOT, "content", "audio-takes.json");
// The fixture (tests) keeps its clips too, though the app no longer serves it.
const DECKS = [path.join(PUBLIC, "deck", "deck.json"), path.join(ROOT, "content", "deck.json"), path.join(ROOT, "lib", "deck", "fixture.json")];
const PAGE = path.join(ROOT, "content", "flagged-clips.html");
const PAGE_TEMPLATE = path.join(ROOT, "scripts", "content", "flagged-clips.html");
const CLIPS = ["word", "sentence"];
const PARALLEL = 4;

const args = process.argv.slice(2);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const deckFile = path.resolve(ROOT, option("--deck") ?? "public/deck/deck.json");
const limit = Number(option("--limit") ?? Infinity);
const check = args.includes("--check");
const prune = args.includes("--prune");
const redo = option("--redo")?.split(",").filter(Boolean) ?? [];

async function api(url, init) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, {
      ...init,
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, ...init.headers },
    });
    if (res.ok) return res;
    const retry = res.status === 429 || res.status >= 500;
    if (!retry || attempt === 4) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
    await new Promise((r) => setTimeout(r, 2000 * attempt));
  }
}

/**
 * The API's raw 24 kHz 16-bit mono samples for a clip, from the cache when there.
 * The API sometimes answers a lone short word with silence; that answer is asked
 * for again, up to three times, and never cached.
 */
async function speak(job) {
  const file = path.join(CACHE, "raw", `${rawKey(job.text, takes[job.name] ?? 1)}.pcm`);
  if (existsSync(file)) return { pcm: readFileSync(file), calls: 0 };
  for (let calls = 1; calls <= 3; calls++) {
    const res = await api("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...VOICE, input: job.text, response_format: "pcm" }),
    });
    const pcm = Buffer.from(await res.arrayBuffer());
    if (Number.isFinite(loudness(pcmToFloat(pcm), ENCODING.sampleRate))) {
      writeFileSync(file, pcm);
      return { pcm, calls };
    }
  }
  throw new Error("the API answered with silence three times");
}

async function transcribe(mp3) {
  const form = new FormData();
  form.append("file", new Blob([mp3], { type: "audio/mpeg" }), "clip.mp3");
  form.append("model", "gpt-4o-transcribe");
  form.append("language", "es");
  const res = await api("https://api.openai.com/v1/audio/transcriptions", { method: "POST", body: form });
  return (await res.json()).text;
}

/** Runs `work` over `items`, `PARALLEL` at a time. */
async function each(items, work) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await work(items[next++]);
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
}

if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing from .env.local");
mkdirSync(path.join(CACHE, "raw"), { recursive: true });

let deckText = readFileSync(deckFile, "utf8");
const deck = JSON.parse(deckText);

const takes = existsSync(TAKES) ? JSON.parse(readFileSync(TAKES, "utf8")) : {};
const deckTips = deck.tips ?? [];
const clipNames = new Set([
  ...deck.cards.flatMap((card) => CLIPS.map((clip) => `${card.id}.${clip}`)),
  ...deckTips.flatMap((tip) => tip.examples.map((_, i) => `${tip.id}.${i + 1}`)),
]);
const unknown = redo.filter((name) => !clipNames.has(name));
if (unknown.length) {
  throw new Error(`--redo: no such clip ${unknown.join(", ")}; write it as card-id.word, card-id.sentence or tip-id.N`);
}
for (const name of redo) takes[name] = (takes[name] ?? 1) + 1;
if (redo.length) writeFileSync(TAKES, JSON.stringify(takes, null, 2) + "\n");
const cards = deck.cards
  .map((card, order) => ({ card, order }))
  .sort((a, b) => a.card.rank - b.card.rank || a.order - b.order)
  .slice(0, limit)
  .map(({ card }) => card);

// A trial run (--limit) leaves the tips out.
const tips = Number.isFinite(limit) ? [] : deckTips;

// One job per clip: `name` is what --redo and content/audio-takes.json call it, and
// `owner` the card or tip id the listening page shows.
const jobs = [
  ...cards.flatMap((card) => {
    const paths = audioPaths(card, takes);
    const texts = clipTexts(card);
    return CLIPS.map((clip) => ({
      name: `${card.id}.${clip}`,
      owner: card.id,
      clip,
      phrase: card.kind === "phrase",
      text: texts[clip],
      url: paths[clip],
      file: path.join(PUBLIC, paths[clip]),
    }));
  }),
  ...tips.flatMap((tip) =>
    tipAudioPaths(tip, takes).examples.map((example, i) => ({
      name: `${tip.id}.${i + 1}`,
      owner: tip.id,
      clip: "example",
      phrase: false,
      text: example.es,
      url: example.audio,
      file: path.join(PUBLIC, example.audio),
    })),
  ),
];

const counts = { made: 0, kept: 0, calls: 0, limited: 0, failed: 0 };
const failed = [];
await each(jobs, async (job) => {
  if (existsSync(job.file)) {
    counts.kept++;
    return;
  }
  try {
    const { pcm, calls } = await speak(job);
    counts.calls += calls;
    const out = finishClip(pcm);
    mkdirSync(path.dirname(job.file), { recursive: true });
    writeFileSync(job.file, out.mp3);
    counts.made++;
    if (out.limited) counts.limited++;
  } catch (err) {
    counts.failed++;
    failed.push(job.name);
    if (counts.failed === 1) console.log(`first failure, ${job.name}: ${err.message}`);
  }
});

// Point each card at its clips by replacing the old path strings, which keeps the
// deck file's layout. Only cards whose clips both exist, and tips whose example
// clips all exist, are changed.
let repointed = 0;
const repoint = (from, to) => {
  if (from === to) return;
  deckText = deckText.replace(JSON.stringify(from), JSON.stringify(to));
  repointed++;
};
for (const card of cards) {
  const paths = audioPaths(card, takes);
  if (!CLIPS.every((clip) => existsSync(path.join(PUBLIC, paths[clip])))) continue;
  for (const clip of CLIPS) {
    repoint(card.audio[clip], paths[clip]);
    card.audio[clip] = paths[clip];
  }
}
for (const tip of tips) {
  const examples = tipAudioPaths(tip, takes).examples;
  if (!examples.every((example) => existsSync(path.join(PUBLIC, example.audio)))) continue;
  examples.forEach((example, i) => {
    repoint(tip.examples[i].audio, example.audio);
    tip.examples[i].audio = example.audio;
  });
}
if (repointed) writeFileSync(deckFile, deckText);

console.log(
  `cards ${cards.length}, tips ${tips.length}, clips: ${counts.made} made (${counts.calls} API calls), ${counts.kept} already there, ` +
    `${counts.failed} failed, ${counts.limited} short of ${ENCODING.lufs} LUFS by the peak ceiling; ` +
    `${repointed} deck paths updated`,
);
if (failed.length) console.log(`failed: ${failed.join(" ")}`);

const sizes = Object.fromEntries(
  [...CLIPS, "example"].map((clip) => [clip, jobs.filter((j) => j.clip === clip && existsSync(j.file)).map((j) => statSync(j.file).size)]),
);
const kb = (n) => (n / 1024).toFixed(1);
const avg = (list) => list.reduce((a, b) => a + b, 0) / (list.length || 1);
const total = [...sizes.word, ...sizes.sentence].reduce((a, b) => a + b, 0);
console.log(
  `size: ${kb(total)} KB in ${sizes.word.length + sizes.sentence.length} card clips; ` +
    `average word ${kb(avg(sizes.word))} KB, sentence ${kb(avg(sizes.sentence))} KB; ` +
    `at that rate 1,000 cards would be ${((1000 * (avg(sizes.word) + avg(sizes.sentence))) / 1024 / 1024).toFixed(1)} MB`,
);
if (sizes.example.length) {
  const tipTotal = sizes.example.reduce((a, b) => a + b, 0);
  console.log(`tip examples: ${kb(tipTotal)} KB in ${sizes.example.length} clips`);
}

if (check) {
  // What the transcriber heard is kept per clip path, so a rerun only checks new clips.
  const heardFile = path.join(CACHE, "heard.json");
  const heard = existsSync(heardFile) ? JSON.parse(readFileSync(heardFile, "utf8")) : {};
  const present = jobs.filter((j) => existsSync(j.file));
  await each(present, async (job) => {
    if (job.url in heard) return;
    try {
      heard[job.url] = await transcribe(readFileSync(job.file));
    } catch (err) {
      console.log(`transcribing ${job.name} failed: ${err.message}`);
    }
  });
  writeFileSync(heardFile, JSON.stringify(heard, null, 1));
  const flagged = present.filter((j) => j.url in heard && normalizeSpoken(heard[j.url]) !== normalizeSpoken(j.text));
  const rows = flagged.map((j) => [j.name, j.text, heard[j.url]].join("\t"));
  writeFileSync(path.join(CACHE, "flagged.tsv"), ["clip\texpected\theard", ...rows].join("\n") + "\n");
  console.log(`check: ${present.length} clips, ${flagged.length} flagged (content/.cache/audio/flagged.tsv)`);
  if (flagged.length) console.log(`flagged: ${flagged.map((j) => j.name).join(" ")}`);

  // The page a person hears them on: the flagged clips and every redone take, played
  // from public/deck/audio by a path relative to the page.
  // A clip's length from its size, as the MP3 is constant bitrate.
  const seconds = (file) => (statSync(file).size * 8) / (ENCODING.kbps * 1000);
  const clips = present.map((j) => ({
    name: j.name,
    card: j.owner,
    clip: j.clip,
    phrase: j.phrase,
    url: j.url,
    text: j.text,
    seconds: seconds(j.file),
  }));
  const toHear = clipsToHear(clips, heard, takes).map(({ url, ...clip }) => ({ ...clip, src: `../public${url}` }));
  const data = { deck: path.relative(ROOT, deckFile), clips: toHear };
  const page = readFileSync(PAGE_TEMPLATE, "utf8").replace("/*DATA*/null", () => JSON.stringify(data).replace(/</g, "\\u003c"));
  writeFileSync(PAGE, page);
  const long = toHear.filter((c) => c.long && !c.flagged);
  const redone = toHear.filter((c) => c.take > 1).length;
  console.log(
    `page: content/flagged-clips.html, ${toHear.length} clips to hear ` +
      `(${long.length} more for a long word clip${long.length ? `: ${long.map((c) => c.name).join(" ")}` : ""}; ${redone} redone takes)`,
  );
}

// Clips neither deck names: a redone take's old clip, a corrected card's old clips,
// or the fixture's tones. Both decks keep their clips in public/deck/audio.
const decks = [deck, ...DECKS.filter((file) => file !== deckFile && existsSync(file)).map((file) => JSON.parse(readFileSync(file, "utf8")))];
const audioDir = path.join(PUBLIC, "deck", "audio");
const orphans = existsSync(audioDir) ? orphanClips(readdirSync(audioDir), decks) : [];
if (prune) for (const name of orphans) rmSync(path.join(audioDir, name));
if (orphans.length) console.log(`${orphans.length} clips no deck names ${prune ? "deleted" : "left (--prune deletes them)"}`);

if (counts.failed) process.exitCode = 1;
