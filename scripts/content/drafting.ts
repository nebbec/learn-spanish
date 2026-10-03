// The draft pass: Claude splits each word of content/word-list.tsv into
// meanings and writes one card per meaning. Each card is checked by the output
// guard and the deck validator, then written to its own file; a word counts as
// drafted once its word file exists, so a rerun picks up where a failure left
// off. Nothing here prints card text or Claude's text: only ranks, words from
// the list, card ids, counts and error kinds.
//
// The rules are in docs/design.md under "Content pipeline", "Decided in E2".

import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ARTICLES, CARD_KINDS, PARTS_OF_SPEECH, type Card } from "@/lib/deck/types";
import { validateCard, validateDeck } from "@/lib/deck/validate";
import type { CallUsage, Effort, Runner } from "./claude";

export interface WordEntry {
  rank: number;
  word: string;
  /** The forms the word was counted from, most frequent first. */
  forms: string[];
}

/** Reads content/word-list.tsv: comment lines start with `#`, then a header row. */
export function parseWordList(text: string): WordEntry[] {
  const [header, ...rows] = text.split("\n").filter((line) => line.trim() && !line.startsWith("#"));
  const cols = header.split("\t");
  const col = (fields: string[], name: string) => fields[cols.indexOf(name)] ?? "";
  return rows.map((row) => {
    const fields = row.split("\t");
    return {
      rank: Number(col(fields, "rank")),
      word: col(fields, "word"),
      forms: col(fields, "forms").split(" ").filter(Boolean),
    };
  });
}

/** Lower-case ASCII: accents dropped, anything else between words becomes a hyphen. */
export function slug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const SKIP_REASONS = [
  "interjection",
  "vulgar",
  "spain-only",
  "name-or-foreign",
  "covered-elsewhere",
  "other",
] as const;
export type SkipReason = (typeof SKIP_REASONS)[number];
export interface Skip {
  reason: SkipReason;
  note: string;
}

const MAX_CARDS = 4;

// Started from the system prompt of wedding-admin-app's lib/translateText.ts
// (Latin American Spanish, informal tú, never vosotros, single-line output).
export const SYSTEM_PROMPT = `You write flashcards for an app that teaches the 1,000 most common Spanish words to English speakers, most common first. The Spanish is neutral Latin American Spanish: natural, everyday and informal (tú, never vosotros; usted only as a word in its own right).

You are given one word from a frequency list made from film and TV subtitles: its rank, the word in dictionary form, and the forms it was counted from, most frequent first. Split the word into the meanings a beginner needs and write one card per meaning.

Meanings
- Usually one card; at most three. Make a second card only when English needs a different word for the meaning (tiempo is "time" and "weather"). Do not split shades of one meaning.
- The forms show what the word was counted from. A form shared with another word (fue is both ser and ir) is not a reason for a card.
- Always the dictionary form: the infinitive, the masculine singular, the singular noun.

Content and glue cards
- kind "content": a word a picture of a character could show, which is most nouns, verbs, adjectives and adverbs. Its prompt, en, is plain English: "to go", "house", "good", "now". Verbs start with "to". No square brackets.
- kind "glue": a function word (article, preposition, conjunction, pronoun, determiner, a particle such as se or lo). Its prompt is a short English phrase with the target marked by exactly one pair of square brackets: "the house [of] Maria", "I see [him]". When English has no word for it, bracket the nearest English, and use the hint to say what to recall.
- Every prompt must have exactly one right Spanish answer. If another common Spanish word, or another card of this word, would also answer the bare English, add a short hint that rules it out: en "to be", hint "identity, origin" (ser) and hint "state, place" (estar). Otherwise hint is null.

Fields
- id: the word without accents, a hyphen, then one to three English words naming the meaning, lower-case ASCII joined by hyphens: "estar-be-state", "tiempo-weather", "de-of".
- pos: noun, verb, adjective, adverb, pronoun, preposition, conjunction, determiner, or other (interjections, numbers used alone, anything else).
- es: the answer as shown. A noun starts with its definite article: "la casa", "el problema", "el agua". Other words are bare: "ir", "bueno", "de".
- grammar: fill what the part of speech uses and set the rest to null. Noun: gender ("m" or "f") and article (el, la, los or las: the one es starts with). Adjective: feminine, the feminine singular ("buena"; the same as es for a one-form adjective such as "grande"). Verb: present, the present-tense yo, tú and él forms without the pronoun ("voy", "vas", "va"), and irregular: true when the verb is irregular in the present or the preterite, stem changes included (poder, tener, ir), false for a fully regular verb. Every other part of speech: all null.
- example: one short, natural sentence a Latin American speaker would say, under ten words, using the word in this card's meaning, and its natural English translation. For a verb, use a conjugated form, not the infinitive.
- spain: the word Spain uses instead for this meaning when it differs noticeably ("coche" for carro), else null. Not for vosotros forms.
- trick: one English sentence, under 25 words, linking the sound of the Spanish word to its meaning, e.g. IR sounds like "ear": you go wherever your ear hears music.

Words with no card
Set skip and return an empty cards list when the word should not be a card for this learner: an interjection or filler that is the same in English (oh, eh, ah), swearing, a Spain-only word with a Latin American equivalent, a name or a word that is not Spanish, or a form that belongs to another word on the list. Otherwise skip is null.

Every text field is one line of plain text, with no Markdown and no surrounding quotes.`;

export function userPrompt(entry: WordEntry): string {
  return `Rank ${entry.rank}: ${entry.word}\nCounted from: ${entry.forms.join(", ") || entry.word}`;
}

const text = { type: "string" };
const nullable = (schema: Record<string, unknown>) => ({ anyOf: [schema, { type: "null" }] });
const object = (properties: Record<string, unknown>) => ({
  type: "object",
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});

/** What Claude returns for one word. `grammar` is flat; the guard keeps the fields `pos` uses. */
export const DRAFT_SCHEMA: Record<string, unknown> = object({
  skip: nullable(object({ reason: { type: "string", enum: [...SKIP_REASONS] }, note: text })),
  cards: {
    type: "array",
    items: object({
      id: text,
      kind: { type: "string", enum: [...CARD_KINDS] },
      pos: { type: "string", enum: [...PARTS_OF_SPEECH] },
      es: text,
      en: text,
      hint: nullable(text),
      grammar: object({
        gender: nullable({ type: "string", enum: ["m", "f"] }),
        article: nullable({ type: "string", enum: [...ARTICLES] }),
        feminine: nullable(text),
        present: nullable(object({ yo: text, tu: text, el: text })),
        irregular: nullable({ type: "boolean" }),
      }),
      example: object({ es: text, en: text }),
      spain: nullable(text),
      trick: text,
    }),
  },
});

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);

// Surrounding-quote pairs, as in normalizeTranslation.
const QUOTE_PAIRS: Array<[string, string]> = [
  ['"', '"'],
  ["'", "'"],
  ["“", "”"],
  ["‘", "’"],
  ["«", "»"],
];

/** Collects the names of the fields that fail, never their contents. */
class Guard {
  fields = new Set<string>();

  fail(field: string) {
    this.fields.add(field);
  }

  /** normalizeTranslation for one field: trimmed, no heading marker or wrapping quotes, one non-empty line. */
  text(value: unknown, field: string): string {
    if (typeof value !== "string") {
      this.fail(field);
      return "";
    }
    let result = value.trim().replace(/^#{1,6}\s+/, "");
    for (const [open, close] of QUOTE_PAIRS) {
      const inner = result.slice(open.length, -close.length);
      if (result.length > 1 && result.startsWith(open) && result.endsWith(close) && !inner.includes(close)) {
        result = inner.trim();
        break;
      }
    }
    if (!result || /[\r\n]/.test(result)) this.fail(field);
    return result;
  }

  /** As `text`, but missing or blank is null. */
  optional(value: unknown, field: string): string | null {
    if (value == null || (typeof value === "string" && !value.trim())) return null;
    return this.text(value, field);
  }
}

/** Media paths follow the id. The extensions are placeholders until the art (F2) and audio (G2) scripts. */
export function withMedia<T extends { id: string; kind: unknown }>(card: T) {
  return {
    ...card,
    image: card.kind === "content" ? `/deck/img/${card.id}.webp` : null,
    audio: { word: `/deck/audio/${card.id}.word.mp3`, sentence: `/deck/audio/${card.id}.sentence.mp3` },
  };
}

function grammarFor(pos: unknown, raw: unknown, g: Guard): unknown {
  const gr = isRec(raw) ? raw : {};
  if (pos === "noun") return { gender: gr.gender, article: gr.article };
  if (pos === "adjective") return { feminine: g.text(gr.feminine, "grammar.feminine") };
  if (pos === "verb") {
    const p = isRec(gr.present) ? gr.present : {};
    return {
      present: {
        yo: g.text(p.yo, "grammar.present.yo"),
        tu: g.text(p.tu, "grammar.present.tu"),
        el: g.text(p.el, "grammar.present.el"),
      },
      irregular: gr.irregular,
    };
  }
  return null;
}

function buildCard(raw: unknown, entry: WordEntry, g: Guard): Card {
  const r = isRec(raw) ? raw : {};
  const id = typeof r.id === "string" ? r.id.trim().toLowerCase() : "";
  const prefix = slug(entry.word);
  if (id !== prefix && !id.startsWith(`${prefix}-`)) g.fail("id");
  const example = isRec(r.example) ? r.example : {};
  const card = withMedia({
    id,
    rank: entry.rank,
    kind: r.kind,
    pos: r.pos,
    es: g.text(r.es, "es"),
    en: g.text(r.en, "en"),
    hint: g.optional(r.hint, "hint"),
    grammar: grammarFor(r.pos, r.grammar, g),
    example: { es: g.text(example.es, "example.es"), en: g.text(example.en, "example.en") },
    spain: g.optional(r.spain, "spain"),
    trick: g.text(r.trick, "trick"),
  });
  const validation = validateCard(card);
  for (const error of validation.ok ? [] : validation.errors) {
    // Errors read "card <id>.<field>: <message>"; keep only the field.
    const rest = error.slice(`card ${id}`.length);
    g.fail(rest.startsWith(".") ? rest.slice(1, rest.indexOf(":")) : "card");
  }
  return card as Card;
}

export type Guarded =
  | { ok: true; cards: Card[]; skip: Skip | null }
  | { ok: false; kind: "shape" | "invalid"; fields: string[] };

/** The output guard: turns Claude's answer for one word into valid cards, or names the failing fields. */
export function guardDraft(output: unknown, entry: WordEntry): Guarded {
  if (!isRec(output) || !Array.isArray(output.cards)) return { ok: false, kind: "shape", fields: [] };
  if (output.skip != null) {
    const skip = output.skip;
    if (!isRec(skip) || !SKIP_REASONS.includes(skip.reason as SkipReason) || output.cards.length > 0) {
      return { ok: false, kind: "invalid", fields: ["skip"] };
    }
    return { ok: true, cards: [], skip: { reason: skip.reason as SkipReason, note: String(skip.note ?? "") } };
  }
  if (output.cards.length === 0 || output.cards.length > MAX_CARDS) {
    return { ok: false, kind: "invalid", fields: ["cards"] };
  }
  const g = new Guard();
  const cards = output.cards.map((raw) => buildCard(raw, entry, g));
  if (new Set(cards.map((c) => c.id)).size < cards.length) g.fail("id");
  const prompts = cards.map((c) => `${c.en.toLowerCase()}|${(c.hint ?? "").toLowerCase()}`);
  if (new Set(prompts).size < cards.length) g.fail("en");
  if (g.fields.size > 0) return { ok: false, kind: "invalid", fields: [...g.fields].sort() };
  return { ok: true, cards, skip: null };
}

/** The draft files under one directory (content/drafts by default). */
export class DraftStore {
  readonly cardsDir: string;
  readonly wordsDir: string;
  readonly failedDir: string;
  readonly logFile: string;
  /** Every card file on disk: id to rank. */
  readonly index = new Map<string, number>();

  constructor(readonly dir: string) {
    this.cardsDir = path.join(dir, "cards");
    this.wordsDir = path.join(dir, "words");
    this.failedDir = path.join(dir, ".failed");
    this.logFile = path.join(dir, "usage.jsonl");
    mkdirSync(this.cardsDir, { recursive: true });
    mkdirSync(this.wordsDir, { recursive: true });
    for (const card of this.cards()) this.index.set(card.id, card.rank);
  }

  cards(): Card[] {
    return readdirSync(this.cardsDir)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .map((f) => JSON.parse(readFileSync(path.join(this.cardsDir, f), "utf8")) as Card);
  }

  wordFile(rank: number) {
    return path.join(this.wordsDir, `${String(rank).padStart(4, "0")}.json`);
  }

  isDrafted(rank: number) {
    return existsSync(this.wordFile(rank));
  }

  /**
   * Replaces a word's cards. Card files go first and the word file last, so a
   * word whose word file is missing is drafted again on the next run. An id
   * another word already holds gets this word's rank appended.
   */
  saveWord(entry: WordEntry, cards: Card[], skip: Skip | null, meta: Rec): string[] {
    for (const [id, rank] of this.index) {
      if (rank !== entry.rank) continue;
      rmSync(path.join(this.cardsDir, `${id}.json`), { force: true });
      this.index.delete(id);
    }
    const ids: string[] = [];
    for (let card of cards) {
      if (this.index.has(card.id)) card = withMedia({ ...card, id: `${card.id}-${entry.rank}` }) as Card;
      writeJson(path.join(this.cardsDir, `${card.id}.json`), card);
      this.index.set(card.id, entry.rank);
      ids.push(card.id);
    }
    writeJson(this.wordFile(entry.rank), { rank: entry.rank, word: entry.word, cards: ids, skip, ...meta });
    return ids;
  }

  /** Keeps an answer the guard refused, for a person to look at. Git ignores this folder. */
  saveFailed(entry: WordEntry, attempt: number, output: unknown) {
    mkdirSync(this.failedDir, { recursive: true });
    writeJson(path.join(this.failedDir, `${String(entry.rank).padStart(4, "0")}-${attempt}.json`), output);
  }

  log(line: Rec) {
    appendFileSync(this.logFile, `${JSON.stringify(line)}\n`);
  }

  /** Checks every drafted card together, as the deck build will. Returns "id.field" for each problem. */
  deckProblems(): string[] {
    const result = validateDeck({ version: 1, cards: this.cards() });
    if (result.ok) return [];
    return result.errors.map((e) => e.replace(/^card /, "").split(":")[0]);
  }
}

/** Writes JSON through a temporary file and a rename, so a killed run never leaves half a file. */
export function writeJson(file: string, value: unknown) {
  writeFileSync(`${file}.tmp`, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(`${file}.tmp`, file);
}

export interface DraftOptions {
  store: DraftStore;
  runner: Runner;
  via: string;
  model: string;
  effort: Effort;
  concurrency?: number;
  /** Further attempts after a failed one, per word. */
  retries?: number;
  /** Draft words again even if they have a word file. */
  redo?: boolean;
  /** Stop starting calls after this many failed calls in a row. */
  stopAfter?: number;
  print?: (line: string) => void;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export interface DraftSummary {
  words: number;
  alreadyDrafted: number;
  drafted: number;
  skipped: number;
  failed: number;
  notRun: number;
  stopped: boolean;
  cards: number;
  skipReasons: Record<string, number>;
  calls: number;
  failedCalls: number;
  tokens: { input: number; output: number; cacheRead: number; cacheWrite: number };
  costUsd: number;
  elapsedMs: number;
}

export async function draftWords(entries: WordEntry[], options: DraftOptions): Promise<DraftSummary> {
  const { store, runner, via, model, effort, concurrency = 2, retries = 2, redo = false, stopAfter = 4 } = options;
  const print = options.print ?? ((line: string) => console.log(line));
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const now = options.now ?? Date.now;
  const started = now();

  const todo = entries.filter((e) => redo || !store.isDrafted(e.rank));
  const summary: DraftSummary = {
    words: entries.length,
    alreadyDrafted: entries.length - todo.length,
    drafted: 0,
    skipped: 0,
    failed: 0,
    notRun: 0,
    stopped: false,
    cards: 0,
    skipReasons: {},
    calls: 0,
    failedCalls: 0,
    tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    costUsd: 0,
    elapsedMs: 0,
  };
  let failsInARow = 0;

  const count = (usage: CallUsage | null) => {
    summary.calls++;
    if (!usage) return;
    summary.tokens.input += usage.input;
    summary.tokens.output += usage.output;
    summary.tokens.cacheRead += usage.cacheRead;
    summary.tokens.cacheWrite += usage.cacheWrite;
    summary.costUsd += usage.costUsd ?? 0;
  };

  async function draftOne(entry: WordEntry) {
    const label = `#${entry.rank} ${entry.word}`;
    let lastError = "";
    for (let attempt = 1; attempt <= 1 + retries; attempt++) {
      if (summary.stopped) break;
      const result = await runner({ system: SYSTEM_PROMPT, prompt: userPrompt(entry), schema: DRAFT_SCHEMA, model, effort });
      const guarded = result.ok ? guardDraft(result.output, entry) : null;
      const error = !result.ok ? result.error : guarded && !guarded.ok ? guarded.kind : null;
      const fields = guarded && !guarded.ok ? guarded.fields : [];
      count(result.usage);
      store.log({
        at: new Date(now()).toISOString(),
        rank: entry.rank,
        word: entry.word,
        attempt,
        via,
        model,
        effort,
        ok: error === null,
        error,
        fields,
        ...(result.usage ?? {}),
      });

      if (guarded?.ok) {
        failsInARow = 0;
        const ids = store.saveWord(entry, guarded.cards, guarded.skip, {
          via,
          model,
          effort,
          draftedAt: new Date(now()).toISOString(),
        });
        if (guarded.skip) {
          summary.skipped++;
          summary.skipReasons[guarded.skip.reason] = (summary.skipReasons[guarded.skip.reason] ?? 0) + 1;
          print(`${label}: skipped (${guarded.skip.reason})`);
        } else {
          summary.drafted++;
          summary.cards += ids.length;
          print(`${label}: ${ids.join(", ")}`);
        }
        return;
      }

      summary.failedCalls++;
      lastError = fields.length ? `${error}: ${fields.join(", ")}` : String(error);
      if (result.ok) store.saveFailed(entry, attempt, result.output);
      if (++failsInARow >= stopAfter) summary.stopped = true;
      // A refused answer is worth asking again at once; a failed call waits a little first.
      else if (!result.ok && attempt <= retries) await sleep(5_000 * attempt);
    }
    if (lastError) {
      summary.failed++;
      print(`${label}: failed (${lastError})`);
    } else {
      summary.notRun++;
    }
  }

  const queue = [...todo];
  const worker = async () => {
    while (queue.length > 0 && !summary.stopped) await draftOne(queue.shift()!);
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
  summary.notRun += queue.length;
  summary.elapsedMs = now() - started;
  return summary;
}

const n = (value: number) => value.toLocaleString("en-US");

export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

/** The end-of-run report: counts only. */
export function formatSummary(s: DraftSummary, via: string): string[] {
  const reasons = Object.entries(s.skipReasons)
    .map(([reason, count]) => `${reason} ${count}`)
    .join(", ");
  const lines = [
    `Words: ${s.words} in range, ${s.alreadyDrafted} already drafted; this run drafted ${s.drafted}, skipped ${s.skipped}${reasons ? ` (${reasons})` : ""}, failed ${s.failed}${s.notRun ? `, not run ${s.notRun}` : ""}`,
    `Cards: ${s.cards} (${s.drafted ? (s.cards / s.drafted).toFixed(2) : "0"} per drafted word)`,
    `Calls: ${s.calls} (${s.failedCalls} failed), ${formatDuration(s.elapsedMs)}`,
    `Tokens: input ${n(s.tokens.input)}, output ${n(s.tokens.output)}, cache read ${n(s.tokens.cacheRead)}, cache write ${n(s.tokens.cacheWrite)}`,
    `Notional API cost: $${s.costUsd.toFixed(2)}${via === "cli" ? " (what the API would charge; the plan is not charged it)" : ""}`,
  ];
  if (s.stopped) lines.push("Stopped early: too many failed calls in a row. Rerun the same command to resume.");
  else if (s.failed) lines.push("Rerun the same command to retry the failed words.");
  return lines;
}
