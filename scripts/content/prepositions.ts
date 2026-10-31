// Verbs with prepositions, the list (DE19): Claude reads each photo of the handout "Verben mit Präpositionen"
// twice, in two independent calls, into items (a verb, a preposition and a meaning); the script compares the two
// reads, checks the cases, and writes content/de/prepositions.tsv with its flagged rows listed in
// content/de/prepositions-flagged.md for Courtney to settle.
//
// The rules are in docs/german.md under "Verbs with prepositions" and "Decided in DE19".

import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { ImageInput } from "./claude";
import { runDraftTasks, writeJson, type DraftOptions, type DraftSummary, type DraftTask, type Guarded, type TaskStore } from "./drafting";

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);

/** The handout has ten pages, photographed as page-01.jpg to page-10.jpg. */
export const PAGES = Array.from({ length: 10 }, (_, i) => i + 1);
/** Each page is read this many times, in separate calls. */
export const READS = [1, 2] as const;
/** Pages 1 to 5 carry Courtney's pen: prepositions inked out in the sentences, English written beside some rows. */
export const PEN_PAGES = [1, 2, 3, 4, 5];

export const CASES = ["akk", "dat", "nom"] as const;
export type Case = (typeof CASES)[number];

/** Prepositions that always take one case. */
export const FIXED_CASE: Readonly<Record<string, Case>> = {
  für: "akk",
  um: "akk",
  gegen: "akk",
  durch: "akk",
  ohne: "akk",
  mit: "dat",
  zu: "dat",
  von: "dat",
  aus: "dat",
  bei: "dat",
  nach: "dat",
  seit: "dat",
  gegenüber: "dat",
};
/** Two-way prepositions: accusative or dative, which the handout states or implies. */
export const TWO_WAY = ["auf", "an", "in", "über", "unter", "vor", "hinter", "neben", "zwischen"];
/** `als` is not a preposition, but the handout lists it with the case of the noun after it. */
export const ALS = "als";

/** One item as Claude reads it from a page. */
export interface ReadItem {
  /** The handout's row on the page, from 1. A row may give several items (`&`, `/`). */
  row: number;
  verb: string;
  objects: string;
  prep: string;
  case: Case;
  /** This preposition's part of the Präp & Kasus cell, as printed (`auf jn|etwA`). */
  pattern: string;
  gloss: string;
  glossBy: "courtney" | "claude";
  /** The handout's own German gloss in angle brackets, or null. */
  handoutGloss: string | null;
  sentence: string;
  /** The row joins prepositions with `/` (either one), so Courtney decides split or either. */
  slash: boolean;
}

export interface PageRead {
  /** How many rows of the handout's table are on the page. */
  rows: number;
  items: ReadItem[];
}

const text = { type: "string" };
const object = (properties: Rec) => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });

export const READ_SCHEMA: Rec = object({
  rows: { type: "integer" },
  items: {
    type: "array",
    items: object({
      row: { type: "integer" },
      verb: text,
      objects: text,
      prep: text,
      case: { type: "string", enum: [...CASES] },
      pattern: text,
      gloss: text,
      glossBy: { type: "string", enum: ["courtney", "claude"] },
      handoutGloss: { anyOf: [text, { type: "null" }] },
      sentence: text,
      slash: { type: "boolean" },
    }),
  },
});

export const READ_SYSTEM = `You read one photographed page of a German handout, "Verben mit Präpositionen" (Deutschkurse bei der Universität München, Stufe 4, B2.2), into structured rows for a flashcard app. Read exactly what is printed; never add verbs, rows or prepositions that are not on the page.

The page holds a table with the columns Verb, Präp & Kasus, Beispielsatz and Übersetzung. A table row starts where a new entry starts in the Verb column; a long sentence or a gloss may wrap onto further lines of the same row. Count the table rows on this page (only the verb table, not the key of abbreviations that ends the last page) and give the count as \`rows\`.

The handout's shorthand: s = sich; jn = jemanden; jm = jemandem; j = jemand; etw = etwas; etwA, etwD, etwN = etwas in the accusative, dative, nominative. Its signs: | means either object (jn|etwA: a person or a thing; one item); & means both prepositions go with the verb (s bedanken bei jm & für etwA: two items, one per preposition); / means either preposition can be used (von jm|etwD / über jn|etwA: one item per preposition, each with slash true); <...> under the verb is a German gloss telling rows of the same verb apart; ADJ means an adjective can follow (keep only the noun item, write the pattern as printed).

Give one item per preposition and meaning, in the order printed, each with:
- row: the table row's number on this page, counting from 1.
- verb: the infinitive. Write sich in front when the verb is reflexive in this row (s ärgern: "sich ärgern"). Write a separable verb whole ("es kommt an": verb "ankommen"). Leave the verb's other objects out of this field.
- objects: the verb's own objects from the Verb column (not the preposition's), spelled out: jemanden, jemandem, etwas, sich. Alternatives joined with " oder " (jn|etwA ansehen: "jemanden oder etwas"; s|jn befreien: verb "befreien", objects "sich oder jemanden"). An impersonal es is written "es". Empty string when there is none.
- prep: the preposition alone, lower case, as printed in the Präp & Kasus column (auf, mit, über, als).
- case: the case that follows the preposition here: "akk" or "dat", or "nom" for als + etwN. Take it from the Präp & Kasus column: stated (etwA, etwD) or implied (jn is accusative, jm dative). Where the column shows neither, use the case the preposition always takes, or the case the handout's sentence shows.
- pattern: this preposition's part of the Präp & Kasus cell exactly as printed, shorthand kept ("auf jn|etwA", "für etwA|ADJ", "gegen").
- gloss: a short English meaning of the verb with this preposition, starting "to" ("to wait for someone or something"). Where the row has handwritten English beside it (pages 1 to 5), read that handwriting as the gloss, keeping its words; change it only where it must, to tell this item apart from another item of the same verb. Rows of the same verb, and the items of one row, must have glosses that tell them apart.
- glossBy: "courtney" when the gloss is the handwritten English, otherwise "claude".
- handoutGloss: the German gloss in angle brackets under the verb, without the brackets and with words broken across lines joined, or null.
- sentence: the Beispielsatz as printed, on one line, words hyphenated across a line break joined. On pages 1 to 5 the prepositions in the sentences are inked out with a pen: write each inked-out word as ___ and never guess it. Where a row has two sentences, one per preposition, give each item its own.
- slash: true only for the items of a row whose prepositions are joined by /.

Ignore stars, ticks and lines drawn through a row: a crossed-out row is still read. Read the preposition and the case only from the Präp & Kasus column, never from the sentence.`;

export const readPrompt = (page: number) =>
  `This is page ${page} of 10.${PEN_PAGES.includes(page) ? " It carries the learner's pen: prepositions inked out in the sentences, and handwritten English beside some rows." : ""} Read it into rows.`;

const one = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");

/** The guard on one read: the shape, the row numbers within the count, every text field one line. */
export function guardRead(output: unknown): Guarded<PageRead> {
  if (!isRec(output) || !Array.isArray(output.items) || !Number.isInteger(output.rows)) {
    return { ok: false, kind: "shape", fields: [] };
  }
  const rows = output.rows as number;
  const fields = new Set<string>();
  if (rows < 1 || rows > 40) fields.add("rows");
  const items: ReadItem[] = [];
  for (const raw of output.items) {
    if (!isRec(raw)) {
      fields.add("items");
      continue;
    }
    const item: ReadItem = {
      row: Number(raw.row),
      verb: one(raw.verb),
      objects: one(raw.objects),
      prep: one(raw.prep).toLowerCase(),
      case: raw.case as Case,
      pattern: one(raw.pattern),
      gloss: one(raw.gloss),
      glossBy: raw.glossBy === "courtney" ? "courtney" : "claude",
      handoutGloss: one(raw.handoutGloss) || null,
      sentence: one(raw.sentence),
      slash: raw.slash === true,
    };
    if (!Number.isInteger(item.row) || item.row < 1 || item.row > rows) fields.add("row");
    if (!CASES.includes(item.case)) fields.add("case");
    for (const key of ["verb", "prep", "pattern", "gloss", "sentence"] as const) if (!item[key]) fields.add(key);
    if (/\s/.test(item.prep)) fields.add("prep");
    items.push(item);
  }
  // Every row of the page gives at least one item.
  const covered = new Set(items.map((i) => i.row));
  for (let r = 1; r <= rows; r++) if (!covered.has(r)) fields.add("items");
  if (fields.size) return { ok: false, kind: "invalid", fields: [...fields].sort() };
  return { ok: true, cards: [{ rows, items }], skip: null };
}

const pad = (page: number) => String(page).padStart(2, "0");

/** The photos and the reads: `page-01.jpg`, and `reads/page-01.read-1.json`. */
export class ReadStore implements TaskStore {
  readonly readsDir: string;
  readonly failedDir: string;
  readonly logFile: string;

  constructor(readonly dir: string) {
    this.readsDir = path.join(dir, "reads");
    this.failedDir = path.join(this.readsDir, ".failed");
    this.logFile = path.join(this.readsDir, "usage.jsonl");
  }

  photo(page: number) {
    return path.join(this.dir, `page-${pad(page)}.jpg`);
  }

  file(page: number, read: number) {
    return path.join(this.readsDir, `page-${pad(page)}.read-${read}.json`);
  }

  isRead(page: number, read: number) {
    return existsSync(this.file(page, read));
  }

  read(page: number, read: number): PageRead | null {
    if (!this.isRead(page, read)) return null;
    const file = JSON.parse(readFileSync(this.file(page, read), "utf8"));
    return { rows: file.rows, items: file.items };
  }

  save(page: number, read: number, value: PageRead, meta: Rec) {
    mkdirSync(this.readsDir, { recursive: true });
    writeJson(this.file(page, read), { page, read, ...meta, rows: value.rows, items: value.items });
  }

  /** The pages with both reads on disk. */
  readPages(): number[] {
    if (!existsSync(this.readsDir)) return [];
    const names = new Set(readdirSync(this.readsDir));
    return PAGES.filter((p) => READS.every((r) => names.has(path.basename(this.file(p, r)))));
  }

  log(line: Rec) {
    mkdirSync(this.readsDir, { recursive: true });
    appendFileSync(this.logFile, `${JSON.stringify(line)}\n`);
  }

  saveFailed(name: string, attempt: number, output: unknown) {
    mkdirSync(this.failedDir, { recursive: true });
    writeJson(path.join(this.failedDir, `${name}-${attempt}.json`), output);
  }
}

/** One call per page and read, through the draft pass's runner. */
export function readTasks(store: ReadStore, pages: number[], image: (page: number) => ImageInput): DraftTask<PageRead>[] {
  return pages.flatMap((page) =>
    READS.map(
      (read): DraftTask<PageRead> => ({
        label: `page ${page} read ${read}`,
        done: store.isRead(page, read),
        log: { page, read },
        failedName: `page-${pad(page)}-read-${read}`,
        request: { system: READ_SYSTEM, prompt: readPrompt(page), schema: READ_SCHEMA, images: [image(page)] },
        guard: guardRead,
        save: ([value], _skip, meta) => {
          store.save(page, read, value, meta);
          return [`${value.rows} rows, ${value.items.length} items`];
        },
      }),
    ),
  );
}

export function readPages(
  store: ReadStore,
  pages: number[],
  options: Omit<DraftOptions, "store" | "spanish">,
): Promise<DraftSummary> {
  const image = (page: number): ImageInput => ({ mediaType: "image/jpeg", data: readFileSync(store.photo(page)).toString("base64") });
  return runDraftTasks(readTasks(store, pages, image), { ...options, store });
}

// ---------------------------------------------------------------------------------------------------------------
// The list

/** One row of content/de/prepositions.tsv: one item. */
export interface ListRow {
  page: number;
  row: number;
  verb: string;
  objects: string;
  prep: string;
  /** `akk`, `dat` or `nom`; an `either` row's cases joined like its prepositions (`dat / akk`). */
  case: string;
  pattern: string;
  gloss: string;
  glossBy: string;
  handoutGloss: string;
  sentence: string;
  /** The matched verb card, filled by the tag pass (DE21). */
  verbCard: string;
  /** Why the row is flagged, from the comparison of the reads: reasons joined by "; ". */
  flags: string;
  /** Courtney's word on a flagged row: `ok`, or for a `/` row `split` or `either`. */
  settle: string;
}

export const COLUMNS: ReadonlyArray<[keyof ListRow, string]> = [
  ["page", "page"],
  ["row", "row"],
  ["verb", "verb"],
  ["objects", "objects"],
  ["prep", "prep"],
  ["case", "case"],
  ["pattern", "pattern"],
  ["gloss", "gloss"],
  ["glossBy", "gloss_by"],
  ["handoutGloss", "handout_gloss"],
  ["sentence", "sentence"],
  ["verbCard", "verb_card"],
  ["flags", "flags"],
  ["settle", "settle"],
];

export const SETTLES = ["", "ok", "split", "either"];
export const SLASH_FLAG = "slash: split or either";

export const LIST_HEADER = [
  "# Verbs with prepositions, from the handout Verben mit Präpositionen (B2.2), one row per item (docs/german.md, DE19).",
  "# Written by npm run prepositions -- --lang de from two reads of each page; your edits are kept on every rerun.",
  "# A row with flags is settled by fixing it and writing ok in settle; a / row takes split (two items, each its own",
  "# gloss) or either (one item answering both; the script joins the pair). Then run npm run prepositions -- --lang de --check.",
  "# When every row is settled and the checks pass, change pending to approve on the status line.",
];

export interface List {
  status: "pending" | "approve";
  rows: ListRow[];
}

/** Letters and digits only, lower case: what two reads must agree on. */
const norm = (s: string) => s.toLowerCase().normalize("NFC").replace(/[^\p{L}\p{N}]/gu, "");

const FIELDS_COMPARED: ReadonlyArray<keyof ReadItem> = ["verb", "objects", "case", "pattern", "handoutGloss", "sentence", "slash", "glossBy"];

function toRow(page: number, item: ReadItem, flags: string[]): ListRow {
  return {
    page,
    row: item.row,
    verb: item.verb,
    objects: item.objects,
    prep: item.prep,
    case: item.case,
    pattern: item.pattern,
    gloss: item.gloss,
    glossBy: item.glossBy,
    handoutGloss: item.handoutGloss ?? "",
    sentence: item.sentence,
    verbCard: "",
    flags: [...flags, ...(item.slash ? [SLASH_FLAG] : [])].join("; "),
    settle: "",
  };
}

/**
 * Compares a page's two reads into list rows: the first read's items, each flagged where the second read differs.
 * Items are matched within a handout row by preposition. A problem is a page whose reads count different rows.
 */
export function compareReads(page: number, a: PageRead, b: PageRead): { rows: ListRow[]; problem: string | null } {
  const problem = a.rows === b.rows ? null : `page ${page}: the reads count ${a.rows} and ${b.rows} rows`;
  const rows: ListRow[] = [];
  const last = Math.max(a.rows, b.rows);
  for (let r = 1; r <= last; r++) {
    const left = a.items.filter((i) => i.row === r);
    const right = b.items.filter((i) => i.row === r);
    const preps = (items: ReadItem[]) => items.map((i) => i.prep).sort().join(",");
    if (left.length === 0 || preps(left) !== preps(right)) {
      for (const item of left.length ? left : right) rows.push(toRow(page, item, ["reads differ: items"]));
      continue;
    }
    const used = new Set<ReadItem>();
    for (const item of left) {
      const other = right.find((i) => i.prep === item.prep && !used.has(i))!;
      used.add(other);
      const differ = FIELDS_COMPARED.filter((f) => norm(String(item[f] ?? "")) !== norm(String(other[f] ?? "")));
      if (item.glossBy === "courtney" && other.glossBy === "courtney" && norm(item.gloss) !== norm(other.gloss)) differ.push("gloss");
      rows.push(toRow(page, item, differ.length ? [`reads differ: ${differ.join(", ")}`] : []));
    }
  }
  return { rows, problem };
}

/** The handout's row count of each page, where both reads agree on it. */
export function pageCounts(store: ReadStore): Map<number, number> {
  const counts = new Map<number, number>();
  for (const page of store.readPages()) {
    const [a, b] = READS.map((r) => store.read(page, r)!);
    if (a.rows === b.rows) counts.set(page, a.rows);
  }
  return counts;
}

export function parseList(text: string): { list: List; problems: string[] } {
  const problems: string[] = [];
  let status: List["status"] = "pending";
  const rows: ListRow[] = [];
  let header: string[] | null = null;
  text.split("\n").forEach((line, i) => {
    if (!line.trim()) return;
    const status_ = /^#\s*status:\s*(\S+)\s*$/i.exec(line);
    if (status_) {
      const value = status_[1].toLowerCase();
      if (value === "pending" || value === "approve") status = value;
      else problems.push(`line ${i + 1}: status is pending or approve`);
      return;
    }
    if (line.startsWith("#")) return;
    const cells = line.split("\t");
    if (!header) {
      header = cells;
      const expected = COLUMNS.map(([, name]) => name);
      if (header.join("\t") !== expected.join("\t")) problems.push(`line ${i + 1}: the columns are ${expected.join(", ")}`);
      return;
    }
    const row = Object.fromEntries(COLUMNS.map(([key], c) => [key, (cells[c] ?? "").trim()])) as unknown as Record<keyof ListRow, string>;
    const parsed: ListRow = { ...row, page: Number(row.page), row: Number(row.row) };
    if (!Number.isInteger(parsed.page) || !Number.isInteger(parsed.row)) problems.push(`line ${i + 1}: page and row are numbers`);
    if (!SETTLES.includes(parsed.settle)) problems.push(`line ${i + 1}: settle is ok, split or either`);
    rows.push(parsed);
  });
  return { list: { status, rows }, problems };
}

export function listText(list: List): string {
  const lines = [...LIST_HEADER, `# status: ${list.status}`, COLUMNS.map(([, name]) => name).join("\t")];
  for (const row of list.rows) lines.push(COLUMNS.map(([key]) => String(row[key]).replace(/[\t\n]/g, " ")).join("\t"));
  return `${lines.join("\n")}\n`;
}

/** Puts a page's rows into the list in place of any it had, keeping every other row as it is. */
export function replacePages(list: List, rows: ListRow[]): List {
  const pages = new Set(rows.map((r) => r.page));
  const kept = list.rows.filter((r) => !pages.has(r.page));
  const all = [...kept, ...rows];
  // Stable: rows of one handout row keep their order.
  const order = new Map(all.map((r, i) => [r, i]));
  all.sort((x, y) => x.page - y.page || x.row - y.row || order.get(x)! - order.get(y)!);
  return { ...list, rows: all };
}

const isSlash = (row: ListRow) => row.flags.split("; ").includes(SLASH_FLAG);

/** Joins the items of each `/` row Courtney marked `either` into one item: `von / über`, `dat / akk`. */
export function applyEither(list: List): List {
  const rows: ListRow[] = [];
  for (const row of list.rows) {
    if (row.settle !== "either" || !isSlash(row) || row.prep.includes("/")) {
      rows.push(row);
      continue;
    }
    const first = rows.find((r) => r.page === row.page && r.row === row.row && r.settle === "either" && isSlash(r));
    if (!first) {
      rows.push({ ...row });
      continue;
    }
    first.prep = `${first.prep} / ${row.prep}`;
    first.case = `${first.case} / ${row.case}`;
    first.pattern = `${first.pattern} / ${row.pattern}`;
  }
  return { ...list, rows };
}

/** The marker in a pattern that implies a case: jn and etwA accusative, jm and etwD dative, etwN nominative. */
export function impliedCases(pattern: string): Set<Case> {
  const found = new Set<Case>();
  for (const word of pattern.split(/[\s|&/,()]+/)) {
    if (/^(jn|jdn|etwA)$/.test(word)) found.add("akk");
    if (/^(jm|jdm|etwD)$/.test(word)) found.add("dat");
    if (/^(etwN|j|jd)$/.test(word)) found.add("nom");
  }
  return found;
}

export interface RowCheck {
  row: ListRow;
  /** Reasons the checks give; these must be fixed, not settled. */
  problems: string[];
  /** Judgments for Courtney: settled by writing ok (or split or either) in settle. */
  flags: string[];
}

/**
 * The list's checks. Problems: a fixed-case preposition with another case, a case the pattern contradicts,
 * a page whose reads disagree on its row count or whose rows the list does not cover, and two rows sharing verb,
 * preposition and gloss. Flags: the reads' disagreements and `/` rows (from the `flags` column), a two-way
 * preposition whose case the handout neither states nor implies, and a preposition outside the check's lists.
 */
export function checkList(list: List, counts: ReadonlyMap<number, number>, readPagesOnDisk: number[]): { rows: RowCheck[]; pageProblems: string[] } {
  const pageProblems: string[] = [];
  for (const page of readPagesOnDisk) {
    const count = counts.get(page);
    if (count === undefined) {
      pageProblems.push(`page ${page}: the two reads count a different number of rows`);
      continue;
    }
    const rowsSeen = new Set(list.rows.filter((r) => r.page === page).map((r) => r.row));
    const missing = Array.from({ length: count }, (_, i) => i + 1).filter((r) => !rowsSeen.has(r));
    const extra = [...rowsSeen].filter((r) => r < 1 || r > count);
    if (missing.length) pageProblems.push(`page ${page}: no item for row ${missing.join(", ")}`);
    if (extra.length) pageProblems.push(`page ${page}: row ${extra.join(", ")} is past the page's ${count} rows`);
  }

  const seen = new Map<string, ListRow>();
  const rows = list.rows.map((row): RowCheck => {
    const problems: string[] = [];
    const flags = row.flags ? row.flags.split("; ").filter(Boolean) : [];
    const preps = row.prep.split("/").map((p) => p.trim());
    const cases = row.case.split("/").map((c) => c.trim());
    const patterns = row.pattern.split(" / ");
    if (preps.length !== cases.length) problems.push("one case per preposition");
    preps.forEach((prep, i) => {
      const kase = cases[i] as Case;
      if (!CASES.includes(kase)) {
        problems.push(`case "${cases[i] ?? ""}" is akk, dat or nom`);
        return;
      }
      const implied = impliedCases(patterns[i] ?? row.pattern);
      if (implied.size === 1 && !implied.has(kase)) problems.push(`the pattern says ${[...implied][0]}`);
      if (prep === ALS) {
        if (kase === "dat") problems.push("als takes nom or akk");
      } else if (FIXED_CASE[prep]) {
        if (FIXED_CASE[prep] !== kase) problems.push(`${prep} takes ${FIXED_CASE[prep]}`);
      } else if (TWO_WAY.includes(prep)) {
        if (kase === "nom") problems.push(`${prep} takes akk or dat`);
        else if (implied.size === 0) flags.push("two-way preposition with no case in the handout");
      } else {
        flags.push(`preposition "${prep}" is not in the check's lists`);
      }
    });
    if (!row.verb) problems.push("no verb");
    if (!row.gloss) problems.push("no gloss");
    const key = `${norm(row.verb)}|${norm(row.prep)}|${norm(row.gloss)}`;
    const twin = seen.get(key);
    if (twin) problems.push(`same verb, preposition and gloss as page ${twin.page} row ${twin.row}`);
    else seen.set(key, row);
    if (row.settle === "split" || row.settle === "either") {
      if (!isSlash(row)) problems.push(`settle ${row.settle} is for a / row`);
    }
    if (isSlash(row) && row.settle === "ok") problems.push("a / row is settled split or either");
    return { row, problems, flags };
  });
  return { rows, pageProblems };
}

/** Open rows: a problem, or a flag with nothing written in settle. */
export const isOpen = (check: RowCheck) => check.problems.length > 0 || (check.flags.length > 0 && check.row.settle === "");

/** content/de/prepositions-flagged.md: every open row by page, row, verb and preposition, with its reasons. No sentences. */
export function flaggedText(list: List, result: ReturnType<typeof checkList>, missingPages: number[]): string {
  const open = result.rows.filter(isOpen);
  const settled = result.rows.filter((c) => !isOpen(c) && c.flags.length > 0);
  const lines = [
    "# Verbs with prepositions: flagged rows",
    "",
    "Written by `npm run prepositions -- --lang de`. Settle each row in `content/de/prepositions.tsv`: fix any cell, then write `ok` in `settle`; a `/` row takes `split` (two items, give each its own gloss) or `either` (one item, both prepositions right; write it on both of its rows, and the script joins them). Problems must be fixed in the row itself. Then run `npm run prepositions -- --lang de --check`, and when nothing is left here, set the list's status line to `approve`.",
    "",
    `Status: ${list.status}. ${list.rows.length} items; ${open.length} open, ${settled.length} settled; ${result.pageProblems.length} page problems.`,
    "",
  ];
  if (missingPages.length) lines.push(`Pages not read yet: ${missingPages.join(", ")}.`, "");
  if (result.pageProblems.length) {
    lines.push("## Page problems", "", ...result.pageProblems.map((p) => `- ${p}`), "");
  }
  lines.push("## Open rows", "");
  if (!open.length) lines.push("None.");
  for (const c of open) {
    const reasons = [...c.problems.map((p) => `problem: ${p}`), ...c.flags];
    lines.push(`- page ${c.row.page}, row ${c.row.row}: ${c.row.verb} ${c.row.prep} (${c.row.case}): ${reasons.join("; ")}`);
  }
  lines.push("");
  return `${lines.join("\n")}`;
}
