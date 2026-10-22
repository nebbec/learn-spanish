import { describe, expect, it } from "vitest";
import { caseJobs, GERMAN_FORM_VERBS, phraseJobs } from "./path-cards";
import { CASE_WANT, checkTips, checkUnits, readTips, readUnits, unitCap, type TipEntry, type Unit } from "./units";

const root = process.cwd();

const tips: TipEntry[] = [
  { id: "tip-one", title: "One", about: "About one." },
  { id: "tip-two", title: "Two", about: "About two." },
];

const unit = (fields: Partial<Unit> = {}): Unit => ({
  id: "unit-a",
  title: "Unit A",
  goal: "say something.",
  tip: null,
  cap: 12,
  wants: ["yo", "phrase: me llamo = my name is"],
  payoff: ["I am Ana."],
  ...fields,
});

describe("content/units.json and content/tips.json", () => {
  const units = readUnits(root);
  const tipList = readTips(root);

  it("have no problems", () => {
    expect(checkTips(tipList)).toEqual([]);
    expect(checkUnits(units, tipList)).toEqual([]);
  });

  it("hold 15 to 20 units and 12 to 15 tips", () => {
    expect(units.length).toBeGreaterThanOrEqual(15);
    expect(units.length).toBeLessThanOrEqual(20);
    expect(tipList.length).toBeGreaterThanOrEqual(12);
    expect(tipList.length).toBeLessThanOrEqual(15);
  });

  it("plan a starter path of about 150 to 200 cards", () => {
    const total = units.reduce((sum, u) => sum + unitCap(u), 0);
    expect(total).toBeGreaterThanOrEqual(150);
    expect(total).toBeLessThanOrEqual(200);
  });
});

describe("content/de/units.json and content/de/tips.json (DE8)", () => {
  const units = readUnits(root, "de");
  const tipList = readTips(root, "de");
  const wants = units.flatMap((u) => u.wants);

  it("have no problems, and make phrase ids without a clash", () => {
    expect(checkTips(tipList)).toEqual([]);
    expect(checkUnits(units, tipList)).toEqual([]);
    expect(phraseJobs(units).problems).toEqual([]);
    expect(caseJobs(units).problems).toEqual([]);
  });

  // DE9's case cards raised the caps past Spanish's 200.
  it("hold 15 to 20 units, 12 to 15 tips, and a starter path of about 150 to 220 cards", () => {
    expect(units.length).toBeGreaterThanOrEqual(15);
    expect(units.length).toBeLessThanOrEqual(20);
    expect(tipList.length).toBeGreaterThanOrEqual(12);
    expect(tipList.length).toBeLessThanOrEqual(15);
    const total = units.reduce((sum, u) => sum + unitCap(u), 0);
    expect(total).toBeGreaterThanOrEqual(150);
    expect(total).toBeLessThanOrEqual(220);
  });

  it("name the three forms of every German form verb, each in one unit", () => {
    for (const { verb } of GERMAN_FORM_VERBS) {
      const forms = units.filter((u) => u.wants.some((w) => /\((ich|du|er) /.test(w) && w.startsWith(`${verb}:`)));
      expect(forms.map((u) => u.id), verb).toHaveLength(1);
      expect(forms[0].wants.filter((w) => /\((ich|du|er) /.test(w) && w.startsWith(`${verb}:`)), verb).toHaveLength(3);
    }
  });

  it("list about 30 case cards (DE9), accusative and dative, and the Sie chunks", () => {
    const cases = caseJobs(units).jobs;
    expect(cases.length).toBe(wants.filter((w) => w.startsWith(CASE_WANT)).length);
    expect(cases.length).toBeGreaterThanOrEqual(25);
    expect(cases.length).toBeLessThanOrEqual(35);
    // The dative cards come in or after the unit that introduces tip-dative, the accusative's after tip-accusative.
    const unitAt = (id: string) => units.findIndex((u) => u.id === id);
    const dative = unitAt(units.find((u) => u.tip === "tip-dative")!.id);
    const accusative = unitAt(units.find((u) => u.tip === "tip-accusative")!.id);
    for (const job of cases) {
      const dat = /^(mit|bei|zu) /.test(job.target);
      expect(unitAt(job.unit) >= (dat ? dative : accusative), job.id).toBe(true);
    }
    expect(wants.filter((w) => w.startsWith("phrase: ") && /\bSie\b/.test(w)).length).toBeGreaterThanOrEqual(1);
  });
});

describe("checkUnits", () => {
  it("accepts a sound plan, with cap left to its default", () => {
    expect(checkUnits([unit(), unit({ id: "unit-b", tip: "tip-one", cap: undefined })], tips)).toEqual([]);
    expect(unitCap(unit({ cap: undefined }))).toBe(12);
  });

  it("rejects duplicate ids and bad ids", () => {
    expect(checkUnits([unit(), unit()], tips)).toEqual(["unit-a: duplicate id"]);
    expect(checkUnits([unit({ id: "Unit A" })], tips)).toEqual(["Unit A: id must be lower-case words joined by hyphens"]);
  });

  it("rejects a tip not in the tip list, and a tip two units introduce", () => {
    expect(checkUnits([unit({ tip: "tip-three" })], tips)).toEqual(["unit-a: tip tip-three is not in the tip list"]);
    expect(checkUnits([unit({ tip: "tip-one" }), unit({ id: "unit-b", tip: "tip-one" })], tips)).toEqual([
      "unit-b: tip tip-one is already introduced by unit-a",
    ]);
  });

  it("rejects caps outside 4 to 16", () => {
    expect(checkUnits([unit({ cap: 4 }), unit({ id: "unit-b", cap: 16 })], tips)).toEqual([]);
    for (const cap of [3, 17, 10.5]) {
      expect(checkUnits([unit({ cap })], tips)).toEqual(["unit-a: cap must be a whole number from 4 to 16"]);
    }
  });

  it("rejects missing text, empty wants, unknown fields and a malformed phrase want", () => {
    expect(checkUnits([unit({ title: " ", goal: "" })], tips)).toEqual(["unit-a: title missing", "unit-a: goal missing"]);
    expect(checkUnits([unit({ wants: [] })], tips)).toEqual(["unit-a: wants must be a non-empty list of text"]);
    expect(checkUnits([unit({ wants: ["phrase: me llamo"] })], tips)).toEqual([
      'unit-a: a phrase want must read "phrase: <Spanish> = <English>"',
    ]);
    expect(checkUnits([{ ...unit(), extra: 1 }], tips)).toEqual(["unit-a: unknown fields extra"]);
    expect(checkUnits([unit({ wants: ["case: einen Bruder = I have [a] brother"] })], tips)).toEqual([]);
    for (const bad of ["case: einen Bruder", "case: einen Bruder = I have a brother", "case: den Mann = [I] see [the] man"]) {
      expect(checkUnits([unit({ wants: [bad] })], tips)).toEqual([
        'unit-a: a case want must read "case: <German> = <English with one [target]>"',
      ]);
    }
    expect(checkUnits({}, tips)).toEqual(["units: not a list"]);
  });
});

describe("checkTips", () => {
  it("rejects duplicate ids, ids without tip-, and missing fields", () => {
    expect(checkTips(tips)).toEqual([]);
    expect(checkTips([...tips, tips[0]])).toEqual(["tip-one: duplicate id"]);
    expect(checkTips([{ id: "two-to-be", title: "T", about: "A" }])).toEqual(["two-to-be: id must be tip- and lower-case words"]);
    expect(checkTips([{ id: "tip-x", title: "T" }])).toEqual(["tip-x: fields must be id, title, about", "tip-x: about missing"]);
  });
});
