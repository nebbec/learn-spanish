// The tag pass (L5): one Claude call per drafted word (and per verb's form cards, and per unit's phrase
// cards) places each card on the learning path. Claude is given the unit plan, the tip list, the id,
// prompt and answer of every drafted card, and the group's own cards, and returns for each card its
// `unit` (with the `want` it fills), `requires` and `tip`. Each card's tag goes to content/tags/<id>.json
// with the fingerprint of the draft it saw. The ordering build (L6) reads the tags.
//
// Script checks, on Claude's answer and again on every stored tag: every required id is a drafted card,
// no card requires itself or one card twice, the unit and tip are in the plan and the tip list, and the
// want is one of the unit's wants. A phrase card's unit and want are not Claude's: they come from the
// plan line it was drafted from.
//
// Nothing here prints card text: only ranks, words from the list, ids, unit and tip ids, and counts.
//
// The rules are in docs/design.md under "Learning path", "Order is computed, not hand-written", and
// "Decided in L5".

import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import type { DraftCard } from "@/lib/deck/types";
import {
  type DraftOptions,
  type DraftStore,
  type DraftSummary,
  type DraftTask,
  type Guarded,
  runDraftTasks,
  type TaskStore,
  writeJson,
} from "./drafting";
import { allDrafted, cardHash, readDraftCard } from "./reviewing";
import { unitCap, type TipEntry, type Unit } from "./units";

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);

/** A card's place on the learning path, as the tag pass sets it. */
export interface Tag {
  id: string;
  /** A unit id of content/units.json, or null: the frequency phase. */
  unit: string | null;
  /** The want of that unit the card fills, copied exactly, or null (always null without a unit). */
  want: string | null;
  /** Ids of drafted cards that must come before this one. */
  requires: string[];
  /** A tip id of content/tips.json, or null. */
  tip: string | null;
  /** The contrast line shown on the intro and the reveal (L9), or null on most cards. */
  why: string | null;
}

/** The longest contrast line the tag pass may write: one short sentence. */
export const WHY_MAX = 140;

/** A tag as content/tags/<id>.json holds it. */
export interface TagFile extends Tag {
  /** `cardHash` of the drafted card the tag was made for: a redrafted card is tagged again. */
  draft: string;
  /** The group the card was tagged with: a word, a verb's form cards or a unit's phrase cards. */
  group: string;
  via: string;
  model: string;
  effort: string;
  taggedAt: string;
}

/** A phrase card's place in the plan, from its group file: not Claude's to change. */
export interface PhrasePlace {
  unit: string;
  /** The survival chunk's want (`phrase: <es> = <en>`), or null for a payoff line. */
  want: string | null;
  /** The phrase's words in dictionary form, from the draft pass. */
  words: string[];
}

/** One call's worth of tagging. */
export interface TagGroup {
  /** Printed: `#13 tener`, `forms ir`, `phrases who-i-am`. */
  label: string;
  kind: "word" | "form" | "phrase";
  /** The word, the verb, or the unit id. */
  name: string;
  /** A group's rank: the word's, the verb's, or the highest of a unit's phrases. */
  rank: number;
  cards: DraftCard[];
  /** For a phrase group: each card's place in the plan, by id. */
  phrases: Record<string, PhrasePlace>;
}

/** Every drafted group with cards, in the order of `allDrafted`: words by rank, then verbs, then units. */
export function tagGroups(drafts: DraftStore): TagGroup[] {
  const groups: TagGroup[] = [];
  for (const g of allDrafted(drafts)) {
    const cards = g.cards.map((id) => readDraftCard(drafts, id)).filter((c): c is DraftCard => c !== null);
    if (!cards.length) continue;
    const kind = g.kind ?? "word";
    const phrases: Record<string, PhrasePlace> = {};
    if (kind === "phrase") {
      for (const card of cards) {
        const file = drafts.readGroup("phrase", card.id) ?? {};
        const words = Array.isArray(file.words) ? (file.words as Array<{ word: string }>).map((w) => w.word) : [];
        const line = typeof file.line === "string" ? file.line : "";
        phrases[card.id] = { unit: String(file.unit ?? g.word), want: file.source === "chunk" ? line : null, words };
      }
    }
    const label = kind === "word" ? `#${g.rank} ${g.word}` : `${kind === "form" ? "forms" : "phrases"} ${g.word}`;
    groups.push({ label, kind, name: g.word, rank: g.rank, cards, phrases });
  }
  return groups;
}

/** What every call is told, and what every tag is checked against. */
export interface TagContext {
  units: Unit[];
  tips: TipEntry[];
  /** Every drafted card, in the order of `tagGroups`. */
  cards: DraftCard[];
}

export function tagContext(groups: TagGroup[], units: Unit[], tips: TipEntry[]): TagContext {
  return { units, tips, cards: groups.flatMap((g) => g.cards) };
}

export const TAG_SYSTEM_PROMPT = `You place flashcards on the learning path of an app that teaches the most common Spanish words to English speakers who start from zero and want to speak. The path begins with the starter path: themed units, in the order of the unit plan you are given, each ending in a few phrases the learner can now say. Then comes the frequency phase: every other card, most common word first. A script computes the order from the tags you set on each card. You do not write or judge cards; you only tag them.

The cards: a content or glue card is one meaning of one Spanish word in dictionary form (a glue card's prompt marks the target word in square brackets); a form card is one present-tense form of a core irregular verb ("I am (identity)" is soy); a phrase card is a whole phrase.

Answer for every card you are asked about, once each, with these fields:
- id: the card's id, exactly as given.
- unit: the id of the unit whose wants this card fills, or null. A card belongs to a unit only when one of that unit's wants names its word in the meaning this card teaches. A want is the word alone ("yo", "casa"), or the word and its meaning ("de: from", "ser: I am (soy)"); a form card fills the want naming its verb and its form. Another meaning of a wanted word does not belong: "de: from" does not take the card for de meaning "of", and a verb's infinitive card does not fill a want for one of its forms. If wants of several units name the card, take the earliest unit. Most cards belong to no unit: null.
- want: the want the card fills, copied exactly as written in the unit's wants, or null when unit is null.
- requires: ids of cards from the list of every drafted card that the learner must meet before this card makes sense. Keep it short: most word cards require nothing. Use it for:
  - a form card: the card of its pronoun (the "I" card for a yo form, "you" for a tú form, "he" for an él form). hay requires nothing.
  - a phrase card that is not a survival chunk: the card of each word of the phrase in the meaning it has there; for a form of a core verb, that form's card when there is one (estoy needs the "I am (state)" form card), else the verb's card. Leave out words with no card in the list.
  - a survival chunk (marked so) is learned whole, before its words: it requires nothing.
  - a word card only when it cannot be understood without another card, which is rare.
  Never the card itself, never an id that is not in the list, and never the same id twice. A card in a unit requires only cards of its own unit or an earlier one.
- tip: the id of the tip this card depends on, or null. The app shows a tip once, just before the first card that names it, so name a tip on the cards that first need its idea. A unit that introduces a tip needs at least its first such card to name it (the ser form cards name the tip about dropping "I" and "you"); a card of the frequency phase names a tip only when it is what the tip is about (por and para name the tip about por and para). At most one tip per card; most cards name none.
- why: one short sentence in English, under ${WHY_MAX} characters, shown under the card when it is introduced, or null. Write it only where this card is easily confused with a near neighbour the learner meets nearby: ser and estar ("Use estar for how or where something is right now; ser for what it is."), por and para, saber and conocer, pedir and preguntar, tú and usted, and the like. It says when to use this card's word rather than the other. Null on nearly every card.

Answer with the ids, unit ids, wants and tip ids exactly as given.`;

/** A card as the tagger sees it: no media paths. */
const shown = (card: DraftCard) => Object.fromEntries(Object.entries(card).filter(([key]) => key !== "image" && key !== "audio"));

/** The request: the plan, the tips and every card first (the same in every call), then the group's cards. */
export function tagPrompt(group: TagGroup, ctx: TagContext): string {
  const heading =
    group.kind === "word"
      ? `The cards of the word "${group.name}" (rank ${group.rank} in the frequency list)`
      : group.kind === "form"
        ? `The form cards of the verb "${group.name}"`
        : `The phrase cards drafted for unit ${group.name}; each one's unit is fixed`;
  return [
    "The unit plan, in order:",
    ...ctx.units.flatMap((unit, i) => [
      `Unit ${i + 1}: ${unit.id}, "${unit.title}". Now you can ${unit.goal.replace(/^now you can /i, "")} Introduces tip: ${unit.tip ?? "none"}. Holds at most ${unitCap(unit)} cards.`,
      "  wants:",
      ...unit.wants.map((w) => `  - ${w}`),
      ...(unit.payoff.length ? ["  payoff phrases:", ...unit.payoff.map((p) => `  - ${p}`)] : []),
    ]),
    "",
    "The tips, in the order they are met:",
    ...ctx.tips.map((t) => `- ${t.id}: ${t.title}. ${t.about}`),
    "",
    "Every drafted card (id | prompt | answer):",
    ...ctx.cards.map((c) => `- ${c.id} | ${c.en}${c.hint ? ` (${c.hint})` : ""} | ${c.es}`),
    "",
    `Tag these cards. ${heading}:`,
    ...group.cards.flatMap((card) => {
      const place = group.phrases[card.id];
      return [
        JSON.stringify(shown(card)),
        ...(place
          ? [
              `  ${place.want ? "A survival chunk" : "A payoff phrase"} of unit ${place.unit}. Its words: ${place.words.join(", ") || "not listed"}.`,
            ]
          : []),
      ];
    }),
  ].join("\n");
}

const text = { type: "string" };
const nullable = (schema: Rec) => ({ anyOf: [schema, { type: "null" }] });
const object = (properties: Rec) => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });

export const TAG_SCHEMA: Rec = object({
  cards: {
    type: "array",
    items: object({
      id: text,
      unit: nullable(text),
      want: nullable(text),
      requires: { type: "array", items: text },
      tip: nullable(text),
      why: nullable(text),
    }),
  },
});

export interface TagProblem {
  field: "unit" | "want" | "requires" | "tip" | "why";
  /** Names ids only, never card text or a want's text. */
  problem: string;
}

/** The script checks on one tag. */
export function tagProblems(tag: Tag, ids: ReadonlySet<string>, units: Unit[], tips: TipEntry[]): TagProblem[] {
  const problems: TagProblem[] = [];
  const unit = tag.unit === null ? null : units.find((u) => u.id === tag.unit);
  if (unit === undefined) problems.push({ field: "unit", problem: `unit ${tag.unit} is not in content/units.json` });
  if (tag.want !== null) {
    if (tag.unit === null) problems.push({ field: "want", problem: "a want with no unit" });
    else if (unit && !unit.wants.includes(tag.want)) problems.push({ field: "want", problem: `the want is not one of ${unit.id}'s wants` });
  }
  const seen = new Set<string>();
  for (const id of tag.requires) {
    if (id === tag.id) problems.push({ field: "requires", problem: "requires itself" });
    else if (!ids.has(id)) problems.push({ field: "requires", problem: `requires ${id}, which is not a drafted card` });
    if (seen.has(id)) problems.push({ field: "requires", problem: `requires ${id} twice` });
    seen.add(id);
  }
  if (tag.tip !== null && !tips.some((t) => t.id === tag.tip)) {
    problems.push({ field: "tip", problem: `tip ${tag.tip} is not in content/tips.json` });
  }
  const why = tag.why ?? null; // Tags made before L9 have no why.
  if (why !== null && (!why.trim() || /[\r\n]/.test(why) || why.length > WHY_MAX)) {
    problems.push({ field: "why", problem: `the why line is not one line of 1 to ${WHY_MAX} characters` });
  }
  return problems;
}

const trimmed = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

/** The output guard: Claude's answer as one tag per card of the group, or the failing fields. */
export function guardTags(output: unknown, group: TagGroup, ctx: TagContext): Guarded<Tag> {
  if (!isRec(output) || !Array.isArray(output.cards)) return { ok: false, kind: "shape", fields: [] };
  const fields = new Set<string>();
  const byId = new Map<string, Rec>();
  for (const raw of output.cards) {
    const id = isRec(raw) ? trimmed(raw.id) : null;
    if (!id || byId.has(id) || !group.cards.some((c) => c.id === id)) fields.add("id");
    else byId.set(id, raw as Rec);
  }
  if (byId.size < group.cards.length) fields.add("cards");
  const ids = new Set(ctx.cards.map((c) => c.id));
  const tags = group.cards.map((card): Tag => {
    const raw = byId.get(card.id) ?? { requires: [] }; // A missing card is already refused as "cards".
    const requires = Array.isArray(raw.requires) ? raw.requires.map((r) => (typeof r === "string" ? r.trim() : "")) : null;
    if (!requires) fields.add("requires");
    const place = group.phrases[card.id];
    const tag: Tag = {
      id: card.id,
      unit: place ? place.unit : trimmed(raw.unit),
      want: place ? place.want : trimmed(raw.want),
      requires: requires ?? [],
      tip: trimmed(raw.tip),
      why: trimmed(raw.why),
    };
    for (const p of tagProblems(tag, ids, ctx.units, ctx.tips)) fields.add(p.field);
    return tag;
  });
  if (fields.size) return { ok: false, kind: "invalid", fields: [...fields].sort() };
  return { ok: true, cards: tags, skip: null };
}

/** The tag files under one directory (content/tags by default). */
export class TagStore implements TaskStore {
  readonly failedDir: string;
  readonly logFile: string;

  constructor(readonly dir: string) {
    this.failedDir = path.join(dir, ".failed");
    this.logFile = path.join(dir, "usage.jsonl");
    mkdirSync(dir, { recursive: true });
  }

  file(id: string) {
    return path.join(this.dir, `${id}.json`);
  }

  /** The ids of every tag file on disk. */
  ids(): string[] {
    return readdirSync(this.dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.slice(0, -".json".length))
      .sort();
  }

  read(id: string): TagFile | null {
    return existsSync(this.file(id)) ? (JSON.parse(readFileSync(this.file(id), "utf8")) as TagFile) : null;
  }

  save(group: TagGroup, tags: Tag[], meta: Rec): string[] {
    const { draftedAt, ...run } = meta;
    for (const tag of tags) {
      const card = group.cards.find((c) => c.id === tag.id)!;
      writeJson(this.file(tag.id), { ...tag, draft: cardHash(card), group: group.label, ...run, taggedAt: draftedAt });
    }
    return tags.map((t) => t.id);
  }

  /** Deletes the tags of cards that are no longer drafted (a word redrafted into fewer cards). Returns their ids. */
  prune(drafted: ReadonlySet<string>): string[] {
    const gone = this.ids().filter((id) => !drafted.has(id));
    for (const id of gone) rmSync(this.file(id), { force: true });
    return gone;
  }

  /** Keeps an answer the guard refused, for a person to look at. Git ignores this folder. */
  saveFailed(name: string, attempt: number, output: unknown) {
    mkdirSync(this.failedDir, { recursive: true });
    writeJson(path.join(this.failedDir, `${name}-${attempt}.json`), output);
  }

  log(line: Rec) {
    appendFileSync(this.logFile, `${JSON.stringify(line)}\n`);
  }
}

/** A card's tag is current when it was made for the card's present draft and passes the checks. */
function isCurrent(tag: TagFile | null, card: DraftCard, ids: ReadonlySet<string>, ctx: TagContext): boolean {
  return tag !== null && tag.draft === cardHash(card) && tagProblems(tag, ids, ctx.units, ctx.tips).length === 0;
}

export type TagOptions = Omit<DraftOptions, "store"> & { store: TagStore };

export function tagTasks(groups: TagGroup[], store: TagStore, ctx: TagContext): DraftTask<Tag>[] {
  const ids = new Set(ctx.cards.map((c) => c.id));
  return groups.map((group) => ({
    label: group.label,
    done: group.cards.every((card) => isCurrent(store.read(card.id), card, ids, ctx)),
    log: group.kind === "word" ? { rank: group.rank, word: group.name } : { group: group.kind, name: group.name },
    failedName: group.kind === "word" ? String(group.rank).padStart(4, "0") : `${group.kind}-${group.name}`,
    request: { system: TAG_SYSTEM_PROMPT, prompt: tagPrompt(group, ctx), schema: TAG_SCHEMA },
    guard: (output) => guardTags(output, group, ctx),
    save: (tags, _skip, meta) => store.save(group, tags, meta),
  }));
}

/** Tags each group with a card not yet tagged, tagged for an older draft, or failing the checks (every group with `redo`). */
export function tagCards(groups: TagGroup[], ctx: TagContext, options: TagOptions): Promise<DraftSummary> {
  return runDraftTasks(tagTasks(groups, options.store, ctx), options);
}

export interface TagCheck {
  /** Cards with a current tag that passes the checks. */
  tagged: number;
  /** Drafted cards with no tag file. */
  untagged: string[];
  /** Cards whose tag was made for an earlier draft. */
  stale: string[];
  /** "id: problem", naming ids only. Includes a tag file for a card that is not drafted. */
  problems: string[];
}

/** Checks every stored tag against the drafts, the unit plan and the tip list. */
export function checkTags(store: TagStore, ctx: TagContext): TagCheck {
  const ids = new Set(ctx.cards.map((c) => c.id));
  const result: TagCheck = { tagged: 0, untagged: [], stale: [], problems: [] };
  for (const card of ctx.cards) {
    const tag = store.read(card.id);
    if (!tag) {
      result.untagged.push(card.id);
      continue;
    }
    if (tag.draft !== cardHash(card)) result.stale.push(card.id);
    const problems = tagProblems(tag, ids, ctx.units, ctx.tips);
    result.problems.push(...problems.map((p) => `${card.id}: ${p.problem}`));
    if (tag.draft === cardHash(card) && !problems.length) result.tagged++;
  }
  for (const id of store.ids()) if (!ids.has(id)) result.problems.push(`${id}: no drafted card`);
  return result;
}
