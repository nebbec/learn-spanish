// Tags every drafted card with its place on the learning path: one Claude call per drafted word, per
// verb's form cards, per unit's phrase cards and per unit's case cards (German, DE9), each returning the
// cards' unit, want, requires and tip. A phrase or case card's unit and want are the plan's, not Claude's.
//
//   npm run tag [-- --from 1 --to 300] [--via cli|api] [--model claude-opus-5-5]
//               [--effort medium] [--concurrency 2] [--retries 2] [--redo]
//   npm run tag -- --check     checks the stored tags only, with no calls
//   npm run tag -- --lang de --cases [--redo]   only the units' case cards (DE9)
//
// --from and --to keep the groups whose rank is in range (a word's rank, a verb's, or the highest of a
// unit's phrases); with neither, every group. --via cli (the default) calls the Claude Code CLI on the Max
// plan; --via api calls the API with ANTHROPIC_API_KEY. Writes content/tags/<id>.json per card and each
// call's token usage to content/tags/usage.jsonl. Rerunning resumes: a group is tagged again only when a
// card has no tag, a tag made for an earlier draft, or a tag the checks refuse; --redo tags it again anyway.
// Tags of cards no longer drafted are deleted.
//
// --cases keeps only the case groups, so they can be tagged again once the noun cards they require are
// drafted (`--redo`).
//
// --lang de (DE5) reads and writes content/de/ in place of content/, with German's prompt (DE7).
//
// Prints only ranks, words, ids, unit and tip ids, and counts, never card text.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { apiRunner, cliRunner, DEFAULT_MODEL, EFFORTS, type Effort } from "./claude";
import { PROMPTS_READY, promptsNotReady } from "./prompts-de";
import { contentPaths, LANG_OPTION, parseLang } from "./script-lang";
import { DraftStore, formatSummary } from "./drafting";
import { checkTags, tagCards, tagContext, tagGroups, TagStore } from "./tagging";
import { checkTips, checkUnits, readTips, readUnits } from "./units";

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
    check: { type: "boolean", default: false },
    cases: { type: "boolean", default: false },
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
// --check sends nothing to Claude, so it runs whatever the language's prompts.
if (!values.check && !PROMPTS_READY[lang]) fail(promptsNotReady(lang));

const from = values.from === undefined ? 1 : Number(values.from);
const to = values.to === undefined ? Number.MAX_SAFE_INTEGER : Number(values.to);
if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from) fail("--from and --to are ranks, --from 1 or more");
if (values.via !== "cli" && values.via !== "api") fail('--via is "cli" or "api"');
if (!EFFORTS.includes(values.effort as Effort)) fail(`--effort is one of ${EFFORTS.join(", ")}`);
const concurrency = Number(values.concurrency);
const retries = Number(values.retries);
if (!(concurrency >= 1) || !(retries >= 0)) fail("--concurrency must be 1 or more and --retries 0 or more");

const tips = readTips(ROOT, lang);
const units = readUnits(ROOT, lang);
const planProblems = [...checkTips(tips), ...checkUnits(units, tips)];
if (planProblems.length) fail(`The tip list or unit plan has ${planProblems.length} problems: ${planProblems.join("; ")}`);

const drafts = new DraftStore(values.drafts ?? paths.drafts, lang);
const groups = tagGroups(drafts);
const ctx = tagContext(groups, units, tips, lang);
const store = new TagStore(values.dir ?? paths.tags);

if (!values.check) {
  const pruned = store.prune(new Set(ctx.cards.map((c) => c.id)));
  if (pruned.length) console.log(`Deleted ${pruned.length} tags of cards no longer drafted: ${pruned.join(", ")}`);
  const chosen = groups.filter((g) => g.rank >= from && g.rank <= to && (!values.cases || g.kind === "case"));
  const via = values.via;
  console.log(
    `Tagging ${chosen.length} groups (${chosen.reduce((n, g) => n + g.cards.length, 0)} cards) via ${via}, model ${values.model}, effort ${values.effort}, ${concurrency} at a time`,
  );
  const summary = await tagCards(chosen, ctx, {
    store,
    runner: via === "api" ? apiRunner() : cliRunner(),
    via,
    model: values.model,
    effort: values.effort as Effort,
    concurrency,
    retries,
    redo: values.redo,
  });
  for (const line of formatSummary(summary, via, "Groups")) console.log(line);
  if (summary.failed > 0 || summary.notRun > 0) process.exitCode = 1;
}

const check = checkTags(store, ctx);
console.log(
  `Tags: ${check.tagged} of ${ctx.cards.length} drafted cards tagged and passing; ${check.untagged.length} untagged, ${check.stale.length} tagged for an earlier draft, ${check.problems.length} problems`,
);
/** Ids, the first 20 of a long list. */
const some = (ids: string[]) => (ids.length > 20 ? `${ids.slice(0, 20).join(", ")} and ${ids.length - 20} more` : ids.join(", "));
if (check.untagged.length) console.log(`Untagged: ${some(check.untagged)}`);
if (check.stale.length) console.log(`Tagged for an earlier draft: ${some(check.stale)}`);
for (const problem of check.problems) console.log(`Problem: ${problem}`);
if (check.problems.length) process.exitCode = 1;
