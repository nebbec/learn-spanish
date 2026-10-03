# Flagged cards

The review pass flagged 20 cards: 17 waiting for you, 3 decided. This file is rewritten by `npm run review` and `npm run deck`; do not edit it.

**To decide on a card**, open its file in `content/review/decisions/` (linked under each card), change `decision: pending` to `decision: approve` or `decision: reject`, and correct any card line first if it needs it. Then run `npm run deck`, which puts approved cards in the deck and rewrites this list.

## Waiting for you

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

### ver-watch · rank 35 · ver

Decide in [decisions/ver-watch.txt](decisions/ver-watch.txt)

| Field | Card |
|---|---|
| Prompt | to watch |
| Hint | TV, a movie |
| Answer | ver |
| Kind | content, verb |
| Grammar | yo veo · tú ves · él ve (irregular) |
| Example | ¿Vemos una película esta noche? / Should we watch a movie tonight? |
| Spain | none |
| Trick | VER sounds like "vary": you watch TV and vary the channel all night. |

Why it was flagged:

- One right answer: With only the hint "TV, a movie", mirar is also a right answer, since mirar la tele and mirar una película are common in much of Latin America, especially the Río de la Plata region. Suggested fix: hint: a movie, a show (same verb as "to see")

Reviewer's note (not a reason to flag): Ver is still the most common way to say watching a movie or TV across Latin America, so the card is worth keeping once the hint rules out mirar.

The reviewer's own translation: answer "to see; to watch (TV, a movie)"; example "Shall we watch a movie tonight?".

### eso-that · rank 36 · eso

Decide in [decisions/eso-that.txt](decisions/eso-that.txt)

| Field | Card |
|---|---|
| Prompt | [that] is not true |
| Hint | neuter pronoun for an idea or thing near you, not far away |
| Answer | eso |
| Kind | glue, pronoun |
| Grammar | none |
| Example | Eso no es verdad. / That's not true. |
| Spain | none |
| Trick | ESO sounds like 'so': 'So THAT is what you meant!' |

Why it was flagged:

- One right answer: The hint says 'near you', which a learner reads as near themselves (the speaker), and that is esto; eso actually points to something near the listener or an idea just mentioned, so the hint teaches the wrong distinction. Suggested fix: hint: neuter pronoun for something just said or near the person you're talking to, not far from both of you

Reviewer's note (not a reason to flag): The English 'that' already rules out esto, so the hint's real job is to rule out aquello and to explain what eso points to.

The reviewer's own translation: answer "that (neuter demonstrative pronoun, for something just said or near the listener)"; example "That is not true.".

### creer-think-opinion · rank 48 · creer

Decide in [decisions/creer-think-opinion.txt](decisions/creer-think-opinion.txt)

| Field | Card |
|---|---|
| Prompt | to think |
| Hint | have an opinion, as in I think so |
| Answer | creer |
| Kind | content, verb |
| Grammar | yo creo · tú crees · él cree (irregular) |
| Example | Creo que va a llover. / I think it's going to rain. |
| Spain | none |
| Trick | CREO sounds like "Cray-oh": you draw what you think with a crayon. |

Why it was flagged:

- One right answer: Pensar is also a common, correct answer for 'to think' meaning 'have an opinion' (pienso que sí, ¿qué piensas?), and the hint doesn't rule it out, so a learner could reasonably answer pensar. Suggested fix: hint: suppose something is so, as in creo que sí for I think so (not pensar)

Reviewer's note (not a reason to flag): Irregular: true is justified because the preterite has the y spelling (creyó, creyeron), even though the present is regular.

The reviewer's own translation: answer "to believe; to think (have an opinion, suppose)"; example "I think it's going to rain.".

### ahora-now · rank 52 · ahora

Decide in [decisions/ahora-now.txt](decisions/ahora-now.txt)

| Field | Card |
|---|---|
| Prompt | now |
| Hint | none |
| Answer | ahora |
| Kind | content, adverb |
| Grammar | none |
| Example | Ahora no puedo hablar, estoy ocupado. / I can't talk now, I'm busy. |
| Spain | none |
| Trick | AHORA sounds like "a whore-a"... better: like "a-HOUR-a": the hour that matters is the one happening now. |

Why it was flagged:

- Memory trick: The trick still contains a crude rejected pun and the drafting leftover '... better:', so the learner would see two tricks, one of them offensive. Suggested fix: trick: AHORA sounds like "a-HOUR-a": the hour that matters is the one happening now (and the Spanish word really does come from hora, hour).

Reviewer's note (not a reason to flag): Mexican speakers also often say ahorita, but ahora is the right neutral answer for this card.

The reviewer's own translation: answer "now (adverb)"; example "Now I can't talk, I'm busy.".

### algo-somewhat · rank 57 · algo

Decide in [decisions/algo-somewhat.txt](decisions/algo-somewhat.txt)

| Field | Card |
|---|---|
| Prompt | somewhat |
| Hint | one word, before an adjective; not un poco |
| Answer | algo |
| Kind | content, adverb |
| Grammar | none |
| Example | Estoy algo cansado hoy. / I'm somewhat tired today. |
| Spain | none |
| Trick | ALGO sounds like 'all go': I'm somewhat tired, but we all go anyway. |

Why it was flagged:

- One right answer: In Latin America, medio is also one common word that goes before an adjective and means 'somewhat' (estoy medio cansado), and the hint does not rule it out; 'not un poco' adds nothing because 'one word' already rules un poco out. Suggested fix: hint: one word, before an adjective; not medio

Reviewer's note (not a reason to flag): The adverb card is a good complement to the pronoun card ("I want [something] to eat"), and the two prompts do not overlap.

The reviewer's own translation: answer "algo (adverb) = somewhat, rather, a bit (before an adjective)"; example "I'm somewhat tired today.".

### gracias-thank-you · rank 75 · gracias

Decide in [decisions/gracias-thank-you.txt](decisions/gracias-thank-you.txt)

| Field | Card |
|---|---|
| Prompt | thank you |
| Hint | none |
| Answer | gracias |
| Kind | content, other |
| Grammar | none |
| Example | Muchas gracias por tu ayuda. / Thank you very much for your help. |
| Spain | none |
| Trick | GRACIAS sounds like gracious: a gracious person always says thank you. |

Why it was flagged:

- Example sentence: The sentence has no conjugated verb, and the rules say the example must conjugate one. Suggested fix: example.es: Muchas gracias, me ayudaste mucho. example.en: Thank you very much, you helped me a lot.

Reviewer's note (not a reason to flag): Gracias also means "thanks", so the learner could accept either English prompt, but both still lead to the same single Spanish answer.

The reviewer's own translation: answer "thank you, thanks"; example "Thank you very much for your help.".

### senor-sir · rank 76 · señor

Decide in [decisions/senor-sir.txt](decisions/senor-sir.txt)

| Field | Card |
|---|---|
| Prompt | sir, Mr. |
| Hint | polite title or word for a man; feminine señora |
| Answer | el señor |
| Kind | content, noun |
| Grammar | masculine, el |
| Example | Buenos días, señor. ¿Le puedo ayudar? / Good morning, sir. Can I help you? |
| Spain | none |
| Trick | SEÑOR sounds like senior: you call an older, respected man sir. |

Why it was flagged:

- Latin American usage: The example uses the usted register (¿Le puedo ayudar?), but the app's sentences must use tú, and usted may only appear as a word card of its own. Suggested fix: example.es: Buenos días, señor López. ¿Cómo está su familia? is still usted, so use instead: El señor López vive en mi calle. / example.en: Mr. López lives on my street.

Reviewer's note (not a reason to flag): The hint's 'feminine señora' rules out other answers like caballero and don, so the card has one right answer; the trick works because señor and senior share a Latin root.

The reviewer's own translation: answer "the gentleman, the man; sir (as a form of address); Mr. (as a title before a surname); also lord"; example "Good morning, sir. Can I help you?".

### hombre-man · rank 85 · hombre

Decide in [decisions/hombre-man.txt](decisions/hombre-man.txt)

| Field | Card |
|---|---|
| Prompt | man |
| Hint | none |
| Answer | el hombre |
| Kind | content, noun |
| Grammar | masculine, el |
| Example | Ese hombre es mi tío. / That man is my uncle. |
| Spain | none |
| Trick | HOMBRE sounds like "hombre-ombre", like a man's deep voice humming "hum-bray" as he walks into the room. |

Why it was flagged:

- Memory trick: The trick says hombre sounds like "hum-bray", which teaches a pronounced h, but the Spanish h is silent (OM-breh), and the "hombre-ombre" part means nothing. Suggested fix: trick: HOMBRE sounds like "OM-bray": picture a man chanting a deep "om" as he walks into the room (the h is silent).

Reviewer's note (not a reason to flag): Hombre is also very common in speech as an interjection (\"¡Hombre!\"), but this card rightly teaches the noun meaning.

The reviewer's own translation: answer "man (adult male person; also mankind)"; example "That man is my uncle.".

### entonces-so · rank 86 · entonces

Decide in [decisions/entonces-so.txt](decisions/entonces-so.txt)

| Field | Card |
|---|---|
| Prompt | so |
| Hint | one word, to draw a conclusion or move on, not tan |
| Answer | entonces |
| Kind | content, adverb |
| Grammar | none |
| Example | Entonces, ¿vienes o no? / So, are you coming or not? |
| Spain | none |
| Trick | ENTONCES sounds like "in tone, says": in a serious tone, he says, "So, what now?" |

Why it was flagged:

- One right answer: The hint rules out tan and multi-word options like así que, but pues is also one word that means 'so' when drawing a conclusion or moving on ('Pues, ¿vienes o no?'), and it is very common in Mexico and Colombia, so the prompt has two right answers. Suggested fix: hint: one word, to draw a conclusion or move on, not pues or tan

Reviewer's note (not a reason to flag): This card stays clearly separate from the word's other card, "then" (at that time).

The reviewer's own translation: answer "then, so (adverb: at that time; or, as a connector, in that case / so)"; example "So, are you coming or not?".

### volver-do-again · rank 90 · volver

Decide in [decisions/volver-do-again.txt](decisions/volver-do-again.txt)

| Field | Card |
|---|---|
| Prompt | to do again |
| Hint | followed by a + infinitive |
| Answer | volver |
| Kind | content, verb |
| Grammar | yo vuelvo · tú vuelves · él vuelve (irregular) |
| Example | ¿Vas a volver a llamarla? / Are you going to call her again? |
| Spain | none |
| Trick | VOLVER sounds like revolver: the cylinder keeps turning around, doing the same thing again and again. |

Why it was flagged:

- Example sentence: In the example, volver stays in the infinitive (only ir is conjugated), so the sentence does not conjugate the card's verb. Suggested fix: example.es: Mañana la vuelvo a llamar. / example.en: I'll call her again tomorrow.

Reviewer's note (not a reason to flag): The hint is needed and correctly rules out repetir and rehacer, and the revolver pun works because revolver and volver really are related.

The reviewer's own translation: answer "to return, to come back; with a + infinitive: to do (something) again"; example "Are you going to call her again?".

## Decided

- el-the (rank 1, el): approved. Flagged for one right answer.
- de-from (rank 2, de): approved. Flagged for one right answer.
- no-no-answer (rank 5, no): approved. Flagged for one right answer.
