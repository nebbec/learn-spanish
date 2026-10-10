// The unit plan (`content/units.json`) and the tip list (`content/tips.json`): their shapes and the
// checks on them. The rules are in docs/design.md under "Learning path", "Order is computed, not
// hand-written" and "Tips".

import { existsSync, readFileSync } from "node:fs";
import { relative } from "node:path";
import { contentPaths, type LangCode } from "./script-lang";

export interface Unit {
  /** Lower-case words joined by hyphens: `who-i-am`. */
  id: string;
  title: string;
  /** Completes "Now you can …": lower case, ending in a full stop. */
  goal: string;
  /** A tip id from the tip list, or null. */
  tip: string | null;
  /** The most cards the unit takes. Defaults to `DEFAULT_CAP`. */
  cap?: number;
  /**
   * The words and meanings the unit should hold, in plain words. A survival chunk is `phrase: <es> = <en>`; a German
   * case card is `case: <de> = <en with [target]>`.
   */
  wants: string[];
  /** The English of the unit's payoff phrases, drafted into phrase cards. */
  payoff: string[];
}

export interface TipEntry {
  /** `tip-` and lower-case words joined by hyphens: `tip-two-to-be`. */
  id: string;
  title: string;
  /** What the tip should say, for the tip draft (L4). Not shipped. */
  about: string;
}

export const DEFAULT_CAP = 12;
export const MIN_CAP = 4;
export const MAX_CAP = 16;

/** The prefix that marks a survival chunk in a unit's `wants`. */
export const PHRASE_WANT = "phrase: ";

/**
 * The prefix that marks a German case card in a unit's `wants` (DE8): `case: <German> = <English>`, the English
 * marking its one target in square brackets, as the card's prompt will (`case: einen Bruder = I have [a] brother`).
 */
export const CASE_WANT = "case: ";

/** A case want's English: exactly one target in square brackets. */
const ONE_TARGET = /^[^[\]]*\[[^[\]]+\][^[\]]*$/;

const isCaseWant = (want: string) => {
  const [target, en, ...rest] = want.slice(CASE_WANT.length).split(" = ");
  return rest.length === 0 && target.trim() !== "" && en !== undefined && ONE_TARGET.test(en.trim());
};

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const TIP_ID = /^tip-[a-z0-9]+(-[a-z0-9]+)*$/;

/** The unit plan of a language: content/units.json, or content/de/units.json (DE5). */
export const unitsPath = (root: string, lang: LangCode = "es") => contentPaths(root, lang).units;
export const tipsPath = (root: string, lang: LangCode = "es") => contentPaths(root, lang).tipList;

export function readUnits(root: string, lang: LangCode = "es"): Unit[] {
  return readPlan(root, unitsPath(root, lang));
}

export function readTips(root: string, lang: LangCode = "es"): TipEntry[] {
  return readPlan(root, tipsPath(root, lang));
}

/** A plan file, or an error naming it when the language has none yet (German's come in DE8). */
function readPlan<T>(root: string, file: string): T {
  if (!existsSync(file)) throw new Error(`${relative(root, file)} does not exist yet`);
  return JSON.parse(readFileSync(file, "utf8"));
}

export const unitCap = (unit: Unit) => unit.cap ?? DEFAULT_CAP;

const isText = (value: unknown): value is string => typeof value === "string" && value.trim() !== "";
const isTextList = (value: unknown): value is string[] => Array.isArray(value) && value.every(isText);

/** Every problem with the tip list, as `<id or index>: <problem>`. Empty when it is sound. */
export function checkTips(tips: unknown): string[] {
  if (!Array.isArray(tips)) return ["tips: not a list"];
  const problems: string[] = [];
  const seen = new Set<string>();
  tips.forEach((tip: Partial<TipEntry>, index) => {
    const name = isText(tip?.id) ? tip.id : `tip ${index}`;
    const fields = Object.keys(tip ?? {}).sort().join(",");
    if (fields !== "about,id,title") problems.push(`${name}: fields must be id, title, about`);
    if (!isText(tip?.id) || !TIP_ID.test(tip.id)) problems.push(`${name}: id must be tip- and lower-case words`);
    else if (seen.has(tip.id)) problems.push(`${name}: duplicate id`);
    else seen.add(tip.id);
    if (!isText(tip?.title)) problems.push(`${name}: title missing`);
    if (!isText(tip?.about)) problems.push(`${name}: about missing`);
  });
  return problems;
}

/** Every problem with the unit plan against the tip list, as `<id or index>: <problem>`. Empty when it is sound. */
export function checkUnits(units: unknown, tips: TipEntry[]): string[] {
  if (!Array.isArray(units)) return ["units: not a list"];
  const tipIds = new Set(tips.map((tip) => tip.id));
  const problems: string[] = [];
  const seen = new Set<string>();
  const tipUnits = new Map<string, string>();
  units.forEach((unit: Partial<Unit>, index) => {
    const name = isText(unit?.id) ? unit.id : `unit ${index}`;
    const extra = Object.keys(unit ?? {}).filter((key) => !["id", "title", "goal", "tip", "cap", "wants", "payoff"].includes(key));
    if (extra.length) problems.push(`${name}: unknown fields ${extra.join(", ")}`);
    if (!isText(unit?.id) || !SLUG.test(unit.id)) problems.push(`${name}: id must be lower-case words joined by hyphens`);
    else if (seen.has(unit.id)) problems.push(`${name}: duplicate id`);
    else seen.add(unit.id);
    if (!isText(unit?.title)) problems.push(`${name}: title missing`);
    if (!isText(unit?.goal)) problems.push(`${name}: goal missing`);
    if (unit?.tip !== null) {
      if (!isText(unit?.tip) || !tipIds.has(unit.tip)) problems.push(`${name}: tip ${String(unit?.tip)} is not in the tip list`);
      else if (tipUnits.has(unit.tip)) problems.push(`${name}: tip ${unit.tip} is already introduced by ${tipUnits.get(unit.tip)}`);
      else tipUnits.set(unit.tip, name);
    }
    if (unit?.cap !== undefined && (!Number.isInteger(unit.cap) || unit.cap < MIN_CAP || unit.cap > MAX_CAP)) {
      problems.push(`${name}: cap must be a whole number from ${MIN_CAP} to ${MAX_CAP}`);
    }
    if (!isTextList(unit?.wants) || unit.wants.length === 0) problems.push(`${name}: wants must be a non-empty list of text`);
    else if (unit.wants.some((want) => want.startsWith(PHRASE_WANT) && !want.includes(" = "))) {
      problems.push(`${name}: a phrase want must read "phrase: <Spanish> = <English>"`);
    } else if (unit.wants.some((want) => want.startsWith(CASE_WANT) && !isCaseWant(want))) {
      problems.push(`${name}: a case want must read "case: <German> = <English with one [target]>"`);
    }
    if (!isTextList(unit?.payoff)) problems.push(`${name}: payoff must be a list of text`);
  });
  return problems;
}
