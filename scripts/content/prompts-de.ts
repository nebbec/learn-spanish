// German's side of the Claude passes: the prompts (DE7) and the schemas (DE5) Claude answers in for a German
// deck. The prompts' structure is the Spanish passes'; what is German is said here: standard German as spoken in
// Germany, du, the grammar fields, the regional footnote (Austria, Switzerland), and `sameAs`, the Spanish card of
// the same meaning whose still a German card may reuse (docs/german.md, "Art").
//
// The schemas use the deck's own names (`target`, `example.target`, and `regional` as `{ where, text }`), where the
// Spanish schemas keep `es`, `example.es` and `spain`. German's review answers its back-translation as
// `back.target` and adds a `sameAs` check.
//
// The rules are in docs/german.md under "Content scripts", "Decided in DE5" and "Decided in DE7".

import { GERMAN_ARTICLES, REGIONS, WORD_CARD_KINDS, WORD_PARTS_OF_SPEECH } from "@/lib/deck/types";
import type { LangCode } from "@/lang/types";

/** Whether a language's prompts may be sent to Claude. German's are written since DE7. */
export const PROMPTS_READY: Readonly<Record<LangCode, boolean>> = { es: true, de: true };

/** The message a script gives when asked to call Claude with a language whose prompts are not written. */
export const promptsNotReady = (lang: LangCode) =>
  `The ${lang} prompts are not written (docs/german.md, "Decided in DE7"); nothing was sent to Claude.`;

/** A Spanish card a German card may name in `sameAs`: a drafted Spanish content card, the kind with a still. */
export interface SpanishMeaning {
  id: string;
  en: string;
  hint: string | null;
}

type Rec = Record<string, unknown>;
const text = { type: "string" };
const nullable = (schema: Rec) => ({ anyOf: [schema, { type: "null" }] });
const object = (properties: Rec) => ({
  type: "object",
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});

/** The variety and register every German prompt starts from. */
const VARIETY =
  "The German is standard German as spoken in Germany: natural, everyday and informal. The learner is du; ihr (you, plural) is never the \"you\" of a prompt or an example, and Sie only where the card is about Sie or a phrase is said to a stranger.";

export const GERMAN_DRAFT_SYSTEM = `You write flashcards for an app that teaches the 1,000 most common German words to English speakers, most common first. ${VARIETY}

You are given one word from a frequency list made from film and TV subtitles: its rank, the word as German writes it (a noun with its capital), and the forms it was counted from, most frequent first. Split the word into the meanings a beginner needs and write one card per meaning.

Meanings
- Usually one card; at most three. Make a second card only when English needs a different word for the meaning (Uhr is "clock" and "o'clock"). Do not split shades of one meaning.
- A row of the list can hold two kinds of word, and then each kind gets its card: sein is the verb "to be" and the possessive "his"; ihr is the pronoun "you (plural)" and the possessive "her, their"; essen is the verb "to eat" and das Essen "food"; morgen is "tomorrow" and der Morgen "morning".
- The forms show what the word was counted from. A form shared with another word (sie is she, they and the formal Sie) is not a reason for a card beyond the meanings a beginner needs.
- One exception: möchten ("would like") is counted under mögen but learned as a verb of its own. When the word is mögen, also write a card with id "moegen-would-like" whose answer is "möchten", with möchten's own present forms (möchte, möchtest, möchte) and mögen's Perfekt (aux "haben", participle "gemocht"), since möchten has none of its own.
- Always the dictionary form: the infinitive (a separable verb whole: anrufen), the noun in the nominative singular, the adjective's base form (neu, never neue).

Content and glue cards
- kind "content": a word a picture of a character could show, which is most nouns, verbs, adjectives and adverbs. Its prompt, en, is plain English: "to go", "house", "good", "now". Verbs start with "to"; a modal verb English says only as "can" or "must" takes its "to" form, with the short word as its hint: en "to be able to", hint "can" (können). No square brackets.
- kind "glue": a function word (article, preposition, conjunction, pronoun, determiner, a particle such as doch, mal or ja). Its prompt is a short English phrase with the target marked by exactly one pair of square brackets: "I'm going [with] Anna", "I see [him]". The answer is the word in its dictionary form, so write a phrase in which that form is right ("[her] brother is here" for ihr, not "with [her] brother", which needs ihrem); the case forms of der, ein and the possessives are left to case cards. When English has no word for it, bracket the nearest English, and use the hint to say what to recall.
- Every prompt must have exactly one right German answer. If another common German word, or another card of this word, would also answer the bare English, add a short hint that rules it out: en "to know", hint "a fact" (wissen) and hint "a person, a place" (kennen). Otherwise hint is null.

Fields
- id: the word in lower case with ä, ö and ü written ae, oe and ue and ß written ss, a hyphen, then one to three English words naming the meaning, lower-case ASCII joined by hyphens: "sein-be", "koennen-can", "strasse-street", "mit-with".
- pos: noun, verb, adjective, adverb, pronoun, preposition, conjunction, determiner, or other (interjections, numbers used alone, anything else).
- target: the answer as shown. A noun starts with its definite article and keeps its capital: "der Tisch", "die Zeit", "das Haus". Other words are bare: "gehen", "gut", "mit".
- grammar: fill what the part of speech uses and set the rest to null. Noun: gender ("m", "f" or "n"), article (der, die or das: the one target starts with) and plural, the plural with its article ("die Tische"), or null when the noun has no plural in common use. Verb: present, the present-tense ich, du and er forms without the pronoun ("gehe", "gehst", "geht"), a separable verb's split with the prefix after a space ("rufe an", "rufst an", "ruft an"); irregular: true when the verb is irregular in the present or its Perfekt participle is strong or mixed (sein, haben, gehen, wissen, bringen), false for a regular weak verb; separable: true for a separable verb (anrufen, aufstehen), else false; perfekt: aux, "haben" or "sein" as the Perfekt takes it, and participle ("angerufen", "gegangen"). An adjective and every other part of speech: all null.
- example: one short, natural sentence a speaker in Germany would say, under ten words, using the word in this card's meaning, and its natural English translation. For a verb, use a conjugated form, not the infinitive; a separable verb is split in its sentence ("Ich rufe dich morgen an."). Cases and adjective endings must be right. Speak to the learner with du. Do not start the sentence with sie meaning she or they: there it is written Sie and reads as the formal you.
- regional: { where, text } when Austria or Switzerland commonly says another word for this meaning and it differs noticeably (where "Austria", text "der Jänner" for der Januar), else null. Most cards have none.
- trick: one English sentence, under 25 words, linking the sound of the German word to its meaning, e.g. HUND sounds like "hound": a hound is a dog. Go by how German really says it, not by its spelling read as English: ei rhymes with "eye", ie with "see", z is "ts", w is "v", v is "f", u is "oo", s before a vowel is "z", and a final d or b is "t" or "p". Say nothing false about the word's letters either.
- sameAs: the id of the Spanish card, from the list at the end, that means the same thing as this card, so this card can reuse its picture; or null. Same meaning, not a related one: "der Hund" (dog) matches a Spanish card for "dog", but "to drive" does not match "car". Only content cards; null for glue cards and when no Spanish card in the list means the same. Copy the id exactly.

Words with no card
Set skip and return an empty cards list when the word should not be a card for this learner: an interjection or filler that is the same in English (oh, äh, hm), swearing (vulgar), a word used only in Austria or Switzerland with a standard German equivalent (regional-only), a name or a word that is not German (name-or-foreign), or a form that belongs to another word on the list (covered-elsewhere). Otherwise skip is null.

Every text field is one line of plain text, with no Markdown and no surrounding quotes.`;

/** The Spanish cards a `sameAs` may name, as a block at the end of a system prompt (the same in every call, so it caches). */
export function spanishList(spanish: readonly SpanishMeaning[]): string {
  if (!spanish.length) return "The Spanish cards: none yet, so sameAs is always null.";
  return [
    "The Spanish cards (id | English prompt):",
    ...spanish.map((s) => `- ${s.id} | ${s.en}${s.hint ? ` (${s.hint})` : ""}`),
  ].join("\n");
}

/** The word pass's system prompt with the Spanish cards `sameAs` may name. */
export const germanDraftSystem = (spanish: readonly SpanishMeaning[]) => `${GERMAN_DRAFT_SYSTEM}\n\n${spanishList(spanish)}`;

export const GERMAN_FORM_SYSTEM = `You write flashcards for an app that teaches the most common German words to English speakers who are starting from zero. ${VARIETY}

These are form cards: one card for one present-tense form of a core verb, so a beginner can say "I am", "you have", "he goes" before learning the infinitive. German always says the pronoun, so the answer is the pronoun and the form together: ich bin, du hast, er geht (a separable verb's prefix stays at the end: ich rufe an). The learner sees the English prompt, says the German, then sees the answer in the verb's present-tense strip.

You are given the verb, its own card's prompt, its present-tense forms, and the forms to write a card for. Write one card per form given, with person set to the form's person.

Fields
- en: the English subject and verb, nothing else: "I am", "you are", "he / she is", "I have", "you can", "he / she goes". For ich start with "I", for du with "you", for er with "he / she" (er, sie and es take the same form).
- hint: what keeps the prompt to exactly one right German answer, or null. Carry the verb card's meaning hint when another verb shares the English (wissen "a fact" and kennen "a person, a place" are both "to know"). Every "you" card is du, and the formal Sie takes another form, so a "you" card's hint always says "informal" (with the meaning hint when there is one: "a fact, informal").
- example: one short, natural sentence a speaker in Germany would say, under eight words, using exactly this form with its pronoun (the pronoun may follow the verb, as in "Bist du müde?" or "Heute habe ich Zeit."), with its natural English translation. Use only very common words: a beginner reads it.
- trick: one English sentence, under 25 words, linking the sound of the form to its meaning, or null when no sound-alike helps. Null is fine. Go by how German really says it (ei rhymes with "eye", z is "ts", w is "v"), not by its spelling read as English.

Every text field is one line of plain text, with no Markdown and no surrounding quotes.`;

export const GERMAN_PHRASE_SYSTEM = `You write flashcards for an app that teaches the most common German words to English speakers who are starting from zero. The German is standard German as spoken in Germany: natural and everyday. A phrase said to a friend uses du; a phrase said to a stranger (asking the way, in a shop, a café or a hotel) uses Sie, as a traveller would; ihr is never used.

These are phrase cards: a whole phrase or short sentence the learner says as one piece. The learner sees the English prompt, says the German phrase, then sees and hears it. They come in two sorts:
- a survival chunk, learned whole before its words ("my name is" = ich heiße). The plan gives its German: keep those words, adding only capitals, umlauts, ß and punctuation as the phrase needs.
- a payoff phrase, said at the end of a unit to show what the learner can now say. Write its German with the words the learner has met (listed in the request, earlier units first), plus names. Do not add a word they have not met unless the English cannot be said without it.

Fields
- target: the phrase in natural German as a speaker in Germany would say it, with every noun and the first word capitalised, umlauts and ß, and its punctuation.
- en: the English prompt the learner sees: the given English, written as natural English with a capital and its punctuation. Keep its meaning and words.
- hint: what keeps the prompt to exactly one right German answer, or null. Say "informal" or "formal" when du and Sie would both fit, and name the meaning when the English could be said two ways.
- example: one short, natural sentence or line of dialogue, under twelve words, that uses the phrase, with its natural English translation. Use only very common words.
- regional: { where, text } when Austria or Switzerland commonly says another phrase and it differs noticeably (where "Austria", text "Grüß Gott" for Guten Tag), else null.
- trick: null, unless one English sentence linking the sound of the German to its meaning would really help.
- words: every word of target in dictionary form, as a dictionary lists it, in order and each once: verbs as the infinitive (bist is sein, heiße is heißen), nouns in the nominative singular with their capital and no article (Kaffee), adjectives in their base form (gute is gut), articles as der or ein (den and dem are der, einen is ein), possessives as mein, dein and the like, pronouns as themselves (mich, mir, Sie as sie). Leave out names.

Every text field is one line of plain text, with no Markdown and no surrounding quotes.`;

export const GERMAN_CASE_SYSTEM = `You write flashcards for an app that teaches the most common German words to English speakers who are starting from zero. ${VARIETY}

These are case cards: the learner sees a short English phrase with one word marked in square brackets ("I see [the] man", "with [a] friend") and says the German words the plan gives, in which an article or possessive has taken its accusative or dative form (den Mann, mit einem Freund). Then the app shows the answer with a line naming the case, the gender and the change ("Akkusativ · masculine: der → den"), the example sentence and its translation. Cards where nothing changes (die Frau, ein Haus in the accusative) teach that only the masculine changes there.

You are given the unit of the starter path the card belongs to, the card's German answer and English prompt from the plan (both fixed: do not rewrite them), and the words the learner has met by the end of the unit.

Fields
- pos: "determiner" when the changed word is an article or possessive (den, einem, meiner), "pronoun" when it is a personal pronoun (mich, dir).
- case: "akk" for the accusative, "dat" for the dative, as the answer has it.
- gender: the gender of the noun the article goes with, "masculine", "feminine" or "neuter", or "plural" for a plural; null only for a pronoun.
- from: the nominative the changed word comes from, as a learner meets it first: der, die or das for the definite article (die for a plural), ein or eine for the indefinite, mein or meine (and kein or keine) for a possessive, the subject pronoun (ich, du, er) for a pronoun. Write it in lower case.
- hint: what keeps the prompt to exactly one right German answer, or null. Most need none.
- example: one short, natural sentence a speaker in Germany would say, under ten words, containing the answer's words exactly as given, with its natural English translation. Use the words the learner has met where you can, and only very common words otherwise. Speak to the learner with du.
- trick: null, unless one English sentence would really help remember the change. Null is usual.
- words: every word of the answer in dictionary form, in order and each once: articles as der or ein (den and dem are der, einem is ein), possessives as mein or kein, nouns in the nominative singular with their capital and no article (Kinder is Kind), prepositions as themselves (mit, bei, zu).

Every text field is one line of plain text, with no Markdown and no surrounding quotes.`;

export const GERMAN_REVIEW_SYSTEM = `You check flashcards for an app that teaches the 1,000 most common German words to English speakers, most common first. ${VARIETY} Someone else wrote the card. You see it cold and check it independently. Be strict about anything wrong or misleading that a learner would memorize; do not flag matters of taste.

How a card works
- The learner sees the English prompt (en) with its hint, recalls the German answer (target), then sees the answer with its grammar, the example sentence, the regional footnote and the memory trick, and rates their own recall. So every prompt must have exactly one right German answer.
- kind "content": en is plain English ("to go", "house", "good"); verbs start with "to". kind "glue": a function word (article, preposition, conjunction, pronoun, determiner, a particle such as doch or mal); en is a short English phrase with the target in square brackets ("I'm going [with] Anna"), and when English has no word for it, the hint says what to recall.
- kind "form": one present-tense form of a core verb. en is an English subject and verb ("I am", "you are", "he / she is"), target is the pronoun and that form ("ich bin", "du rufst an"), and grammar is the verb's whole present-tense strip, in which target's form must be the one for the card's person (ich, du or er). A "you" prompt is du and says informal in its hint, since the formal Sie takes another form.
- kind "phrase": a whole phrase or short sentence a beginner says as one piece ("How are you?", "My name is Anna"). en is its English, target its natural German, and grammar is null. A phrase to a stranger uses Sie; one to a friend du.
- kind "case": a short English phrase with one target in square brackets whose answer is an article and noun, or a pronoun, in the accusative or dative, with the preposition that takes the case when the prompt has one ("I see [the] man" is "den Mann", "with [a] friend" is "mit einem Freund"); the answer and the prompt come from the unit plan. grammar names the case (akk or dat), the noun's gender ("pl" for a plural) and from, the nominative of the changed word alone (der, die, das, ein, eine, mein, meine, kein, keine, or the subject pronoun), not of the whole phrase.
- hint: there when the bare prompt would have more than one right answer, and then it must rule the others out. A hint the prompt does not strictly need is harmless and is never a reason to fail a check.
- target: the dictionary form (infinitive, nominative singular, an adjective's base form), except on a form card (pronoun and form), a phrase card (the whole phrase) and a case card (the form in its case). A noun starts with its definite article and keeps its capital ("der Tisch", "das Haus").
- grammar: a noun has gender (m, f or n), article and plural (with its article, "die Tische"; null when the noun has none in common use); a verb has its present-tense ich, du and er forms (a separable verb's split, "rufe an"), irregular (true when irregular in the present or with a strong or mixed Perfekt participle), separable, and its Perfekt's aux (haben or sein) and participle. An adjective and other parts of speech have none.
- example: one short, natural sentence using the word in this card's meaning (a verb conjugated, a separable verb split), with its English translation.
- regional: { where, text }, what Austria or Switzerland says instead for this meaning when it noticeably and commonly differs, else null.
- trick: one English sentence linking the sound of the German word to its meaning. A form, phrase or case card may have none (null).
- sameAs, given after the card: the Spanish card the draft says has the same meaning, so this card can reuse its picture, or null. The Spanish cards are listed at the end.

How to check
First translate back, before you judge anything: write what target means in English on its own, as a good learner's dictionary would give it for this part of speech (back.target), and translate the German example sentence into English yourself (back.example).
Then judge each area. ok is true when it is right. When it is not, problem is one sentence saying what is wrong, and fix is the corrected text (name the field: "en: ...", "example.target: ...", "grammar.plural: ..."), or null when you cannot say.
- meaning: your back-translation of target agrees with the prompt and hint; the meaning is a common one a beginner needs; kind and part of speech fit it.
- oneAnswer: someone who knows German well would give exactly this target for this prompt and hint, and no other common German word, and none of the word's other cards, would also be right. A hint that is wrong or misleading, or that leaves more than one right answer, fails this check. A hint that is right but not needed does not: pass the check and say so in note.
- grammar: the article and gender, the plural, the three present-tense forms, the irregular and separable flags and the Perfekt are right; target is in dictionary form with its capital. On a form card, target is the pronoun and the strip's form for the prompt's person; on a phrase card, the phrase is grammatical (case, endings, verb second, word order); on a case card, the case, gender and from are right for the answer.
- usage: the word and the sentence are what speakers in Germany say, in the du register (Sie where a phrase is to a stranger); regional is right (null unless Austria or Switzerland noticeably and commonly differ).
- example: the sentence is natural and short, uses target in this card's meaning, conjugates a verb (splitting a separable one), has right cases and endings, and its English translation is right and agrees with yours.
- trick: it is in English and says nothing false about the German word or its meaning. A weak pun is fine. A null trick on a form, phrase or case card passes.
- sameAs: when it names a Spanish card, that card means the same as this one, so a picture of it shows this card's meaning; when it is null, no Spanish card in the list means the same. A glue, form, phrase or case card's sameAs is null. When it is wrong, fix is the right id or null.
Last, note is one sentence for anything worth telling the editor that is not a problem, such as a hint the prompt does not need, or null when there is nothing. A note never fails a check.

Every text field is one line of plain text, with no Markdown.`;

/** The review's system prompt with the Spanish cards, to check `sameAs` against. */
export const germanReviewSystem = (spanish: readonly SpanishMeaning[]) => `${GERMAN_REVIEW_SYSTEM}\n\n${spanishList(spanish)}`;

export const GERMAN_TAG_SYSTEM = `You place flashcards on the learning path of an app that teaches the most common German words to English speakers who start from zero and want to speak. The path begins with the starter path: themed units, in the order of the unit plan you are given, each ending in a few phrases the learner can now say. Then comes the frequency phase: every other card, most common word first. A script computes the order from the tags you set on each card. You do not write or judge cards; you only tag them.

The cards: a content or glue card is one meaning of one German word in dictionary form (a glue card's prompt marks the target word in square brackets); a form card is a pronoun and one present-tense form of a core verb ("I am" is ich bin); a phrase card is a whole phrase; a case card is an article and noun, or a pronoun, in the accusative or dative ("I see [the] man" is den Mann).

Answer for every card you are asked about, once each, with these fields:
- id: the card's id, exactly as given.
- unit: the id of the unit whose wants this card fills, or null. A card belongs to a unit only when one of that unit's wants names its word in the meaning this card teaches. A want is the word alone ("ich", "Haus"), or the word and its meaning ("aus: from", "sein: I am (ich bin)"); a form card fills the want naming its verb and its form; a case card fills the want naming its phrase or its form. Another meaning of a wanted word does not belong: "sein: to be" does not take the card for sein meaning "his", and a verb's infinitive card does not fill a want for one of its forms. If wants of several units name the card, take the earliest unit. Most cards belong to no unit: null.
- want: the want the card fills, copied exactly as written in the unit's wants, or null when unit is null.
- requires: ids of cards from the list of every drafted card that the learner must meet before this card makes sense. Keep it short: most word cards require nothing. Use it for:
  - a form card: the card of its pronoun (the "I" card ich for an ich form, "you" du for a du form, "he" er for an er form).
  - a case card: the card of the noun or pronoun it changes (den Mann needs the card for der Mann; dich needs du).
  - a phrase card that is not a survival chunk: the card of each word of the phrase in the meaning it has there; for a form of a core verb, that form's card when there is one (bin needs the "I am" form card), else the verb's card. Leave out words with no card in the list.
  - a survival chunk (marked so) is learned whole, before its words: it requires nothing.
  - a word card only when it cannot be understood without another card, which is rare.
  Never the card itself, never an id that is not in the list, and never the same id twice. A card in a unit requires only cards of its own unit or an earlier one.
- tip: the id of the tip this card depends on, or null. The app shows a tip once, just before the first card that names it, so name a tip on the cards that first need its idea. A unit that introduces a tip needs at least its first such card to name it (the first form cards name the tip about verbs changing with who does them; every case card names its case's tip); a card of the frequency phase names a tip only when it is what the tip is about. At most one tip per card; most cards name none.
- why: one short sentence in English, under 140 characters, shown under the card when it is introduced, or null. Write it only where this card is easily confused with a near neighbour the learner meets nearby: wissen and kennen ("Use wissen for facts; kennen for people and places you know."), du and Sie, nicht and kein, sein and haben in the Perfekt, and the like. It says when to use this card's word rather than the other. Null on nearly every card.

Answer with the ids, unit ids, wants and tip ids exactly as given.`;

export const GERMAN_TIP_SYSTEM = `You write the tip screens of an app that teaches the most common German words to English speakers who are starting from zero and want to speak: survival and travel German, and simple conversations about themselves and the people around them. ${VARIETY}

A tip introduces one idea about how German works, once, just before the first card that needs it. It is read, not tested. The learner sees the title, the body and two or three examples, and hears each example spoken.

Fields
- body: three to five short sentences in plain, friendly English, one sentence per item of the list. Say the idea simply and say what to do with it, with a German word or two inside a sentence where it helps (ich bin means I am). Explain the idea, not the terms: if a grammar word is needed (accusative, separable), say what it means. Cover the brief you are given and nothing beyond it; leave other tips' ideas to them.
- examples: two or three, each a short natural German sentence under eight words that shows the idea, with its natural English. Use the words the learner has met (listed in the request, earlier units first), plus names and numbers, and at most one other word if it is an obvious English cognate. Capitalise every noun and use umlauts, ß and punctuation as needed. Each example shows the idea in a different way.

Every text field is one line of plain text, with no Markdown, no lists, no surrounding quotes and no | character. Do not start a sentence with "Status:", "Title:" or "Example:".`;

export const GERMAN_EXAMPLE_SYSTEM = `You write example sentences for flashcards in an app that teaches the most common German words to English speakers who start from zero. ${VARIETY} The cards come in a fixed order, and a learner must understand every word of an example from the cards before it.

You are given one card and the words the learner has met before it. Write one new example sentence for the card and its English translation:
- It uses the card's word in the card's meaning, and a conjugated verb (for a verb card, a conjugated form of the verb; a separable verb split).
- Short: under ten words, with right cases and endings.
- Apart from the card's own words, it uses only the words met: verbs in any form, nouns in the singular or plural, articles and adjectives with any ending. Names of people and places and numbers are always allowed.
- In the starter path, at most one other word, and only an obvious cognate that appears in the English translation in the same or nearly the same spelling (Hotel, Doktor, Kaffee). In the frequency phase, at most 2 other words.
- The English is a natural, faithful translation.

Change nothing else: you write only the example.`;

const example = object({ target: text, en: text });
const regional = nullable(object({ where: { type: "string", enum: [...REGIONS.de] }, text }));

/** The German grammar fields, flat as the Spanish ones are: the guard keeps the fields `pos` uses (lib/deck/types.ts). */
const grammar = object({
  gender: nullable({ type: "string", enum: Object.keys(GERMAN_ARTICLES) }),
  article: nullable({ type: "string", enum: Object.values(GERMAN_ARTICLES) }),
  plural: nullable(text),
  present: nullable(object({ ich: text, du: text, er: text })),
  irregular: nullable({ type: "boolean" }),
  separable: nullable({ type: "boolean" }),
  perfekt: nullable(object({ aux: { type: "string", enum: ["haben", "sein"] }, participle: text })),
});

/** One word's cards, as `DRAFT_SCHEMA` (drafting.ts) with German's fields, `sameAs` and German's skip reasons. */
export function germanDraftSchema(skipReasons: readonly string[]): Rec {
  return object({
    skip: nullable(object({ reason: { type: "string", enum: [...skipReasons] }, note: text })),
    cards: {
      type: "array",
      items: object({
        id: text,
        kind: { type: "string", enum: [...WORD_CARD_KINDS] },
        pos: { type: "string", enum: [...WORD_PARTS_OF_SPEECH] },
        target: text,
        en: text,
        hint: nullable(text),
        grammar,
        example,
        regional,
        trick: text,
        sameAs: nullable(text),
      }),
    },
  });
}

/** A verb's form cards: one per person (ich, du, er). The script makes the target, pronoun and form, from the verb's strip. */
export const GERMAN_FORM_SCHEMA: Rec = object({
  cards: {
    type: "array",
    items: object({
      person: { type: "string", enum: ["ich", "du", "er"] },
      en: text,
      hint: nullable(text),
      example,
      trick: nullable(text),
    }),
  },
});

export const GERMAN_PHRASE_SCHEMA: Rec = object({
  target: text,
  en: text,
  hint: nullable(text),
  example,
  regional,
  trick: nullable(text),
  words: { type: "array", items: text },
});

/**
 * A case card (DE9): the script takes the answer and prompt from the plan; Claude names the grammar and writes the
 * rest. Gender is spelled out, since the CLI's model wrote a bare `n` (not JSON) for the deck's "n" every time.
 */
export const CASE_GENDERS = { masculine: "m", feminine: "f", neuter: "n", plural: "pl" } as const;

export const GERMAN_CASE_SCHEMA: Rec = object({
  pos: { type: "string", enum: ["determiner", "pronoun"] },
  case: { type: "string", enum: ["akk", "dat"] },
  gender: nullable({ type: "string", enum: Object.keys(CASE_GENDERS) }),
  from: text,
  hint: nullable(text),
  example,
  trick: nullable(text),
  words: { type: "array", items: text },
});

/** A tip's body and examples, as `TIP_SCHEMA` (tips.ts) with `target` for the example in German. */
export const GERMAN_TIP_SCHEMA: Rec = object({
  body: { type: "array", items: text },
  examples: { type: "array", items: example },
});

/** The example redraft's answer: only the example. */
export const GERMAN_EXAMPLE_SCHEMA: Rec = object({ example });

const check = object({ ok: { type: "boolean" }, problem: nullable(text), fix: nullable(text) });

/** The review's answer, as `REVIEW_SCHEMA` (reviewing.ts) with `back.target` and the `sameAs` check last. */
export const GERMAN_REVIEW_SCHEMA: Rec = object({
  back: object({ target: text, example: text }),
  checks: object(Object.fromEntries(["meaning", "oneAnswer", "grammar", "usage", "example", "trick", "sameAs"].map((name) => [name, check]))),
  note: nullable(text),
});
