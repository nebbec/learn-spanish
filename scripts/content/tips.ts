// The tip pass (L4): Claude drafts each tip of content/tips.json into a plain
// text file, content/tips/<id>.txt, one call per tip through the draft pass's
// caller. Courtney reads every file and sets its status line to "approve"; the
// deck build ships approved tips only and holds back any card naming another.
//
// Nothing here prints tip text: only ids, line numbers, field names and counts.
//
// The rules are in docs/design.md under "Learning path", "Tips", and "Decided in L4".

import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { DeckTip } from "@/lib/deck/types";
import { tipAudioPath } from "./audio.mjs";
import {
  Guard,
  runDraftTasks,
  writeText,
  type DraftOptions,
  type DraftSummary,
  type DraftTask,
  type Guarded,
  type TaskStore,
} from "./drafting";
import type { TipEntry, Unit } from "./units";

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);

export const TIP_STATUSES = ["pending", "approve"] as const;
export type TipStatus = (typeof TIP_STATUSES)[number];

/** A tip's body is three to five sentences; it has two or three examples. */
export const BODY_SENTENCES = { min: 3, max: 5 };
export const EXAMPLES = { min: 2, max: 3 };

/** The lines of a tip file that carry a key. Every other line that is not a note is the body. */
const KEY_LINE = /^(status|title|example)\s*:/i;

export interface TipJob {
  id: string;
  title: string;
  /** The brief from content/tips.json. */
  about: string;
  /** The tip's place in the order tips are met, from 1, and how many tips there are. */
  number: number;
  total: number;
  /** The unit that introduces the tip, or null for a tip of the frequency phase. */
  unit: { number: number; title: string; goal: string } | null;
  /** The wants of the introducing unit and every earlier one; every unit's for a frequency-phase tip. */
  known: string[];
  /** The other tips' titles, in the order they are met. */
  others: string[];
}

/** One job per tip of the list, in the order they are met. */
export function tipJobs(tips: TipEntry[], units: Unit[]): TipJob[] {
  return tips.map((tip, index) => {
    const at = units.findIndex((u) => u.tip === tip.id);
    const unit = at >= 0 ? units[at] : null;
    return {
      id: tip.id,
      title: tip.title,
      about: tip.about,
      number: index + 1,
      total: tips.length,
      unit: unit ? { number: at + 1, title: unit.title, goal: unit.goal } : null,
      known: (at >= 0 ? units.slice(0, at + 1) : units).flatMap((u) => u.wants),
      others: tips.filter((t) => t.id !== tip.id).map((t) => t.title),
    };
  });
}

export const TIP_SYSTEM_PROMPT = `You write the tip screens of an app that teaches the most common Spanish words to English speakers who are starting from zero and want to speak: survival and travel Spanish, and simple conversations about themselves and the people around them. The Spanish is neutral Latin American Spanish: natural, everyday and informal (tú, never vosotros; usted only when the tip is about usted).

A tip introduces one idea about how Spanish works, once, just before the first card that needs it. It is read, not tested. The learner sees the title, the body and two or three examples, and hears each example spoken.

Fields
- body: three to five short sentences in plain, friendly English, one sentence per item of the list. Say the idea simply and say what to do with it, with a Spanish word or two inside a sentence where it helps (soy means I am). Explain the idea, not the terms: if a grammar word is needed, say what it means. Cover the brief you are given and nothing beyond it; leave other tips' ideas to them.
- examples: two or three, each a short natural Spanish sentence under eight words that shows the idea, with its natural English. Use the words the learner has met (listed in the request, earlier units first), plus names and numbers, and at most one other word if it is an obvious English cognate. Use accents and ¿ ? ¡ ! as needed. Each example shows the idea in a different way.

Every text field is one line of plain text, with no Markdown, no lists, no surrounding quotes and no | character. Do not start a sentence with "Status:", "Title:" or "Example:".`;

export function tipPrompt(job: TipJob): string {
  return [
    `Tip ${job.number} of ${job.total}: "${job.title}"`,
    `The brief: ${job.about}`,
    job.unit
      ? `It comes at the start of unit ${job.unit.number} of the starter path, "${job.unit.title}". The unit's goal: now you can ${job.unit.goal.replace(/^now you can /i, "")}`
      : "It comes after the starter path, before the first card of the frequency phase that needs it, when the learner knows every word below and a few hundred more.",
    "What the learner has met (the unit plan's wants, earlier units first; this unit's are being learned now):",
    ...job.known.map((w) => `- ${w}`),
    "The other tips, in the order they are met:",
    ...job.others.map((t) => `- ${t}`),
  ].join("\n");
}

const text = { type: "string" };
const object = (properties: Rec) => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });

export const TIP_SCHEMA: Rec = object({
  body: { type: "array", items: text },
  examples: { type: "array", items: object({ es: text, en: text }) },
});

/** A drafted tip as its file holds it: the body one sentence per line. */
export interface TipDraft {
  id: string;
  title: string;
  body: string[];
  examples: Array<{ es: string; en: string }>;
}

/** The output guard: turns Claude's answer into a tip, or names the failing fields. The title is the tip list's. */
export function guardTip(output: unknown, job: TipJob): Guarded<TipDraft> {
  if (!isRec(output) || !Array.isArray(output.body) || !Array.isArray(output.examples)) {
    return { ok: false, kind: "shape", fields: [] };
  }
  const g = new Guard();
  const body = output.body.map((sentence) => g.text(sentence, "body"));
  if (body.length < BODY_SENTENCES.min || body.length > BODY_SENTENCES.max) g.fail("body");
  if (body.some((sentence) => KEY_LINE.test(sentence))) g.fail("body");
  const examples = output.examples.map((raw) => {
    const e = isRec(raw) ? raw : {};
    return { es: g.text(e.es, "examples.es"), en: g.text(e.en, "examples.en") };
  });
  if (examples.length < EXAMPLES.min || examples.length > EXAMPLES.max) g.fail("examples");
  for (const e of examples) {
    if (e.es.includes("|")) g.fail("examples.es");
    if (e.en.includes("|")) g.fail("examples.en");
  }
  if (new Set(examples.map((e) => e.es.toLowerCase())).size < examples.length) g.fail("examples.es");
  if (g.fields.size > 0) return { ok: false, kind: "invalid", fields: [...g.fields].sort() };
  return { ok: true, cards: [{ id: job.id, title: job.title, body, examples }], skip: null };
}

/** The text of a newly drafted tip file, waiting for Courtney to read it. */
export function tipFileText(job: TipJob, tip: TipDraft, meta: Rec): string {
  const where = job.unit ? `introduced by unit ${job.unit.number}, ${job.unit.title}` : "for cards after the starter path";
  return [
    `# ${job.id} · tip ${job.number} of ${job.total} · ${where}`,
    `# The brief from content/tips.json: ${job.about}`,
    `# Drafted ${meta.draftedAt} by ${meta.model} (via ${meta.via}, effort ${meta.effort}).`,
    "#",
    '# Read it as a beginner would. To ship it, change "pending" on the status line to "approve".',
    "# Correct anything first:",
    "#   title:    the heading of the tip screen",
    "#   the plain lines under the title are the body, three to five sentences, one per line",
    "#             (the app shows them as one paragraph)",
    "#   example:  Spanish | English, two or three of them; each is spoken (npm run audio makes the clips)",
    "# Lines starting with # are notes and are ignored. Then run: npm run deck",
    "# Until this tip is approved, no card naming it goes into the deck.",
    `# npm run tips -- --tips ${job.id} --redo drafts it again and replaces this whole file.`,
    "",
    "status: pending",
    "",
    `title: ${tip.title}`,
    "",
    ...tip.body,
    "",
    ...tip.examples.map((e) => `example: ${e.es} | ${e.en}`),
    "",
  ].join("\n");
}

export interface ParsedTip {
  status: TipStatus | null;
  title: string;
  /** The body lines, in order. */
  body: string[];
  examples: Array<{ es: string; en: string }>;
  /** Line numbers and keys only, never the text. */
  errors: string[];
}

/** Reads a tip file. A person may have edited it, so every rule is checked and named by line or key. */
export function parseTipFile(text: string): ParsedTip {
  const parsed: ParsedTip = { status: null, title: "", body: [], examples: [], errors: [] };
  const seen = new Set<string>();
  text.split("\n").forEach((raw, index) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    const at = `line ${index + 1}`;
    const key = KEY_LINE.exec(line)?.[1].toLowerCase();
    if (!key) {
      parsed.body.push(line);
      return;
    }
    const value = line.slice(line.indexOf(":") + 1).trim();
    if (key !== "example" && seen.has(key)) parsed.errors.push(`${at}: a second ${key} line`);
    seen.add(key);
    if (key === "status") {
      const status = value.toLowerCase();
      if (TIP_STATUSES.includes(status as TipStatus)) parsed.status = status as TipStatus;
      else parsed.errors.push(`${at}: status must be pending or approve`);
    } else if (key === "title") {
      parsed.title = value;
    } else {
      const bar = value.indexOf("|");
      const es = bar >= 0 ? value.slice(0, bar).trim() : "";
      const en = bar >= 0 ? value.slice(bar + 1).trim() : "";
      if (!es || !en || en.includes("|")) parsed.errors.push(`${at}: an example reads "example: Spanish | English"`);
      else parsed.examples.push({ es, en });
    }
  });
  if (!seen.has("status")) parsed.errors.push("no status line");
  if (!parsed.title) parsed.errors.push("no title");
  if (!parsed.body.length) parsed.errors.push("no body");
  if (parsed.examples.length < EXAMPLES.min || parsed.examples.length > EXAMPLES.max) {
    parsed.errors.push(`${parsed.examples.length} examples, not two or three`);
  }
  return parsed;
}

/**
 * The deck's entry for an approved tip: the body lines as one paragraph, each
 * example with its clip's path (`/deck/audio/<tip id>.<n>.<hash>.mp3`, L8). The
 * deck build sets the paths again with the redone takes of content/audio-takes.json.
 */
export function deckTip(id: string, tip: ParsedTip, takes: Record<string, number> = {}): DeckTip {
  return {
    id,
    title: tip.title,
    body: tip.body.join(" "),
    examples: tip.examples.map((e, i) => ({ es: e.es, en: e.en, audio: tipAudioPath(id, i + 1, e.es, takes) })),
  };
}

/** The tip files under one directory (content/tips by default). */
export class TipStore implements TaskStore {
  readonly failedDir: string;
  readonly logFile: string;

  constructor(readonly dir: string) {
    this.failedDir = path.join(dir, ".failed");
    this.logFile = path.join(dir, "usage.jsonl");
    mkdirSync(dir, { recursive: true });
  }

  file(id: string) {
    return path.join(this.dir, `${id}.txt`);
  }

  /** A tip is drafted when its file exists, so a rerun resumes. */
  isDrafted(id: string) {
    return existsSync(this.file(id));
  }

  /** The ids of every tip file on disk. */
  ids(): string[] {
    return readdirSync(this.dir)
      .filter((f) => f.endsWith(".txt"))
      .map((f) => f.slice(0, -".txt".length))
      .sort();
  }

  read(id: string): ParsedTip | null {
    return this.isDrafted(id) ? parseTipFile(readFileSync(this.file(id), "utf8")) : null;
  }

  save(job: TipJob, tip: TipDraft, meta: Rec): string[] {
    writeText(this.file(job.id), tipFileText(job, tip, meta));
    return [job.id];
  }

  /** Keeps an answer the guard refused, for a person to look at. Git ignores this folder. */
  saveFailed(name: string, attempt: number, output: unknown) {
    mkdirSync(this.failedDir, { recursive: true });
    writeText(path.join(this.failedDir, `${name}-${attempt}.json`), `${JSON.stringify(output, null, 2)}\n`);
  }

  log(line: Rec) {
    appendFileSync(this.logFile, `${JSON.stringify(line)}\n`);
  }
}

export type TipOptions = Omit<DraftOptions, "store"> & { store: TipStore };

export function tipTasks(jobs: TipJob[], store: TipStore): DraftTask<TipDraft>[] {
  return jobs.map((job) => ({
    label: job.id,
    done: store.isDrafted(job.id),
    log: { tip: job.id },
    failedName: job.id,
    request: { system: TIP_SYSTEM_PROMPT, prompt: tipPrompt(job), schema: TIP_SCHEMA },
    guard: (output) => guardTip(output, job),
    save: ([tip], _skip, meta) => store.save(job, tip, meta),
  }));
}

/** Drafts each tip not yet drafted (every one with `redo`), one call each. */
export function draftTips(jobs: TipJob[], options: TipOptions): Promise<DraftSummary> {
  return runDraftTasks(tipTasks(jobs, options.store), options);
}

export interface TipsForDeck {
  /** Approved tips with no problem, in the order they are met: what the deck ships. */
  tips: DeckTip[];
  /** Drafted and not yet approved. */
  pending: string[];
  notDrafted: string[];
  /** "id: what is wrong", by line number or key. Such a tip is not shipped. */
  problems: string[];
}

/** Reads every tip file against the tip list. Only approved tips with no problem ship. */
export function tipsForDeck(store: TipStore, list: TipEntry[]): TipsForDeck {
  const result: TipsForDeck = { tips: [], pending: [], notDrafted: [], problems: [] };
  for (const { id } of list) {
    const tip = store.read(id);
    if (!tip) result.notDrafted.push(id);
    else if (tip.status === "approve" && !tip.errors.length) result.tips.push(deckTip(id, tip));
    else if (tip.status === "approve" || tip.status === null) result.problems.push(...tip.errors.map((e) => `${id}: ${e}`));
    else result.pending.push(id);
  }
  const listed = new Set(list.map((t) => t.id));
  for (const id of store.ids()) if (!listed.has(id)) result.problems.push(`${id}: not in content/tips.json`);
  return result;
}
