// Drafts cards for a range of ranks of content/word-list.tsv with Claude.
//
//   npm run draft -- --from 1 --to 20 [--via cli|api] [--model claude-opus-5-5]
//                    [--effort medium] [--concurrency 2] [--retries 2] [--redo]
//   npm run draft -- --forms [--verbs ser,estar] [...]    the core verbs' form cards
//   npm run draft -- --phrases [--units who-i-am] [...]   content/units.json's chunks and payoffs
//
// --forms drafts one call per verb of FORM_VERBS (path-cards.ts) whose card is
// drafted, into content/drafts/forms/<verb>.json; --phrases one call per phrase,
// into content/drafts/phrases/<id>.json. Both resume like words do.
//
// --via cli (the default) calls the Claude Code CLI on the Max plan; --via api
// calls the API with ANTHROPIC_API_KEY. Writes content/drafts/cards/<id>.json
// per card and content/drafts/words/<rank>.json per word, and logs each call's
// token usage to content/drafts/usage.jsonl. Rerunning the same command
// resumes: words with a word file are skipped unless --redo is given.
//
// Prints only ranks, words, card ids and counts, never card text.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { apiRunner, cliRunner, DEFAULT_MODEL, EFFORTS, type Effort } from "./claude";
import { DraftStore, draftWords, formatSummary, parseWordList, type DraftSummary } from "./drafting";
import { draftForms, draftPhrases, formJobs, phraseJobs, wordRanks } from "./path-cards";
import { readUnits } from "./units";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const { values } = parseArgs({
  options: {
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
    list: { type: "string", default: path.join(ROOT, "content", "word-list.tsv") },
    dir: { type: "string", default: path.join(ROOT, "content", "drafts") },
  },
});

function fail(message: string): never {
  console.error(message);
  process.exit(2);
}

const mode = values.forms ? "forms" : values.phrases ? "phrases" : "words";
if (values.forms && values.phrases) fail("Give --forms or --phrases, not both");
const from = Number(values.from);
const to = Number(values.to ?? values.from);
if (mode === "words" && (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from)) {
  fail("Give a range of ranks (--from 1 --to 20), or --forms, or --phrases");
}
const list = (value: string | undefined) => value?.split(",").map((v) => v.trim()).filter(Boolean);
if (values.via !== "cli" && values.via !== "api") fail('--via is "cli" or "api"');
if (!EFFORTS.includes(values.effort as Effort)) fail(`--effort is one of ${EFFORTS.join(", ")}`);
const effort = values.effort as Effort;
const concurrency = Number(values.concurrency);
const retries = Number(values.retries);
if (!(concurrency >= 1) || !(retries >= 0)) fail("--concurrency must be 1 or more and --retries 0 or more");

const wordList = parseWordList(readFileSync(values.list, "utf8"));
const store = new DraftStore(values.dir);
const via = values.via;
const options = {
  store,
  runner: via === "api" ? apiRunner() : cliRunner(),
  via,
  model: values.model,
  effort,
  concurrency,
  retries,
  redo: values.redo,
};
const how = `via ${via}, model ${values.model}, effort ${effort}, ${concurrency} at a time`;
let summary: DraftSummary;
let noun = "Words";

if (mode === "forms") {
  const { jobs, missing } = formJobs(store, readUnits(ROOT), list(values.verbs));
  if (missing.length) console.log(`Not drafted, their verb's card is missing: ${missing.join(", ")}`);
  console.log(`Drafting the form cards of ${jobs.length} verbs (${jobs.reduce((n, j) => n + j.cards.length, 0)} cards) ${how}`);
  summary = await draftForms(jobs, options);
  noun = "Verbs";
} else if (mode === "phrases") {
  const units = list(values.units);
  const { jobs: all, problems } = phraseJobs(readUnits(ROOT));
  if (problems.length) fail(`The unit plan's phrases have ${problems.length} problems: ${problems.join("; ")}`);
  const jobs = all.filter((j) => !units || units.includes(j.unit));
  console.log(`Drafting ${jobs.length} phrase cards ${how}`);
  summary = await draftPhrases(jobs, wordRanks(wordList), options);
  noun = "Phrases";
} else {
  const entries = wordList.filter((e) => e.rank >= from && e.rank <= to);
  console.log(`Drafting ranks ${from} to ${to} (${entries.length} ${entries.length === 1 ? "word" : "words"}) ${how}`);
  summary = await draftWords(entries, options);
}
for (const line of formatSummary(summary, via, noun)) console.log(line);

const problems = store.deckProblems();
console.log(
  problems.length
    ? `Deck check over all ${store.index.size} drafted cards: ${problems.length} problems (${problems.slice(0, 20).join("; ")})`
    : `Deck check over all ${store.index.size} drafted cards: no problems`,
);
const logPath = path.relative(process.cwd(), store.logFile);
console.log(`Per-call usage: ${logPath.startsWith("..") ? store.logFile : logPath}`);
if (summary.failed > 0 || summary.notRun > 0) process.exitCode = 1;
