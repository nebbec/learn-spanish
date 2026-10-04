import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import {
  checkCastAnswer,
  checkStyle,
  formatCast,
  formatReview,
  parseCast,
  parseReview,
  parseStyle,
  planSheets,
  sheetPrompt,
  stillState,
  stillsFromDeck,
  type CastRow,
  type DeckLike,
  type Manifest,
  type ReviewRow,
} from "./art";
import { cutSheet, STILL_SIZE, toStill } from "./art-images";
import { artPaths, castStills, publishStills, readReview, renderSheets, stillsToRender, type Higgsfield } from "./art-run";
import type { Runner } from "./claude";

const root = process.cwd();
const style = parseStyle(readFileSync(path.join(root, "content", "art", "style.md"), "utf8"));

const card = (id: string, kind: string, image: string | null, en = id) => ({ id, kind, es: id.split("-")[0], en, hint: "", image });
const deck: DeckLike = {
  cards: [
    card("hola-hello", "content", "/deck/img/hola-hello.webp", "hello"),
    card("ser-form-yo", "form", "/deck/img/ser-be-identity.webp", "I am"),
    card("ser-form-tu", "form", "/deck/img/ser-be-identity.webp", "you are"),
    card("de-of", "glue", null),
    card("casa-house", "content", "/deck/img/casa-house.webp", "house"),
  ],
};

const castRow = (still: string, character: CastRow["character"]): CastRow => ({ still, character, pose: `pose for ${still}` });
const review = (still: string, take: number, verdict: ReviewRow["verdict"]): ReviewRow => ({
  still,
  take,
  character: "concha",
  sheet: "concha-01",
  verdict,
  note: "",
});

describe("stills", () => {
  it("are the deck's distinct image paths, a form-only verb named after its still", () => {
    const stills = stillsFromDeck(deck);
    expect(stills.map((s) => s.id)).toEqual(["hola-hello", "ser-be-identity", "casa-house"]);
    expect(stills[1]).toMatchObject({ es: "ser", en: "I am / you are", cards: ["ser-form-yo", "ser-form-tu"] });
  });

  it("number 36 in the real deck", () => {
    const real = JSON.parse(readFileSync(path.join(root, "content", "deck.json"), "utf8")) as DeckLike;
    expect(stillsFromDeck(real)).toHaveLength(36);
  });
});

describe("cast.tsv", () => {
  it("round-trips and reports bad rows by id", () => {
    const rows = [castRow("hola-hello", "chick"), castRow("casa-house", "turtle")];
    expect(parseCast(formatCast(rows))).toEqual({ rows, problems: [] });
    const bad = parseCast("still\tcharacter\tpose\nx-y\tdragon\tflying\nx-z\tconcha\t\n");
    expect(bad.rows).toEqual([]);
    expect(bad.problems).toHaveLength(2);
  });

  it("the committed file has no problems", () => {
    expect(parseCast(readFileSync(path.join(root, "content", "art", "cast.tsv"), "utf8")).problems).toEqual([]);
  });
});

describe("the cast call", () => {
  it("style.md has the cast, five descriptions and a six-slot template", () => {
    expect(checkStyle(style)).toEqual([]);
  });

  it("keeps good entries and names the bad and missing ones", () => {
    const stills = stillsFromDeck(deck);
    const output = {
      stills: [
        { still: "hola-hello", character: "chick", pose: "waving" },
        { still: "ser-be-identity", character: "dragon", pose: "posing" },
        { still: "nope", character: "concha", pose: "x" },
      ],
    };
    const { rows, problems } = checkCastAnswer(output, stills);
    expect(rows).toEqual([{ still: "hola-hello", character: "chick", pose: "waving" }]);
    expect(problems).toEqual(["ser-be-identity: unknown character", "unknown or repeated still nope", "ser-be-identity: missing", "casa-house: missing"]);
  });
});

describe("planSheets", () => {
  const ids = ["a1", "a2", "a3", "a4", "a5", "a6", "a7", "b1"];
  const cast = new Map(ids.map((id) => [id, castRow(id, id.startsWith("a") ? "concha" : "chick")]));

  it("puts one character on a sheet and fills a part sheet with extra takes", () => {
    const sheets = planSheets({ sheets: [] }, ids, cast);
    expect(sheets.map((s) => s.id)).toEqual(["concha-01", "concha-02", "chick-01"]);
    expect(sheets[0].panels.map((p) => `${p.still}.t${p.take}`)).toEqual(["a1.t1", "a2.t1", "a3.t1", "a4.t1", "a5.t1", "a6.t1"]);
    expect(sheets[1].panels.map((p) => p.take)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(sheets[2].panels.every((p) => p.still === "b1")).toBe(true);
  });

  it("numbers sheets and takes after the ones already rendered", () => {
    const manifest: Manifest = { sheets: planSheets({ sheets: [] }, ["b1"], cast) };
    const next = planSheets(manifest, ["b1"], cast);
    expect(next[0].id).toBe("chick-02");
    expect(next[0].panels[0].take).toBe(7);
  });

  it("fills every slot of the template", () => {
    const [sheet] = planSheets({ sheets: [] }, ["b1"], cast);
    const prompt = sheetPrompt(style, sheet);
    expect(prompt).not.toMatch(/\{(character|\d)\}/);
    expect(prompt).toContain(style.descriptions.chick);
    expect(prompt).toContain("pose for b1");
  });
});

describe("review", () => {
  it("round-trips and rejects unknown verdicts", () => {
    const rows = [review("a1", 1, "ok"), review("a2", 1, "")];
    expect(parseReview(formatReview(rows)).rows).toEqual(rows);
    expect(parseReview("a1\t1\tconcha\tconcha-01\tmaybe\n").problems).toHaveLength(1);
  });

  it("a still is approved by one ok take, redone when every take is redo", () => {
    const rows = [review("a", 1, "redo"), review("a", 2, "ok"), review("b", 1, "redo"), review("c", 1, "redo"), review("c", 2, "")];
    expect(stillState(rows, "a")).toEqual({ state: "approved", take: 2 });
    expect(stillState(rows, "b")).toEqual({ state: "redo" });
    expect(stillState(rows, "c")).toEqual({ state: "pending" });
    expect(stillState(rows, "d")).toEqual({ state: "none" });
  });

  it("renders stills with no take or only redo takes, not those on an unfinished sheet", () => {
    const stills = ["a", "b", "c", "d", "e"].map((id) => ({ id, image: `/deck/img/${id}.webp`, es: id, en: id, hint: "", cards: [id] }));
    const manifest: Manifest = { sheets: [{ id: "concha-01", character: "concha", panels: [{ still: "e", take: 1, pose: "x" }] }] };
    const rows = [review("a", 1, "ok"), review("b", 1, "redo"), review("c", 1, "")];
    expect(stillsToRender(stills, rows, manifest)).toEqual(["b", "d"]);
  });
});

/** A transparent 3 by 2 sheet with a blob in the middle of each panel. */
async function fakeSheet(width = 600, height = 400): Promise<Buffer> {
  const cell = width / 3;
  const blobs = Array.from({ length: 6 }, (_, i) => {
    const cx = (i % 3) * cell + cell / 2;
    const cy = Math.floor(i / 3) * (height / 2) + height / 4;
    return `<circle cx="${cx}" cy="${cy}" r="${30 + i * 5}" fill="#f4a"/>`;
  }).join("");
  return sharp(Buffer.from(`<svg width="${width}" height="${height}">${blobs}</svg>`)).png().toBuffer();
}

describe("images", () => {
  it("cut a sheet into six trimmed panels and fit each to a square WebP", async () => {
    const panels = await cutSheet(await fakeSheet());
    expect(panels).toHaveLength(6);
    const sizes = await Promise.all(panels.map(async (p) => (await sharp(p!).metadata()).width));
    expect(sizes).toEqual([60, 70, 80, 90, 100, 110].map((d) => expect.closeTo(d, -1)));
    const still = await sharp(await toStill(panels[0]!)).metadata();
    expect(still).toMatchObject({ format: "webp", width: STILL_SIZE, height: STILL_SIZE, hasAlpha: true });
  });
});

describe("the run", () => {
  let dir = "";
  afterEach(() => dir && rmSync(dir, { recursive: true, force: true }));

  function setup() {
    dir = mkdtempSync(path.join(tmpdir(), "art-"));
    const p = artPaths(dir);
    mkdirSync(path.dirname(p.deck), { recursive: true });
    writeFileSync(p.deck, JSON.stringify(deck));
    return p;
  }

  it("casts with Claude, renders, cuts, resumes, and publishes the ok takes", async () => {
    const p = setup();
    const runner: Runner = async () => ({
      ok: true,
      usage: null as never,
      output: {
        stills: [
          { still: "hola-hello", character: "chick", pose: "waving" },
          { still: "ser-be-identity", character: "concha", pose: "posing" },
          { still: "casa-house", character: "concha", pose: "at the door" },
        ],
      },
    });
    expect(await castStills(p, style, runner, { model: "m", effort: "low", log: () => {} })).toEqual({ added: 3, failed: [] });

    const jobs: string[] = [];
    const sheet = await fakeSheet();
    const hf: Higgsfield = {
      async run(jobType) {
        jobs.push(jobType);
        return { job: `job-${jobs.length}`, url: `https://example.test/${jobs.length}` };
      },
      fetch: async () => sheet,
    };
    const first = await renderSheets(p, style, hf, { log: () => {} });
    expect(first).toEqual({ sheets: 2, takes: 12, empty: [] });
    expect(jobs).toEqual(["seedream_5_0_flash", "image_background_remover", "seedream_5_0_flash", "image_background_remover"]);
    expect(readReview(p)).toHaveLength(12);
    expect(existsSync(path.join(p.stills, "hola-hello.t6.webp"))).toBe(true);

    // Nothing reviewed yet: a rerun renders nothing.
    expect((await renderSheets(p, style, hf, { log: () => {} })).sheets).toBe(0);
    expect(jobs).toHaveLength(4);

    const rows = readReview(p).map((r) => ({ ...r, verdict: r.still === "casa-house" && r.take === 2 ? ("ok" as const) : r.verdict }));
    writeFileSync(p.review, formatReview(rows));
    const result = publishStills(p);
    expect(result.published).toEqual(["casa-house"]);
    expect(result.missing).toEqual(["hola-hello", "ser-be-identity"]);
    expect(readFileSync(path.join(p.public, "deck", "img", "casa-house.webp"))).toEqual(readFileSync(path.join(p.stills, "casa-house.t2.webp")));
  }, 30_000);
});
