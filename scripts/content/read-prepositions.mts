// Reads the photos of the handout "Verben mit Präpositionen" into the list of verbs with prepositions (DE19).
//
//   npm run prepositions -- --lang de [--pages 1,2] [--via cli|api] [--model claude-opus-5-5]
//                           [--effort medium] [--concurrency 2] [--retries 2] [--redo]
//   npm run prepositions -- --lang de --check          no calls: settle, check and list the flagged rows again
//
// Each photo (content/de/prepositions/page-01.jpg to page-10.jpg) is read twice, in two independent calls,
// into content/de/prepositions/reads/page-NN.read-N.json. A page whose reads are both on disk is compared and
// put into content/de/prepositions.tsv once; after that its rows are Courtney's to edit, and a rerun keeps them
// (--redo reads the pages again and replaces their rows). Every run joins the / rows marked either, runs the
// checks and rewrites content/de/prepositions-flagged.md.
//
// Prints counts and page numbers only, never rows.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { apiRunner, cliRunner, DEFAULT_MODEL, EFFORTS, type Effort } from "./claude";
import { formatSummary, writeText } from "./drafting";
import {
  applyEither,
  checkList,
  compareReads,
  flaggedText,
  isOpen,
  listText,
  pageCounts,
  PAGES,
  parseList,
  readPages,
  ReadStore,
  READS,
  replacePages,
  type List,
} from "./prepositions";
import { contentPaths, LANG_OPTION, parseLang } from "./script-lang";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const { values } = parseArgs({
  options: {
    ...LANG_OPTION,
    pages: { type: "string" },
    via: { type: "string", default: "cli" },
    model: { type: "string", default: DEFAULT_MODEL },
    effort: { type: "string", default: "medium" },
    concurrency: { type: "string", default: "2" },
    retries: { type: "string", default: "2" },
    redo: { type: "boolean", default: false },
    check: { type: "boolean", default: false },
  },
});

function fail(message: string): never {
  console.error(message);
  process.exit(2);
}

const lang = parseLang(values.lang);
if (lang !== "de") fail("Verbs with prepositions are German only: run npm run prepositions -- --lang de");
const paths = contentPaths(ROOT, lang);
if (values.via !== "cli" && values.via !== "api") fail('--via is "cli" or "api"');
if (!EFFORTS.includes(values.effort as Effort)) fail(`--effort is one of ${EFFORTS.join(", ")}`);
const concurrency = Number(values.concurrency);
const retries = Number(values.retries);
if (!(concurrency >= 1) || !(retries >= 0)) fail("--concurrency must be 1 or more and --retries 0 or more");
const pages = values.pages ? values.pages.split(",").map(Number) : PAGES;
if (pages.some((p) => !PAGES.includes(p))) fail(`--pages are numbers from 1 to ${PAGES.length}`);

const store = new ReadStore(paths.prepositions);
const missingPhotos = pages.filter((p) => !existsSync(store.photo(p)));
if (missingPhotos.length) fail(`No photo for page ${missingPhotos.join(", ")} in ${path.relative(ROOT, store.dir)}`);

let exitCode = 0;
if (!values.check) {
  const via = values.via;
  console.log(`Reading pages ${pages.join(", ")} twice each via ${via}, model ${values.model}, effort ${values.effort}, ${concurrency} at a time`);
  const summary = await readPages(store, pages, {
    runner: via === "api" ? apiRunner() : cliRunner(),
    via,
    model: values.model,
    effort: values.effort as Effort,
    concurrency,
    retries,
    redo: values.redo,
  });
  for (const line of formatSummary(summary, via, "Reads").filter((l) => !l.startsWith("Cards:"))) console.log(line);
  if (summary.failed > 0 || summary.notRun > 0) exitCode = 1;
}

let list: List = { status: "pending", rows: [] };
if (existsSync(paths.prepositionList)) {
  const parsed = parseList(readFileSync(paths.prepositionList, "utf8"));
  if (parsed.problems.length) fail(`${path.relative(ROOT, paths.prepositionList)} has ${parsed.problems.length} problems: ${parsed.problems.join("; ")}`);
  list = parsed.list;
}

const readOnDisk = store.readPages();
const inList = new Set(list.rows.map((r) => r.page));
const toAdd = readOnDisk.filter((p) => !inList.has(p) || (!values.check && values.redo && pages.includes(p)));
for (const page of toAdd) {
  const [a, b] = READS.map((r) => store.read(page, r)!);
  list = replacePages(list, compareReads(page, a, b).rows);
}
if (toAdd.length) console.log(`Pages put into the list from their reads: ${toAdd.join(", ")}`);
list = applyEither(list);

const result = checkList(list, pageCounts(store), readOnDisk);
writeText(paths.prepositionList, listText(list));
const missing = PAGES.filter((p) => !readOnDisk.includes(p));
writeText(paths.prepositionFlags, flaggedText(list, result, missing));

const open = result.rows.filter(isOpen);
const settled = result.rows.filter((c) => !isOpen(c) && c.flags.length > 0);
const problems = result.rows.filter((c) => c.problems.length > 0);
const pagesOf = (rows: typeof open) => [...new Set(rows.map((c) => c.row.page))].join(", ") || "none";
console.log(`List: ${list.rows.length} items from ${readOnDisk.length} of ${PAGES.length} pages${missing.length ? ` (not read: ${missing.join(", ")})` : ""}`);
console.log(`Row counts: ${readOnDisk.length - result.pageProblems.filter((p) => /reads count|two reads/.test(p)).length} of ${readOnDisk.length} pages where both reads agree`);
console.log(`Page problems: ${result.pageProblems.length}${result.pageProblems.length ? ` (pages ${[...new Set(result.pageProblems.map((p) => p.split(":")[0].replace("page ", "")))].join(", ")})` : ""}`);
console.log(`Rows failing a check: ${problems.length} (pages ${pagesOf(problems)})`);
console.log(`Flagged rows: ${open.length} open (pages ${pagesOf(open)}), ${settled.length} settled`);
console.log(`Status: ${list.status}`);
console.log(`Flagged list: ${path.relative(process.cwd(), paths.prepositionFlags)}`);
if (exitCode) process.exitCode = exitCode;
