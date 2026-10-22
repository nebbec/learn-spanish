// German's side of the word list (DE6): reading the de_DE dictionary, which
// writes nouns with a capital, and the rule that gives a German form its
// lemmas. The summing, sharing and ranking are lemmatize.mjs's, shared with
// Spanish. Pure functions, no files or network. The rules are in
// docs/german.md under "Word list", "Decided in DE6".

/** Flags of the de_DE (frami) affix file for a headword that is not a word on its own. */
const NOT_ALONE = /[ohd]/; // o: only in a compound (`mann/…o…` for Hausmann), h: needs an affix, d: forbidden

/**
 * The headwords of a Hunspell .dic file, nouns included. Every word is compared in lower case, so `words` holds
 * them lower-cased; `spelling` keeps how each is written, lower case when the dictionary has it so (the verb
 * `essen` over the noun `Essen`) and the capitalised noun otherwise (`Mann`). Headwords that are only parts of
 * compounds (`mann/SEPTozm`, the -mann of Hausmann) are left out. `plurals` is empty: German's rule does not use
 * it. Names are capitalised headwords too, so the word list leaves them out by hand (`DROP_DE`).
 */
export function parseDicWords(text) {
  const words = new Set();
  const spelling = new Map();
  for (const line of text.split(/\r?\n/).slice(1)) {
    if (line.startsWith("#")) continue;
    const [head, flags = ""] = line.split(/\s/)[0].split("/");
    const word = head.normalize("NFC");
    if (!word || !/^\p{L}/u.test(word) || NOT_ALONE.test(flags)) continue;
    const lower = word.toLowerCase();
    words.add(lower);
    const had = spelling.get(lower);
    if (had === undefined || (had !== lower && word === lower)) spelling.set(lower, word);
  }
  return { words, plurals: new Set(), spelling };
}

/** Endings of a declined adjective or determiner: gute, guten, gutem, guter, gutes. */
const ADJECTIVE_ENDING = /^(e|en|em|er|es)$/;

/**
 * The lemmas a German form may belong to, in the shape `candidates` in lemmatize.mjs gives: `{ lemma: weight }`
 * when fixed, an array to share by frequency, or null when the form is dropped.
 *
 * 1. An override.
 * 2. The lemma list's lemmas for the form, those the dictionary knows. None: the form is itself (and is kept only
 *    if the dictionary knows it).
 * 3. A declined adjective goes to its base (neue to neu, kleine to klein), as Spanish buena goes to bueno; not a
 *    form that is a lemma itself, as a verb's infinitive is (lieben is not lieb with an ending).
 * 4. Otherwise the lemmas are shared by frequency, with the form itself among them when the list has it as a
 *    lemma of other forms (Tag of Tage), so `Tag` keeps its count against the rare verb tagen and `hast` goes
 *    to haben, not the noun Hast. A form that is only an inflection (`ist`, `hielt`, which the dictionary also
 *    lists as headwords) is not a lemma, so it goes to its verb. The wrong guesses among frequent forms
 *    (mal to malen, Frage to fragen) are overrides.
 *
 * The list spells words as before the 1996 reform (mußte, daß), so a form with "ss" that the list does not know
 * is looked up with "ß" (musste as mußte, to müssen).
 */
export function candidatesDe(form, { lemmaMap, lemmaSet, dic, overrides }) {
  if (Object.hasOwn(overrides, form)) {
    const value = overrides[form];
    if (value === null) return null;
    return typeof value === "string" ? { [value]: 1 } : value;
  }
  const listed = lemmaMap.get(form) ?? lemmaMap.get(form.replaceAll("ss", "ß")) ?? [];
  const known = [...listed].filter((l) => l !== form && dic.words.has(l));
  if (known.length === 0) return { [form]: 1 };
  if (!lemmaSet.has(form)) {
    const base = known.filter((l) => form.startsWith(l) && ADJECTIVE_ENDING.test(form.slice(l.length)));
    return base.length ? base : known;
  }
  return [form, ...known];
}

/**
 * How each lemma of the list is written: the spelling the list gives the most forms (`Zeit` with zeiten over the
 * preposition zeit with none, the verb `verschwinden` over the noun `Verschwinden`), by lower-case lemma.
 */
export function lemmaSpellings(text) {
  const forms = new Map();
  for (const line of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const [lemma, form] = line.split("\t");
    if (!lemma || !form) continue;
    const written = lemma.normalize("NFC").trim();
    const lower = written.toLowerCase();
    if (!forms.has(lower)) forms.set(lower, new Map());
    const counts = forms.get(lower);
    counts.set(written, (counts.get(written) ?? 0) + 1);
  }
  const spelling = new Map();
  for (const [lower, counts] of forms) {
    const best = [...counts].sort((a, b) => b[1] - a[1] || (a[0] === lower ? -1 : b[0] === lower ? 1 : 0))[0];
    spelling.set(lower, best[0]);
  }
  return spelling;
}

/**
 * How a kept word is written in the list, so nouns have their capital: a hand-made spelling first (`Zeit`, which
 * the dictionary also has as the rare preposition zeit), then lower case when the dictionary has the word so
 * (`ja`, `weg`, `essen`), then the lemma list's spelling (`lemmaSpellings`), then the dictionary's.
 */
export function spellingIn(dic, listSpellings = new Map(), named = new Map()) {
  return (lemma) =>
    named.get(lemma) ??
    (dic.spelling.get(lemma) === lemma ? lemma : undefined) ??
    listSpellings.get(lemma) ??
    dic.spelling.get(lemma) ??
    lemma;
}
