// The art pass (F2): which cast member shows each still, the sheets of six
// poses that Higgsfield renders, and the review of the cut stills.
//
//   content/art/cast.tsv     still, character, pose: Courtney edits it
//   content/art/sheets.json  every sheet rendered: its panels and job ids
//   content/art/review.tsv   still, take, character, verdict: Courtney marks
//                            each take "ok" or "redo"
//
// A still is one distinct `image` path of the deck, so a verb's form cards
// share their verb's still. Nothing here prints card text, only ids and counts.
//
// The rules are in docs/design.md under "Art", "Decided in F1" and "Decided in F2",
// and in content/art/style.md.

import type { DraftRequest } from "./claude";

export const CAST = ["concha", "alpaca", "turtle", "chick", "capybara"] as const;
export type Character = (typeof CAST)[number];
export const isCharacter = (v: unknown): v is Character => CAST.includes(v as Character);

/** Panels on one render: a 3 by 2 sheet. */
export const PANELS = 6;
export const COLS = 3;
export const ROWS = 2;

/** Credits per job on Courtney's plan, from `higgsfield generate cost`. */
export const CREDITS = { render: 0.5, cutout: 1 };

export interface DeckLike {
  cards: { id: string; kind: string; es: string; en: string; hint?: string | null; image: string | null }[];
}

export interface Still {
  /** The image file's name without extension: `ser-be-identity`. */
  id: string;
  /** The deck's image path: `/deck/img/ser-be-identity.webp`. */
  image: string;
  /** The Spanish word the still shows: the card's `es`, or the verb for a still only form cards use. */
  es: string;
  /** Every English prompt of the cards that use it, joined. */
  en: string;
  hint: string;
  cards: string[];
}

export const stillId = (image: string) => image.replace(/^.*\//, "").replace(/\.[a-z0-9]+$/i, "");

/** The deck's distinct image paths, in deck order. */
export function stillsFromDeck(deck: DeckLike): Still[] {
  const byImage = new Map<string, DeckLike["cards"]>();
  for (const card of deck.cards) {
    if (!card.image) continue;
    const list = byImage.get(card.image) ?? [];
    list.push(card);
    byImage.set(card.image, list);
  }
  return [...byImage].map(([image, cards]) => {
    const id = stillId(image);
    const own = cards.find((c) => c.id === id);
    const first = own ?? cards[0];
    return {
      id,
      image,
      es: own ? own.es : id.split("-")[0],
      en: [...new Set(cards.map((c) => c.en))].join(" / "),
      hint: first.hint ?? "",
      cards: cards.map((c) => c.id),
    };
  });
}

// ---------------------------------------------------------------- cast.tsv

export interface CastRow {
  still: string;
  character: Character;
  pose: string;
}

const CAST_HEADER = `# Which cast member shows each still, and the pose. Edit freely: the art script
# (npm run art) reads this file before every render. character is one of
# ${CAST.join(", ")}. The pose is a short phrase, no text in the image.
# A changed pose or character takes effect on the still's next render (a redo).
still\tcharacter\tpose`;

export function parseCast(text: string): { rows: CastRow[]; problems: string[] } {
  const rows: CastRow[] = [];
  const problems: string[] = [];
  const seen = new Set<string>();
  text.split("\n").forEach((line, i) => {
    if (!line.trim() || line.startsWith("#") || line.startsWith("still\t")) return;
    const [still, character, pose] = line.split("\t").map((v) => v?.trim() ?? "");
    if (!still) return problems.push(`line ${i + 1}: no still id`);
    if (seen.has(still)) return problems.push(`line ${i + 1}: ${still} is listed twice`);
    if (!isCharacter(character)) return problems.push(`line ${i + 1}: ${still} has character "${character}"`);
    if (!pose) return problems.push(`line ${i + 1}: ${still} has no pose`);
    seen.add(still);
    rows.push({ still, character, pose });
  });
  return { rows, problems };
}

export function formatCast(rows: CastRow[]): string {
  const clean = (v: string) => v.replace(/[\t\n]+/g, " ").trim();
  return `${CAST_HEADER}\n${rows.map((r) => `${r.still}\t${r.character}\t${clean(r.pose)}`).join("\n")}\n`;
}

export function castCounts(rows: CastRow[]): Record<Character, number> {
  const counts = Object.fromEntries(CAST.map((c) => [c, 0])) as Record<Character, number>;
  for (const r of rows) counts[r.character]++;
  return counts;
}

// ---------------------------------------------------------------- the cast call

/** The parts of content/art/style.md the script uses: the cast section and the prompt template. */
export interface Style {
  castSection: string;
  descriptions: Record<Character, string>;
  template: string;
}

export function parseStyle(md: string): Style {
  const castSection = md.match(/## The cast\n([\s\S]*?)\n## /)?.[1]?.trim() ?? "";
  const descriptions = {} as Record<Character, string>;
  for (const c of CAST) {
    const m = md.match(new RegExp(`^- \\*\\*${c}\\*\\*: (.+)$`, "m"));
    if (m) descriptions[c] = m[1].trim();
  }
  const template = md.match(/## Prompt template[^\n]*\n[\s\S]*?```\n([\s\S]*?)```/)?.[1]?.trim() ?? "";
  return { castSection, descriptions, template };
}

export function checkStyle(style: Style): string[] {
  const problems: string[] = [];
  if (!style.castSection) problems.push('style.md has no "## The cast" section');
  for (const c of CAST) if (!style.descriptions[c]) problems.push(`style.md has no description for ${c}`);
  for (const slot of ["{character}", "{1}", "{2}", "{3}", "{4}", "{5}", "{6}"])
    if (!style.template.includes(slot)) problems.push(`style.md's template has no ${slot}`);
  return problems;
}

export const CAST_SYSTEM = `You cast the illustrations of a flashcard app that teaches the most common Spanish words. Each card's still shows one character from a fixed cast of five clay-toy characters acting out the word's meaning. You choose the character for each still and write its pose.

Rules:
- The concha leads: give her about half of the stills, and every still where no one else clearly fits better. Give the others the words that suit their personality.
- Stills are rendered six to a sheet, one character per sheet, so where the fit is close, prefer giving each other character a count that fills its sheets (a multiple of six, or none).
- The pose shows the word's meaning, never whether the learner was right: a sad word is a drooping character, a happy word a beaming one.
- A pose is one short phrase (8 to 25 words), present participles, in the voice of the examples: "waving happily in front of the open door of a small cosy clay house". Full body, a simple readable action, at most two small props. Play to the character's personality.
- The image can hold no text, letters, numbers, flags or symbols, so never rely on a sign, a label, a speech bubble with words, or a flag. Show a situation a learner would name with the word instead.
- No places or scenery: the still is cut out onto a white card, so a train platform, a shop window, a room or a landscape is drawn as a background and lost. Show the word with the character and small props it holds or stands beside.
- Only the chosen character appears, except where the word needs a second figure (a friend, a family member): then a smaller or larger copy of the same character, described in the pose.
- Do not name the character in the pose; start with the action.`;

export function castPrompt(style: Style, stills: Still[]): string {
  const list = stills
    .map((s) => `- ${s.id}: Spanish "${s.es}", English "${s.en}"${s.hint ? ` (${s.hint})` : ""}`)
    .join("\n");
  return `The cast, from the style guide:\n\n${style.castSection}\n\nCast and pose these ${stills.length} stills, one entry each, using the ids as given:\n\n${list}`;
}

export const CAST_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["stills"],
  properties: {
    stills: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["still", "character", "pose"],
        properties: {
          still: { type: "string" },
          character: { type: "string", enum: [...CAST] },
          pose: { type: "string" },
        },
      },
    },
  },
};

export function castRequest(style: Style, stills: Still[], model: string, effort: DraftRequest["effort"]): DraftRequest {
  return { system: CAST_SYSTEM, prompt: castPrompt(style, stills), schema: CAST_SCHEMA, model, effort };
}

/** Checks Claude's answer: every still once, a known character, a pose. Problems name ids only. */
export function checkCastAnswer(output: unknown, stills: Still[]): { rows: CastRow[]; problems: string[] } {
  const items = (output as { stills?: unknown })?.stills;
  if (!Array.isArray(items)) return { rows: [], problems: ["the answer has no stills list"] };
  const wanted = new Set(stills.map((s) => s.id));
  const rows: CastRow[] = [];
  const problems: string[] = [];
  for (const item of items as Record<string, unknown>[]) {
    const still = String(item?.still ?? "");
    const pose = String(item?.pose ?? "").replace(/\s+/g, " ").trim();
    if (!wanted.has(still)) problems.push(`unknown or repeated still ${still || "(none)"}`);
    else if (!isCharacter(item.character)) problems.push(`${still}: unknown character`);
    else if (!pose) problems.push(`${still}: no pose`);
    else {
      wanted.delete(still);
      rows.push({ still, character: item.character, pose });
    }
  }
  for (const id of wanted) problems.push(`${id}: missing`);
  return { rows, problems };
}

// ---------------------------------------------------------------- sheets

export interface Panel {
  still: string;
  /** 1 for a still's first render, 2 for the next, and so on. */
  take: number;
  pose: string;
}

export interface JobRef {
  job: string;
  url: string;
}

export interface Sheet {
  /** `<character>-<nn>`, numbered per character across every run. */
  id: string;
  character: Character;
  /** Six panels, in reading order. */
  panels: Panel[];
  render?: JobRef;
  cutout?: JobRef;
  /** Set once the panels are cut into stills and added to the review. */
  cut?: boolean;
}

export interface Manifest {
  sheets: Sheet[];
}

export function nextTake(manifest: Manifest, still: string): number {
  let take = 0;
  for (const sheet of manifest.sheets) for (const p of sheet.panels) if (p.still === still) take = Math.max(take, p.take);
  return take + 1;
}

/**
 * Plans new sheets for the stills given, grouped by character in the order given,
 * six to a sheet. A character's last, part-filled sheet repeats its own stills as
 * extra takes, so every render is a full sheet of six and the reviewer gets a choice.
 */
export function planSheets(manifest: Manifest, stills: string[], cast: Map<string, CastRow>): Sheet[] {
  const sheets: Sheet[] = [];
  const takes = new Map<string, number>();
  const take = (still: string) => {
    const t = takes.get(still) ?? nextTake(manifest, still);
    takes.set(still, t + 1);
    return t;
  };
  for (const character of CAST) {
    const mine = stills.filter((id) => cast.get(id)?.character === character);
    if (!mine.length) continue;
    let n = manifest.sheets.filter((s) => s.character === character).length;
    for (let i = 0; i < mine.length; i += PANELS) {
      const chunk = mine.slice(i, i + PANELS);
      const ids = Array.from({ length: PANELS }, (_, k) => chunk[k % chunk.length]);
      n++;
      sheets.push({
        id: `${character}-${String(n).padStart(2, "0")}`,
        character,
        panels: ids.map((still) => ({ still, take: take(still), pose: cast.get(still)!.pose })),
      });
    }
  }
  return sheets;
}

export function sheetPrompt(style: Style, sheet: Sheet): string {
  let text = style.template.replace("{character}", ensureStop(style.descriptions[sheet.character]));
  sheet.panels.forEach((p, i) => (text = text.replace(`{${i + 1}}`, p.pose.replace(/\.$/, ""))));
  return text;
}

const ensureStop = (s: string) => (/[.!?]$/.test(s) ? s : `${s}.`);

// ---------------------------------------------------------------- review.tsv

export const VERDICTS = ["", "ok", "redo"] as const;
export type Verdict = (typeof VERDICTS)[number];

export interface ReviewRow {
  still: string;
  take: number;
  character: Character;
  sheet: string;
  verdict: Verdict;
  note: string;
}

const REVIEW_HEADER = `# One row per cut still (a "take"). Look at the contact sheets in content/art/contact/,
# then write "ok" or "redo" in the verdict column of each take. A still needs one
# "ok" take; if a still has two takes, mark the better one ok and the other redo.
# A still whose takes are all "redo" is rendered again by \`npm run art -- render\`,
# with the character and pose in cast.tsv (change them there first if you like).
# The note column is for you. \`npm run art -- publish\` copies the ok takes into the app.
still\ttake\tcharacter\tsheet\tverdict\tnote`;

export function parseReview(text: string): { rows: ReviewRow[]; problems: string[] } {
  const rows: ReviewRow[] = [];
  const problems: string[] = [];
  text.split("\n").forEach((line, i) => {
    if (!line.trim() || line.startsWith("#") || line.startsWith("still\t")) return;
    const [still, take, character, sheet, verdict = "", ...note] = line.split("\t").map((v) => v.trim());
    const v = verdict.toLowerCase();
    if (!still || !(Number(take) >= 1)) return problems.push(`line ${i + 1}: needs a still id and a take number`);
    if (!isCharacter(character)) return problems.push(`line ${i + 1}: ${still} has character "${character}"`);
    if (!VERDICTS.includes(v as Verdict)) return problems.push(`line ${i + 1}: ${still} take ${take} has verdict "${verdict}" (ok, redo or empty)`);
    rows.push({ still, take: Number(take), character, sheet: sheet ?? "", verdict: v as Verdict, note: note.join(" ") });
  });
  return { rows, problems };
}

export function formatReview(rows: ReviewRow[]): string {
  const body = rows.map((r) => [r.still, r.take, r.character, r.sheet, r.verdict, r.note.replace(/\t/g, " ")].join("\t"));
  return `${REVIEW_HEADER}\n${body.join("\n")}\n`;
}

export type StillState =
  | { state: "none" }
  | { state: "pending" }
  | { state: "approved"; take: number }
  | { state: "redo" };

/** Where a still stands: no take yet, a take waiting for review, an ok take, or every take marked redo. */
export function stillState(rows: ReviewRow[], still: string): StillState {
  const mine = rows.filter((r) => r.still === still);
  const ok = mine.find((r) => r.verdict === "ok");
  if (ok) return { state: "approved", take: ok.take };
  if (!mine.length) return { state: "none" };
  if (mine.some((r) => r.verdict === "")) return { state: "pending" };
  return { state: "redo" };
}

/** The file name of a cut take, under content/art/stills/. */
export const takeFile = (still: string, take: number) => `${still}.t${take}.webp`;
