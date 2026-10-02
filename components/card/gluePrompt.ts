/** A glue prompt split around its target: `the house [of] Maria`. */
export interface GluePrompt {
  before: string;
  target: string;
  after: string;
}

/**
 * Splits a glue card's `en` at its square brackets. The deck validator
 * guarantees exactly one pair; a prompt without one comes back as all target,
 * so a bad card still shows its text.
 */
export function splitGluePrompt(en: string): GluePrompt {
  const open = en.indexOf("[");
  const close = en.indexOf("]", open + 1);
  if (open === -1 || close === -1) return { before: "", target: en, after: "" };
  return {
    before: en.slice(0, open),
    target: en.slice(open + 1, close),
    after: en.slice(close + 1),
  };
}
