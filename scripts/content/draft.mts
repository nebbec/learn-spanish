// Drafts cards for a range of ranks of content/word-list.tsv with Claude.
//
//   npm run draft -- --from 1 --to 20 [--via cli|api] [--model claude-opus-5-5]
//                    [--effort medium] [--concurrency 2] [--retries 2] [--redo]
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
import { DraftStore, draftWords, formatSummary, parseWordList } from "./drafting";

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
    list: { type: "string", default: path.join(ROOT, "content", "word-list.tsv") },
    dir: { type: "string", default: path.join(ROOT, "content", "drafts") },
  },
});

function fail(message: string): never {
  console.error(message);
  process.exit(2);
}

const from = Number(values.from);
const to = Number(values.to ?? values.from);
if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from) {
  fail("Give a range of ranks: --from 1 --to 20");
}
if (values.via !== "cli" && values.via !== "api") fail('--via is "cli" or "api"');
if (!EFFORTS.includes(values.effort as Effort)) fail(`--effort is one of ${EFFORTS.join(", ")}`);
const effort = values.effort as Effort;
const concurrency = Number(values.concurrency);
const retries = Number(values.retries);
if (!(concurrency >= 1) || !(retries >= 0)) fail("--concurrency must be 1 or more and --retries 0 or more");

const entries = parseWordList(readFileSync(values.list, "utf8")).filter((e) => e.rank >= from && e.rank <= to);
const store = new DraftStore(values.dir);
const via = values.via;

console.log(
  `Drafting ranks ${from} to ${to} (${entries.length} ${entries.length === 1 ? "word" : "words"}) via ${via}, model ${values.model}, effort ${effort}, ${concurrency} at a time`,
);
const summary = await draftWords(entries, {
  store,
  runner: via === "api" ? apiRunner() : cliRunner(),
  via,
  model: values.model,
  effort,
  concurrency,
  retries,
  redo: values.redo,
});
for (const line of formatSummary(summary, via)) console.log(line);

const problems = store.deckProblems();
console.log(
  problems.length
    ? `Deck check over all ${store.index.size} drafted cards: ${problems.length} problems (${problems.slice(0, 20).join("; ")})`
    : `Deck check over all ${store.index.size} drafted cards: no problems`,
);
const logPath = path.relative(process.cwd(), store.logFile);
console.log(`Per-call usage: ${logPath.startsWith("..") ? store.logFile : logPath}`);
if (summary.failed > 0 || summary.notRun > 0) process.exitCode = 1;
