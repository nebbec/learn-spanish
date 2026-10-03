// Reviews drafted cards for a range of ranks with a second, independent Claude call per card.
//
//   npm run review -- --from 1 --to 20 [--via cli|api] [--model claude-opus-5-5]
//                     [--effort medium] [--concurrency 2] [--retries 2] [--redo]
//
// --via cli (the default) calls the Claude Code CLI on the Max plan; --via api
// calls the API with ANTHROPIC_API_KEY. Writes content/review/cards/<id>.json
// per card, a decision file content/review/decisions/<id>.txt per flagged card,
// the readable list content/review/flagged.md, and each call's token usage to
// content/review/usage.jsonl. Rerunning the same command resumes: a card whose
// current draft has a review is skipped unless --redo is given.
//
// Prints only ranks, words, card ids, check names and counts, never card text.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { apiRunner, cliRunner, DEFAULT_MODEL, EFFORTS, type Effort } from "./claude";
import { refreshFlagged } from "./decisions";
import { DraftStore } from "./drafting";
import { draftedWords, formatReviewSummary, reviewCards, ReviewStore } from "./reviewing";

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
    drafts: { type: "string", default: path.join(ROOT, "content", "drafts") },
    dir: { type: "string", default: path.join(ROOT, "content", "review") },
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

const drafts = new DraftStore(values.drafts);
const store = new ReviewStore(values.dir);
const words = draftedWords(drafts, from, to);
const via = values.via;

console.log(
  `Reviewing the cards of ranks ${from} to ${to} (${words.length} drafted ${words.length === 1 ? "word" : "words"}) via ${via}, model ${values.model}, effort ${effort}, ${concurrency} at a time`,
);
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
