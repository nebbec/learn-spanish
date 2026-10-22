// Reviews drafted cards for a range of ranks with a second, independent Claude call per card.
//
//   npm run review -- --from 1 --to 20 [--via cli|api] [--model claude-opus-5-5]
//                     [--effort medium] [--concurrency 2] [--retries 2] [--redo]
//   npm run review -- --forms [--verbs ser,estar] [...]    the drafted form cards
//   npm run review -- --phrases [--units who-i-am] [...]   the drafted phrase cards
//   npm run review -- --lang de ...                        German: content/de/drafts into content/de/review
//
// --lang de (DE5) reads and writes content/de/ in place of content/, with
// German's prompt (DE7), which also checks each card's `sameAs` against the
// drafted Spanish content cards.
//
// --via cli (the default) calls the Claude Code CLI on the Max plan; --via api
// calls the API with ANTHROPIC_API_KEY. Writes content/review/cards/<id>.json
// per card, a decision file content/review/decisions/<id>.txt per flagged card,
// the readable list content/review/flagged.md, and each call's token usage to
// content/review/usage.jsonl. Rerunning the same command resumes: a card whose
// current draft has a review is skipped unless --redo is given.
//
// The known-words check (L7) runs on every card reviewed, against the learning
// path's order as `npm run deck` computes it now (units.json and the tags), with
// E1's lemma list from content/.cache (downloaded once if missing). With no
// unit plan yet (German before DE8) it is not run, and the run says so.
//
// Prints only ranks, words, card ids, check names and counts, never card text.

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { apiRunner, cliRunner, DEFAULT_MODEL, EFFORTS, type Effort } from "./claude";
import { pathOnDisk } from "./deck-build";
import { refreshFlagged } from "./decisions";
import { DraftStore, spanishMeanings } from "./drafting";
import { exampleProblem, loadLemmas } from "./known-words";
import { PROMPTS_READY, promptsNotReady } from "./prompts-de";
import { draftedForms, draftedPhrases, draftedWords, formatReviewSummary, reviewCards, ReviewStore } from "./reviewing";
import { contentPaths, LANG_OPTION, parseLang } from "./script-lang";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const { values } = parseArgs({
  options: {
    ...LANG_OPTION,
    from: { type: "string" },
    to: { type: "string" },
    via: { type: "string", default: "cli" },
    model: { type: "string", default: DEFAULT_MODEL },
    effort: { type: "string", default: "medium" },
    concurrency: { type: "string", default: "2" },
    retries: { type: "string", default: "2" },
    redo: { type: "boolean", default: false },
    forms: { type: "boolean", default: false },
    phrases: { type: "boolean", default: false },
    verbs: { type: "string" },
    units: { type: "string" },
    drafts: { type: "string" },
    dir: { type: "string" },
  },
});

function fail(message: string): never {
  console.error(message);
  process.exit(2);
}

const lang = parseLang(values.lang);
const paths = contentPaths(ROOT, lang);
if (!PROMPTS_READY[lang]) fail(promptsNotReady(lang));

if (values.forms && values.phrases) fail("Give --forms or --phrases, not both");
const from = Number(values.from);
const to = Number(values.to ?? values.from);
if (!values.forms && !values.phrases && (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from)) {
  fail("Give a range of ranks (--from 1 --to 20), or --forms, or --phrases");
}
const list = (value: string | undefined) => value?.split(",").map((v) => v.trim()).filter(Boolean);
if (values.via !== "cli" && values.via !== "api") fail('--via is "cli" or "api"');
if (!EFFORTS.includes(values.effort as Effort)) fail(`--effort is one of ${EFFORTS.join(", ")}`);
const effort = values.effort as Effort;
const concurrency = Number(values.concurrency);
const retries = Number(values.retries);
if (!(concurrency >= 1) || !(retries >= 0)) fail("--concurrency must be 1 or more and --retries 0 or more");

const drafts = new DraftStore(values.drafts ?? paths.drafts, lang);
const store = new ReviewStore(values.dir ?? paths.review);
const words = values.forms
  ? draftedForms(drafts, list(values.verbs))
  : values.phrases
    ? draftedPhrases(drafts, list(values.units))
    : draftedWords(drafts, from, to);
const via = values.via;
const what = values.forms
  ? `the form cards of ${words.length} drafted verbs`
  : values.phrases
    ? `the phrase cards of ${words.length} units`
    : `the cards of ranks ${from} to ${to} (${words.length} drafted ${words.length === 1 ? "word" : "words"})`;

const lemmas = await loadLemmas(ROOT, lang);
// The order is the learning path's, so it needs the unit plan and tip list; German's come in DE8.
const plan = existsSync(paths.units) && existsSync(paths.tipList);
const computed = plan ? pathOnDisk(ROOT, drafts, store, lemmas) : null;
const knownWords = new Map<string, string>();
for (const [id, check] of computed?.examples ?? []) if (!check.ok) knownWords.set(computed!.draftIds.get(id) ?? id, exampleProblem(check));
if (!lemmas) {
  console.log(`Known-words check not run: no ${paths.config.language} lemma list pinned in sources.mjs`);
} else if (!computed) {
  console.log(`Known-words check not run: no unit plan yet (${path.relative(ROOT, paths.units)} and ${path.relative(ROOT, paths.tipList)})`);
} else if (computed.orderProblems.length) {
  console.log(`Known-words check not run: the order has ${computed.orderProblems.length} problems (run npm run deck to see them)`);
}

console.log(`Reviewing ${what} via ${via}, model ${values.model}, effort ${effort}, ${concurrency} at a time`);
const summary = await reviewCards(words, {
  drafts,
  store,
  runner: via === "api" ? apiRunner() : cliRunner(),
  via,
  model: values.model,
  effort,
  concurrency,
  retries,
  redo: values.redo,
  knownWords,
  spanish: lang === "es" ? [] : spanishMeanings(new DraftStore(contentPaths(ROOT, "es").drafts)),
});
for (const line of formatReviewSummary(summary, via)) console.log(line);

const flagged = refreshFlagged(drafts, store);
const rel = (file: string) => path.relative(process.cwd(), file);
console.log(
  `Flagged list: ${rel(store.flaggedFile)} (${flagged.flagged} flagged: ${flagged.waiting.length} waiting, ${flagged.approved} approved, ${flagged.rejected} rejected${flagged.problems.length ? `, ${flagged.problems.length} with a problem in the decision file` : ""})`,
);
if (flagged.reset.length) console.log(`Decision files remade for a new draft: ${flagged.reset.join(", ")}`);
console.log(`Per-call usage: ${rel(store.logFile)}`);
if (summary.failed > 0 || summary.notRun > 0) process.exitCode = 1;
