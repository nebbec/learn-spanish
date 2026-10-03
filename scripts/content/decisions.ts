// A person's decisions on flagged cards. Each flagged card gets a plain text
// file, content/review/decisions/<id>.txt, holding the reasons, a decision line
// ("pending", "approve" or "reject") and the card as "field: value" lines the
// person may correct. The deck build reads these files. content/review/flagged.md
// is the readable list of every flagged card with its reasons.
//
// Nothing here prints card text: problems are reported as ids, line numbers and
// field names.
//
// The rules are in docs/design.md under "Content pipeline", "Decided in E3".

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Card } from "@/lib/deck/types";
import { type DraftStore, withMedia } from "./drafting";
import {
  cardHash,
  draftedWords,
  readDraftCard,
  REASON_LABELS,
  type Finding,
  type Review,
  type ReviewStore,
} from "./reviewing";

export const DECISIONS = ["pending", "approve", "reject"] as const;
export type Decision = (typeof DECISIONS)[number];

/** The card's fields as lines a person can edit, with the grammar lines its part of speech uses. */
export function cardLines(card: Card): Array<[string, string]> {
  const lines: Array<[string, string]> = [
    ["id", card.id],
    ["kind", card.kind],
    ["pos", card.pos],
    ["es", card.es],
    ["en", card.en],
    ["hint", card.hint ?? ""],
  ];
  if (card.pos === "noun") lines.push(["gender", card.grammar.gender], ["article", card.grammar.article]);
  if (card.pos === "adjective") lines.push(["feminine", card.grammar.feminine]);
  if (card.pos === "verb") {
    const { present, irregular } = card.grammar;
    lines.push(["yo", present.yo], ["tu", present.tu], ["el", present.el], ["irregular", irregular ? "yes" : "no"]);
  }
  lines.push(
    ["example.es", card.example.es],
    ["example.en", card.example.en],
    ["spain", card.spain ?? ""],
    ["trick", card.trick],
  );
  return lines;
}

const CARD_KEYS = [
  "id", "kind", "pos", "es", "en", "hint", "gender", "article", "feminine",
  "yo", "tu", "el", "irregular", "example.es", "example.en", "spain", "trick",
];

/** A finding as one readable line. */
function findingLine(f: Finding): string {
  return `${REASON_LABELS[f.reason]}: ${f.problem}${f.fix ? ` Suggested fix: ${f.fix}` : ""}`;
}

/** The text of a new decision file for a flagged card. */
export function decisionFile(card: Card, review: Review): string {
  const width = Math.max(...cardLines(card).map(([key]) => key.length));
  return [
    `# ${card.id} · rank ${review.rank} · ${review.word}`,
    "#",
    "# Why it was flagged:",
    ...review.findings.map((f) => `#   - ${findingLine(f)}`),
    ...(review.note ? [`# Reviewer's note (not a reason to flag): ${review.note}`] : []),
    "#",
    '# To decide, change "pending" on the decision line to:',
    "#   approve   the card goes into the deck as written below, with any corrections you make",
    "#   reject    the card stays out of the deck",
    "# To correct the card, change the text after the colon on any card line.",
    "# Leave hint or spain empty for none; irregular is yes or no.",
    "# Then run: npm run deck",
    "# Lines starting with # are notes and are ignored.",
    "",
    "decision: pending",
    "",
    ...cardLines(card).map(([key, value]) => `${`${key}:`.padEnd(width + 1)} ${value}`.trimEnd()),
    "",
    "# The draft this file was made from. Do not change it.",
    `draft: ${cardHash(card)}`,
    "",
  ].join("\n");
}

export interface ParsedDecision {
  decision: Decision | null;
  draft: string;
  fields: Map<string, string>;
  /** Line numbers and keys only, never the text. */
  errors: string[];
}

export function parseDecision(text: string): ParsedDecision {
  const parsed: ParsedDecision = { decision: null, draft: "", fields: new Map(), errors: [] };
  text.split("\n").forEach((raw, index) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    const colon = line.indexOf(":");
    const key = colon > 0 ? line.slice(0, colon).trim().toLowerCase() : "";
    const value = colon > 0 ? line.slice(colon + 1).trim() : "";
    if (key === "decision") {
      const decision = value.toLowerCase();
      if (DECISIONS.includes(decision as Decision)) parsed.decision = decision as Decision;
      else parsed.errors.push(`line ${index + 1}: decision must be pending, approve or reject`);
    } else if (key === "draft") {
      parsed.draft = value;
    } else if (CARD_KEYS.includes(key)) {
      parsed.fields.set(key, value);
    } else {
      parsed.errors.push(`line ${index + 1}: not a "field: value" line this file knows`);
    }
  });
  if (!parsed.decision && !parsed.errors.length) parsed.errors.push("no decision line");
  return parsed;
}

function yesNo(value: string): unknown {
  const v = value.toLowerCase();
  return v === "yes" || v === "true" ? true : v === "no" || v === "false" ? false : value;
}

/**
 * The card a decision file describes: the draft's fields, replaced by the
 * file's lines. Media paths follow the (possibly corrected) id. Not validated.
 */
export function cardFromDecision(draft: Card, fields: Map<string, string>): unknown {
  const values = new Map(cardLines(draft));
  for (const [key, value] of fields) values.set(key, value);
  const get = (key: string) => values.get(key) ?? "";
  const pos = get("pos");
  const grammar =
    pos === "noun"
      ? { gender: get("gender"), article: get("article") }
      : pos === "adjective"
        ? { feminine: get("feminine") }
        : pos === "verb"
          ? { present: { yo: get("yo"), tu: get("tu"), el: get("el") }, irregular: yesNo(get("irregular")) }
          : null;
  return withMedia({
    id: get("id"),
    rank: draft.rank,
    kind: get("kind"),
    pos,
    es: get("es"),
    en: get("en"),
    hint: get("hint") || null,
    grammar,
    example: { es: get("example.es"), en: get("example.en") },
    spain: get("spain") || null,
    trick: get("trick"),
  });
}

export function decisionPath(store: ReviewStore, id: string) {
  return path.join(store.decisionsDir, `${id}.txt`);
}

export function readDecision(store: ReviewStore, id: string): ParsedDecision | null {
  const file = decisionPath(store, id);
  return existsSync(file) ? parseDecision(readFileSync(file, "utf8")) : null;
}

/** Where a flagged card stands: its decision, or "problem" when its decision file cannot be read. */
export type FlaggedState = Decision | "problem";

export interface FlaggedCard {
  card: Card;
  review: Review;
  state: FlaggedState;
}

/**
 * Every flagged card whose review matches its current draft, in rank order,
 * with its decision. Makes a decision file for a flagged card that has none,
 * and replaces one made from an older draft (`reset` lists those ids).
 */
export function flaggedCards(drafts: DraftStore, store: ReviewStore): { cards: FlaggedCard[]; reset: string[] } {
  const cards: FlaggedCard[] = [];
  const reset: string[] = [];
  for (const word of draftedWords(drafts)) {
    for (const id of word.cards) {
      const card = readDraftCard(drafts, id);
      const review = store.get(id);
      if (!card || !review?.flagged || review.draft !== cardHash(card)) continue;
      let parsed = readDecision(store, id);
      if (parsed && parsed.draft !== review.draft) reset.push(id);
      if (!parsed || parsed.draft !== review.draft) {
        writeFileSync(decisionPath(store, id), decisionFile(card, review));
        parsed = readDecision(store, id)!;
      }
      cards.push({ card, review, state: parsed.errors.length ? "problem" : parsed.decision! });
    }
  }
  return { cards, reset };
}

const cell = (value: string | null) => (value ? value.replace(/\|/g, "\\|") : "none");

function grammarText(card: Card): string | null {
  if (card.pos === "noun") return `${card.grammar.gender === "m" ? "masculine" : "feminine"}, ${card.grammar.article}`;
  if (card.pos === "adjective") return `feminine ${card.grammar.feminine}`;
  if (card.pos === "verb") {
    const { present, irregular } = card.grammar;
    return `yo ${present.yo} · tú ${present.tu} · él ${present.el}${irregular ? " (irregular)" : ""}`;
  }
  return null;
}

const STATE_TEXT: Record<FlaggedState, string> = {
  pending: "waiting for you",
  approve: "approved",
  reject: "rejected",
  problem: "the decision file has a problem; `npm run deck` says which line",
};

/** content/review/flagged.md: the cards waiting for a decision in full, then the decided ones in a line each. */
export function renderFlaggedList(cards: FlaggedCard[]): string {
  const waiting = cards.filter((c) => c.state === "pending" || c.state === "problem");
  const decided = cards.filter((c) => c.state === "approve" || c.state === "reject");
  const out = [
    "# Flagged cards",
    "",
    `The review pass flagged ${cards.length} ${cards.length === 1 ? "card" : "cards"}: ${waiting.length} waiting for you, ${decided.length} decided. This file is rewritten by \`npm run review\` and \`npm run deck\`; do not edit it.`,
    "",
    "**To decide on a card**, open its file in `content/review/decisions/` (linked under each card), change `decision: pending` to `decision: approve` or `decision: reject`, and correct any card line first if it needs it. Then run `npm run deck`, which puts approved cards in the deck and rewrites this list.",
    "",
    "## Waiting for you",
    "",
  ];
  if (!waiting.length) out.push("Nothing.", "");
  for (const { card, review, state } of waiting) {
    out.push(
      `### ${card.id} · rank ${review.rank} · ${review.word}`,
      "",
      `Decide in [decisions/${card.id}.txt](decisions/${card.id}.txt)${state === "problem" ? `. ${STATE_TEXT.problem}.` : ""}`,
      "",
      "| Field | Card |",
      "|---|---|",
      `| Prompt | ${cell(card.en)} |`,
      `| Hint | ${cell(card.hint)} |`,
      `| Answer | ${cell(card.es)} |`,
      `| Kind | ${card.kind}, ${card.pos} |`,
      `| Grammar | ${cell(grammarText(card))} |`,
      `| Example | ${cell(card.example.es)} / ${cell(card.example.en)} |`,
      `| Spain | ${cell(card.spain)} |`,
      `| Trick | ${cell(card.trick)} |`,
      "",
      "Why it was flagged:",
      "",
      ...review.findings.map((f) => `- ${findingLine(f)}`),
      "",
      ...(review.note ? [`Reviewer's note (not a reason to flag): ${review.note}`, ""] : []),
      `The reviewer's own translation: answer "${review.back.es}"; example "${review.back.example}".`,
      "",
    );
  }
  out.push("## Decided", "");
  if (!decided.length) out.push("Nothing yet.", "");
  for (const { card, review, state } of decided) {
    out.push(`- ${card.id} (rank ${review.rank}, ${review.word}): ${STATE_TEXT[state]}. Flagged for ${[...new Set(review.findings.map((f) => REASON_LABELS[f.reason]))].join(", ").toLowerCase()}.`);
  }
  return `${out.join("\n").trimEnd()}\n`;
}

/** Brings the decision files up to date and rewrites the flagged list. Returns counts by state. */
export function refreshFlagged(drafts: DraftStore, store: ReviewStore) {
  const { cards, reset } = flaggedCards(drafts, store);
  writeFileSync(store.flaggedFile, renderFlaggedList(cards));
  const count = (state: FlaggedState) => cards.filter((c) => c.state === state).length;
  return {
    flagged: cards.length,
    waiting: cards.filter((c) => c.state === "pending").map((c) => c.card.id),
    approved: count("approve"),
    rejected: count("reject"),
    problems: cards.filter((c) => c.state === "problem").map((c) => c.card.id),
    reset,
  };
}
