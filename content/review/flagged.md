# Flagged cards

The review pass flagged 53 cards: 38 waiting for you, 15 decided. This file is rewritten by `npm run review` and `npm run deck`; do not edit it.

**To decide on a card**, open its file in `content/review/decisions/` (linked under each card), change `decision: pending` to `decision: approve` or `decision: reject`, and correct any card line first if it needs it. Then run `npm run deck`, which puts approved cards in the deck and rewrites this list.

## Waiting for you

### un-a · rank 6 · un

Decide in [decisions/un-a.txt](decisions/un-a.txt)

| Field | Card |
|---|---|
| Prompt | I want [a] book |
| Hint | masculine form |
| Answer | un |
| Kind | glue, determiner |
| Grammar | none |
| Example | Estoy en un hotel muy bueno. / I'm at a very good hotel. |
| Spain | none |
| Trick | UN sounds like the start of "an": just drop the a and you have it. |

Why it was flagged:

- Memory trick: The trick says un sounds like the start of English "an", but un is pronounced "oon", and dropping the a from "an" leaves "n", not un, so it teaches the wrong sound. Suggested fix: trick: UN sounds like "oon", close to "one": a book is just one book.

Reviewer's note (not a reason to flag): The hint "masculine form" isn't strictly needed, because libro is masculine and that already makes un the only answer, but it does no harm.

The reviewer's own translation: answer "a, an (masculine singular indefinite article)"; example "I'm in a very good hotel.".

### si-yes · rank 32 · sí

Decide in [decisions/si-yes.txt](decisions/si-yes.txt)

| Field | Card |
|---|---|
| Prompt | yes |
| Hint | none |
| Answer | sí |
| Kind | content, adverb |
| Grammar | none |
| Example | ¿Chocolate? ¡Sí, sí! / Chocolate? Yes, yes! |
| Spain | none |
| Trick | SÍ sounds like see: when you see what someone means, you nod and say yes. |

Why it was flagged:

- Example sentence: The example sentence has no conjugated verb. Suggested fix: example.es: ¿Quieres chocolate? ¡Sí, por favor! / example.en: Do you want chocolate? Yes, please!

Reviewer's note (not a reason to flag): The accent matters: sí means yes, but si without the accent means if, so the trick could point that out.

The reviewer's own translation: answer "yes"; example "Chocolate? Yes, yes!".

### gracias-thank-you · rank 75 · gracias

Decide in [decisions/gracias-thank-you.txt](decisions/gracias-thank-you.txt)

| Field | Card |
|---|---|
| Prompt | thank you |
| Hint | none |
| Answer | gracias |
| Kind | content, other |
| Grammar | none |
| Example | No, gracias. Yo insisto. / No, thank you. I insist. |
| Spain | none |
| Trick | GRACIAS sounds like gracious: a gracious person always says thank you. |

Why it was flagged:

- Example sentence: Turning something down and then saying 'I insist' don't fit together, and the explicit 'yo' in 'Yo insisto' sounds stilted. Suggested fix: example.es: Gracias por tu ayuda. / example.en: Thanks for your help.

The reviewer's own translation: answer "thanks / thank you (interjection)"; example "No, thank you. I insist.".

### hola-hello · rank 88 · hola

Decide in [decisions/hola-hello.txt](decisions/hola-hello.txt)

| Field | Card |
|---|---|
| Prompt | hello |
| Hint | none |
| Answer | hola |
| Kind | content, other |
| Grammar | none |
| Example | ¡Hola, Ana! Sí, yo insisto. / Hello, Ana! Yes, I insist. |
| Spain | none |
| Trick | HOLA sounds like "hello" with an O and an A: you holler hola to say hello. |

Why it was flagged:

- Example sentence: The sentence is grammatical, but 'Yes, I insist' right after a greeting makes no sense on its own, and the stressed 'yo' sounds forced, so it is not a natural model of how hola is used. Suggested fix: example.es: ¡Hola, Ana! ¿Cómo estás? / example.en: Hello, Ana! How are you?

Reviewer's note (not a reason to flag): pos 'other' fits an interjection, and no hint is needed because hola is the clear everyday answer for 'hello'.

The reviewer's own translation: answer "hello, hi (greeting)"; example "Hi, Ana! Yes, I insist.".

### mejor-best · rank 100 · mejor

Decide in [decisions/mejor-best.txt](decisions/mejor-best.txt)

| Field | Card |
|---|---|
| Prompt | best |
| Hint | used with el or la |
| Answer | mejor |
| Kind | content, adjective |
| Grammar | feminine mejor |
| Example | Eres mi mejor amigo. / You're my best friend. |
| Spain | none |
| Trick | MEJOR sounds like "major": the major league is where the best players go. |

Why it was flagged:

- One right answer: The hint says 'best' is mejor used with el or la, but the card's own example uses it with the possessive mi and no article, so the hint misleads the learner. Suggested fix: hint: used after el, la or a possessive such as mi

Reviewer's note (not a reason to flag): Since "best" in English already rules out the separate "better" card, the hint is not strictly needed, but if it stays it should be accurate.

The reviewer's own translation: answer "better; (with an article or possessive) best"; example "You are my best friend.".

### padre-parents · rank 128 · padre

Decide in [decisions/padre-parents.txt](decisions/padre-parents.txt)

| Field | Card |
|---|---|
| Prompt | parents |
| Hint | none |
| Answer | los padres |
| Kind | content, noun |
| Grammar | masculine, los |
| Example | Mis padres viven en el campo. / My parents live in the countryside. |
| Spain | none |
| Trick | PADRES sounds like padres plural: more than one father figure at home means both your parents. |

Why it was flagged:

- One right answer: Without a hint, the informal los papás, which is very common in Latin America for parents, would also be a right answer. Suggested fix: hint: not the informal papás
- Memory trick: The trick is circular (padres sounds like padres) and calls a mother a father figure, so it gives no sound link to the meaning parents. Suggested fix: trick: PADRES starts with PA, like PArents, and your padres are your parents.

Reviewer's note (not a reason to flag): The plural answer is fine here because padres only means parents in the plural, but the editor should know it departs from the usual singular dictionary form.

The reviewer's own translation: answer "the parents (also: the fathers)"; example "My parents live in the countryside.".

### siempre-always · rank 129 · siempre

Decide in [decisions/siempre-always.txt](decisions/siempre-always.txt)

| Field | Card |
|---|---|
| Prompt | always |
| Hint | none |
| Answer | siempre |
| Kind | content, adverb |
| Grammar | none |
| Example | Siempre llegas tarde a clase. / You always arrive late to class. |
| Spain | none |
| Trick | SIEMPRE sounds like see 'em pray: whenever you visit Grandma, you always see 'em pray. |

Why it was flagged:

- Example uses words not met yet: The example uses words not met before this card: llegas, tarde, clase. In the frequency phase it may use at most two words not met yet. Suggested fix: npm run draft -- --examples --ids siempre-always

The reviewer's own translation: answer "always"; example "You always arrive late to class.".

### entender-understand · rank 141 · entender

Decide in [decisions/entender-understand.txt](decisions/entender-understand.txt)

| Field | Card |
|---|---|
| Prompt | to understand |
| Hint | none |
| Answer | entender |
| Kind | content, verb |
| Grammar | yo entiendo · tú entiendes · él entiende (irregular) |
| Example | Ana, no entiendo nada. / Ana, I don't understand anything. |
| Spain | none |
| Trick | ENTENDER sounds like "intend her": to understand what she intends, you have to listen to her. |

Why it was flagged:

- One right answer: With no hint, "to understand" also has comprender as a common, correct answer, so a learner who recalls comprender would be marked wrong. Suggested fix: hint: the everyday word, as in "I don't get it" (not comprender)

Reviewer's note (not a reason to flag): The e→ie stem change (entiendo, entiendes, entiende) correctly makes the irregular flag true.

The reviewer's own translation: answer "to understand"; example "Ana, I don't understand anything.".

### alli-there · rank 178 · allí

Decide in [decisions/alli-there.txt](decisions/alli-there.txt)

| Field | Card |
|---|---|
| Prompt | there |
| Hint | a specific place far from both of us, not ahí or allá |
| Answer | allí |
| Kind | content, adverb |
| Grammar | none |
| Example | Mi abuela vive allí, en esa casa azul. / My grandma lives there, in that blue house. |
| Spain | none |
| Trick | ALLÍ sounds like "ally": your ally is waiting over there, far away. |

Why it was flagged:

- Example sentence: The card teaches allí as far from both of us, but the example pairs it with esa, the demonstrative for things near the listener (it goes with ahí), so the sentence contradicts the hint a learner has just memorized. Suggested fix: example.es: Mi abuela vive allí, en aquella casa azul. example.en: My grandma lives there, in that blue house over there.

Reviewer's note (not a reason to flag): In much of Latin America, allá is used more than allí in casual speech, but allí is still common and the hint correctly picks it out.

The reviewer's own translation: answer "there (at that place, away from both speaker and listener)"; example "My grandmother lives there, in that blue house.".

### mal-badly · rank 204 · mal

Decide in [decisions/mal-badly.txt](decisions/mal-badly.txt)

| Field | Card |
|---|---|
| Prompt | badly |
| Hint | none |
| Answer | mal |
| Kind | content, adverb |
| Grammar | none |
| Example | Él está muy mal. / He's doing very badly. |
| Spain | none |
| Trick | MAL as in malfunction: a machine that malfunctions is working badly. |

Why it was flagged:

- Example sentence: With estar, mal describes a state (usually unwell, ill or in a bad way), not how someone does something, so the sentence doesn't teach the meaning on the card, and the English 'doing very badly' is a loose and ambiguous translation. Suggested fix: example.es: Canto muy mal. / example.en: I sing very badly.

Reviewer's note (not a reason to flag): Malamente also means badly, but it is rare and informal, so mal is clearly the expected answer without a hint.

The reviewer's own translation: answer "mal (adverb) = badly, poorly; with estar: unwell, in a bad way"; example "He is very unwell / He's in a really bad way.".

### pequeno-small · rank 205 · pequeño

Decide in [decisions/pequeno-small.txt](decisions/pequeno-small.txt)

| Field | Card |
|---|---|
| Prompt | small |
| Hint | none |
| Answer | pequeño |
| Kind | content, adjective |
| Grammar | feminine pequeña |
| Example | Mi hija es muy pequeña. / My daughter is very small. |
| Spain | none |
| Trick | PEQUEÑO sounds like peck-a-new: a tiny chick can only peck a new, small seed. |

Why it was flagged:

- Example sentence: Said of a daughter, pequeña most naturally means young rather than physically small, so the example doesn't clearly show the size meaning the learner is memorizing. Suggested fix: example.es: Mi casa es muy pequeña. example.en: My house is very small.

Reviewer's note (not a reason to flag): In much of Latin America chico (and chiquito) also commonly means small, but pequeño is the standard answer a fluent speaker would give for "small", so no hint is strictly required.

The reviewer's own translation: answer "small, little (adjective)"; example "My daughter is very little (most naturally: very young).".

### cuenta-bill · rank 238 · cuenta

Decide in [decisions/cuenta-bill.txt](decisions/cuenta-bill.txt)

| Field | Card |
|---|---|
| Prompt | bill |
| Hint | at a restaurant |
| Answer | la cuenta |
| Kind | content, noun |
| Grammar | feminine, la |
| Example | La cuenta, por favor. / The check, please. |
| Spain | none |
| Trick | CUENTA sounds like count-a: the waiter counts up everything you ate on the bill. |

Why it was flagged:

- Example sentence: The example sentence has no conjugated verb, which the card format requires. Suggested fix: example.es: Ya pedí la cuenta. example.en: I already asked for the bill.

Reviewer's note (not a reason to flag): The hint "at a restaurant" separates this card from the "account" card and rules out la factura, which is used for utility bills and invoices.

The reviewer's own translation: answer "the bill, the check (at a restaurant); also account, count"; example "The bill, please.".

### adios-goodbye · rank 274 · adiós

Decide in [decisions/adios-goodbye.txt](decisions/adios-goodbye.txt)

| Field | Card |
|---|---|
| Prompt | goodbye |
| Hint | the standard word, not chao |
| Answer | adiós |
| Kind | content, other |
| Grammar | none |
| Example | Gracias, yo no insisto. ¡Adiós, Ana! / Thanks, I won't insist. Goodbye, Ana! |
| Spain | none |
| Trick | ADIÓS sounds like "a dose": take a dose of courage before saying goodbye. |

Why it was flagged:

- Example sentence: The sentence sounds unnatural: the stressed 'yo' in 'yo no insisto' has no reason to be there, and thanking someone and then saying you won't insist is not a normal way to say goodbye. Suggested fix: example.es: Ya me voy a casa. ¡Adiós, Ana! / example.en: I'm going home now. Goodbye, Ana!

Reviewer's note (not a reason to flag): The hint rules out chao, and hasta luego is a phrase, not a single word, so the hint is fine.

The reviewer's own translation: answer "goodbye, bye (interjection)"; example "Thanks, I don't insist. Goodbye, Ana!".

### cerca-fence · rank 339 · cerca

Decide in [decisions/cerca-fence.txt](decisions/cerca-fence.txt)

| Field | Card |
|---|---|
| Prompt | fence |
| Hint | around a yard or field |
| Answer | la cerca |
| Kind | content, noun |
| Grammar | feminine, la |
| Example | El perro saltó la cerca. / The dog jumped the fence. |
| Spain | la valla |
| Trick | CERCA sounds like circle: a fence circles the yard. |

Why it was flagged:

- One right answer: For 'fence' around a yard or field, other common Latin American words are just as right (el cerco, la reja, la valla, el alambrado), and the hint does not rule them out. Suggested fix: hint: around a yard or field; the same word as 'near'

Reviewer's note (not a reason to flag): The word's rank 339 comes almost entirely from the adverb 'near', so the noun 'fence' is a much less frequent second meaning, and the editor may want to decide whether it deserves its own card this early.

The reviewer's own translation: answer "la cerca: fence (a barrier around a piece of land), a feminine noun; the same spelling is also the adverb 'near'"; example "The dog jumped (over) the fence.".

### calle-street · rank 503 · calle

Decide in [decisions/calle-street.txt](decisions/calle-street.txt)

| Field | Card |
|---|---|
| Prompt | street |
| Hint | none |
| Answer | la calle |
| Kind | content, noun |
| Grammar | feminine, la |
| Example | Mi casa está en esta calle. / My house is on this street. |
| Spain | none |
| Trick | CALLE sounds like "kai-yay": you yell "Hey!" to a friend across the street. |

Why it was flagged:

- Memory trick: The respelling "kai-yay" teaches the wrong pronunciation: calle is said KAH-yeh, with a plain "ka" rather than "kai" and a short final e rather than "ay". Suggested fix: trick: CALLE sounds like "KAH-yeh": you yell "Ka-yeh!" to a friend across the street.

The reviewer's own translation: answer "the street"; example "My house is on this street.".

### perdon-sorry · rank 520 · perdón

Decide in [decisions/perdon-sorry.txt](decisions/perdon-sorry.txt)

| Field | Card |
|---|---|
| Prompt | sorry |
| Hint | one-word apology, not lo siento or disculpa |
| Answer | perdón |
| Kind | content, other |
| Grammar | none |
| Example | ¡Perdón! No te vi. / Sorry! I didn't see you. |
| Spain | none |
| Trick | PERDÓN sounds like pardon: you say pardon when you bump into someone. |

Why it was flagged:

- One right answer: The hint rules out disculpa but not the other common one-word verb apologies perdona, perdone and disculpe, so a learner could reasonably give one of those. Suggested fix: hint: one-word apology, not a verb form like perdona or disculpa, and not lo siento

Reviewer's note (not a reason to flag): The interjection "sorry" is clearly separate from the other card's noun "forgiveness" (el perdón), so the two cards don't clash.

The reviewer's own translation: answer "sorry; excuse me; pardon (interjection)"; example "Sorry! I didn't see you.".

### estar-form-el · rank 8 · estar

Decide in [decisions/estar-form-el.txt](decisions/estar-form-el.txt)

| Field | Card |
|---|---|
| Prompt | he / she is |
| Hint | state, place |
| Answer | está |
| Kind | form, verb |
| Grammar | yo estoy · tú estás · él está (irregular) |
| Example | Hola, Ana. ¿Cómo está él? / Hi, Ana. How is he? |
| Spain | none |
| Trick | none |

Why it was flagged:

- Example sentence: Greeting Ana and then asking about an unnamed él sounds unnatural because the pronoun has nothing to refer to, so it reads like a drill sentence rather than something a person would say. Suggested fix: example.es: Hola, Ana. ¿Cómo está tu hermano? / example.en: Hi, Ana. How is your brother?

Reviewer's note (not a reason to flag): The hint "state, place" is needed here because it rules out "es" from ser, and está is also the formal usted form, which the him/her prompt correctly leaves aside.

The reviewer's own translation: answer "está = he / she is (temporary state or location, from estar); also you are (formal, usted)"; example "Hi, Ana. How is he?".

### haber-form-hay · rank 12 · haber

Decide in [decisions/haber-form-hay.txt](decisions/haber-form-hay.txt)

| Field | Card |
|---|---|
| Prompt | there is / there are |
| Hint | something exists; not estar |
| Answer | hay |
| Kind | form, verb |
| Grammar | yo he · tú has · él hay (irregular) |
| Example | Hay pan en la mesa. / There's bread on the table. |
| Spain | none |
| Trick | Hay sounds like eye: use your eye to see what there is. |

Why it was flagged:

- Example uses words not met yet: The example uses words not met before this card: pan, en, mesa. In the frequency phase it may use at most two words not met yet. Suggested fix: npm run draft -- --examples --ids haber-form-hay

Reviewer's note (not a reason to flag): The strip puts hay in the él slot as the format requires, but the auxiliary él form is ha (él ha comido), so it may be worth showing that somewhere so learners don't say "él hay".

The reviewer's own translation: answer "there is / there are (impersonal form of haber)"; example "There is bread on the table.".

### ir-form-el · rank 15 · ir

Decide in [decisions/ir-form-el.txt](decisions/ir-form-el.txt)

| Field | Card |
|---|---|
| Prompt | he / she goes |
| Hint | none |
| Answer | va |
| Kind | form, verb |
| Grammar | yo voy · tú vas · él va (irregular) |
| Example | Ella va al trabajo. / She goes to work. |
| Spain | none |
| Trick | Va sounds like 'vroom': he goes, vroom, va! |

Why it was flagged:

- Example uses words not met yet: The example uses words not met before this card: Ella, al, trabajo. In the frequency phase it may use at most two words not met yet. Suggested fix: npm run draft -- --examples --ids ir-form-el

Reviewer's note (not a reason to flag): Va is also the usted form, so the learner may want to be told that "you go" in a formal context gives the same answer.

The reviewer's own translation: answer "he / she / it goes (also: you go, formal usted)"; example "She goes to work.".

### hacer-form-yo · rank 17 · hacer

Decide in [decisions/hacer-form-yo.txt](decisions/hacer-form-yo.txt)

| Field | Card |
|---|---|
| Prompt | I do |
| Hint | none |
| Answer | hago |
| Kind | form, verb |
| Grammar | yo hago · tú haces · él hace (irregular) |
| Example | Hago la tarea en casa. / I do my homework at home. |
| Spain | none |
| Trick | Hago sounds like 'ah, go!': I do it, here I go. |

Why it was flagged:

- Example uses words not met yet: The example uses words not met before this card: tarea, en, casa. In the frequency phase it may use at most two words not met yet. Suggested fix: npm run draft -- --examples --ids hacer-form-yo

Reviewer's note (not a reason to flag): Spain usually says "los deberes" where Latin America says "la tarea", but that is about the example sentence, not the card's word, so spain is correctly null.

The reviewer's own translation: answer "I do / I make"; example "I do (the) homework at home.".

### hacer-form-el · rank 17 · hacer

Decide in [decisions/hacer-form-el.txt](decisions/hacer-form-el.txt)

| Field | Card |
|---|---|
| Prompt | he / she does |
| Hint | none |
| Answer | hace |
| Kind | form, verb |
| Grammar | yo hago · tú haces · él hace (irregular) |
| Example | Ella hace ejercicio todos los días. / She exercises every day. |
| Spain | none |
| Trick | none |

Why it was flagged:

- Example uses words not met yet: The example uses words not met before this card: Ella, ejercicio, todos, días. In the frequency phase it may use at most two words not met yet. Suggested fix: npm run draft -- --examples --ids hacer-form-el

The reviewer's own translation: answer "he / she does, makes (hacer, third person singular present)"; example "She does exercise every day. (She exercises every day.)".

### poder-form-tu · rank 19 · poder

Decide in [decisions/poder-form-tu.txt](decisions/poder-form-tu.txt)

| Field | Card |
|---|---|
| Prompt | you can |
| Hint | are able to, informal |
| Answer | puedes |
| Kind | form, verb |
| Grammar | yo puedo · tú puedes · él puede (irregular) |
| Example | ¿Puedes hablar inglés, por favor? / Can you speak English, please? |
| Spain | none |
| Trick | none |

Why it was flagged:

- Example sentence: When you ask someone to switch to English, Spanish speakers normally say "hablar en inglés"; "hablar inglés" asks whether they know the language, so it sounds odd next to "por favor" and teaches a pattern learners will misuse. Suggested fix: example.es: ¿Puedes hablar más despacio, por favor? / example.en: Can you speak more slowly, please?

Reviewer's note (not a reason to flag): The hint "are able to, informal" is right: "informal" rules out usted's form puede, and "are able to" separates this card from sabes.

The reviewer's own translation: answer "you (informal) can / are able to"; example "Can you speak English, please?".

### poder-form-el · rank 19 · poder

Decide in [decisions/poder-form-el.txt](decisions/poder-form-el.txt)

| Field | Card |
|---|---|
| Prompt | he / she can |
| Hint | is able to |
| Answer | puede |
| Kind | form, verb |
| Grammar | yo puedo · tú puedes · él puede (irregular) |
| Example | Mi hermana puede hablar inglés muy bien. / My sister can speak English very well. |
| Spain | none |
| Trick | Puede sounds like pway-day, close to payday: on payday, he can buy anything. |

Why it was flagged:

- Example sentence: For a learned skill like speaking a language well, Spanish normally uses saber (sabe hablar) or just habla, so puede hablar inglés muy bien teaches the classic can = poder mistake. Suggested fix: example.es: Mi hermana puede venir a la fiesta mañana. / example.en: My sister can come to the party tomorrow.

Reviewer's note (not a reason to flag): The form puede also covers usted, which the prompt he / she leaves out on purpose, and that is fine.

The reviewer's own translation: answer "he / she can (is able to); also usted can"; example "My sister can speak English very well.".

### phrase-yes-please · rank 105 · me-and-you

Decide in [decisions/phrase-yes-please.txt](decisions/phrase-yes-please.txt)

| Field | Card |
|---|---|
| Prompt | Yes, please. |
| Hint | none |
| Answer | Sí, por favor. |
| Kind | phrase, phrase |
| Grammar | none |
| Example | Sí, por favor, yo insisto. / Yes, please, I insist. |
| Spain | none |
| Trick | none |

Why it was flagged:

- Example sentence: The example sounds unnatural: the subject pronoun yo adds an emphasis nobody needs here, and insisting fits awkwardly with accepting an offer, so it is a poor model of how the phrase is really used. Suggested fix: example.es: Sí, por favor, quiero un café. / example.en: Yes, please, I want a coffee.

Reviewer's note (not a reason to flag): Spain also says Sí, por favor, so a null spain field is right.

The reviewer's own translation: answer "Yes, please."; example "Yes, please, I insist.".

### phrase-no-thank-you · rank 75 · me-and-you

Decide in [decisions/phrase-no-thank-you.txt](decisions/phrase-no-thank-you.txt)

| Field | Card |
|---|---|
| Prompt | No, thank you. |
| Hint | none |
| Answer | No, gracias. |
| Kind | phrase, phrase |
| Grammar | none |
| Example | ¿Chocolate? No, gracias. / Chocolate? No, thank you. |
| Spain | none |
| Trick | none |

Why it was flagged:

- Example sentence: The example sentence has no conjugated verb. Suggested fix: example.es: ¿Quieres chocolate? No, gracias. / example.en: Do you want chocolate? No, thank you.

The reviewer's own translation: answer "No, thank you. / No, thanks."; example "Chocolate? No, thank you.".

### phrase-whats-your-name · rank 82 · who-i-am

Decide in [decisions/phrase-whats-your-name.txt](decisions/phrase-whats-your-name.txt)

| Field | Card |
|---|---|
| Prompt | What's your name? |
| Hint | informal |
| Answer | ¿Cómo te llamas? |
| Kind | phrase, phrase |
| Grammar | none |
| Example | Hola, ¿cómo te llamas? —Me llamo Ana. / Hi, what's your name? —My name is Ana. |
| Spain | none |
| Trick | It literally means "how do you call yourself?", where cómo is "how" and te llamas is "you call yourself". |

Why it was flagged:

- One right answer: The hint 'informal' still allows '¿Cuál es tu nombre?', a correct and fairly common informal Latin American way to ask someone's name. Suggested fix: hint: informal; the everyday way, literally "how do you call yourself?"

Reviewer's note (not a reason to flag): The new hint matches the wording of this unit's "My name is..." card, so the two cards point to the same llamarse pattern.

The reviewer's own translation: answer "How do you (informal) call yourself? = What's your name? (informal)"; example "Hi, what's your name? —My name is Ana.".

### phrase-nice-to-meet-you · rank 625 · who-i-am

Decide in [decisions/phrase-nice-to-meet-you.txt](decisions/phrase-nice-to-meet-you.txt)

| Field | Card |
|---|---|
| Prompt | Nice to meet you. |
| Hint | The two-word phrase that anyone can say, man or woman. |
| Answer | Mucho gusto. |
| Kind | phrase, phrase |
| Grammar | none |
| Example | Hola, me llamo Ana. Mucho gusto. / Hi, my name is Ana. Nice to meet you. |
| Spain | Spain more often says encantado, or encantada if you are a woman. |
| Trick | Gusto means pleasure, like doing something with gusto, so mucho gusto is literally much pleasure. |

Why it was flagged:

- One right answer: The hint asks for a two-word phrase that anyone can say, man or woman, but 'Un placer' also fits that and is common in Latin America for 'Nice to meet you'. Suggested fix: hint: The everyday two-word phrase, literally "much pleasure", that anyone can say, man or woman.

Reviewer's note (not a reason to flag): The example sentence almost repeats the unit's phrase card "My name is Ana. Nice to meet you.", so the editor may want a different example, such as "Mucho gusto, Pedro. Yo soy Luis."

The reviewer's own translation: answer "Mucho gusto. = Nice to meet you (literally 'much pleasure'), said on being introduced."; example "Hello, my name is Ana. Nice to meet you.".

### phrase-youre-welcome · rank 66 · who-i-am

Decide in [decisions/phrase-youre-welcome.txt](decisions/phrase-youre-welcome.txt)

| Field | Card |
|---|---|
| Prompt | You're welcome. |
| Hint | none |
| Answer | De nada. |
| Kind | phrase, phrase |
| Grammar | none |
| Example | —Gracias, Ana. —¡De nada! / Thanks, Ana. —You're welcome! |
| Spain | none |
| Trick | De nada literally means "of nothing", like saying "it was nothing". |

Why it was flagged:

- Example sentence: The example sentence has no conjugated verb, and its English drops the opening dash that the Spanish dialogue has. Suggested fix: example.es: —Gracias, Ana. Eres muy amable. —¡De nada!; example.en: —Thanks, Ana. You're very kind. —You're welcome!

Reviewer's note (not a reason to flag): Con gusto and No hay de qué are also heard in Latin America, but De nada is clearly the standard beginner answer, so the card needs no hint.

The reviewer's own translation: answer "Of nothing / It was nothing, the standard reply to thanks: You're welcome."; example "Thanks, Ana. You're welcome!".

### phrase-my-name-is-ana · rank 625 · who-i-am

Decide in [decisions/phrase-my-name-is-ana.txt](decisions/phrase-my-name-is-ana.txt)

| Field | Card |
|---|---|
| Prompt | My name is Ana. Nice to meet you. |
| Hint | none |
| Answer | Me llamo Ana. Mucho gusto. |
| Kind | phrase, phrase |
| Grammar | none |
| Example | —Me llamo Ana. Mucho gusto. —Mucho gusto, Ana. / My name is Ana. Nice to meet you. Nice to meet you, Ana. |
| Spain | Me llamo Ana. Encantada. (Encantado or encantada is more common than mucho gusto in Spain.) |
| Trick | none |

Why it was flagged:

- One right answer: With no hint, "Mi nombre es Ana. Encantada." (or "Me llamo Ana. Encantada.") is just as correct for this prompt, but the unit's own sibling cards use hints to rule out exactly those alternatives. Suggested fix: hint: The everyday "I call myself" way, then the two-word phrase anyone can say, man or woman.

Reviewer's note (not a reason to flag): This card mostly combines the unit's "My name is..." and "Nice to meet you." cards, and the spain field would be cleaner as just "Me llamo Ana. Encantada." with the explanation moved out of it.

The reviewer's own translation: answer "I call myself Ana (My name is Ana). Much pleasure (Nice to meet you)."; example "My name is Ana. Nice to meet you. Nice to meet you, Ana.".

### phrase-i-want-a-coffee · rank 532 · what-i-want-and-have

Decide in [decisions/phrase-i-want-a-coffee.txt](decisions/phrase-i-want-a-coffee.txt)

| Field | Card |
|---|---|
| Prompt | I want a coffee, please. |
| Hint | none |
| Answer | Quiero un café, por favor. |
| Kind | phrase, phrase |
| Grammar | none |
| Example | Buenos días. Quiero un café, por favor. ¡Gracias! / Good morning. I want a coffee, please. Thanks! |
| Spain | none |
| Trick | none |

Why it was flagged:

- Example sentence: The example is three separate utterances, not one short sentence, and thanking before getting the coffee is a little odd. Suggested fix: example.es: Buenos días, quiero un café, por favor. / example.en: Good morning, I want a coffee, please.

Reviewer's note (not a reason to flag): When ordering, Latin American speakers also often say "¿Me da un café, por favor?" (or "¿Me regala un café?" in Colombia), which could be a later card.

The reviewer's own translation: answer "I want a coffee, please."; example "Good morning. I want a coffee, please. Thanks!".

### phrase-can-you-repeat-that · rank 1006 · when-i-dont-understand

Decide in [decisions/phrase-can-you-repeat-that.txt](decisions/phrase-can-you-repeat-that.txt)

| Field | Card |
|---|---|
| Prompt | Can you repeat that? |
| Hint | informal |
| Answer | ¿Puedes repetir? |
| Kind | phrase, phrase |
| Grammar | none |
| Example | No entiendo. ¿Puedes repetir, por favor? / I don't understand. Can you repeat that, please? |
| Spain | none |
| Trick | none |

Why it was flagged:

- Words outside the top 1,000: The phrase uses repetir, not among the 1,000 most common words.

Reviewer's note (not a reason to flag): The hint "informal" correctly rules out usted's "¿Puede repetir?", and learners may say "¿Puedes repetirlo?", which is an equally natural answer worth accepting when they rate their own recall.

The reviewer's own translation: answer "Can you repeat? (informal, i.e. Can you say that again?)"; example "I don't understand. Can you repeat, please?".

### phrase-do-you-speak-english · rank 907 · when-i-dont-understand

Decide in [decisions/phrase-do-you-speak-english.txt](decisions/phrase-do-you-speak-english.txt)

| Field | Card |
|---|---|
| Prompt | Do you speak English? |
| Hint | informal |
| Answer | ¿Hablas inglés? |
| Kind | phrase, phrase |
| Grammar | none |
| Example | Lo siento, ¿hablas inglés? No entiendo. / I'm sorry, do you speak English? I don't understand. |
| Spain | none |
| Trick | none |

Why it was flagged:

- Example sentence: The example uses 'Lo siento' to get someone's attention before a question, but Spanish speakers say 'Perdón' or 'Disculpa' for that, and the unit's own 'I'm sorry' card says lo siento is not 'excuse me'. Suggested fix: example.es: Perdón, no entiendo. ¿Hablas inglés? / example.en: Sorry, I don't understand. Do you speak English?

Reviewer's note (not a reason to flag): The informal hint is needed because it rules out the usted form '¿Habla inglés?', which is common when talking to strangers.

The reviewer's own translation: answer "Do you speak English? (informal tú)"; example "I'm sorry, do you speak English? I don't understand.".

### phrase-can-you-help-me · rank 144 · can-you-help-me

Decide in [decisions/phrase-can-you-help-me.txt](decisions/phrase-can-you-help-me.txt)

| Field | Card |
|---|---|
| Prompt | Can you help me, please? |
| Hint | Formal: polite, to a stranger (usted) |
| Answer | ¿Me puede ayudar, por favor? |
| Kind | phrase, phrase |
| Grammar | none |
| Example | Perdón, ¿me puede ayudar, por favor? No entiendo. / Excuse me, can you help me, please? I don't understand. |
| Spain | none |
| Trick | none |

Why it was flagged:

- Latin American usage: The card uses the usted register (puede), but the app's Spanish must be in the informal tú register, with usted taught only as a word card of its own. Suggested fix: es: ¿Me puedes ayudar, por favor? | hint: Informal (tú) | example.es: Perdón, ¿me puedes ayudar, por favor? No entiendo.

Reviewer's note (not a reason to flag): With the formal hint, ¿Me podría ayudar, por favor? would also be a natural answer; the tú version has the same issue with ¿Me podrías ayudar?, so the editor could think about accepting the conditional form or making the hint rule it out.

The reviewer's own translation: answer "Can you (formal) help me, please?"; example "Sorry, can you help me, please? I don't understand.".

### phrase-excuse-me-polite · rank 305 · out-and-about

Decide in [decisions/phrase-excuse-me-polite.txt](decisions/phrase-excuse-me-polite.txt)

| Field | Card |
|---|---|
| Prompt | Excuse me. |
| Hint | formal, to get a stranger's attention |
| Answer | Disculpe. |
| Kind | phrase, phrase |
| Grammar | none |
| Example | Disculpe, ¿dónde está el baño? / Excuse me, where is the bathroom? |
| Spain | none |
| Trick | none |

Why it was flagged:

- One right answer: For "Excuse me" used to get a stranger's attention, Perdón, Perdone and Con permiso are also right, and the hint does not rule them out. Suggested fix: hint: informal (tú), to get someone's attention; the verb disculpar, not perdón
- Latin American usage: Disculpe is the usted command form, and the app teaches the tú register and uses usted only as a word in its own right, so this card teaches a conjugation the rest of the course avoids. Suggested fix: es: Disculpa.

Reviewer's note (not a reason to flag): Disculpe is a natural and polite way to address strangers in Latin America, so if the editor chooses to allow this one usted form, the card would only need a hint that rules out Perdón and Perdone.

The reviewer's own translation: answer "Excuse me (formal usted command of disculpar: pardon me / sorry, used to get attention or apologize)."; example "Excuse me, where is the bathroom?".

### phrase-i-love-you · rank 28 · people-i-love

Decide in [decisions/phrase-i-love-you.txt](decisions/phrase-i-love-you.txt)

| Field | Card |
|---|---|
| Prompt | I love you. |
| Hint | Everyday love for family, friends or partner, not the more intense te amo |
| Answer | Te quiero. |
| Kind | phrase, phrase |
| Grammar | none |
| Example | Te quiero mucho, mi amor. / I love you so much, my love. |
| Spain | none |
| Trick | none |

Why it was flagged:

- Example uses words not met yet: The example uses words not met before this card: mi, amor, mucho. In the frequency phase it may use at most two words not met yet. Suggested fix: npm run draft -- --examples --ids phrase-i-love-you

Reviewer's note (not a reason to flag): The hint is needed and correctly rules out te amo; the example translation's "so much" is fine, though "a lot" or "very much" is closer to mucho, since "so much" would be tanto.

The reviewer's own translation: answer "I love you (affectionate, everyday; also used to mean 'I care about you' with family and friends)."; example "I love you a lot, my love.".

### phrase-ill-call-you-tomorrow · rank 171 · people-i-love

Decide in [decisions/phrase-ill-call-you-tomorrow.txt](decisions/phrase-ill-call-you-tomorrow.txt)

| Field | Card |
|---|---|
| Prompt | I'll call you tomorrow. |
| Hint | informal |
| Answer | Te llamo mañana. |
| Kind | phrase, phrase |
| Grammar | none |
| Example | Ahora no puedo, pero te llamo mañana. / I can't right now, but I'll call you tomorrow. |
| Spain | none |
| Trick | none |

Why it was flagged:

- One right answer: The hint 'informal' rules out 'Lo/La llamo mañana', but 'Te voy a llamar mañana' (and less often 'Te llamaré mañana') is an equally natural, very common Latin American answer to 'I'll call you tomorrow', and the hint doesn't rule these out. Suggested fix: hint: Informal, using the simple present (not voy a llamar or llamaré)

Reviewer's note (not a reason to flag): Using the present tense for a near-future promise is a useful pattern to teach, and the corrected hint makes that point clearly.

The reviewer's own translation: answer "I'll call you tomorrow (literally: I call you tomorrow)."; example "Not now I can't, but I'll call you tomorrow.".

### phrase-how-do-you-say · rank 67 · what-people-say

Decide in [decisions/phrase-how-do-you-say.txt](decisions/phrase-how-do-you-say.txt)

| Field | Card |
|---|---|
| Prompt | How do you say…? |
| Hint | Asking about a word, with "you" meaning people in general |
| Answer | ¿Cómo se dice…? |
| Kind | phrase, phrase |
| Grammar | none |
| Example | ¿Cómo se dice "thank you" en español? / How do you say "thank you" in Spanish? |
| Spain | none |
| Trick | none |

Why it was flagged:

- Example uses words not met yet: The example uses words not met before this card: español, thank, you. In the frequency phase it may use at most two words not met yet. Suggested fix: npm run draft -- --examples --ids phrase-how-do-you-say

Reviewer's note (not a reason to flag): The hint is useful because it rules out the literal ¿Cómo dices…? and points to the impersonal se, which is the standard way to ask this.

The reviewer's own translation: answer "How is ... said? / How do you say ...?"; example "How do you say "thank you" in Spanish?".

### phrase-i-think-thats-true · rank 89 · what-people-say

Decide in [decisions/phrase-i-think-thats-true.txt](decisions/phrase-i-think-thats-true.txt)

| Field | Card |
|---|---|
| Prompt | I think that's true. |
| Hint | Use creer, the everyday verb for an opinion. |
| Answer | Creo que es verdad. |
| Kind | phrase, phrase |
| Grammar | none |
| Example | Ella dice que es feliz. Creo que es verdad. / She says she's happy. I think that's true. |
| Spain | none |
| Trick | none |

Why it was flagged:

- One right answer: The hint rules out pensar but not "Creo que es cierto", which is just as common and natural for "that's true", so two answers would be right. Suggested fix: hint: Use creer, the everyday verb for an opinion, and the noun verdad for "true".

Reviewer's note (not a reason to flag): Leaving out eso is natural here, but a learner who answers \"Creo que eso es verdad\" is still essentially right, and the editor may want to accept that.

The reviewer's own translation: answer "I think (believe) it's true."; example "She says that she is happy. I think it's true.".

## Decided

- que-who-which (rank 3, que): approved. Flagged for one right answer.
- a-to (rank 7, a): approved. Flagged for one right answer.
- estar-be-state (rank 8, estar): approved. Flagged for example sentence.
- lo-the-thing (rank 11, lo): approved. Flagged for memory trick.
- haber-have-auxiliary (rank 12, haber): approved. Flagged for latin american usage.
- haber-there-is (rank 12, haber): approved. Flagged for grammar.
- ver-watch (rank 35, ver): approved. Flagged for one right answer.
- eso-that (rank 36, eso): approved. Flagged for one right answer.
- creer-think-opinion (rank 48, creer): approved. Flagged for one right answer.
- ahora-now (rank 52, ahora): approved. Flagged for memory trick.
- algo-somewhat (rank 57, algo): approved. Flagged for one right answer.
- senor-sir (rank 76, señor): approved. Flagged for latin american usage.
- hombre-man (rank 85, hombre): approved. Flagged for memory trick.
- entonces-so (rank 86, entonces): approved. Flagged for one right answer.
- volver-do-again (rank 90, volver): approved. Flagged for example sentence.
