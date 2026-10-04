// The art pass (F2): a still for every distinct `image` path of content/deck.json.
//
//   npm run art -- cast    [--via cli|api] [--model claude-opus-5-5] [--effort medium]
//       Claude gives each uncast still a cast member and a pose, into content/art/cast.tsv.
//   npm run art -- render  [--dry-run] [--max-sheets 3]
//       Renders sheets of six (Seedream 5.0 Flash, on credits), removes the
//       backgrounds, cuts the stills into content/art/stills/ and lists each
//       take in content/art/review.tsv. Renders the stills with no take yet and
//       those whose takes are all marked redo. Rerunning resumes.
//   npm run art -- contact
//       Contact sheets of the takes waiting for a verdict, in content/art/contact/.
//   npm run art -- publish
//       Copies each still's ok take to its image path under public/.
//   npm run art -- status
//
// Prints ids, counts and credits, never card text. The rules are in
// docs/design.md under "Art" and in content/art/style.md.

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { checkStyle, parseStyle } from "./art";
import {
  artPaths,
  artStatus,
  castStills,
  castSummary,
  planRender,
  publishStills,
  readCast,
  readStills,
  renderSheets,
  writeContactSheets,
  type Higgsfield,
} from "./art-run";
import { apiRunner, cliRunner, DEFAULT_MODEL, EFFORTS, type Effort } from "./claude";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    via: { type: "string", default: "cli" },
    model: { type: "string", default: DEFAULT_MODEL },
    effort: { type: "string", default: "medium" },
    "dry-run": { type: "boolean", default: false },
    "max-sheets": { type: "string" },
  },
});

function fail(message: string): never {
  console.error(message);
  process.exit(2);
}

const p = artPaths(ROOT);
const style = parseStyle(readFileSync(p.style, "utf8"));
const styleProblems = checkStyle(style);
if (styleProblems.length) fail(styleProblems.join("; "));
const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;

/** One Higgsfield job through the CLI, waited on; returns its id and result URL, never the prompt. */
function runJob(jobType: string, flags: string[]): Promise<{ job: string; url: string }> {
  const args = ["generate", "create", jobType, ...flags, "--wait", "--wait-timeout", "15m", "--json"];
  return new Promise((resolve, reject) => {
    const child = spawn("higgsfield", args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("close", (code) => {
      try {
        const parsed = JSON.parse(out) as unknown;
        const jobs = (Array.isArray(parsed) ? parsed : [parsed]) as { id?: string; status?: string; result_url?: string }[];
        const done = jobs.find((j) => j.status === "completed" && j.result_url);
        if (done) return resolve({ job: done.id!, url: done.result_url! });
        reject(new Error(`${jobType} ended ${jobs.map((j) => j.status).join(",") || "with no job"}`));
      } catch {
        reject(new Error(`${jobType} failed (exit ${code}): ${err.trim().split("\n").slice(-1)[0] ?? ""}`));
      }
    });
  });
}

const higgsfield: Higgsfield = {
  run: runJob,
  async fetch(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`download failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  },
};

const step = positionals[0];
if (step === "cast") {
  if (values.via !== "cli" && values.via !== "api") fail('--via is "cli" or "api"');
  if (!EFFORTS.includes(values.effort as Effort)) fail(`--effort is one of ${EFFORTS.join(", ")}`);
  const runner = values.via === "api" ? apiRunner() : cliRunner();
  const { added, failed } = await castStills(p, style, runner, { model: values.model, effort: values.effort as Effort });
  console.log(`Added ${added}; ${failed.length ? `not cast: ${failed.join(", ")}` : "none failed"}`);
  console.log(castSummary(readCast(p), readStills(p)));
} else if (step === "render") {
  const plan = planRender(p);
  if (plan.uncast.length) console.log(`Not in cast.tsv, skipped (run the cast step): ${plan.uncast.join(", ")}`);
  console.log(`${plan.unfinished.length} unfinished and ${plan.newSheets.length} new sheets; about ${plan.credits} credits`);
  for (const s of [...plan.unfinished, ...plan.newSheets]) console.log(`  ${s.id}: ${s.panels.map((x) => `${x.still}.t${x.take}`).join(", ")}`);
  if (!values["dry-run"]) {
    const max = values["max-sheets"] ? Number(values["max-sheets"]) : Infinity;
    const r = await renderSheets(p, style, higgsfield, { maxSheets: max });
    console.log(`Rendered ${r.sheets} sheets, cut ${r.takes} takes${r.empty.length ? `; empty panels: ${r.empty.join(", ")}` : ""}`);
    const s = artStatus(p);
    console.log(`Average take: ${kb(s.averageBytes)} over ${s.takes} takes`);
  }
} else if (step === "contact") {
  const files = await writeContactSheets(p);
  console.log(files.length ? files.map((f) => path.relative(ROOT, f)).join("\n") : "No takes waiting for a verdict");
} else if (step === "publish") {
  const r = publishStills(p);
  console.log(`Published ${r.published.length} stills, average ${kb(r.averageBytes)}`);
  if (r.missing.length) console.log(`No ok take yet (${r.missing.length}): ${r.missing.join(", ")}`);
} else if (step === "status") {
  const s = artStatus(p);
  console.log(castSummary(readCast(p), readStills(p)));
  console.log(`Stills: ${Object.entries(s.counts).map(([k, n]) => `${k} ${n}`).join(", ")}; ${s.takes} takes cut, average ${kb(s.averageBytes)}`);
} else {
  fail("Usage: npm run art -- cast | render | contact | publish | status");
}
