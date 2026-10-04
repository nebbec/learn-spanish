// The art pass's steps over the files in content/art (F2): cast the stills with
// Claude, render and cut sheets through Higgsfield, lay out contact sheets, and
// publish the approved takes into public/deck/img. Higgsfield, the download and
// Claude are passed in, so the tests run without any of them.
//
// Prints ids and counts only. The rules are in docs/design.md under "Art".

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  CREDITS,
  castCounts,
  castRequest,
  checkCastAnswer,
  formatCast,
  formatReview,
  parseCast,
  parseReview,
  planSheets,
  sheetPrompt,
  stillState,
  stillsFromDeck,
  takeFile,
  type CastRow,
  type DeckLike,
  type JobRef,
  type Manifest,
  type ReviewRow,
  type Sheet,
  type Still,
  type Style,
} from "./art";
import { contactSheet, cutSheet, toStill } from "./art-images";
import type { DraftRequest, Runner } from "./claude";

export interface ArtPaths {
  root: string;
  deck: string;
  style: string;
  cast: string;
  manifest: string;
  review: string;
  stills: string;
  contact: string;
  cache: string;
  /** The app's public folder: a still is published at public + its image path. */
  public: string;
}

export function artPaths(root: string): ArtPaths {
  const art = path.join(root, "content", "art");
  return {
    root,
    deck: path.join(root, "content", "deck.json"),
    style: path.join(art, "style.md"),
    cast: path.join(art, "cast.tsv"),
    manifest: path.join(art, "sheets.json"),
    review: path.join(art, "review.tsv"),
    stills: path.join(art, "stills"),
    contact: path.join(art, "contact"),
    cache: path.join(root, "content", ".cache", "art"),
    public: path.join(root, "public"),
  };
}

const readText = (file: string) => (existsSync(file) ? readFileSync(file, "utf8") : "");
const writeText = (file: string, text: string | Buffer) => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, text);
};

export function readStills(p: ArtPaths): Still[] {
  return stillsFromDeck(JSON.parse(readFileSync(p.deck, "utf8")) as DeckLike);
}

export function readCast(p: ArtPaths): CastRow[] {
  const { rows, problems } = parseCast(readText(p.cast));
  if (problems.length) throw new Error(`content/art/cast.tsv: ${problems.join("; ")}`);
  return rows;
}

export function readReview(p: ArtPaths): ReviewRow[] {
  const { rows, problems } = parseReview(readText(p.review));
  if (problems.length) throw new Error(`content/art/review.tsv: ${problems.join("; ")}`);
  return rows;
}

export function readManifest(p: ArtPaths): Manifest {
  return existsSync(p.manifest) ? (JSON.parse(readFileSync(p.manifest, "utf8")) as Manifest) : { sheets: [] };
}

const writeManifest = (p: ArtPaths, m: Manifest) => writeText(p.manifest, `${JSON.stringify(m, null, 2)}\n`);

type Log = (line: string) => void;

// ---------------------------------------------------------------- cast

/** Casts every still of the deck that cast.tsv lacks, in calls of `batch`, and appends them. */
export async function castStills(
  p: ArtPaths,
  style: Style,
  runner: Runner,
  { model, effort, batch = 40, log = console.log }: { model: string; effort: DraftRequest["effort"]; batch?: number; log?: Log },
): Promise<{ added: number; failed: string[] }> {
  const rows = readCast(p);
  const have = new Set(rows.map((r) => r.still));
  const todo = readStills(p).filter((s) => !have.has(s.id));
  const failed: string[] = [];
  let added = 0;
  for (let i = 0; i < todo.length; i += batch) {
    const chunk = todo.slice(i, i + batch);
    log(`Casting ${chunk.length} stills (${i + chunk.length} of ${todo.length})`);
    const result = await runner(castRequest(style, chunk, model, effort));
    if (!result.ok) {
      log(`  call failed: ${result.error}`);
      failed.push(...chunk.map((s) => s.id));
      continue;
    }
    const checked = checkCastAnswer(result.output, chunk);
    if (checked.problems.length) log(`  ${checked.problems.length} problems: ${checked.problems.join("; ")}`);
    rows.push(...checked.rows);
    added += checked.rows.length;
    failed.push(...chunk.filter((s) => !checked.rows.some((r) => r.still === s.id)).map((s) => s.id));
    writeText(p.cast, formatCast(rows));
  }
  return { added, failed };
}

export function castSummary(rows: CastRow[], stills: Still[]): string {
  const inDeck = new Set(stills.map((s) => s.id));
  const mine = rows.filter((r) => inDeck.has(r.still));
  const counts = castCounts(mine);
  const share = mine.length ? Math.round((100 * counts.concha) / mine.length) : 0;
  return `${mine.length} of ${stills.length} stills cast: ${Object.entries(counts).map(([c, n]) => `${c} ${n}`).join(", ")} (concha ${share}%)`;
}

// ---------------------------------------------------------------- render

export interface Higgsfield {
  /** Runs one job to the end and returns its id and result URL. */
  run(jobType: string, flags: string[]): Promise<JobRef>;
  /** Downloads a result. */
  fetch(url: string): Promise<Buffer>;
}

/** The stills that need a new sheet: no take yet, or every take marked redo, and none on an unfinished sheet. */
export function stillsToRender(stills: Still[], review: ReviewRow[], manifest: Manifest): string[] {
  const unfinished = new Set(manifest.sheets.filter((s) => !s.cut).flatMap((s) => s.panels.map((p) => p.still)));
  const planned = new Set(manifest.sheets.flatMap((s) => s.panels.map((p) => p.still)));
  return stills
    .map((s) => s.id)
    .filter((id) => {
      if (unfinished.has(id)) return false;
      const state = stillState(review, id).state;
      return state === "redo" || (state === "none" && !planned.has(id));
    });
}

export interface RenderPlan {
  newSheets: Sheet[];
  unfinished: Sheet[];
  credits: number;
  uncast: string[];
}

export function planRender(p: ArtPaths): RenderPlan {
  const stills = readStills(p);
  const cast = new Map(readCast(p).map((r) => [r.still, r]));
  const manifest = readManifest(p);
  const todo = stillsToRender(stills, readReview(p), manifest);
  const uncast = todo.filter((id) => !cast.has(id));
  const newSheets = planSheets(manifest, todo.filter((id) => cast.has(id)), cast);
  const unfinished = manifest.sheets.filter((s) => !s.cut);
  const jobs = [...unfinished, ...newSheets];
  const credits =
    jobs.filter((s) => !s.render).length * CREDITS.render + jobs.filter((s) => !s.cutout).length * CREDITS.cutout;
  return { newSheets, unfinished, credits, uncast };
}

async function cached(file: string, url: string, hf: Higgsfield): Promise<Buffer> {
  if (existsSync(file)) return readFileSync(file);
  const buffer = await hf.fetch(url);
  writeText(file, buffer);
  return buffer;
}

/**
 * Renders the planned sheets, removes their backgrounds, cuts them and adds each
 * take to the review. Saves the manifest after every job, so a rerun resumes.
 */
export async function renderSheets(
  p: ArtPaths,
  style: Style,
  hf: Higgsfield,
  { maxSheets = Infinity, log = console.log }: { maxSheets?: number; log?: Log } = {},
): Promise<{ sheets: number; takes: number; empty: string[] }> {
  const manifest = readManifest(p);
  const plan = planRender(p);
  manifest.sheets.push(...plan.newSheets);
  writeManifest(p, manifest);
  const work = manifest.sheets.filter((s) => !s.cut).slice(0, maxSheets);
  let takes = 0;
  const empty: string[] = [];
  for (const sheet of work) {
    log(`Sheet ${sheet.id}: ${sheet.panels.map((x) => `${x.still}.t${x.take}`).join(", ")}`);
    if (!sheet.render) {
      sheet.render = await hf.run("seedream_5_0_flash", [
        "--prompt", sheetPrompt(style, sheet),
        "--image", path.join(p.root, "content", "art", "cast", `${sheet.character}-sheet.webp`),
        "--aspect_ratio", "3:2",
        "--resolution", "2k",
      ]);
      writeManifest(p, manifest);
    }
    if (!sheet.cutout) {
      sheet.cutout = await hf.run("image_background_remover", ["--image", sheet.render.job]);
      writeManifest(p, manifest);
    }
    await cached(path.join(p.cache, `${sheet.id}.render`), sheet.render.url, hf);
    const cutout = await cached(path.join(p.cache, `${sheet.id}.cutout`), sheet.cutout.url, hf);
    const panels = await cutSheet(cutout);
    const review = readReview(p);
    sheet.panels.forEach((panel, i) => {
      if (review.some((r) => r.still === panel.still && r.take === panel.take)) return;
      review.push({ still: panel.still, take: panel.take, character: sheet.character, sheet: sheet.id, verdict: "", note: panels[i] ? "" : "empty panel" });
    });
    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i];
      const { still, take } = sheet.panels[i];
      if (!panel) {
        empty.push(`${still}.t${take}`);
        continue;
      }
      writeText(path.join(p.stills, takeFile(still, take)), await toStill(panel));
      takes++;
    }
    writeText(p.review, formatReview(review));
    sheet.cut = true;
    writeManifest(p, manifest);
  }
  return { sheets: work.length, takes, empty };
}

// ---------------------------------------------------------------- contact sheets

/** Lays out every take still waiting for a verdict, by character, twelve to a page. Returns the files written. */
export async function writeContactSheets(p: ArtPaths, { perPage = 12 } = {}): Promise<string[]> {
  const stills = readStills(p);
  const order = new Map(stills.map((s, i) => [s.id, i]));
  const words = new Map(stills.map((s) => [s.id, s.es]));
  const pending = readReview(p)
    .filter((r) => r.verdict === "" && existsSync(path.join(p.stills, takeFile(r.still, r.take))))
    .sort((a, b) => a.character.localeCompare(b.character) || (order.get(a.still) ?? 0) - (order.get(b.still) ?? 0) || a.take - b.take);
  mkdirSync(p.contact, { recursive: true });
  for (const old of readdirSync(p.contact)) if (old.endsWith(".jpg")) rmSync(path.join(p.contact, old));
  const files: string[] = [];
  const pages = Math.ceil(pending.length / perPage);
  for (let i = 0; i < pending.length; i += perPage) {
    const page = pending.slice(i, i + perPage);
    const n = i / perPage + 1;
    const tiles = page.map((r) => ({
      image: readFileSync(path.join(p.stills, takeFile(r.still, r.take))),
      label: `${r.still} t${r.take} (${words.get(r.still) ?? "?"})`,
    }));
    const file = path.join(p.contact, `contact-${String(n).padStart(2, "0")}.jpg`);
    writeFileSync(file, await contactSheet(tiles, { title: `Art review, page ${n} of ${pages}: mark each take ok or redo in content/art/review.tsv` }));
    files.push(file);
  }
  return files;
}

// ---------------------------------------------------------------- publish

export interface PublishResult {
  published: string[];
  missing: string[];
  averageBytes: number;
}

/** Copies each approved take to its deck image path under public/. */
export function publishStills(p: ArtPaths): PublishResult {
  const review = readReview(p);
  const published: string[] = [];
  const missing: string[] = [];
  let bytes = 0;
  for (const still of readStills(p)) {
    const state = stillState(review, still.id);
    const source = state.state === "approved" ? path.join(p.stills, takeFile(still.id, state.take)) : "";
    if (!source || !existsSync(source)) {
      missing.push(still.id);
      continue;
    }
    const buffer = readFileSync(source);
    writeText(path.join(p.public, still.image), buffer);
    bytes += buffer.length;
    published.push(still.id);
  }
  return { published, missing, averageBytes: published.length ? Math.round(bytes / published.length) : 0 };
}

/** Counts of every still's state, and the average size of the takes cut so far. */
export function artStatus(p: ArtPaths): { counts: Record<string, number>; takes: number; averageBytes: number } {
  const review = readReview(p);
  const counts: Record<string, number> = { none: 0, pending: 0, approved: 0, redo: 0 };
  for (const s of readStills(p)) counts[stillState(review, s.id).state]++;
  const files = existsSync(p.stills) ? readdirSync(p.stills).filter((f) => f.endsWith(".webp")) : [];
  const bytes = files.reduce((sum, f) => sum + statSync(path.join(p.stills, f)).size, 0);
  return { counts, takes: files.length, averageBytes: files.length ? Math.round(bytes / files.length) : 0 };
}
