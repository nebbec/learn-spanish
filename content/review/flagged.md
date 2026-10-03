# Flagged cards

The review pass flagged 10 cards: 10 waiting for you, 0 decided. This file is rewritten by `npm run review` and `npm run deck`; do not edit it.

**To decide on a card**, open its file in `content/review/decisions/` (linked under each card), change `decision: pending` to `decision: approve` or `decision: reject`, and correct any card line first if it needs it. Then run `npm run deck`, which puts approved cards in the deck and rewrites this list.

## Waiting for you

### el-the · rank 1 · el

Decide in [decisions/el-the.txt](decisions/el-the.txt)

| Field | Card |
|---|---|
| Prompt | [the] boy |
| Hint | masculine singular |
| Answer | el |
| Kind | glue, determiner |
| Grammar | none |
| Example | El perro está en la cocina. / The dog is in the kitchen. |
| Spain | none |
| Trick | EL sounds like the letter L, and L comes before M just like THE comes before a noun. |

Why it was flagged:

- One right answer: The hint is unnecessary because 'boy' (niño/chico) is already masculine singular, so 'el' is the only answer and a hint should only appear when the bare prompt is ambiguous. Suggested fix: hint: null

The reviewer's own translation: answer "the (masculine singular definite article)"; example "The dog is in the kitchen.".

### de-from · rank 2 · de

Decide in [decisions/de-from.txt](decisions/de-from.txt)

| Field | Card |
|---|---|
| Prompt | I'm [from] Mexico |
| Hint | origin |
| Answer | de |
| Kind | glue, preposition |
| Grammar | none |
| Example | Soy de Colombia, ¿y tú? / I'm from Colombia, and you? |
| Spain | none |
| Trick | DE sounds like day: you came FROM far away, a whole day's trip. |

Why it was flagged:

- One right answer: The frame 'I'm [from] Mexico' already allows only 'de' ('soy desde México' is wrong), so the hint 'origin' isn't needed and breaks the hint-only-when-ambiguous rule. Suggested fix: hint: null

The reviewer's own translation: answer "de = of, from (a preposition)"; example "I'm from Colombia, and you?".

### que-who-which · rank 3 · que

Decide in [decisions/que-who-which.txt](decisions/que-who-which.txt)

| Field | Card |
|---|---|
| Prompt | the man [who] lives here |
| Hint | the everyday word, not quien |
| Answer | que |
| Kind | glue, pronoun |
| Grammar | none |
| Example | El hombre que vive aquí es mi tío. / The man who lives here is my uncle. |
| Spain | none |
| Trick | QUE sounds like "key": it's the key that points to who or which thing you mean. |

Why it was flagged:

- One right answer: The hint suggests quien would also be correct here, just less common, but 'el hombre quien vive aquí' is ungrammatical because a restrictive relative clause without a comma needs que, so the bare prompt already has only one answer. Suggested fix: hint: null

The reviewer's own translation: answer "que (relative pronoun): who, that, which"; example "The man who lives here is my uncle.".

### no-no-answer · rank 5 · no

Decide in [decisions/no-no-answer.txt](decisions/no-no-answer.txt)

| Field | Card |
|---|---|
| Prompt | [No], thanks. |
| Hint | the answer, opposite of yes |
| Answer | no |
| Kind | glue, adverb |
| Grammar | none |
| Example | ¿Quieres café? No, gracias. / Do you want coffee? No, thanks. |
| Spain | none |
| Trick | NO is spelled and said like English no, so refusing in Spanish works just like in English. |

Why it was flagged:

- One right answer: The bare prompt "[No], thanks." already has only one right answer, "no", and cannot be confused with the "I do [not] know" card, so the hint is unnecessary and should be dropped. Suggested fix: hint: null

The reviewer's own translation: answer "no (the negative answer, opposite of yes)"; example "Do you want coffee? No, thanks.".

### un-a · rank 6 · un

Decide in [decisions/un-a.txt](decisions/un-a.txt)

| Field | Card |
|---|---|
| Prompt | I want [a] book |
| Hint | masculine form |
| Answer | un |
| Kind | glue, determiner |
| Grammar | none |
| Example | Tengo un perro y una gata. / I have a dog and a cat. |
| Spain | none |
| Trick | UN sounds like the start of "an": just drop the a and you have it. |

Why it was flagged:

- One right answer: The hint is not needed because libro is masculine, so un is already the only right answer to the bare prompt, and hints should appear only when the prompt has more than one answer. Suggested fix: hint: null
- Memory trick: Dropping the a from an leaves n, not un, and Spanish un sounds like oon, not like English an, so the trick is misleading. Suggested fix: trick: UN sounds like oon, a short form of uno (one), so un libro is one book, a book.

The reviewer's own translation: answer "a, an (masculine singular indefinite article)"; example "I have a dog and a (female) cat.".

### a-to · rank 7 · a

Decide in [decisions/a-to.txt](decisions/a-to.txt)

| Field | Card |
|---|---|
| Prompt | I go [to] Mexico |
| Hint | direction, movement |
| Answer | a |
| Kind | glue, preposition |
| Grammar | none |
| Example | Mañana voy a la playa. / Tomorrow I'm going to the beach. |
| Spain | none |
| Trick | A sounds like 'ah!': you shout 'ah!' as you finally arrive at where you were going. |

Why it was flagged:

- One right answer: The hint 'direction, movement' also fits hacia (toward) and colloquial para ('voy para México'), whereas 'destination' points only to a. Suggested fix: hint: destination of movement

The reviewer's own translation: answer "to, at (preposition marking destination, direction, time, indirect object)"; example "Tomorrow I'm going to the beach.".

### estar-be-state · rank 8 · estar

Decide in [decisions/estar-be-state.txt](decisions/estar-be-state.txt)

| Field | Card |
|---|---|
| Prompt | to be |
| Hint | state, place |
| Answer | estar |
| Kind | content, verb |
| Grammar | yo estoy · tú estás · él está (irregular) |
| Example | ¿Dónde estás? Estoy muy cansado. / Where are you? I'm really tired. |
| Spain | none |
| Trick | ESTAR sounds like "a star": a star is always somewhere in the sky, shining bright or dim depending on its state. |

Why it was flagged:

- Example sentence: The example is two sentences, but the card format calls for one short sentence. Suggested fix: example.es: Estoy en casa y estoy muy cansado. | example.en: I'm at home and I'm really tired.

The reviewer's own translation: answer "to be (temporary states, conditions and location)"; example "Where are you? I'm very tired.".

### lo-the-thing · rank 11 · lo

Decide in [decisions/lo-the-thing.txt](decisions/lo-the-thing.txt)

| Field | Card |
|---|---|
| Prompt | [the] important thing is the family |
| Hint | before an adjective, no noun |
| Answer | lo |
| Kind | glue, determiner |
| Grammar | none |
| Example | Lo bueno es que llegamos temprano. / The good thing is that we arrived early. |
| Spain | none |
| Trick | LO sounds like low: the lowdown, the main thing, is what matters. |

Why it was flagged:

- Memory trick: The trick suggests lo means 'the main thing' or 'what matters', but lo only means 'the ... thing' and carries no sense of importance (lo malo is 'the bad thing'). Suggested fix: trick: LO sounds like low: lo bajo is 'the low part', so LO plus an adjective means 'the ... thing' or 'the ... part'.

The reviewer's own translation: answer "the (neuter article before an adjective: 'the ... thing / the ... part')"; example "The good thing is that we arrived early.".

### haber-have-auxiliary · rank 12 · haber

Decide in [decisions/haber-have-auxiliary.txt](decisions/haber-have-auxiliary.txt)

| Field | Card |
|---|---|
| Prompt | to have |
| Hint | helper verb, as in I have eaten; not tener |
| Answer | haber |
| Kind | content, verb |
| Grammar | yo he · tú has · él ha (irregular) |
| Example | ¿Ya has comido? / Have you eaten yet? |
| Spain | none |
| Trick | HABER sounds like have-er: it's the helper that turns eaten into have eaten. |

Why it was flagged:

- Latin American usage: For 'Have you eaten yet?' Latin American speakers overwhelmingly say '¿Ya comiste?' (preterite); '¿Ya has comido?' sounds Peninsular, so the example teaches a less natural Latin American usage. Suggested fix: example.es: Nunca he estado en México. | example.en: I've never been to Mexico.

The reviewer's own translation: answer "to have (auxiliary verb forming perfect tenses); also there to be (hay)"; example "Have you eaten yet? / Have you already eaten?".

### haber-there-is · rank 12 · haber

Decide in [decisions/haber-there-is.txt](decisions/haber-there-is.txt)

| Field | Card |
|---|---|
| Prompt | there to be |
| Hint | as in there is, there are (hay); not estar |
| Answer | haber |
| Kind | content, verb |
| Grammar | yo he · tú has · él hay (irregular) |
| Example | Hay un perro en la casa. / There is a dog in the house. |
| Spain | none |
| Trick | HAY sounds like eye: open your eye and see what there is. |

Why it was flagged:

- Grammar: The él present form of haber is ha (él ha comido); hay is the separate impersonal form, so listing él: hay teaches a wrong form. Suggested fix: grammar.present.el: ha

The reviewer's own translation: answer "there to be (impersonal haber: hay = there is/there are); also the helper verb to have"; example "There is a dog in the house.".

## Decided

Nothing yet.
