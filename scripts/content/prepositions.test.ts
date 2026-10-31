import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { cliArgs, cliStdin, readCliResult, type DraftRequest, type Runner } from "./claude";
import {
  applyEither,
  checkList,
  compareReads,
  flaggedText,
  guardRead,
  impliedCases,
  isOpen,
  listText,
  pageCounts,
  parseList,
  readPages,
  ReadStore,
  replacePages,
  SLASH_FLAG,
  type List,
  type PageRead,
  type ReadItem,
} from "./prepositions";

const item = (over: Partial<ReadItem> = {}): ReadItem => ({
  row: 1,
  verb: "warten",
  objects: "",
  prep: "auf",
  case: "akk",
  pattern: "auf jn|etwA",
  gloss: "to wait for someone or something",
  glossBy: "claude",
  handoutGloss: null,
  sentence: "Ich warte ___ den Bus.",
  slash: false,
  ...over,
});

// A page of three rows: warten auf; s bedanken bei & für; erzählen von / über.
const page = (): PageRead => ({
  rows: 3,
  items: [
    item(),
    item({ row: 2, verb: "sich bedanken", prep: "bei", case: "dat", pattern: "bei jm", gloss: "to thank someone" }),
    item({ row: 2, verb: "sich bedanken", prep: "für", case: "akk", pattern: "für etwA", gloss: "to thank for something" }),
    item({ row: 3, verb: "erzählen", prep: "von", case: "dat", pattern: "von jm|etwD", gloss: "to tell of", slash: true }),
    item({ row: 3, verb: "erzählen", prep: "über", case: "akk", pattern: "über jn|etwA", gloss: "to tell about", slash: true }),
  ],
});

describe("reading a page", () => {
  it("sends the photo to the CLI as a stream-json message on stdin, and reads the result line", () => {
    const request: DraftRequest = {
      system: "sys",
      prompt: "Read page 1",
      schema: { type: "object" },
      model: "claude-opus-5-5",
      effort: "medium",
      images: [{ mediaType: "image/jpeg", data: "AAAA" }],
    };
    const args = cliArgs(request);
    expect(args.slice(0, 6)).toEqual(["-p", "--input-format", "stream-json", "--output-format", "stream-json", "--verbose"]);
    expect(args).not.toContain("Read page 1");
    const message = JSON.parse(cliStdin(request)!);
    expect(message.message.content).toEqual([
      { type: "image", source: { type: "base64", media_type: "image/jpeg", data: "AAAA" } },
      { type: "text", text: "Read page 1" },
    ]);
    expect(cliStdin({ ...request, images: undefined })).toBeNull();
    const stream = [
      JSON.stringify({ type: "system" }),
      JSON.stringify({ type: "assistant" }),
      JSON.stringify({ type: "result", is_error: false, structured_output: { rows: 1 }, total_cost_usd: 0.1 }),
      "",
    ].join("\n");
    expect(readCliResult(stream, 5)).toMatchObject({ ok: true, output: { rows: 1 } });
    expect(readCliResult(`${JSON.stringify({ type: "system" })}\n${JSON.stringify({ type: "assistant" })}\n`, 5)).toMatchObject({ ok: false, error: "cli-bad-json" });
  });

  it("guards a read: row numbers within the count, every row with an item, one-line fields", () => {
    expect(guardRead(page())).toMatchObject({ ok: true, cards: [{ rows: 3 }] });
    expect(guardRead({ rows: 3, items: page().items.slice(0, 1) })).toMatchObject({ ok: false, fields: ["items"] });
    expect(guardRead({ rows: 1, items: [{ ...item(), row: 2 }] })).toMatchObject({ ok: false });
    expect(guardRead({ rows: 1, items: [{ ...item(), case: "gen" }] })).toMatchObject({ ok: false, fields: ["case"] });
    expect(guardRead({ items: [] })).toMatchObject({ ok: false, kind: "shape" });
    const spaced = guardRead({ rows: 1, items: [{ ...item(), sentence: " Ich  warte\n___ den Bus. ", prep: "Auf" }] });
    expect(spaced).toMatchObject({ ok: true, cards: [{ items: [{ sentence: "Ich warte ___ den Bus.", prep: "auf" }] }] });
  });

  it("reads each page twice through the runner, resumes, and logs usage", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "prepositions-"));
    writeFileSync(path.join(dir, "page-01.jpg"), "jpeg");
    const store = new ReadStore(dir);
    const seen: DraftRequest[] = [];
    const runner: Runner = async (request) => {
      seen.push(request);
      return { ok: true, output: page(), usage: { input: 1, output: 2, cacheRead: 0, cacheWrite: 0, costUsd: 0.05, durationMs: 1, models: [] } };
    };
    const options = { runner, via: "cli", model: "claude-opus-5-5", effort: "medium" as const, print: () => {}, sleep: async () => {} };
    const summary = await readPages(store, [1], options);
    expect(summary).toMatchObject({ drafted: 2, calls: 2, failed: 0 });
    expect(seen[0].images).toEqual([{ mediaType: "image/jpeg", data: Buffer.from("jpeg").toString("base64") }]);
    expect(seen[0].prompt).toContain("page 1 of 10");
    expect(store.read(1, 2)).toEqual(page());
    expect(store.readPages()).toEqual([1]);
    expect(readFileSync(store.logFile, "utf8").trim().split("\n")).toHaveLength(2);
    const again = await readPages(store, [1], options);
    expect(again).toMatchObject({ alreadyDrafted: 2, calls: 0 });
  });
});

describe("the list", () => {
  it("compares two reads: rows that agree stand, rows that differ are flagged, / rows always", () => {
    const b = page();
    b.items[0] = { ...b.items[0], gloss: "another English gloss, Claude's own" };
    b.items[1] = { ...b.items[1], case: "akk" };
    const { rows, problem } = compareReads(4, page(), b);
    expect(problem).toBeNull();
    expect(rows.map((r) => [r.page, r.row, r.prep, r.flags])).toEqual([
      [4, 1, "auf", ""],
      [4, 2, "bei", "reads differ: case"],
      [4, 2, "für", ""],
      [4, 3, "von", SLASH_FLAG],
      [4, 3, "über", SLASH_FLAG],
    ]);
    // A handwritten gloss read differently is a difference; so are other prepositions in a row.
    const c = page();
    c.items[0] = { ...c.items[0], glossBy: "courtney" };
    const d = page();
    d.items[0] = { ...d.items[0], glossBy: "courtney", gloss: "to await" };
    d.items[2] = { ...d.items[2], prep: "um" };
    const compared = compareReads(4, c, d).rows;
    expect(compared[0].flags).toBe("reads differ: gloss");
    expect(compared[1].flags).toBe("reads differ: items");
    expect(compareReads(4, page(), { ...page(), rows: 4, items: [...page().items, item({ row: 4 })] }).problem).toContain("4 rows");
  });

  it("writes and reads the TSV unchanged, and keeps edited pages when a page is added", () => {
    const list: List = { status: "pending", rows: compareReads(1, page(), page()).rows };
    const text = listText(list);
    expect(parseList(text)).toEqual({ list, problems: [] });
    const edited = { ...list, rows: list.rows.map((r, i) => (i === 0 ? { ...r, gloss: "to wait (edited)" } : r)) };
    const added = replacePages(edited, compareReads(2, page(), page()).rows);
    expect(added.rows).toHaveLength(10);
    expect(added.rows[0].gloss).toBe("to wait (edited)");
    expect(parseList(text.replace("status: pending", "status: approve")).list.status).toBe("approve");
    expect(parseList(text.replace("\tauf\t", "\tauf\t").replace(/\t\n/, "\tmaybe\n")).problems.length).toBeGreaterThan(0);
  });

  it("joins a / row marked either into one item, and keeps a split row as two", () => {
    const rows = compareReads(1, page(), page()).rows;
    const either = applyEither({ status: "pending", rows: rows.map((r) => (r.row === 3 ? { ...r, settle: "either" } : r)) });
    expect(either.rows).toHaveLength(4);
    expect(either.rows[3]).toMatchObject({ prep: "von / über", case: "dat / akk", pattern: "von jm|etwD / über jn|etwA" });
    expect(applyEither(either)).toEqual(either);
    const split = applyEither({ status: "pending", rows: rows.map((r) => (r.row === 3 ? { ...r, settle: "split" } : r)) });
    expect(split.rows).toHaveLength(5);
  });

  it("reads the case a pattern implies", () => {
    expect([...impliedCases("auf jn|etwA")]).toEqual(["akk"]);
    expect([...impliedCases("mit jm")]).toEqual(["dat"]);
    expect([...impliedCases("als etwN")]).toEqual(["nom"]);
    expect([...impliedCases("gegen")]).toEqual([]);
    expect([...impliedCases("für etwA|ADJ")]).toEqual(["akk"]);
  });

  it("checks cases, two-way prepositions, row counts and duplicates", () => {
    const rows = compareReads(1, page(), page()).rows;
    const counts = new Map([[1, 3]]);
    const clean = checkList({ status: "pending", rows }, counts, [1]);
    expect(clean.pageProblems).toEqual([]);
    expect(clean.rows.map((c) => c.problems)).toEqual([[], [], [], [], []]);
    expect(clean.rows.filter(isOpen)).toHaveLength(2);

    const bad = [
      { ...rows[0], prep: "mit", case: "akk", pattern: "mit etwA" }, // fixed case, and the pattern agrees with the wrong case
      { ...rows[1], case: "akk" }, // the pattern says dat
      { ...rows[2], prep: "an", pattern: "an", case: "dat" }, // two-way with no case in the handout: a flag
      { ...rows[2], row: 2, gloss: rows[2].gloss }, // duplicate of the row before
      { ...rows[0], row: 3, prep: "als", case: "nom", pattern: "als etwN", gloss: "to count as" },
    ];
    const result = checkList({ status: "pending", rows: bad }, counts, [1]);
    expect(result.rows[0].problems).toEqual(["mit takes dat"]);
    expect(result.rows[1].problems).toEqual(["the pattern says dat", "bei takes dat"]);
    expect(result.rows[2].problems).toEqual([]);
    expect(result.rows[2].flags).toEqual(["two-way preposition with no case in the handout"]);
    expect(result.rows[3].problems).toEqual([]);
    expect(result.rows[4].problems).toEqual([]);

    const twin = checkList({ status: "pending", rows: [rows[0], { ...rows[0] }] }, new Map([[1, 1]]), [1]);
    expect(twin.rows[1].problems).toEqual(["same verb, preposition and gloss as page 1 row 1"]);
    const short = checkList({ status: "pending", rows: rows.slice(0, 1) }, counts, [1]);
    expect(short.pageProblems).toEqual(["page 1: no item for row 2, 3"]);
    expect(checkList({ status: "pending", rows }, new Map(), [1]).pageProblems).toEqual(["page 1: the two reads count a different number of rows"]);
  });

  it("settles flags with ok, split or either, and lists open rows without sentences", () => {
    const rows = compareReads(1, page(), page()).rows;
    const settled = rows.map((r) => (r.row === 3 ? { ...r, settle: "split" } : r));
    const list: List = { status: "pending", rows: settled };
    const result = checkList(list, new Map([[1, 3]]), [1]);
    expect(result.rows.filter(isOpen)).toEqual([]);
    const okOnSlash = checkList({ status: "pending", rows: rows.map((r) => ({ ...r, settle: "ok" })) }, new Map([[1, 3]]), [1]);
    expect(okOnSlash.rows[3].problems).toEqual(["a / row is settled split or either"]);
    expect(okOnSlash.rows[0].problems).toEqual([]);

    const open = checkList({ status: "pending", rows }, new Map([[1, 3]]), [1]);
    const text = flaggedText({ status: "pending", rows }, open, [2, 3]);
    expect(text).toContain("page 1, row 3: erzählen von (dat): slash: split or either");
    expect(text).toContain("Pages not read yet: 2, 3.");
    expect(text).not.toContain("den Bus");
  });

  it("counts a page's rows only where both reads agree", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "prepositions-"));
    const store = new ReadStore(dir);
    store.save(1, 1, page(), {});
    store.save(1, 2, page(), {});
    store.save(2, 1, page(), {});
    store.save(2, 2, { ...page(), rows: 4, items: [...page().items, item({ row: 4 })] }, {});
    store.save(3, 1, page(), {});
    expect(store.readPages()).toEqual([1, 2]);
    expect([...pageCounts(store)]).toEqual([[1, 3]]);
  });
});
