// Drafts the tips of content/tips.json with Claude, one call per tip, into
// content/tips/<id>.txt for Courtney to read and approve.
//
//   npm run tips [-- --tips tip-two-to-be,tip-el-la] [--via cli|api] [--model claude-opus-5-5]
//                [--effort medium] [--concurrency 2] [--retries 2] [--redo]
//
// --via cli (the default) calls the Claude Code CLI on the Max plan; --via api
// calls the API with ANTHROPIC_API_KEY. A tip is drafted when its file exists,
// so rerunning resumes; --redo drafts again and replaces the file, approval and
// corrections included. Each call's token usage goes to content/tips/usage.jsonl.
//
// Prints only tip ids and counts, never tip text.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { apiRunner, cliRunner, DEFAULT_MODEL, EFFORTS, type Effort } from "./claude";
import { formatSummary } from "./drafting";
import { draftTips, TipStore, tipJobs } from "./tips";
import { checkTips, checkUnits, readTips, readUnits } from "./units";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const { values } = parseArgs({
  options: {
    tips: { type: "string" },
    via: { type: "string", default: "cli" },
    model: { type: "string", default: DEFAULT_MODEL },
    effort: { type: "string", default: "medium" },
    concurrency: { type: "string", default: "2" },
    retries: { type: "string", default: "2" },
    redo: { type: "boolean", default: false },
    dir: { type: "string", default: path.join(ROOT, "content", "tips") },
  },
});

function fail(message: string): never {
  console.error(message);
  process.exit(2);
}

if (values.via !== "cli" && values.via !== "api") fail('--via is "cli" or "api"');
if (!EFFORTS.includes(values.effort as Effort)) fail(`--effort is one of ${EFFORTS.join(", ")}`);
const concurrency = Number(values.concurrency);
const retries = Number(values.retries);
if (!(concurrency >= 1) || !(retries >= 0)) fail("--concurrency must be 1 or more and --retries 0 or more");

const list = readTips(ROOT);
const units = readUnits(ROOT);
const planProblems = [...checkTips(list), ...checkUnits(units, list)];
if (planProblems.length) fail(`The tip list or unit plan has ${planProblems.length} problems: ${planProblems.join("; ")}`);

const only = values.tips?.split(",").map((v) => v.trim()).filter(Boolean);
const unknown = (only ?? []).filter((id) => !list.some((t) => t.id === id));
if (unknown.length) fail(`Not in content/tips.json: ${unknown.join(", ")}`);
const jobs = tipJobs(list, units).filter((job) => !only || only.includes(job.id));

const store = new TipStore(values.dir);
const via = values.via;
console.log(`Drafting ${jobs.length} tips via ${via}, model ${values.model}, effort ${values.effort}, ${concurrency} at a time`);
const summary = await draftTips(jobs, {
  store,
  runner: via === "api" ? apiRunner() : cliRunner(),
  via,
  model: values.model,
  effort: values.effort as Effort,
  concurrency,
  retries,
  redo: values.redo,
});
// One tip per call, so the per-call card count says nothing here.
for (const line of formatSummary(summary, via, "Tips").filter((l) => !l.startsWith("Cards:"))) console.log(line);
const rel = path.relative(process.cwd(), store.dir);
console.log(`Read each file under ${rel.startsWith("..") ? store.dir : rel}/ and set its status to approve, then run npm run deck`);
if (summary.failed > 0 || summary.notRun > 0) process.exitCode = 1;
