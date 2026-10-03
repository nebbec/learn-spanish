// The learning path's form and phrase cards in the draft pass (L3). Form cards come from a fixed list of
// core irregular verbs: one Claude call per verb writes the prompts and examples of its three forms, and the
// script makes the ids, takes the form itself, the grammar strip and the still from the verb's drafted card.
// Phrase cards come from content/units.json: each unit's survival chunks (`phrase: <es> = <en>` wants) and
// payoff lines, one call per phrase; the script makes the id from the plan's English and the rank from the
// words Claude lists. Both write card files to content/drafts/cards/ like any card, with a group file per
// verb (`forms/<verb>.json`) or per phrase (`phrases/<id>.json`) instead of a word file.
//
// Nothing here prints card text: only verbs, unit ids, card ids, counts and error kinds.
//
// The rules are in docs/design.md under "Learning path" ("Form cards", "Phrase cards") and "Content
// pipeline", "Decided in L3".

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { DraftCard, VerbGrammar } from "@/lib/deck/types";
import {
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
import { PHRASE_WANT, type Unit } from "./units";

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

/** A form card's person: yo, tú or él, or haber's impersonal hay. */
export const PERSONS = ["yo", "tu", "el", "hay"] as const;
export type Person = (typeof PERSONS)[number];
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

/** `<verb>-form-<yo|tu|el>`, or `haber-form-hay`. */
export const formId = (verb: string, person: Person) => (person === "hay" ? "haber-form-hay" : `${verb}-form-${person}`);

/** The form for a person: from the verb's present-tense strip, or hay. */
const formOf = (grammar: VerbGrammar, person: Person) => (person === "hay" ? "hay" : grammar.present[person]);

export interface FormJob {
  verb: string;
  rank: number;
  /** The verb's drafted card. */
  source: DraftCard & { pos: "verb" };
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

/** The form jobs for the given verbs (all by default). A verb whose card is not drafted, or not a verb, is missing. */
export function formJobs(store: DraftStore, units: Unit[], verbs?: string[]): { jobs: FormJob[]; missing: string[] } {
  const sources = new Map(FORM_VERBS.map((v) => [v.verb, readCard(store, v.card)]));
  const jobs: FormJob[] = [];
  const missing: string[] = [];
  for (const v of FORM_VERBS) {
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
      cards: v.persons.map((person) => ({ person, id: formId(v.verb, person), es: formOf(source.grammar, person) })),
      wants: units.flatMap((u) => u.wants.filter((w) => w.startsWith(`${v.verb}:`))),
      others: FORM_VERBS.filter((o) => o.verb !== v.verb).flatMap((o) => {
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

export function formPrompt(job: FormJob): string {
  const { present, irregular } = job.source.grammar;
  return [
    `Verb: ${job.verb}, rank ${job.rank}. Its card asks ${promptOf(job.source)}.`,
    `Present tense: yo ${present.yo} · tú ${present.tu} · él ${present.el}${irregular ? " (irregular)" : ""}.`,
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

/** The words of a sentence, lower case, for checking that an example uses a form. */
const wordsOf = (s: string) => s.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);

/** The output guard for a verb's form cards: one valid card per form asked for, or the failing field names. */
export function guardForms(output: unknown, job: FormJob): Guarded {
  if (!isRec(output) || !Array.isArray(output.cards)) return { ok: false, kind: "shape", fields: [] };
  const raws = output.cards.filter(isRec);
  const persons = raws.map((r) => r.person);
  if (raws.length !== job.cards.length || !job.cards.every((c) => persons.filter((p) => p === c.person).length === 1)) {
    return { ok: false, kind: "invalid", fields: ["cards"] };
  }
  const g = new Guard();
  const cards = job.cards.map((want) => {
    const r = raws.find((raw) => raw.person === want.person)!;
    const example = isRec(r.example) ? r.example : {};
    const card = withMedia({
      id: want.id,
      rank: job.rank,
      kind: "form",
      pos: "verb",
      es: want.es,
      en: g.text(r.en, "en"),
      hint: g.optional(r.hint, "hint"),
      grammar: structuredClone(job.source.grammar),
      example: { es: g.text(example.es, "example.es"), en: g.text(example.en, "example.en") },
      spain: null,
      trick: g.optional(r.trick, "trick"),
      image: job.source.image,
    });
    if (!wordsOf(card.example.es).includes(want.es.toLowerCase())) g.fail("example.es");
    guardValid(card, g);
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
    request: { system: FORM_SYSTEM_PROMPT, prompt: formPrompt(job), schema: FORM_SCHEMA },
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

export function phrasePrompt(job: PhraseJob): string {
  return [
    `Unit ${job.unitNumber} of the starter path: "${job.unitTitle}". Its goal: now you can ${job.unitGoal.replace(/^now you can /i, "")}`,
    job.source === "chunk"
      ? `This is a survival chunk. Its English: "${job.en}". Its Spanish, from the plan: ${job.es}`
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
): { guarded: Guarded; words: PhraseWords | null } {
  if (!isRec(output)) return { guarded: { ok: false, kind: "shape", fields: [] }, words: null };
  const g = new Guard();
  const rawWords = Array.isArray(output.words) ? output.words : [];
  const words = [...new Set(rawWords.map((w) => (typeof w === "string" ? w.trim().toLowerCase() : "")).filter(Boolean))].map(
    (word) => ({ word, rank: ranks.get(word) ?? null }),
  );
  const known = words.map((w) => w.rank).filter((r): r is number => r !== null);
  if (known.length === 0) g.fail("words");
  const example = isRec(output.example) ? output.example : {};
  const card = withMedia({
    id: job.id,
    rank: known.length ? Math.max(...known) : 0,
    kind: "phrase",
    pos: "phrase",
    es: g.text(output.es, "es"),
    en: g.text(output.en, "en"),
    hint: g.optional(output.hint, "hint"),
    grammar: null,
    example: { es: g.text(example.es, "example.es"), en: g.text(example.en, "example.en") },
    spain: g.optional(output.spain, "spain"),
    trick: g.optional(output.trick, "trick"),
  });
  guardValid(card, g);
  if (g.fields.size > 0) return { guarded: { ok: false, kind: "invalid", fields: [...g.fields].sort() }, words: null };
  const outside = words.filter((w) => w.rank === null || w.rank > TOP_WORDS).map((w) => w.word);
  return { guarded: { ok: true, cards: [card as DraftCard], skip: null }, words: { words, outside } };
}

/** Word list ranks by word, for a phrase's rank. */
export const wordRanks = (entries: WordEntry[]) => new Map(entries.map((e) => [e.word, e.rank]));

export function phraseTasks(jobs: PhraseJob[], store: DraftStore, ranks: Map<string, number>): DraftTask[] {
  return jobs.map((job) => {
    let last: PhraseWords | null = null;
    const group = store.readGroup("phrase", job.id);
    return {
      label: `phrase ${job.unit}`,
      done: group !== null && group.line === job.line && group.unit === job.unit,
      log: { group: "phrase", id: job.id, unit: job.unit },
      failedName: job.id,
      request: { system: PHRASE_SYSTEM_PROMPT, prompt: phrasePrompt(job), schema: PHRASE_SCHEMA },
      guard: (output) => {
        const { guarded, words } = guardPhrase(output, job, ranks);
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
