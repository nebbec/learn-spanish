# Flagged cards

The review pass flagged 2 cards: 2 waiting for you, 0 decided. This file is rewritten by `npm run review` and `npm run deck`; do not edit it.

**To decide on a card**, open its file in `content/de/review/decisions/` (linked under each card), change `decision: pending` to `decision: approve` or `decision: reject`, and correct any card line first if it needs it. Then run `npm run deck -- --lang de`, which puts approved cards in the deck and rewrites this list.

## Waiting for you

### ein-one · rank 6 · ein

Decide in [decisions/ein-one.txt](decisions/ein-one.txt)

| Field | Card |
|---|---|
| Prompt | Just [one] beer, please |
| Hint | before a noun, not counting |
| Answer | ein |
| Kind | glue, determiner |
| Grammar | none |
| Example | Ich trinke nur ein Bier. / I'm only drinking one beer. |
| Regional | none |
| Trick | EIN is the start of Einstein, which literally means one stone. |

Why it was flagged:

- Meaning: The prompt asks for the number one before a noun, but the hint says not counting, which contradicts it. Suggested fix: hint: the number, before a noun (not eins)
- One right answer: The hint not counting is misleading, since [one] beer is counting, and it does not rule out the stand-alone counting form eins. Suggested fix: hint: the number, before a noun (not eins)

Reviewer's note (not a reason to flag): This card covers ein as the number one before a noun, and the other card covers ein as the article a, so the two are kept apart only by this hint.

The reviewer's own translation: answer "a, an; one (before a masculine or neuter noun)"; example "I'm only drinking one beer.".

### ja-particle-really · rank 20 · ja

Decide in [decisions/ja-particle-really.txt](decisions/ja-particle-really.txt)

| Field | Card |
|---|---|
| Prompt | That's [really] great! |
| Hint | particle of surprise, not wirklich |
| Answer | ja |
| Kind | glue, other |
| Grammar | none |
| Example | Du bist ja schon da! / Oh, you're already here! |
| Regional | none |
| Trick | JA sounds like "yah": picture a surprised "yeah, wow!" slipped into the middle of a sentence. |

Why it was flagged:

- One right answer: The hint rules out wirklich but not aber, the other common particle of surprise: Das ist aber toll! is just as right as Das ist ja toll!, and the adverb echt also fits. Suggested fix: hint: particle of surprise, not aber, echt or wirklich

Reviewer's note (not a reason to flag): English has no real word for this ja, so the bracketed [really] is only a rough stand-in, and the hint does most of the work.

The reviewer's own translation: answer "(modal particle) expressing surprise or a shared obvious fact; roughly oh, really, after all"; example "Oh, you're already here!".

## Decided

Nothing yet.
