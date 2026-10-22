// The learning path's form and phrase cards in the draft pass (L3). Form cards come from a fixed list of
// core irregular verbs: one Claude call per verb writes the prompts and examples of its three forms, and the
// script makes the ids, takes the form itself, the grammar strip and the still from the verb's drafted card.
// Phrase cards come from content/units.json: each unit's survival chunks (`phrase: <es> = <en>` wants) and
// payoff lines, one call per phrase; the script makes the id from the plan's English and the rank from the
// words Claude lists. Both write card files to content/drafts/cards/ like any card, with a group file per
// verb (`forms/<verb>.json`) or per phrase (`phrases/<id>.json`) instead of a word file.
//
// German case cards (DE9) come from content/de/units.json too: each `case: <German> = <English>` want is one
// card, one call each, its answer and prompt fixed by the plan; Claude names the case, gender and `from` and
// writes the example. Group files `cases/<id>.json`, like phrases.
//
// Nothing here prints card text: only verbs, unit ids, card ids, counts and error kinds.
//
// The rules are in docs/design.md under "Learning path" ("Form cards", "Phrase cards") and "Content
// pipeline", "Decided in L3".

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { DraftCard as AnyDraftCard, GermanVerbGrammar, VerbGrammar } from "@/lib/deck/types";
import {
  claudeExample,
  claudeTexts,
  type DraftOptions,
  type DraftStore,
  type DraftSummary,
  type DraftTask,
  Guard,
  type Guarded,
  guardValid,
  runDraftTasks,
  slug,
  type WordEntry,
  withMedia,
} from "./drafting";
import {
  CASE_GENDERS,
  GERMAN_CASE_SCHEMA,
  GERMAN_CASE_SYSTEM,
  GERMAN_FORM_SCHEMA,
  GERMAN_FORM_SYSTEM,
  GERMAN_PHRASE_SCHEMA,
  GERMAN_PHRASE_SYSTEM,
} from "./prompts-de";
import { LANGS, type LangCode } from "./script-lang";
import { CASE_WANT, PHRASE_WANT, type Unit } from "./units";

/** Drafted cards of either language; the drafts' store says which (DE5). */
type DraftCard = AnyDraftCard;

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);

const text = { type: "string" };
const nullable = (schema: Rec) => ({ anyOf: [schema, { type: "null" }] });
const object = (properties: Rec) => ({
  type: "object",
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});

/** A Spanish form card's person: yo, tú or él, or haber's impersonal hay. */
export const PERSONS = ["yo", "tu", "el", "hay"] as const;
/** A German form card's person (DE5): ich, du or er. German has no hay. */
export const GERMAN_PERSONS = ["ich", "du", "er"] as const;
export type Person = (typeof PERSONS)[number] | (typeof GERMAN_PERSONS)[number];
const THREE: Person[] = ["yo", "tu", "el"];

export interface FormVerb {
  verb: string;
  /** The verb's drafted card whose grammar strip and still the form cards take. */
  card: string;
  persons: Person[];
}

/** The core irregular verbs that get form cards, in the order the unit plan meets them. */
export const FORM_VERBS: FormVerb[] = [
  { verb: "ser", card: "ser-be-identity", persons: THREE },
  { verb: "estar", card: "estar-be-state", persons: THREE },
  { verb: "querer", card: "querer-want", persons: THREE },
  { verb: "tener", card: "tener-have", persons: THREE },
  { verb: "saber", card: "saber-know", persons: THREE },
  { verb: "poder", card: "poder-can", persons: THREE },
  { verb: "haber", card: "haber-there-is", persons: ["hay"] },
  { verb: "ir", card: "ir-go", persons: THREE },
  { verb: "hacer", card: "hacer-do", persons: THREE },
  { verb: "venir", card: "venir-come", persons: THREE },
  { verb: "decir", card: "decir-say", persons: THREE },
];

const GERMAN_THREE: Person[] = ["ich", "du", "er"];

/**
 * German's core verbs (DE7), as docs/german.md lists them ("What the cards look like"). Each names the drafted card
 * its strip and still come from: the ids of ranks 1 to 20 are the trial's, the others the ids the draft prompt's
 * rule gives (`koennen-can`), to be checked when DE12 drafts them (`npm run draft -- --lang de --forms` lists a verb
 * whose card is missing). möchten has no row of its own in the word list (its forms count under mögen), so the
 * draft prompt asks for its card under mögen.
 */
export const GERMAN_FORM_VERBS: FormVerb[] = [
  { verb: "sein", card: "sein-be", persons: GERMAN_THREE },
  { verb: "haben", card: "haben-have", persons: GERMAN_THREE },
  { verb: "werden", card: "werden-become", persons: GERMAN_THREE },
  { verb: "können", card: "koennen-can", persons: GERMAN_THREE },
  { verb: "müssen", card: "muessen-must", persons: GERMAN_THREE },
  { verb: "wollen", card: "wollen-want", persons: GERMAN_THREE },
  { verb: "möchten", card: "moegen-would-like", persons: GERMAN_THREE },
  { verb: "gehen", card: "gehen-go", persons: GERMAN_THREE },
  { verb: "kommen", card: "kommen-come", persons: GERMAN_THREE },
  { verb: "wissen", card: "wissen-know", persons: GERMAN_THREE },
];

/** The verbs that get form cards, per language. */
export const FORM_VERBS_BY_LANG: Readonly<Record<LangCode, readonly FormVerb[]>> = { es: FORM_VERBS, de: GERMAN_FORM_VERBS };

/**
 * `<verb>-form-<yo|tu|el>`, or `haber-form-hay`; German `<verb>-form-<ich|du|er>`, the verb spelled as an id
 * spells it (`koennen-form-ich`).
 */
export const formId = (verb: string, person: Person, lang: LangCode = "es") =>
  person === "hay" ? "haber-form-hay" : `${lang === "es" ? verb : slug(verb, lang)}-form-${person}`;

/**
 * The answer for a person: from the verb's present-tense strip, or hay. A German form card's answer has its
 * pronoun, as German never drops it (`ich bin`, `ich rufe an`).
 */
function formOf(grammar: VerbGrammar | GermanVerbGrammar, person: Person): string {
  if (person === "hay") return "hay";
  if (person === "ich" || person === "du" || person === "er") return `${person} ${(grammar as GermanVerbGrammar).present[person]}`;
  return (grammar as VerbGrammar).present[person];
}

export interface FormJob {
  verb: string;
  rank: number;
  /** The verb's drafted card. */
  source: DraftCard & { pos: "verb" };
  /** The language of the cards (DE5): Spanish unless given. */
  lang?: LangCode;
  cards: Array<{ person: Person; id: string; es: string }>;
  /** The unit plan's wants for this verb (`ser: I am (soy)`). */
  wants: string[];
  /** The other form verbs' prompts, so hints keep every prompt to one answer (ser and estar). */
  others: string[];
}

function readCard(store: DraftStore, id: string): DraftCard | null {
  const file = path.join(store.cardsDir, `${id}.json`);
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as DraftCard) : null;
}

const promptOf = (c: DraftCard) => (c.hint ? `"${c.en}" (hint: ${c.hint})` : `"${c.en}"`);

/**
 * The form jobs for the given verbs (all by default) of the drafts' language. A verb whose card is not drafted,
 * or not a verb, is missing. `list` is the language's verb list unless given.
 */
export function formJobs(
  store: DraftStore,
  units: Unit[],
  verbs?: string[],
  list: readonly FormVerb[] = FORM_VERBS_BY_LANG[store.lang],
): { jobs: FormJob[]; missing: string[] } {
  const sources = new Map(list.map((v) => [v.verb, readCard(store, v.card)]));
  const jobs: FormJob[] = [];
  const missing: string[] = [];
  for (const v of list) {
    if (verbs && !verbs.includes(v.verb)) continue;
    const source = sources.get(v.verb);
    if (!source || source.pos !== "verb") {
      missing.push(v.verb);
      continue;
    }
    jobs.push({
      verb: v.verb,
      rank: source.rank,
      source,
      lang: store.lang,
      cards: v.persons.map((person) => ({ person, id: formId(v.verb, person, store.lang), es: formOf(source.grammar, person) })),
      wants: units.flatMap((u) => u.wants.filter((w) => w.startsWith(`${v.verb}:`))),
      others: list.filter((o) => o.verb !== v.verb).flatMap((o) => {
        const card = sources.get(o.verb);
        return card ? [`${o.verb}: ${promptOf(card)}`] : [];
      }),
    });
  }
  return { jobs, missing };
}

export const FORM_SYSTEM_PROMPT = `You write flashcards for an app that teaches the most common Spanish words to English speakers who are starting from zero. The Spanish is neutral Latin American Spanish: natural, everyday and informal (tú, never vosotros; usted is never the "you" of a prompt).

These are form cards: one card for one present-tense form of a core irregular verb, so a beginner can say "I am", "you have", "he goes" before learning the infinitive. The learner sees the English prompt, says the one Spanish form, then sees the answer in the verb's present-tense strip.

You are given the verb, its own card's prompt, its present-tense forms, and the forms to write a card for. Write one card per form given, with person set to the form's person.

Fields
- en: the English subject and verb, nothing else: "I am", "you are", "he / she is", "I have", "you want", "he / she goes". For yo start with "I", for tu with "you", for el with "he / she". For haber's hay, "there is / there are".
- hint: what keeps the prompt to exactly one right Spanish answer, or null. Carry the verb card's meaning hint when another verb shares the English (ser "identity" and estar "state, place" are both "to be"). Every "you" card is tú, and usted takes the él form, so a "you" card's hint always says "informal" (with the meaning hint when there is one: "identity, informal").
- example: one short, natural sentence a Latin American speaker would say, under eight words, using exactly this form, with its natural English translation. Use only very common words: a beginner reads it.
- trick: one English sentence, under 25 words, linking the sound of the form to its meaning, or null when no sound-alike helps. Null is fine.

Every text field is one line of plain text, with no Markdown and no surrounding quotes.`;

/** The present-tense strip as the form prompt shows it. */
function strip(job: FormJob): string {
  if ((job.lang ?? "es") !== "es") {
    const { present, irregular, separable } = job.source.grammar as GermanVerbGrammar;
    const flags = [irregular && "irregular", separable && "separable"].filter(Boolean).join(", ");
    return `ich ${present.ich} · du ${present.du} · er ${present.er}${flags ? ` (${flags})` : ""}`;
  }
  const { present, irregular } = job.source.grammar as VerbGrammar;
  return `yo ${present.yo} · tú ${present.tu} · él ${present.el}${irregular ? " (irregular)" : ""}`;
}

export function formPrompt(job: FormJob): string {
  return [
    `Verb: ${job.verb}, rank ${job.rank}. Its card asks ${promptOf(job.source)}.`,
    `Present tense: ${strip(job)}.`,
    "Write one card for each of these forms:",
    ...job.cards.map((c) => `- ${c.person}: ${c.es}`),
    job.wants.length ? `The unit plan asks for: ${job.wants.join("; ")}.` : "The unit plan names no form of this verb.",
    job.others.length ? `The other verbs with form cards ask: ${job.others.join("; ")}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export const FORM_SCHEMA: Rec = object({
  cards: {
    type: "array",
    items: object({
      person: { type: "string", enum: [...PERSONS] },
      en: text,
      hint: nullable(text),
      example: object({ es: text, en: text }),
      trick: nullable(text),
    }),
  },
});

/** The form pass's system prompt and schema per language (DE5). German's are in prompts-de.ts (DE7). */
export const FORM_REQUESTS: Readonly<Record<LangCode, { system: string; schema: Rec }>> = {
  es: { system: FORM_SYSTEM_PROMPT, schema: FORM_SCHEMA },
  de: { system: GERMAN_FORM_SYSTEM, schema: GERMAN_FORM_SCHEMA },
};

/** The words of a sentence, lower case, for checking that an example uses a form. */
const wordsOf = (s: string) => s.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);

/** The output guard for a verb's form cards: one valid card per form asked for, or the failing field names. */
export function guardForms(output: unknown, job: FormJob): Guarded {
  const lang = job.lang ?? "es";
  if (!isRec(output) || !Array.isArray(output.cards)) return { ok: false, kind: "shape", fields: [] };
  const raws = output.cards.filter(isRec);
  const persons = raws.map((r) => r.person);
  if (raws.length !== job.cards.length || !job.cards.every((c) => persons.filter((p) => p === c.person).length === 1)) {
    return { ok: false, kind: "invalid", fields: ["cards"] };
  }
  const g = new Guard();
  const cards = job.cards.map((want) => {
    const r = raws.find((raw) => raw.person === want.person)!;
    const example = claudeExample(r, g, lang);
    const card = withMedia(
      {
        id: want.id,
        rank: job.rank,
        kind: "form",
        pos: "verb",
        target: want.es,
        en: g.text(r.en, "en"),
        hint: g.optional(r.hint, "hint"),
        grammar: structuredClone(job.source.grammar),
        example,
        regional: null,
        trick: g.optional(r.trick, "trick"),
        image: job.source.image,
      },
      lang,
    );
    // Every word of the form is in the example: `voy`, or a German form with its pronoun (`ich rufe an`).
    const used = wordsOf(card.example.target);
    if (!wordsOf(want.es).every((w) => used.includes(w))) g.fail(lang === "es" ? "example.es" : "example.target");
    guardValid(card, g, lang);
    return card as DraftCard;
  });
  const prompts = cards.map((c) => `${c.en.toLowerCase()}|${(c.hint ?? "").toLowerCase()}`);
  if (new Set(prompts).size < cards.length) g.fail("en");
  if (g.fields.size > 0) return { ok: false, kind: "invalid", fields: [...g.fields].sort() };
  return { ok: true, cards, skip: null };
}

export function formTasks(jobs: FormJob[], store: DraftStore): DraftTask[] {
  return jobs.map((job) => ({
    label: `form ${job.verb}`,
    done: store.readGroup("form", job.verb) !== null,
    log: { group: "form", rank: job.rank, word: job.verb },
    failedName: `form-${job.verb}`,
    request: { ...FORM_REQUESTS[store.lang], prompt: formPrompt(job) },
    guard: (output) => guardForms(output, job),
    save: (cards, _skip, meta) => store.saveGroup("form", job.verb, cards, { rank: job.rank, word: job.verb, from: job.source.id, ...meta }),
  }));
}

export function draftForms(jobs: FormJob[], options: DraftOptions): Promise<DraftSummary> {
  return runDraftTasks(formTasks(jobs, options.store), options);
}

/** Words of the English the id keeps, after `phrase-`. */
const PHRASE_ID_WORDS = 4;

/** `phrase-` and the first four words of the plan's English, apostrophes dropped: "I'm from Mexico" is phrase-im-from-mexico. */
export function phraseId(en: string): string {
  const words = slug(en.replace(/['’]/g, "")).split("-").filter(Boolean);
  return words.length ? `phrase-${words.slice(0, PHRASE_ID_WORDS).join("-")}` : "";
}

export interface PhraseJob {
  id: string;
  unit: string;
  unitTitle: string;
  unitGoal: string;
  /** The unit's place in the plan, from 1. */
  unitNumber: number;
  /** The phrase's place among every phrase of the plan, which orders the review. */
  order: number;
  source: "chunk" | "payoff";
  /** The plan's line the phrase was made from, as written; a changed line is drafted again. */
  line: string;
  en: string;
  /** A survival chunk's Spanish, from the plan; null for a payoff line. */
  es: string | null;
  /** The wants of this unit and every earlier one: what the learner has met by the end of the unit. */
  known: string[];
}

/** Every phrase of the plan: each unit's survival chunks, then its payoff lines. Two lines with one id are a problem. */
export function phraseJobs(units: Unit[]): { jobs: PhraseJob[]; problems: string[] } {
  const jobs: PhraseJob[] = [];
  const problems: string[] = [];
  const seen = new Map<string, string>();
  units.forEach((unit, index) => {
    const known = units.slice(0, index + 1).flatMap((u) => u.wants);
    const lines = [
      ...unit.wants
        .filter((w) => w.startsWith(PHRASE_WANT))
        .map((line) => {
          const [es, en] = line.slice(PHRASE_WANT.length).split(" = ");
          return { source: "chunk" as const, line, es: es.trim(), en: (en ?? "").trim() };
        }),
      ...unit.payoff.map((line) => ({ source: "payoff" as const, line, es: null, en: line.trim() })),
    ];
    for (const l of lines) {
      const id = phraseId(l.en);
      if (!id) {
        problems.push(`${unit.id}: a ${l.source} line has no English words to make an id from`);
        continue;
      }
      if (seen.has(id)) {
        problems.push(`${id}: made from a line of ${seen.get(id)} and one of ${unit.id}; reword one`);
        continue;
      }
      seen.set(id, unit.id);
      jobs.push({
        id,
        unit: unit.id,
        unitTitle: unit.title,
        unitGoal: unit.goal,
        unitNumber: index + 1,
        order: jobs.length,
        ...l,
        known,
      });
    }
  });
  return { jobs, problems };
}

export const PHRASE_SYSTEM_PROMPT = `You write flashcards for an app that teaches the most common Spanish words to English speakers who are starting from zero. The Spanish is neutral Latin American Spanish: natural, everyday and informal (tú, never vosotros; usted only when the phrase is to a stranger and the English says so).

These are phrase cards: a whole phrase or short sentence the learner says as one piece. The learner sees the English prompt, says the Spanish phrase, then sees and hears it. They come in two sorts:
- a survival chunk, learned whole before its words ("my name is" = me llamo). The plan gives its Spanish: keep those words, adding only capitals, accents and ¿ ? ¡ ! as the phrase needs.
- a payoff phrase, said at the end of a unit to show what the learner can now say. Write its Spanish with the words the learner has met (listed in the request, earlier units first), plus names. Do not add a word they have not met unless the English cannot be said without it.

Fields
- es: the phrase in natural Latin American Spanish, with accents and ¿ ? ¡ ! as needed, as a speaker would say it.
- en: the English prompt the learner sees: the given English, written as natural English with a capital and its punctuation. Keep its meaning and words.
- hint: what keeps the prompt to exactly one right Spanish answer, or null. Say "informal" or "formal" when tú and usted would both fit, and name the meaning when the English could be said two ways.
- example: one short, natural sentence or line of dialogue, under twelve words, that uses the phrase, with its natural English translation. Use only very common words.
- spain: what Spain says instead when it differs noticeably, else null.
- trick: null, unless one English sentence linking the sound of the Spanish to its meaning would really help.
- words: every word of es in dictionary form, as a dictionary lists it, in order and each once: verbs as the infinitive (estás is estar, llamo is llamar), nouns and adjectives as the masculine singular (buena is bueno), articles as el or un, pronouns as themselves (me, te, lo). Leave out names.

Every text field is one line of plain text, with no Markdown and no surrounding quotes.`;

export function phrasePrompt(job: PhraseJob, lang: LangCode = "es"): string {
  return [
    `Unit ${job.unitNumber} of the starter path: "${job.unitTitle}". Its goal: now you can ${job.unitGoal.replace(/^now you can /i, "")}`,
    job.source === "chunk"
      ? `This is a survival chunk. Its English: "${job.en}". Its ${LANGS[lang].language}, from the plan: ${job.es}`
      : `This is a payoff phrase. Its English: "${job.en}".`,
    "What the learner has met by the end of this unit (the unit plan's wants, earlier units first):",
    ...job.known.map((w) => `- ${w}`),
  ].join("\n");
}

export const PHRASE_SCHEMA: Rec = object({
  es: text,
  en: text,
  hint: nullable(text),
  example: object({ es: text, en: text }),
  spain: nullable(text),
  trick: nullable(text),
  words: { type: "array", items: text },
});

/** The phrase pass's system prompt and schema per language (DE5). German's are in prompts-de.ts (DE7). */
export const PHRASE_REQUESTS: Readonly<Record<LangCode, { system: string; schema: Rec }>> = {
  es: { system: PHRASE_SYSTEM_PROMPT, schema: PHRASE_SCHEMA },
  de: { system: GERMAN_PHRASE_SYSTEM, schema: GERMAN_PHRASE_SCHEMA },
};

/** The 1,000 most common words: a phrase is made only of these. */
export const TOP_WORDS = 1000;

export interface PhraseWords {
  /** Each word of the phrase in dictionary form, with its rank in the word list or null. */
  words: Array<{ word: string; rank: number | null }>;
  /** The words that are not among the top 1,000. The review flags the card for them. */
  outside: string[];
}

/** The output guard for one phrase card: the card and its words, or the failing field names. */
export function guardPhrase(
  output: unknown,
  job: PhraseJob,
  ranks: Map<string, number>,
  lang: LangCode = "es",
): { guarded: Guarded; words: PhraseWords | null } {
  if (!isRec(output)) return { guarded: { ok: false, kind: "shape", fields: [] }, words: null };
  const g = new Guard();
  const rawWords = Array.isArray(output.words) ? output.words : [];
  const words = [...new Set(rawWords.map((w) => (typeof w === "string" ? w.trim().toLowerCase() : "")).filter(Boolean))].map(
    (word) => ({ word, rank: ranks.get(word) ?? null }),
  );
  const known = words.map((w) => w.rank).filter((r): r is number => r !== null);
  if (known.length === 0) g.fail("words");
  const claude = claudeTexts(output, g, lang);
  const card = withMedia(
    {
      id: job.id,
      rank: known.length ? Math.max(...known) : 0,
      kind: "phrase",
      pos: "phrase",
      target: claude.target,
      en: g.text(output.en, "en"),
      hint: g.optional(output.hint, "hint"),
      grammar: null,
      example: claude.example,
      regional: claude.regional,
      trick: g.optional(output.trick, "trick"),
    },
    lang,
  );
  guardValid(card, g, lang);
  if (g.fields.size > 0) return { guarded: { ok: false, kind: "invalid", fields: [...g.fields].sort() }, words: null };
  const outside = words.filter((w) => w.rank === null || w.rank > TOP_WORDS).map((w) => w.word);
  return { guarded: { ok: true, cards: [card as DraftCard], skip: null }, words: { words, outside } };
}

/**
 * Word list ranks by word in lower case, for a phrase's rank: the guard lowers Claude's words, and German's list
 * writes nouns with their capital (`Kaffee`). A word twice keeps its better rank.
 */
export function wordRanks(entries: WordEntry[]): Map<string, number> {
  const ranks = new Map<string, number>();
  for (const e of entries) {
    const word = e.word.toLowerCase();
    if (!ranks.has(word) || e.rank < ranks.get(word)!) ranks.set(word, e.rank);
  }
  return ranks;
}

export function phraseTasks(jobs: PhraseJob[], store: DraftStore, ranks: Map<string, number>): DraftTask[] {
  return jobs.map((job) => {
    let last: PhraseWords | null = null;
    const group = store.readGroup("phrase", job.id);
    return {
      label: `phrase ${job.unit}`,
      done: group !== null && group.line === job.line && group.unit === job.unit,
      log: { group: "phrase", id: job.id, unit: job.unit },
      failedName: job.id,
      request: { ...PHRASE_REQUESTS[store.lang], prompt: phrasePrompt(job, store.lang) },
      guard: (output) => {
        const { guarded, words } = guardPhrase(output, job, ranks, store.lang);
        last = words;
        return guarded;
      },
      save: (cards, _skip, meta) =>
        store.saveGroup("phrase", job.id, cards, {
          rank: cards[0].rank,
          word: job.unit,
          unit: job.unit,
          order: job.order,
          source: job.source,
          line: job.line,
          words: last?.words ?? [],
          outside: last?.outside ?? [],
          ...meta,
        }),
    };
  });
}

export function draftPhrases(jobs: PhraseJob[], ranks: Map<string, number>, options: DraftOptions): Promise<DraftSummary> {
  return runDraftTasks(phraseTasks(jobs, options.store, ranks), options);
}

/** `case-` and the first four words of the plan's English, brackets and apostrophes dropped: `case-i-see-the-man`. */
export function caseId(en: string): string {
  const words = slug(en.replace(/['’[\]]/g, ""), "de").split("-").filter(Boolean);
  return words.length ? `case-${words.slice(0, PHRASE_ID_WORDS).join("-")}` : "";
}

export interface CaseJob {
  id: string;
  unit: string;
  unitTitle: string;
  unitNumber: number;
  /** The case card's place among every case card of the plan, which orders the review. */
  order: number;
  /** The plan's want the card was made from, as written; a changed want is drafted again. */
  line: string;
  /** The answer, from the plan: `den Mann`, `mit einem Freund`. */
  target: string;
  /** The prompt, from the plan, its target in square brackets: `I see [the] man`. */
  en: string;
  /** The wants of this unit and every earlier one. */
  known: string[];
}

/**
 * Every case card of the plan (DE9): each unit's `case:` wants, in plan order. This is German's case list, which
 * Courtney approves with the plan. Two wants with one id are a problem.
 */
export function caseJobs(units: Unit[]): { jobs: CaseJob[]; problems: string[] } {
  const jobs: CaseJob[] = [];
  const problems: string[] = [];
  const seen = new Map<string, string>();
  units.forEach((unit, index) => {
    const known = units.slice(0, index + 1).flatMap((u) => u.wants);
    for (const line of unit.wants.filter((w) => w.startsWith(CASE_WANT))) {
      const [target, en] = line.slice(CASE_WANT.length).split(" = ").map((part) => (part ?? "").trim());
      const id = en ? caseId(en) : "";
      if (!id || !target) {
        problems.push(`${unit.id}: a case want must read "case: <German> = <English with one [target]>"`);
        continue;
      }
      if (seen.has(id)) {
        problems.push(`${id}: made from a want of ${seen.get(id)} and one of ${unit.id}; reword one`);
        continue;
      }
      seen.set(id, unit.id);
      jobs.push({ id, unit: unit.id, unitTitle: unit.title, unitNumber: index + 1, order: jobs.length, line, target, en, known });
    }
  });
  return { jobs, problems };
}

export function casePrompt(job: CaseJob): string {
  return [
    `Unit ${job.unitNumber} of the starter path: "${job.unitTitle}".`,
    `The card's answer: ${job.target}`,
    `Its English prompt: ${job.en}`,
    "What the learner has met by the end of this unit (the unit plan's wants, earlier units first):",
    ...job.known.map((w) => `- ${w}`),
  ].join("\n");
}

/** The case pass's system prompt and schema: German only, since Spanish has no case cards. */
export const CASE_REQUESTS: Readonly<Partial<Record<LangCode, { system: string; schema: Rec }>>> = {
  de: { system: GERMAN_CASE_SYSTEM, schema: GERMAN_CASE_SCHEMA },
};

/** The output guard for one case card: the card and its words, or the failing field names. */
export function guardCase(output: unknown, job: CaseJob, ranks: Map<string, number>): { guarded: Guarded; words: PhraseWords | null } {
  if (!isRec(output)) return { guarded: { ok: false, kind: "shape", fields: [] }, words: null };
  const g = new Guard();
  const rawWords = Array.isArray(output.words) ? output.words : [];
  const words = [...new Set(rawWords.map((w) => (typeof w === "string" ? w.trim().toLowerCase() : "")).filter(Boolean))].map(
    (word) => ({ word, rank: ranks.get(word) ?? null }),
  );
  const known = words.map((w) => w.rank).filter((r): r is number => r !== null);
  if (known.length === 0) g.fail("words");
  const from = typeof output.from === "string" ? output.from.trim().toLowerCase() : "";
  // Claude spells the gender out (masculine); the deck has m, f, n and pl. Anything else reaches the validator as it is.
  const gender = CASE_GENDERS[output.gender as keyof typeof CASE_GENDERS] ?? output.gender ?? null;
  const card = withMedia(
    {
      id: job.id,
      rank: known.length ? Math.max(...known) : 0,
      kind: "case",
      pos: output.pos,
      target: job.target,
      en: job.en,
      hint: g.optional(output.hint, "hint"),
      grammar: { case: output.case, gender, from },
      example: claudeExample(output, g, "de"),
      regional: null,
      trick: g.optional(output.trick, "trick"),
      image: null,
    },
    "de",
  );
  // Every word of the answer is in the example: `den Mann` in "Ich sehe den Mann."
  const used = wordsOf(card.example.target);
  if (!wordsOf(job.target).every((w) => used.includes(w))) g.fail("example.target");
  guardValid(card, g, "de");
  if (g.fields.size > 0) return { guarded: { ok: false, kind: "invalid", fields: [...g.fields].sort() }, words: null };
  const outside = words.filter((w) => w.rank === null || w.rank > TOP_WORDS).map((w) => w.word);
  return { guarded: { ok: true, cards: [card as DraftCard], skip: null }, words: { words, outside } };
}

export function caseTasks(jobs: CaseJob[], store: DraftStore, ranks: Map<string, number>): DraftTask[] {
  const request = CASE_REQUESTS[store.lang];
  if (!request) throw new Error(`${LANGS[store.lang].language} has no case cards`);
  return jobs.map((job) => {
    let last: PhraseWords | null = null;
    const group = store.readGroup("case", job.id);
    return {
      label: `case ${job.unit}`,
      done: group !== null && group.line === job.line && group.unit === job.unit,
      log: { group: "case", id: job.id, unit: job.unit },
      failedName: job.id,
      request: { ...request, prompt: casePrompt(job) },
      guard: (output) => {
        const { guarded, words } = guardCase(output, job, ranks);
        last = words;
        return guarded;
      },
      save: (cards, _skip, meta) =>
        store.saveGroup("case", job.id, cards, {
          rank: cards[0].rank,
          word: job.unit,
          unit: job.unit,
          order: job.order,
          line: job.line,
          words: last?.words ?? [],
          outside: last?.outside ?? [],
          ...meta,
        }),
    };
  });
}

export function draftCases(jobs: CaseJob[], ranks: Map<string, number>, options: DraftOptions): Promise<DraftSummary> {
  return runDraftTasks(caseTasks(jobs, options.store, ranks), options);
}
