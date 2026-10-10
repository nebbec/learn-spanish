// The review pass: a second, independent Claude call per drafted card. The
// reviewer sees the card cold, with only the word and its rank (and the prompts
// of the word's other cards, to judge that each prompt has one answer); never
// the draft prompt or the draft call's reasoning. It translates the Spanish
// back first, then checks each area. Any check that fails flags the card, and
// so do the script's own checks (the id rule, and clashes the deck validator
// finds among all drafted cards). A hint the prompt does not need is not a
// failure: the reviewer passes the check and may say so in its note, which
// never flags a card.
//
// Nothing here prints card text or Claude's text: only ranks, words from the
// list, card ids, check names, counts and error kinds. The reasons go to the
// review files and to the flagged list, which are for a person.
//
// The rules are in docs/design.md under "Content pipeline", "Decided in E3".

import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { DraftCard as AnyDraftCard } from "@/lib/deck/types";
import { PHRASE_ID } from "@/lib/deck/validate";
import type { CallUsage, Effort, Runner } from "./claude";
import { DraftStore, formatDuration, slug, type SpanishMeaning, writeJson, type GroupKind } from "./drafting";
import { GERMAN_REVIEW_SCHEMA, GERMAN_REVIEW_SYSTEM, germanReviewSystem } from "./prompts-de";
import type { LangCode } from "./script-lang";

/** Drafted cards of either language; the drafts' store says which (DE5). */
type DraftCard = AnyDraftCard;

/** The persons a form card's id may end in, per language. Spanish haber's only card is haber-form-hay. */
const FORM_PERSONS: Readonly<Record<LangCode, string>> = { es: "yo|tu|el", de: "ich|du|er" };

/** The reviewer's checks, in the order it answers them. */
export const CHECKS = ["meaning", "oneAnswer", "grammar", "usage", "example", "trick"] as const;
/** German's reviewer also checks `sameAs`, the Spanish card whose still a German card may reuse (DE7). */
export const CHECKS_BY_LANG: Readonly<Record<LangCode, readonly CheckName[]>> = { es: CHECKS, de: [...CHECKS, "sameAs"] };
export type CheckName = (typeof CHECKS)[number] | "sameAs";
/** Why a card is flagged: one of the reviewer's checks, or one the script makes itself. */
export type Reason = CheckName | "id" | "deck" | "words" | "known-words";

/** Spanish's labels, as the flagged list and decision files have always named the reasons. */
export const REASON_LABELS: Record<Reason, string> = {
  meaning: "Meaning",
  oneAnswer: "One right answer",
  grammar: "Grammar",
  usage: "Latin American usage",
  example: "Example sentence",
  trick: "Memory trick",
  id: "Card id",
  deck: "Clash with another card",
  words: "Words outside the top 1,000",
  "known-words": "Example uses words not met yet",
  sameAs: "Same meaning as a Spanish card",
};

/** A reason's label in a language's flagged list and decision files: German's usage is Germany's (DE7). */
export function reasonLabel(reason: Reason, lang: LangCode = "es"): string {
  if (lang === "de" && reason === "usage") return "Usage in Germany";
  return REASON_LABELS[reason];
}

/** Words that follow the word in an id: one to three, naming the meaning. */
const MAX_MEANING_WORDS = 3;

/**
 * The id rule: the word without accents, a hyphen, then one to three English
 * words naming the meaning, lower-case a-z and 0-9 joined by hyphens
 * (`estar-be-state`). An id another word already held when it was drafted has
 * that word's rank at the end (`que-what-16`). Returns what is wrong, or null.
 */
export function idProblem(id: string, word: string, rank: number, kind?: GroupKind, lang: LangCode = "es"): string | null {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) return "must be lower-case a-z and 0-9 words joined by single hyphens";
  // A form card's id is its verb's, then -form- and the person (Spanish haber's only card is haber-form-hay).
  if (kind === "form") {
    const verb = slug(word, lang);
    const persons = FORM_PERSONS[lang];
    if (lang === "es" && verb === "haber") return id === "haber-form-hay" ? null : 'must be "haber-form-hay"';
    const ok = new RegExp(`^${verb}-form-(${persons})$`).test(id);
    return ok ? null : `must be "${verb}-form-" and ${persons.split("|").join(", ").replace(/, (\w+)$/, " or $1")}`;
  }
  if (kind === "phrase") return PHRASE_ID.test(id) ? null : 'must be "phrase-" and one to four English words';
  const prefix = `${slug(word, lang)}-`;
  if (!id.startsWith(prefix)) return `must start with "${prefix}" and then name the meaning`;
  let meaning = id.slice(prefix.length).split("-");
  if (meaning.length > 1 && meaning.at(-1) === String(rank)) meaning = meaning.slice(0, -1);
  if (meaning.length > MAX_MEANING_WORDS) return `must name the meaning in at most ${MAX_MEANING_WORDS} words`;
  return null;
}

/** A short fingerprint of a drafted card: a review or a decision applies only to the card it saw. */
export function cardHash(card: AnyDraftCard): string {
  return createHash("sha256").update(JSON.stringify(card)).digest("hex").slice(0, 16);
}

export const REVIEW_SYSTEM_PROMPT = `You check flashcards for an app that teaches the 1,000 most common Spanish words to English speakers, most common first. The Spanish must be neutral Latin American Spanish: natural, everyday and informal (tú, never vosotros; usted only as a word in its own right). Someone else wrote the card. You see it cold and check it independently. Be strict about anything wrong or misleading that a learner would memorize; do not flag matters of taste.

How a card works
- The learner sees the English prompt (en) with its hint, recalls the Spanish answer (es), then sees the answer with its grammar, the example sentence, the Spain alternative and the memory trick, and rates their own recall. So every prompt must have exactly one right Spanish answer.
- kind "content": en is plain English ("to go", "house", "good"); verbs start with "to". kind "glue": a function word (article, preposition, conjunction, pronoun, determiner, a particle such as se or lo); en is a short English phrase with the target in square brackets ("the house [of] Maria"), and when English has no word for it, the hint says what to recall.
- kind "form": one present-tense form of a core irregular verb. en is an English subject and verb ("I am", "you are", "he / she is", "there is / there are"), es is that one form ("soy"), and grammar is the verb's whole present-tense strip, in which es must be the form for the card's person (yo, tú or él; haber's card is hay). A "you" prompt is tú and says informal in its hint, since usted takes the él form.
- kind "phrase": a whole phrase or short sentence a beginner says as one piece ("How are you?", "I'm from Mexico"). en is its English, es its natural Latin American Spanish with accents and ¿ ? ¡ ! as needed, and grammar is null.
- hint: there when the bare prompt would have more than one right answer, and then it must rule the others out. A hint the prompt does not strictly need is harmless and is never a reason to fail a check.
- es: the dictionary form (infinitive, masculine singular, singular noun), except on a form card (one form) and a phrase card (the whole phrase). A noun starts with its definite article ("la casa", "el agua").
- grammar: a noun has gender and article; an adjective its feminine singular; a verb its present-tense yo, tú and él forms and irregular, which is true when the verb is irregular in the present or the preterite, stem changes included. Other parts of speech have none.
- example: one short, natural sentence using the word in this card's meaning (a verb conjugated, not the infinitive), with its English translation.
- spain: the word Spain uses instead for this meaning when it differs noticeably, else null.
- trick: one English sentence linking the sound of the Spanish word to its meaning. A form or phrase card may have none (null).

How to check
First translate back, before you judge anything: write what es means in English on its own, as a good learner's dictionary would give it for this part of speech, and translate the Spanish example sentence into English yourself.
Then judge each area. ok is true when it is right. When it is not, problem is one sentence saying what is wrong, and fix is the corrected text (name the field: "en: ...", "example.es: ..."), or null when you cannot say.
- meaning: your back-translation of es agrees with the prompt and hint; the meaning is a common one a beginner needs; kind and part of speech fit it.
- oneAnswer: someone who knows Spanish well would give exactly this es for this prompt and hint, and no other common Spanish word, and none of the word's other cards, would also be right. A hint that is wrong or misleading, or that leaves more than one right answer, fails this check. A hint that is right but not needed does not: pass the check and say so in note.
- grammar: the article and gender, the feminine form, the three present-tense forms and the irregular flag are right; es is in dictionary form. On a form card, es is the strip's form for the prompt's person; on a phrase card, the phrase is grammatical (agreement, verb endings, word order).
- usage: the word and the sentence are what Latin American speakers say, in the tú register; spain is right (null when Spain says the same, filled when it noticeably differs).
- example: the sentence is natural and short, uses es in this card's meaning, conjugates a verb, and its English translation is right and agrees with yours.
- trick: it is in English and says nothing false about the Spanish word or its meaning. A weak pun is fine. A null trick on a form or phrase card passes.
Last, note is one sentence for anything worth telling the editor that is not a problem, such as a hint the prompt does not need, or null when there is nothing. A note never fails a check.

Every text field is one line of plain text, with no Markdown.`;

/**
 * The review pass's system prompt per language (DE5). German's (DE7) is followed by the Spanish cards a `sameAs`
 * may name: see `reviewSystem`.
 */
export const REVIEW_SYSTEMS: Readonly<Record<LangCode, string>> = { es: REVIEW_SYSTEM_PROMPT, de: GERMAN_REVIEW_SYSTEM };

/** The review's system prompt for a language: German's ends with the Spanish cards, to check `sameAs` against. */
export function reviewSystem(lang: LangCode, spanish: readonly SpanishMeaning[] = []): string {
  return lang === "es" ? REVIEW_SYSTEM_PROMPT : germanReviewSystem(spanish);
}

/**
 * The part of the card the reviewer sees: no id, rank or media paths. The Spanish review
 * prompt names the answer `es` and the footnote `spain`, so a Spanish card is shown with those
 * names, exactly as before deck format 3. A German card is shown with the deck's names.
 */
function shownCard(card: DraftCard, lang: LangCode) {
  const { kind, pos, target, en, hint, grammar, example, regional, trick } = card;
  if (lang !== "es") return { kind, pos, target, en, hint, grammar, example, regional, trick };
  return { kind, pos, es: target, en, hint, grammar, example: { es: example.target, en: example.en }, spain: regional?.text ?? null, trick };
}

export function reviewPrompt(
  card: DraftCard,
  word: Pick<DraftedWord, "rank" | "word" | "kind" | "sameAs">,
  others: DraftCard[],
  lang: LangCode = "es",
  spanish: readonly SpanishMeaning[] = [],
): string {
  const prompt = (c: DraftCard) => (c.hint ? `"${c.en}" (hint: ${c.hint})` : `"${c.en}"`);
  const [about, owner, only] =
    word.kind === "form"
      ? [`A form card of the verb ${word.word}, rank ${word.rank} in a frequency list made from film and TV subtitles: one present-tense form, recalled from its English.`, "verb's other form cards", "verb's only form card"]
      : word.kind === "phrase"
        ? [`A phrase card of the starter path's unit ${word.word}, recalled whole from its English.`, "unit's other phrase cards", "unit's only phrase card"]
        : [`Word: ${word.word}, rank ${word.rank} in a frequency list made from film and TV subtitles.`, "word's other cards", "word's only card"];
  return [
    about,
    others.length ? `The ${owner} ask: ${others.map(prompt).join("; ")}.` : `This is the ${only}.`,
    "",
    "The card:",
    JSON.stringify(shownCard(card, lang), null, 2),
    ...(lang === "es" ? [] : ["", sameAsLine(word.sameAs?.[card.id] ?? null, spanish)]),
  ].join("\n");
}

/** What the draft said about the Spanish card of the same meaning (German, DE7), for the `sameAs` check. */
function sameAsLine(id: string | null, spanish: readonly SpanishMeaning[]): string {
  if (!id) return "sameAs: null (the draft found no Spanish card with this meaning).";
  const match = spanish.find((s) => s.id === id);
  const prompt = match ? `"${match.en}"${match.hint ? ` (hint: ${match.hint})` : ""}` : "not in the list";
  return `sameAs: ${id}, the Spanish card ${prompt}.`;
}

const text = { type: "string" };
const nullable = (schema: Record<string, unknown>) => ({ anyOf: [schema, { type: "null" }] });
const object = (properties: Record<string, unknown>) => ({
  type: "object",
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});
const check = object({ ok: { type: "boolean" }, problem: nullable(text), fix: nullable(text) });

/** The back-translation comes first, so the reviewer writes it before it judges; the note comes last. */
export const REVIEW_SCHEMA: Record<string, unknown> = object({
  back: object({ es: text, example: text }),
  checks: object(Object.fromEntries(CHECKS.map((name) => [name, check]))),
  note: nullable(text),
});

/** The review's schema per language: German's names the back-translated answer `target` and adds `sameAs` (DE7). */
export const REVIEW_SCHEMAS: Readonly<Record<LangCode, Record<string, unknown>>> = { es: REVIEW_SCHEMA, de: GERMAN_REVIEW_SCHEMA };

export interface Finding {
  reason: Reason;
  problem: string;
  fix: string | null;
}

/**
 * The reviewer's own translation: of the answer (`es` in a Spanish review, `target` in a German one) and of the
 * example sentence.
 */
export type BackTranslation = { es: string; example: string } | { target: string; example: string };

/** The back-translated answer, whichever language's review it is. */
export const backAnswer = (back: BackTranslation) => ("target" in back ? back.target : back.es);

export interface ReviewAnswer {
  back: BackTranslation;
  findings: Finding[];
  /** Something worth telling the editor that is not a problem (a hint not needed). Never flags the card. */
  note: string | null;
}

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);
const oneLine = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");

/** Checks the reviewer's answer. A failed check needs a problem; a passed one keeps none. The note is optional. */
export function guardReview(output: unknown, lang: LangCode = "es"): { ok: true; answer: ReviewAnswer } | { ok: false; fields: string[] } {
  const fields: string[] = [];
  const o = isRec(output) ? output : {};
  const back = isRec(o.back) ? o.back : {};
  const checks = isRec(o.checks) ? o.checks : {};
  const key = lang === "es" ? "es" : "target";
  const answered = oneLine(back[key]);
  const example = oneLine(back.example);
  const answer: ReviewAnswer = {
    back: lang === "es" ? { es: answered, example } : { target: answered, example },
    findings: [],
    note: oneLine(o.note) || null,
  };
  if (!answered) fields.push(`back.${key}`);
  if (!example) fields.push("back.example");
  for (const name of CHECKS_BY_LANG[lang]) {
    const c = isRec(checks[name]) ? checks[name] : {};
    const problem = oneLine(c.problem);
    if (typeof c.ok !== "boolean" || (!c.ok && !problem)) fields.push(`checks.${name}`);
    else if (!c.ok) answer.findings.push({ reason: name, problem, fix: oneLine(c.fix) || null });
  }
  return fields.length ? { ok: false, fields } : { ok: true, answer };
}

/** One card's review, as saved in content/review/cards/<id>.json. */
export interface Review {
  id: string;
  rank: number;
  word: string;
  /** cardHash of the draft the reviewer saw. */
  draft: string;
  flagged: boolean;
  findings: Finding[];
  back: BackTranslation;
  /** The reviewer's note, which never flags a card. Reviews made before E4 have none. */
  note?: string | null;
  via: string;
  model: string;
  effort: string;
  reviewedAt: string;
}

/** A word as content/drafts/words/<rank>.json holds it. */
export interface DraftedWord {
  rank: number;
  /** The word; a form group's verb; a phrase group's unit id. */
  word: string;
  cards: string[];
  /** Set on the learning path's groups (L3): a verb's form cards, or a unit's phrase cards. */
  kind?: GroupKind;
  /** A phrase group's words outside the top 1,000, by card id. Never printed. */
  outside?: Record<string, string[]>;
  /** A German word's Spanish card of the same meaning, by card id (DE7). Never shipped. */
  sameAs?: Record<string, string | null>;
}

/** The drafted words in a range of ranks, in rank order. */
export function draftedWords(drafts: DraftStore, from = 1, to = Number.MAX_SAFE_INTEGER): DraftedWord[] {
  return readdirSync(drafts.wordsDir)
    .filter((f) => /^\d+\.json$/.test(f))
    .map((f) => JSON.parse(readFileSync(path.join(drafts.wordsDir, f), "utf8")) as DraftedWord)
    .filter((w) => w.rank >= from && w.rank <= to)
    .sort((a, b) => a.rank - b.rank);
}

const readJsonDir = (dir: string) =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith(".json"))
        .sort()
        .map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")) as Record<string, unknown>)
    : [];

/** The verbs whose form cards are drafted, in rank order: one group per verb. */
export function draftedForms(drafts: DraftStore, verbs?: string[]): DraftedWord[] {
  return readJsonDir(drafts.formsDir)
    .map((g) => ({ kind: "form" as const, rank: g.rank as number, word: g.word as string, cards: g.cards as string[] }))
    .filter((g) => !verbs || verbs.includes(g.word))
    .sort((a, b) => a.rank - b.rank || a.word.localeCompare(b.word));
}

/**
 * The drafted phrase cards, one group per unit in plan order (each phrase file keeps its place in the plan as
 * `order`), so the reviewer sees the unit's other phrases. A group's rank is its highest card's.
 */
export function draftedPhrases(drafts: DraftStore, units?: string[]): DraftedWord[] {
  const files = readJsonDir(drafts.phrasesDir)
    .filter((g) => !units || units.includes(g.unit as string))
    .sort((a, b) => (a.order as number) - (b.order as number));
  const groups = new Map<string, DraftedWord>();
  for (const g of files) {
    const unit = g.unit as string;
    const group = groups.get(unit) ?? { kind: "phrase" as const, rank: 0, word: unit, cards: [], outside: {} };
    groups.set(unit, group);
    group.rank = Math.max(group.rank, g.rank as number);
    for (const id of g.cards as string[]) {
      group.cards.push(id);
      if ((g.outside as string[] | undefined)?.length) group.outside![id] = g.outside as string[];
    }
  }
  return [...groups.values()];
}

/** Every drafted group: the words, then the verbs' form cards, then the units' phrase cards. */
export function allDrafted(drafts: DraftStore): DraftedWord[] {
  return [...draftedWords(drafts), ...draftedForms(drafts), ...draftedPhrases(drafts)];
}

/** A drafted card, of the drafts' language. */
export function readDraftCard(drafts: DraftStore, id: string): DraftCard | null {
  const file = path.join(drafts.cardsDir, `${id}.json`);
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as DraftCard) : null;
}

/** The review files under one directory (content/review by default). */
export class ReviewStore {
  readonly reviewsDir: string;
  readonly decisionsDir: string;
  readonly logFile: string;
  readonly flaggedFile: string;

  constructor(readonly dir: string) {
    this.reviewsDir = path.join(dir, "cards");
    this.decisionsDir = path.join(dir, "decisions");
    this.logFile = path.join(dir, "usage.jsonl");
    this.flaggedFile = path.join(dir, "flagged.md");
    mkdirSync(this.reviewsDir, { recursive: true });
    mkdirSync(this.decisionsDir, { recursive: true });
  }

  get(id: string): Review | null {
    const file = path.join(this.reviewsDir, `${id}.json`);
    return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Review) : null;
  }

  save(review: Review) {
    writeJson(path.join(this.reviewsDir, `${review.id}.json`), review);
  }

  log(line: Rec) {
    appendFileSync(this.logFile, `${JSON.stringify(line)}\n`);
  }
}

/**
 * The script's own checks on one card: the id rule, what the deck validator found among all drafts, and the
 * known-words check (L7): `knownWords` is the problem with the card's example, by id, as `exampleProblem` words it.
 */
export function scriptFindings(
  card: DraftCard,
  word: DraftedWord,
  deckProblems: string[],
  knownWords?: ReadonlyMap<string, string>,
  lang: LangCode = "es",
): Finding[] {
  const findings: Finding[] = [];
  const id = idProblem(card.id, word.word, card.rank, word.kind, lang);
  if (id) findings.push({ reason: "id", problem: `The id ${id}.`, fix: null });
  const outside = word.outside?.[card.id] ?? [];
  if (outside.length) {
    findings.push({
      reason: "words",
      problem: `The phrase uses ${outside.join(", ")}, not among the 1,000 most common words.`,
      fix: null,
    });
  }
  const fields = deckProblems.filter((p) => p.startsWith(`${card.id}.`)).map((p) => p.slice(card.id.length + 1));
  if (fields.length) {
    findings.push({
      reason: "deck",
      problem: `The deck validator found a problem in ${fields.join(", ")} when checking every drafted card together (two cards with the same prompt, or the same id).`,
      fix: null,
    });
  }
  const known = knownWords?.get(card.id);
  if (known) {
    findings.push({ reason: "known-words", problem: known, fix: `npm run draft -- --examples --ids ${card.id}` });
  }
  return findings;
}

export interface ReviewOptions {
  drafts: DraftStore;
  store: ReviewStore;
  runner: Runner;
  via: string;
  model: string;
  effort: Effort;
  concurrency?: number;
  /** Further attempts after a failed one, per card. */
  retries?: number;
  /** Review cards again even if their draft has a review. */
  redo?: boolean;
  /** The known-words check's problem with each card's example, by id (L7). Cards not in it pass the check. */
  knownWords?: ReadonlyMap<string, string>;
  /** German's review (DE7): the Spanish cards a `sameAs` may name. None when left out. */
  spanish?: readonly SpanishMeaning[];
  /** Stop starting calls after this many failed calls in a row. */
  stopAfter?: number;
  print?: (line: string) => void;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export interface ReviewSummary {
  cards: number;
  alreadyReviewed: number;
  passed: number;
  flagged: number;
  failed: number;
  notRun: number;
  stopped: boolean;
  reasons: Partial<Record<Reason, number>>;
  calls: number;
  failedCalls: number;
  tokens: { input: number; output: number; cacheRead: number; cacheWrite: number };
  costUsd: number;
  elapsedMs: number;
}

interface Job {
  card: DraftCard;
  word: DraftedWord;
  others: DraftCard[];
}

/** Reviews every drafted card of the given words that has no review of its current draft. */
export async function reviewCards(words: DraftedWord[], options: ReviewOptions): Promise<ReviewSummary> {
  const { drafts, store, runner, via, model, effort, concurrency = 2, retries = 2, redo = false, stopAfter = 4 } = options;
  const print = options.print ?? ((line: string) => console.log(line));
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const now = options.now ?? Date.now;
  const started = now();

  const jobs: Job[] = [];
  for (const word of words) {
    const cards = word.cards.map((id) => readDraftCard(drafts, id)).filter((c): c is DraftCard => c !== null);
    for (const card of cards) jobs.push({ card, word, others: cards.filter((c) => c !== card) });
  }
  const todo = jobs.filter((j) => redo || store.get(j.card.id)?.draft !== cardHash(j.card));
  const deckProblems = drafts.deckProblems();
  const spanish = options.spanish ?? [];
  const system = reviewSystem(drafts.lang, spanish);

  const summary: ReviewSummary = {
    cards: jobs.length,
    alreadyReviewed: jobs.length - todo.length,
    passed: 0,
    flagged: 0,
    failed: 0,
    notRun: 0,
    stopped: false,
    reasons: {},
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

  async function reviewOne({ card, word, others }: Job) {
    const label = `#${word.rank} ${word.word}: ${card.id}`;
    let lastError = "";
    for (let attempt = 1; attempt <= 1 + retries; attempt++) {
      if (summary.stopped) break;
      const result = await runner({
        system,
        prompt: reviewPrompt(card, word, others, drafts.lang, spanish),
        schema: REVIEW_SCHEMAS[drafts.lang],
        model,
        effort,
      });
      const guarded = result.ok ? guardReview(result.output, drafts.lang) : null;
      const error = !result.ok ? result.error : guarded && !guarded.ok ? "invalid" : null;
      const fields = guarded && !guarded.ok ? guarded.fields : [];
      count(result.usage);
      store.log({
        at: new Date(now()).toISOString(),
        rank: word.rank,
        word: word.word,
        id: card.id,
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
        const findings = [...guarded.answer.findings, ...scriptFindings(card, word, deckProblems, options.knownWords, drafts.lang)];
        store.save({
          id: card.id,
          // A phrase group's rank is its highest card's; each card keeps its own.
          rank: card.rank,
          word: word.word,
          draft: cardHash(card),
          flagged: findings.length > 0,
          findings,
          back: guarded.answer.back,
          note: guarded.answer.note,
          via,
          model,
          effort,
          reviewedAt: new Date(now()).toISOString(),
        });
        const reasons = [...new Set(findings.map((f) => f.reason))];
        if (reasons.length) {
          summary.flagged++;
          for (const r of reasons) summary.reasons[r] = (summary.reasons[r] ?? 0) + 1;
          print(`${label} flagged (${reasons.join(", ")})`);
        } else {
          summary.passed++;
          print(`${label} passed`);
        }
        return;
      }

      summary.failedCalls++;
      lastError = fields.length ? `${error}: ${fields.join(", ")}` : String(error);
      if (++failsInARow >= stopAfter) summary.stopped = true;
      else if (!result.ok && attempt <= retries) await sleep(5_000 * attempt);
    }
    if (lastError) {
      summary.failed++;
      print(`${label} failed (${lastError})`);
    } else {
      summary.notRun++;
    }
  }

  const queue = [...todo];
  const worker = async () => {
    while (queue.length > 0 && !summary.stopped) await reviewOne(queue.shift()!);
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
  summary.notRun += queue.length;
  summary.elapsedMs = now() - started;
  return summary;
}

const n = (value: number) => value.toLocaleString("en-US");

/** The end-of-run report: counts and check names only. */
export function formatReviewSummary(s: ReviewSummary, via: string): string[] {
  const reasons = Object.entries(s.reasons)
    .map(([reason, count]) => `${reason} ${count}`)
    .join(", ");
  const lines = [
    `Cards: ${s.cards} in range, ${s.alreadyReviewed} already reviewed; this run passed ${s.passed}, flagged ${s.flagged}${reasons ? ` (${reasons})` : ""}, failed ${s.failed}${s.notRun ? `, not run ${s.notRun}` : ""}`,
    `Calls: ${s.calls} (${s.failedCalls} failed), ${formatDuration(s.elapsedMs)}`,
    `Tokens: input ${n(s.tokens.input)}, output ${n(s.tokens.output)}, cache read ${n(s.tokens.cacheRead)}, cache write ${n(s.tokens.cacheWrite)}`,
    `Notional API cost: $${s.costUsd.toFixed(2)}${via === "cli" ? " (what the API would charge; the plan is not charged it)" : ""}`,
  ];
  if (s.stopped) lines.push("Stopped early: too many failed calls in a row. Rerun the same command to resume.");
  else if (s.failed) lines.push("Rerun the same command to retry the failed cards.");
  return lines;
}
