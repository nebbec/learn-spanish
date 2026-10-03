// Turns a list of word forms with counts into a ranked list of dictionary
// words (lemmas). Pure functions, no files or network: scripts/content/word-list.mjs
// does the reading and writing. The rules are in docs/design.md under
// "Content pipeline".

/** Lower case, Unicode NFC, trimmed: how every word is compared. */
export function normalize(word) {
  return word.normalize("NFC").trim().toLowerCase();
}

const ACCENTS = { á: "a", é: "e", í: "i", ó: "o", ú: "u" };

/** Removes stress accents (á é í ó ú) and keeps ñ and ü. */
export function stripAccents(word) {
  return word.replace(/[áéíóú]/g, (c) => ACCENTS[c]);
}

/** Lines of "form count", most frequent first, as `{ form, count }`. */
export function parseFrequency(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    const match = /^(\S+)\s+(\d+)\s*$/.exec(line.trim());
    if (match) rows.push({ form: normalize(match[1]), count: Number(match[2]) });
  }
  return rows;
}

/** Lines of "lemma<TAB>form" into a map from form to its possible lemmas. */
export function parseLemmaPairs(text) {
  const map = new Map();
  for (const line of text.replace(/^﻿/, "").split(/\r?\n/)) {
    const [lemma, form] = line.split("\t");
    if (!lemma || !form) continue;
    const key = normalize(form);
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(normalize(lemma));
  }
  return map;
}

/**
 * The headwords of a Hunspell .dic file that are all lower case, as `words`.
 * Proper names are capitalised in the dictionary, so they are left out.
 * `plurals` holds the ones that carry the plural flag S: nouns and adjectives.
 * Irregular verb forms (es, fue, puedo) are headwords too, but without it.
 */
export function parseDicStems(text) {
  const words = new Set();
  const plurals = new Set();
  const lines = text.split(/\r?\n/);
  for (const line of lines.slice(1)) {
    const [word, flags = ""] = line.split(/\s/)[0].normalize("NFC").split("/");
    if (!word || word !== word.toLowerCase()) continue;
    words.add(word);
    if (flags.includes("S")) plurals.add(word);
  }
  return { words, plurals };
}

const CLITIC = /(nos|los|las|les|me|te|se|os|lo|la|le)$/;
const VERB = /(ar|er|ir|ír)$/;
const PARTICIPLE = /(ad|id|íd)(o|a|os|as)$/;

/**
 * Verb lemmas for a form with object pronouns attached (decirte, irme,
 * déjame, dímelo, haciéndolo), or null. Up to two pronouns come off. An
 * imperative or gerund with pronouns attached has a written accent, except the
 * short imperatives (dame, dile, hazlo), so a longer form without one (bastante)
 * is only taken apart when what is left is an infinitive.
 */
export function cliticLemmas(form, lemmaMap, lemmaSet, { infinitiveOnly = false } = {}) {
  let rest = form;
  for (let i = 0; i < 2; i++) {
    const match = CLITIC.exec(rest);
    if (!match || rest.length - match[1].length < 2) return null;
    rest = rest.slice(0, -match[1].length);
    const plain = stripAccents(rest);
    if (VERB.test(plain) && lemmaSet.has(plain)) return [plain];
    if (infinitiveOnly || (plain === rest && rest.length > 3)) continue;
    const verbs = [...(lemmaMap.get(plain) ?? [])].filter((l) => VERB.test(l));
    if (verbs.length) return verbs;
  }
  return null;
}

/**
 * The lemmas a form may belong to, as `{ lemma: weight }` when the share is
 * fixed, an array of lemmas when it is to be shared out by frequency, or null
 * when the form is dropped.
 */
export function candidates(form, { lemmaMap, lemmaSet, dic, overrides }) {
  if (Object.hasOwn(overrides, form)) {
    const value = overrides[form];
    if (value === null) return null;
    return typeof value === "string" ? { [value]: 1 } : value;
  }
  // Lemmas the dictionary does not know are mistakes in the lemma list
  // (profundo to profundar, henry to henrio), so they are not offered.
  const known = [...(lemmaMap.get(form) ?? [])].filter((l) => l === form || dic.words.has(l));
  const lemmas = known.length ? new Set(known) : null;
  if (lemmas) {
    if (lemmas.has(form)) return { [form]: 1 };
    // A regular past participle counts towards its verb (he perdido). The
    // ones used mostly as nouns or adjectives (comida, cansado) are overrides.
    const verbs = [...lemmas].filter((l) => VERB.test(l));
    if (PARTICIPLE.test(form) && verbs.length) return verbs;
    // A feminine or plural form goes to its masculine singular (buena to
    // bueno, tía to tío); nouns with their own meaning (cara) are overrides.
    // When a verb is also possible (dejas: deja or dejar) it is shared.
    if (verbs.length < lemmas.size) return verbs.length ? [...lemmas] : [...lemmas].filter((l) => l !== form);
    // A noun or adjective in its own right is that word: casa is the noun,
    // not a form of casar. Verb forms that are also rare nouns (era, son,
    // mira) are overrides.
    if (dic.plurals.has(form)) return { [form]: 1 };
    return [...lemmas];
  }
  // A dictionary word is itself (dios), unless it is an infinitive with
  // pronouns attached (irme, darle). Short imperatives (dame) are overrides.
  if (dic.words.has(form) || lemmaSet.has(form)) {
    return cliticLemmas(form, lemmaMap, lemmaSet, { infinitiveOnly: true }) ?? { [form]: 1 };
  }
  return cliticLemmas(form, lemmaMap, lemmaSet) ?? { [form]: 1 };
}

/**
 * Sums the forms' counts into lemmas and ranks them.
 *
 * A form with several possible lemmas and no override is shared between them
 * in proportion to the counts each lemma gets from forms that are not shared,
 * so `creo` goes almost all to creer and hardly at all to crear.
 *
 * A lemma is kept when the Hunspell dictionary has it as a lower-case word or
 * an override names it, and it is not in `drop`.
 *
 * @param {{
 *   frequencies: { form: string, count: number }[],
 *   lemmaMap: Map<string, Set<string>>,
 *   dic: { words: Set<string>, plurals: Set<string> },
 *   overrides?: Record<string, string | string[] | Record<string, number> | null>,
 *   drop?: string[],
 *   size?: number,
 * }} input
 */
export function buildWordList({ frequencies, lemmaMap, dic, overrides = {}, drop = [], size = 1200 }) {
  const lemmaSet = new Set();
  for (const lemmas of lemmaMap.values()) for (const l of lemmas) lemmaSet.add(l);
  const named = new Set();
  for (const value of Object.values(overrides)) {
    if (typeof value === "string") named.add(value);
    else if (value) for (const l of Object.keys(value)) named.add(l);
  }
  const dropped = new Set(drop);
  const context = { lemmaMap, lemmaSet, dic, overrides };

  const resolved = frequencies.map(({ form, count }) => ({ form, count, to: candidates(form, context) }));

  // Counts from forms that belong to one lemma only.
  const solo = new Map();
  for (const { count, to } of resolved) {
    if (!to) continue;
    const lemmas = Array.isArray(to) ? to : Object.keys(to);
    if (lemmas.length === 1) solo.set(lemmas[0], (solo.get(lemmas[0]) ?? 0) + count);
  }

  const totals = new Map();
  const forms = new Map();
  let droppedForms = 0;
  let sharedForms = 0;
  for (const { form, count, to } of resolved) {
    if (!to) {
      droppedForms++;
      continue;
    }
    let weights = to;
    if (Array.isArray(to)) {
      if (to.length > 1) sharedForms++;
      const masses = to.map((l) => solo.get(l) ?? 0);
      const sum = masses.reduce((a, b) => a + b, 0);
      weights = Object.fromEntries(to.map((l, i) => [l, sum ? masses[i] / sum : 1 / to.length]));
    }
    for (const [lemma, weight] of Object.entries(weights)) {
      const share = count * weight;
      if (share <= 0) continue;
      totals.set(lemma, (totals.get(lemma) ?? 0) + share);
      if (!forms.has(lemma)) forms.set(lemma, []);
      forms.get(lemma).push({ form, count: Math.round(share) });
    }
  }

  const kept = [...totals]
    .filter(([lemma]) => (dic.words.has(lemma) || named.has(lemma)) && !dropped.has(lemma))
    .map(([word, count]) => ({ word, count: Math.round(count) }))
    .sort((a, b) => b.count - a.count || (a.word < b.word ? -1 : a.word > b.word ? 1 : 0));

  const entries = kept.slice(0, size).map((entry, i) => ({
    rank: i + 1,
    word: entry.word,
    count: entry.count,
    forms: forms
      .get(entry.word)
      .sort((a, b) => b.count - a.count)
      .map((f) => f.form),
  }));

  return {
    entries,
    resolved,
    stats: {
      forms: frequencies.length,
      droppedForms,
      sharedForms,
      lemmas: totals.size,
      keptLemmas: kept.length,
      rejectedLemmas: totals.size - kept.length,
    },
  };
}
