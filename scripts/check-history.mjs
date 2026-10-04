// M1's check: every line removed from docs/design.md between <before> and
// <after> is in docs/history.md, and the links in both docs (and in the files
// that point at them) resolve in the working tree, anchors included.
//
//   node scripts/check-history.mjs [before-ref] [after-ref]
//
// The defaults are the commit before M1 and M1's move commit. Pass "worktree"
// as after-ref to compare against the working tree. Moved notes may have had a
// link to a section of design.md rewritten from "](#x)" to "](design.md#x)";
// the check allows exactly that.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const [before = "e221464", afterArg = "9885461"] = process.argv.slice(2);
const after = afterArg === "worktree" ? undefined : afterArg;
const DOCS = ["docs/design.md", "docs/history.md", "docs/ticket-loop.md", "CLAUDE.md"];

function read(file, ref) {
  if (!ref) return existsSync(file) ? readFileSync(file, "utf8") : null;
  try {
    return execFileSync("git", ["show", `${ref}:${file}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}

function slug(heading) {
  return heading
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_\- ]/gu, "")
    .replace(/ /g, "-");
}

function anchors(text) {
  const seen = new Map();
  const out = new Set();
  let fence = false;
  for (const line of text.split("\n")) {
    if (line.startsWith("```")) fence = !fence;
    const m = !fence && line.match(/^#{1,6} (.*)$/);
    if (!m) continue;
    const base = slug(m[1]);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    out.add(n ? `${base}-${n}` : base);
  }
  return out;
}

let failures = 0;

// 1. Removed lines are in history.md.
const oldDesign = read("docs/design.md", before).split("\n");
const newDesign = read("docs/design.md", after).split("\n");
const history = read("docs/history.md", after);
const historyLines = new Set(history.split("\n"));
const left = new Map();
for (const line of newDesign) left.set(line, (left.get(line) ?? 0) + 1);
const removed = [];
for (const line of oldDesign) {
  const n = left.get(line) ?? 0;
  if (n > 0) left.set(line, n - 1);
  else removed.push(line);
}
const missing = removed.filter(
  (line) => line.trim() !== "" && !historyLines.has(line) && !historyLines.has(line.replaceAll("](#", "](design.md#")),
);
const bytes = (lines) => Buffer.byteLength(lines.join("\n"));
console.log(`design.md: ${bytes(oldDesign)} bytes at ${before}, ${bytes(newDesign)} bytes ${after ? `at ${after}` : "now"}`);
console.log(`lines removed from design.md: ${removed.length}; not found in history.md: ${missing.length}`);
for (const line of missing) console.log(`  missing: ${line.slice(0, 100)}`);
failures += missing.length;

// 2. Links resolve.
let links = 0;
for (const doc of DOCS) {
  const text = read(doc);
  if (text === null) continue;
  for (const [, target] of text.replace(/`[^`\n]*`/g, "").matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^[a-z]+:/.test(target)) continue;
    links++;
    const [file, anchor] = target.split("#");
    const targetPath = file ? path.join(path.dirname(doc), file) : doc;
    const targetText = read(targetPath);
    let problem = null;
    if (targetText === null && !existsSync(targetPath)) problem = "no such file";
    else if (anchor && targetText !== null && !anchors(targetText).has(anchor)) problem = "no such heading";
    if (problem) {
      failures++;
      console.log(`  broken in ${doc}: ${target} (${problem})`);
    }
  }
}
console.log(`relative links checked: ${links}`);
console.log(failures ? `FAIL: ${failures} problems` : "OK");
process.exit(failures ? 1 : 0);
