// The example redraft (L7): `npm run draft -- --examples --ids a,b` asks Claude
// for a new example sentence for each named card, given the words met before
// the card in the learning path's order, and changes nothing else of the card.
// The known-words check (known-words.ts) is the guard: an example that still
// uses words not met yet is refused and asked again. A card whose tag was
// current keeps it, since the tag pass's fields do not depend on the example;
// its review does not, so `npm run review` checks the new example.
//
// Nothing here prints card text: only card ids, counts and error kinds.
//
// The rules are in docs/design.md under "Learning path", "Example sentences
// use known words" and "Decided in L7".

import path from "node:path";
import type { Card, DraftCard } from "@/lib/deck/types";
import type { DeckBuild } from "./deck-build";
import {
  type DraftOptions,
  type DraftStore,
  type DraftSummary,
  type DraftTask,
  Guard,
  type Guarded,
  guardValid,
  runDraftTasks,
  writeJson,
} from "./drafting";
import {
  checkExample,
  type ExampleCheck,
  exampleProblem,
  FREQUENCY_OTHER_WORDS,
  type Lemmas,
  knownBefore,
  wordsBefore,
} from "./known-words";
import { cardHash, readDraftCard } from "./reviewing";
import type { TagStore } from "./tagging";

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);

export const EXAMPLE_SYSTEM_PROMPT = `You write example sentences for flashcards in an app that teaches the most common Spanish words to English speakers who start from zero. The Spanish is neutral Latin American Spanish: natural, everyday and informal (tú, never vosotros). The cards come in a fixed order, and a learner must understand every word of an example from the cards before it.

You are given one card and the words the learner has met before it. Write one new example sentence for the card and its English translation:
- It uses the card's word in the card's meaning, and a conjugated verb (for a verb card, a conjugated form of the verb).
- Short: under ten words.
- Apart from the card's own words, it uses only the words met: verbs in any form, nouns and adjectives in the singular or plural and either gender. Names of people and places and numbers are always allowed.
- In the starter path, at most one other word, and only an obvious cognate that appears in the English translation in the same or nearly the same spelling (hotel, doctor, chocolate). In the frequency phase, at most ${FREQUENCY_OTHER_WORDS} other words.
- The English is a natural, faithful translation.

Change nothing else: you write only the example.`;

const text = { type: "string" };
export const EXAMPLE_SCHEMA: Rec = {
  type: "object",
  additionalProperties: false,
  required: ["example"],
  properties: {
    example: { type: "object", additionalProperties: false, required: ["es", "en"], properties: { es: text, en: text } },
  },
};

/** One card whose example is redrafted. */
export interface ExampleJob {
  /** The drafted id: the card file's name. */
  id: string;
  card: DraftCard;
  /** The card as the order places it: its `unit` says starter path or frequency phase. */
  placed: Card;
  /** Lemmas known before the card. */
  known: Set<string>;
  /** The words of the cards before it, as written on them, for the prompt. */
  met: string[];
  /** The current example's known-words check. */
  check: ExampleCheck;
}

/**
 * The jobs for the given ids (drafted ids, or the ids the build lists), in the order given. `missing` holds ids
 * that are not in the computed order (not drafted, rejected, or the order has problems).
 */
export function exampleJobs(
  build: Pick<DeckBuild, "order" | "draftIds">,
  drafts: DraftStore,
  ids: string[],
  lemmas: Lemmas,
): { jobs: ExampleJob[]; missing: string[] } {
  const jobs: ExampleJob[] = [];
  const missing: string[] = [];
  for (const id of ids) {
    const placed = build.order.find((c) => c.id === id || build.draftIds.get(c.id) === id);
    const draftId = placed ? (build.draftIds.get(placed.id) ?? placed.id) : id;
    const card = placed ? readDraftCard(drafts, draftId) : null;
    if (!placed || !card) {
      missing.push(id);
      continue;
    }
    const known = knownBefore(build.order, placed.id, lemmas)!;
    const check = checkExample({ ...card, unit: placed.unit }, known, lemmas);
    jobs.push({ id: draftId, card, placed, known, met: wordsBefore(build.order, placed.id), check });
  }
  return { jobs, missing };
}

function grammarLine(card: DraftCard): string | null {
  const g = card.grammar as Record<string, unknown> | null;
  if (g && isRec(g.present)) return `Present tense: yo ${g.present.yo} · tú ${g.present.tu} · él ${g.present.el}`;
  if (g && typeof g.feminine === "string") return `Feminine: ${g.feminine}`;
  return null;
}

export function examplePrompt(job: ExampleJob): string {
  const { card, placed, check } = job;
  const place = placed.unit ? `the starter path, unit ${placed.unit}` : "the frequency phase";
  return [
    `Card (${card.kind}, ${card.pos}), in ${place}:`,
    `Prompt: ${card.en}${card.hint ? ` (${card.hint})` : ""}`,
    `Answer: ${card.es}`,
    grammarLine(card),
    `Current example: ${card.example.es} = ${card.example.en}`,
    check.ok ? "Why it is redrafted: asked for by a person." : `Why it is redrafted: ${exampleProblem(check)}`,
    "",
    job.met.length
      ? `Words met before this card (${job.met.length}): ${job.met.join(", ")}`
      : "Words met before this card: none. This is the first card.",
    "",
    "Write the new example.",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

/** The guard: a valid card with only its example changed, and an example that passes the known-words check. */
export function guardExample(output: unknown, job: ExampleJob, lemmas: Lemmas): Guarded {
  if (!isRec(output) || !isRec(output.example)) return { ok: false, kind: "shape", fields: [] };
  const g = new Guard();
  const example = { es: g.text(output.example.es, "example.es"), en: g.text(output.example.en, "example.en") };
  const card: DraftCard = { ...job.card, example };
  guardValid(card, g);
  if (!g.fields.size && !checkExample({ ...card, unit: job.placed.unit }, job.known, lemmas).ok) g.fail("example.es");
  if (g.fields.size > 0) return { ok: false, kind: "invalid", fields: [...g.fields].sort() };
  return { ok: true, cards: [card], skip: null };
}

/** Writes the card with its new example, and moves a current tag on to the new draft. */
export function saveExample(drafts: DraftStore, tags: TagStore | null, job: ExampleJob, card: DraftCard): string[] {
  writeJson(path.join(drafts.cardsDir, `${job.id}.json`), card);
  const tag = tags?.read(job.id);
  if (tags && tag && tag.draft === cardHash(job.card)) writeJson(tags.file(job.id), { ...tag, draft: cardHash(card) });
  return [job.id];
}

export function exampleTasks(jobs: ExampleJob[], drafts: DraftStore, tags: TagStore | null, lemmas: Lemmas): DraftTask[] {
  return jobs.map((job) => ({
    label: `example ${job.id}`,
    // An example that already passes is done: a rerun resumes, and --redo redrafts it anyway.
    done: job.check.ok,
    log: { group: "example", rank: job.card.rank, id: job.id },
    failedName: `example-${job.id}`,
    request: { system: EXAMPLE_SYSTEM_PROMPT, prompt: examplePrompt(job), schema: EXAMPLE_SCHEMA },
    guard: (output) => guardExample(output, job, lemmas),
    save: (cards) => saveExample(drafts, tags, job, cards[0]),
  }));
}

export function redraftExamples(
  jobs: ExampleJob[],
  lemmas: Lemmas,
  options: DraftOptions & { tags?: TagStore | null },
): Promise<DraftSummary> {
  return runDraftTasks(exampleTasks(jobs, options.store, options.tags ?? null, lemmas), options);
}
