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
import type {
  AdjectiveGrammar,
  DraftCard as AnyDraftCard,
  CaseGrammar,
  GermanNounGrammar,
  GermanVerbGrammar,
  NounGrammar,
  VerbGrammar,
} from "@/lib/deck/types";
import { type DraftStore, withMedia } from "./drafting";
import {
  allDrafted,
  cardHash,
  backAnswer,
  readDraftCard,
  reasonLabel,
  type Finding,
  type Review,
  type ReviewStore,
} from "./reviewing";
import { LANGS, type LangCode } from "./script-lang";

/** A drafted card of either language. Its grammar lines follow the drafts' language (DE5). */
type DraftCard = AnyDraftCard;

export const DECISIONS = ["pending", "approve", "reject"] as const;
export type Decision = (typeof DECISIONS)[number];

const yesNoText = (value: boolean) => (value ? "yes" : "no");

/** The grammar lines of a Spanish card: gender and article, feminine, or the present strip and the irregular flag. */
function spanishGrammarLines(card: DraftCard): Array<[string, string]> {
  if (card.pos === "noun") {
    const g = card.grammar as NounGrammar;
    return [["gender", g.gender], ["article", g.article]];
  }
  if (card.pos === "adjective") return [["feminine", (card.grammar as AdjectiveGrammar).feminine]];
  if (card.pos === "verb") {
    const { present, irregular } = card.grammar as VerbGrammar;
    return [["yo", present.yo], ["tu", present.tu], ["el", present.el], ["irregular", yesNoText(irregular)]];
  }
  return [];
}

/**
 * The grammar lines of a German card (docs/german.md, "Card data"): a noun's gender, article and plural; a
 * verb's ich, du and er forms, irregular, separable and the Perfekt; a case card's case, gender and nominative.
 */
function germanGrammarLines(card: DraftCard): Array<[string, string]> {
  if (card.pos === "noun") {
    const g = card.grammar as GermanNounGrammar;
    return [["gender", g.gender], ["article", g.article], ["plural", g.plural ?? ""]];
  }
  if (card.pos === "verb") {
    const g = card.grammar as GermanVerbGrammar;
    return [
      ["ich", g.present.ich],
      ["du", g.present.du],
      ["er", g.present.er],
      ["irregular", yesNoText(g.irregular)],
      ["separable", yesNoText(g.separable)],
      ["perfekt.aux", g.perfekt.aux],
      ["perfekt.participle", g.perfekt.participle],
    ];
  }
  if (card.kind === "case") {
    const g = card.grammar as CaseGrammar;
    return [["case", g.case], ["gender", g.gender ?? ""], ["from", g.from]];
  }
  return [];
}

/** The card's fields as lines a person can edit, with the grammar lines its language and part of speech use. */
export function cardLines(card: DraftCard, lang: LangCode = "es"): Array<[string, string]> {
  const lines: Array<[string, string]> = [
    ["id", card.id],
    ["kind", card.kind],
    ["pos", card.pos],
    ["target", card.target],
    ["en", card.en],
    ["hint", card.hint ?? ""],
    ...(lang === "es" ? spanishGrammarLines(card) : germanGrammarLines(card)),
  ];
  lines.push(
    ["example.target", card.example.target],
    ["example.en", card.example.en],
    ["regional.where", card.regional?.where ?? ""],
    ["regional.text", card.regional?.text ?? ""],
    ["trick", card.trick ?? ""],
  );
  return lines;
}

const CARD_KEYS: Readonly<Record<LangCode, readonly string[]>> = {
  es: [
    "id", "kind", "pos", "target", "en", "hint", "gender", "article", "feminine",
    "yo", "tu", "el", "irregular", "example.target", "example.en", "regional.where", "regional.text", "trick",
  ],
  de: [
    "id", "kind", "pos", "target", "en", "hint", "gender", "article", "plural",
    "ich", "du", "er", "irregular", "separable", "perfekt.aux", "perfekt.participle", "case", "from",
    "example.target", "example.en", "regional.where", "regional.text", "trick",
  ],
};

/** A finding as one readable line. */
function findingLine(f: Finding, lang: LangCode = "es"): string {
  return `${reasonLabel(f.reason, lang)}: ${f.problem}${f.fix ? ` Suggested fix: ${f.fix}` : ""}`;
}

/** The text of a new decision file for a flagged card. */
export function decisionFile(card: DraftCard, review: Review, lang: LangCode = "es"): string {
  const lines = cardLines(card, lang);
  const width = Math.max(...lines.map(([key]) => key.length));
  return [
    `# ${card.id} · rank ${review.rank} · ${review.word}`,
    "#",
    "# Why it was flagged:",
    ...review.findings.map((f) => `#   - ${findingLine(f, lang)}`),
    ...(review.note ? [`# Reviewer's note (not a reason to flag): ${review.note}`] : []),
    "#",
    '# To decide, change "pending" on the decision line to:',
    "#   approve   the card goes into the deck as written below, with any corrections you make",
    "#   reject    the card stays out of the deck",
    "# To correct the card, change the text after the colon on any card line.",
    ...(review.findings.some((f) => f.reason === "sameAs")
      ? [`# sameAs is not a card line: correct it in ${LANGS[lang].contentDir}/drafts/words/${String(review.rank).padStart(4, "0")}.json.`]
      : []),
    lang === "es"
      ? "# Leave hint or regional.text empty for none; irregular is yes or no."
      : "# Leave hint, plural or regional.text empty for none; irregular and separable are yes or no.",
    `# Then run: npm run deck${lang === "es" ? "" : ` -- --lang ${lang}`}`,
    "# Lines starting with # are notes and are ignored.",
    "",
    "decision: pending",
    "",
    ...lines.map(([key, value]) => `${`${key}:`.padEnd(width + 1)} ${value}`.trimEnd()),
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

export function parseDecision(text: string, lang: LangCode = "es"): ParsedDecision {
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
    } else if (CARD_KEYS[lang].includes(key)) {
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
 * file's lines. Media paths follow the (possibly corrected) id; a form card keeps its verb's image. Not validated.
 */
export function cardFromDecision(draft: DraftCard, fields: Map<string, string>, lang: LangCode = "es"): unknown {
  const values = new Map(cardLines(draft, lang));
  for (const [key, value] of fields) values.set(key, value);
  const get = (key: string) => values.get(key) ?? "";
  const pos = get("pos");
  const grammar = lang === "es" ? spanishGrammar(pos, get) : germanGrammar(pos, get("kind"), get);
  return withMedia(
    {
    id: get("id"),
    rank: draft.rank,
    kind: get("kind"),
    pos,
    target: get("target"),
    en: get("en"),
    hint: get("hint") || null,
    grammar,
    example: { target: get("example.target"), en: get("example.en") },
    regional: get("regional.text") ? { where: get("regional.where"), text: get("regional.text") } : null,
    trick: get("trick") || null,
    image: draft.image,
    },
    lang,
  );
}

function spanishGrammar(pos: string, get: (key: string) => string): unknown {
  if (pos === "noun") return { gender: get("gender"), article: get("article") };
  if (pos === "adjective") return { feminine: get("feminine") };
  if (pos === "verb") return { present: { yo: get("yo"), tu: get("tu"), el: get("el") }, irregular: yesNo(get("irregular")) };
  return null;
}

function germanGrammar(pos: string, kind: string, get: (key: string) => string): unknown {
  if (pos === "noun") return { gender: get("gender"), article: get("article"), plural: get("plural") || null };
  if (pos === "verb") {
    return {
      present: { ich: get("ich"), du: get("du"), er: get("er") },
      irregular: yesNo(get("irregular")),
      separable: yesNo(get("separable")),
      perfekt: { aux: get("perfekt.aux"), participle: get("perfekt.participle") },
    };
  }
  if (kind === "case") return { case: get("case"), gender: get("gender") || null, from: get("from") };
  return null;
}

export function decisionPath(store: ReviewStore, id: string) {
  return path.join(store.decisionsDir, `${id}.txt`);
}

export function readDecision(store: ReviewStore, id: string, lang: LangCode = "es"): ParsedDecision | null {
  const file = decisionPath(store, id);
  return existsSync(file) ? parseDecision(readFileSync(file, "utf8"), lang) : null;
}

/** Where a flagged card stands: its decision, or "problem" when its decision file cannot be read. */
export type FlaggedState = Decision | "problem";

export interface FlaggedCard {
  card: DraftCard;
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
  for (const word of allDrafted(drafts)) {
    for (const id of word.cards) {
      const card = readDraftCard(drafts, id);
      const review = store.get(id);
      if (!card || !review?.flagged || review.draft !== cardHash(card)) continue;
      let parsed = readDecision(store, id, drafts.lang);
      if (parsed && parsed.draft !== review.draft) reset.push(id);
      if (!parsed || parsed.draft !== review.draft) {
        writeFileSync(decisionPath(store, id), decisionFile(card, review, drafts.lang));
        parsed = readDecision(store, id, drafts.lang)!;
      }
      cards.push({ card, review, state: parsed.errors.length ? "problem" : parsed.decision! });
    }
  }
  return { cards, reset };
}

const cell = (value: string | null) => (value ? value.replace(/\|/g, "\\|") : "none");

const GENDER_NAMES: Record<string, string> = { m: "masculine", f: "feminine", n: "neuter", pl: "plural" };

function grammarText(card: DraftCard, lang: LangCode): string | null {
  if (lang !== "es") return germanGrammarText(card);
  if (card.pos === "noun") {
    const g = card.grammar as NounGrammar;
    return `${g.gender === "m" ? "masculine" : "feminine"}, ${g.article}`;
  }
  if (card.pos === "adjective") return `feminine ${(card.grammar as AdjectiveGrammar).feminine}`;
  if (card.pos === "verb") {
    const { present, irregular } = card.grammar as VerbGrammar;
    return `yo ${present.yo} · tú ${present.tu} · él ${present.el}${irregular ? " (irregular)" : ""}`;
  }
  return null;
}

function germanGrammarText(card: DraftCard): string | null {
  if (card.pos === "noun") {
    const g = card.grammar as GermanNounGrammar;
    return `${GENDER_NAMES[g.gender]}, ${g.article}${g.plural ? `; plural ${g.plural}` : "; no plural"}`;
  }
  if (card.pos === "verb") {
    const g = card.grammar as GermanVerbGrammar;
    const flags = [g.irregular && "irregular", g.separable && "separable"].filter(Boolean).join(", ");
    return `ich ${g.present.ich} · du ${g.present.du} · er ${g.present.er}${flags ? ` (${flags})` : ""}; Perfekt: ${g.perfekt.aux === "sein" ? "ist" : "hat"} ${g.perfekt.participle}`;
  }
  if (card.kind === "case") {
    const g = card.grammar as CaseGrammar;
    return `${g.case === "akk" ? "Akkusativ" : "Dativ"}${g.gender ? ` · ${GENDER_NAMES[g.gender]}` : ""}: from ${g.from}`;
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
export function renderFlaggedList(cards: FlaggedCard[], lang: LangCode = "es"): string {
  const decisions = `${LANGS[lang].contentDir}/review/decisions/`;
  const deck = lang === "es" ? "npm run deck" : `npm run deck -- --lang ${lang}`;
  const waiting = cards.filter((c) => c.state === "pending" || c.state === "problem");
  const decided = cards.filter((c) => c.state === "approve" || c.state === "reject");
  const out = [
    "# Flagged cards",
    "",
    `The review pass flagged ${cards.length} ${cards.length === 1 ? "card" : "cards"}: ${waiting.length} waiting for you, ${decided.length} decided. This file is rewritten by \`npm run review\` and \`npm run deck\`; do not edit it.`,
    "",
    `**To decide on a card**, open its file in \`${decisions}\` (linked under each card), change \`decision: pending\` to \`decision: approve\` or \`decision: reject\`, and correct any card line first if it needs it. Then run \`${deck}\`, which puts approved cards in the deck and rewrites this list.`,
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
      `| Answer | ${cell(card.target)} |`,
      `| Kind | ${card.kind}, ${card.pos} |`,
      `| Grammar | ${cell(grammarText(card, lang))} |`,
      `| Example | ${cell(card.example.target)} / ${cell(card.example.en)} |`,
      `| Regional | ${cell(card.regional && `${card.regional.where}: ${card.regional.text}`)} |`,
      `| Trick | ${cell(card.trick)} |`,
      "",
      "Why it was flagged:",
      "",
      ...review.findings.map((f) => `- ${findingLine(f, lang)}`),
      "",
      ...(review.note ? [`Reviewer's note (not a reason to flag): ${review.note}`, ""] : []),
      `The reviewer's own translation: answer "${backAnswer(review.back)}"; example "${review.back.example}".`,
      "",
    );
  }
  out.push("## Decided", "");
  if (!decided.length) out.push("Nothing yet.", "");
  for (const { card, review, state } of decided) {
    out.push(`- ${card.id} (rank ${review.rank}, ${review.word}): ${STATE_TEXT[state]}. Flagged for ${[...new Set(review.findings.map((f) => reasonLabel(f.reason, lang)))].join(", ").toLowerCase()}.`);
  }
  return `${out.join("\n").trimEnd()}\n`;
}

/** Brings the decision files up to date and rewrites the flagged list. Returns counts by state. */
export function refreshFlagged(drafts: DraftStore, store: ReviewStore) {
  const { cards, reset } = flaggedCards(drafts, store);
  writeFileSync(store.flaggedFile, renderFlaggedList(cards, drafts.lang));
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
