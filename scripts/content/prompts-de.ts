// German's side of the Claude passes (DE5): the schemas Claude answers in for a
// German deck, and stand-in system prompts. DE5 only makes the passes take
// `--lang de`; the German prompts' wording (du, Germany, the grammar fields,
// `sameAs`, the regional footnote, cognates) is DE7's, which writes it here and
// may rename Claude's fields. Until then `PROMPTS_READY.de` is false and the
// scripts refuse a German run that would call Claude; the tests drive the passes
// with a fake runner.
//
// The schemas use the deck's own names (`target`, `example.target`, and
// `regional` as `{ where, text }`), where the Spanish schemas keep `es`,
// `example.es` and `spain`.
//
// The rules are in docs/german.md under "Content scripts", "Decided in DE5".

import { GERMAN_ARTICLES, REGIONS, WORD_CARD_KINDS, WORD_PARTS_OF_SPEECH } from "@/lib/deck/types";
import type { LangCode } from "@/lang/types";

/** Whether a language's prompts may be sent to Claude. German's are stand-ins until DE7. */
export const PROMPTS_READY: Readonly<Record<LangCode, boolean>> = { es: true, de: false };

/** The message a script gives when asked to call Claude with a language whose prompts are not written. */
export const promptsNotReady = (lang: LangCode) =>
  `The ${lang} prompts are stand-ins until DE7 writes them (docs/german.md, "Decided in DE5"); nothing was sent to Claude.`;

type Rec = Record<string, unknown>;
const text = { type: "string" };
const nullable = (schema: Rec) => ({ anyOf: [schema, { type: "null" }] });
const object = (properties: Rec) => ({
  type: "object",
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});

const STAND_IN = "Stand-in until DE7 writes the German prompt. Never sent to Claude.";

export const GERMAN_DRAFT_SYSTEM = `German word pass. ${STAND_IN}`;
export const GERMAN_FORM_SYSTEM = `German form cards. ${STAND_IN}`;
export const GERMAN_PHRASE_SYSTEM = `German phrase cards. ${STAND_IN}`;
export const GERMAN_REVIEW_SYSTEM = `German review pass. ${STAND_IN}`;
export const GERMAN_TAG_SYSTEM = `German tag pass. ${STAND_IN}`;
export const GERMAN_TIP_SYSTEM = `German tips. ${STAND_IN}`;

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

/** One word's cards, as `DRAFT_SCHEMA` (drafting.ts) with German's fields. The skip reasons are the Spanish list until DE7. */
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

/** A tip's body and examples, as `TIP_SCHEMA` (tips.ts) with `target` for the example in German. */
export const GERMAN_TIP_SCHEMA: Rec = object({
  body: { type: "array", items: text },
  examples: { type: "array", items: example },
});
