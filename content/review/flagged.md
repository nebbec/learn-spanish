# Flagged cards

The review pass flagged 186 cards: 145 waiting for you, 41 decided. This file is rewritten by `npm run review` and `npm run deck`; do not edit it.

**To decide on a card**, open its file in `content/review/decisions/` (linked under each card), change `decision: pending` to `decision: approve` or `decision: reject`, and correct any card line first if it needs it. Then run `npm run deck`, which puts approved cards in the deck and rewrites this list.

## Waiting for you

### por-by · rank 14 · por

Decide in [decisions/por-by.txt](decisions/por-by.txt)

| Field | Card |
|---|---|
| Prompt | a book written [by] my mother |
| Hint | none |
| Answer | por |
| Kind | glue, preposition |
| Grammar | none |
| Example | La comida fue hecha por mi madre. / The food was made by my mother. |
| Spain | none |
| Trick | POR sounds like poor: a poem written by a poor poet. |

Why it was flagged:

- Example sentence: The full passive "La comida fue hecha por mi madre" sounds stiff for food in everyday speech, where people would say "La comida la hizo mi mamá"; a written work is a more natural place for the por agent. Suggested fix: example.es: Esta canción fue escrita por mi hermano. / example.en: This song was written by my brother.

Reviewer's note (not a reason to flag): The prompt clearly separates this card from the cause/exchange and through cards, because \"escrito\" makes por the only natural answer and rules out de.

The reviewer's own translation: answer "by (agent of a passive or participle), also for, through, because of"; example "The food was made by my mother.".

### ver-see · rank 35 · ver

Decide in [decisions/ver-see.txt](decisions/ver-see.txt)

| Field | Card |
|---|---|
| Prompt | to see |
| Hint | none |
| Answer | ver |
| Kind | content, verb |
| Grammar | yo veo · tú ves · él ve (irregular) |
| Example | Quiero ver a mi madre hoy. / I want to see my mother today. |
| Spain | none |
| Trick | VER sounds like "where": you ask where it is until you finally see it. |

Why it was flagged:

- Example sentence: The example uses ver only in the infinitive, and it means visiting someone rather than seeing with your eyes. Suggested fix: example.es: No veo bien sin mis lentes. / example.en: I can't see well without my glasses.

Reviewer's note (not a reason to flag): The trick's sound link is loose, because ver sounds more like "bear" than "where", but it says nothing false.

The reviewer's own translation: answer "to see (also: to watch)"; example "I want to see my mother today.".

### creer-think-opinion · rank 48 · creer

Decide in [decisions/creer-think-opinion.txt](decisions/creer-think-opinion.txt)

| Field | Card |
|---|---|
| Prompt | to think |
| Hint | have an opinion, as in I think so |
| Answer | creer |
| Kind | content, verb |
| Grammar | yo creo · tú crees · él cree (irregular) |
| Example | Creo que Ana está enferma. / I think Ana is sick. |
| Spain | none |
| Trick | CREO sounds like "Cray-oh": you draw what you think with a crayon. |

Why it was flagged:

- One right answer: The hint 'have an opinion' doesn't rule out pensar ('Pienso que es buena idea' is also a correct way to give an opinion), so a learner could fairly answer pensar. Suggested fix: hint: have an opinion, as in I think so = ___ que sí (not pensar; the same verb as to believe)

Reviewer's note (not a reason to flag): irregular: true is defensible because of the preterite creyó/creyeron and creíste, though some grammars call these spelling changes rather than true irregularities.

The reviewer's own translation: answer "creer: to believe; to think (have an opinion, suppose), as in creo que sí, I think so"; example "I think (that) Ana is sick.".

### ahora-now · rank 52 · ahora

Decide in [decisions/ahora-now.txt](decisions/ahora-now.txt)

| Field | Card |
|---|---|
| Prompt | now |
| Hint | none |
| Answer | ahora |
| Kind | content, adverb |
| Grammar | none |
| Example | Ahora no puedo hablar, estoy cansado. / I can't talk now, I'm tired. |
| Spain | none |
| Trick | AHORA sounds like "a whore-a"... better: like "a-HOUR-a": the hour that matters is the one happening now. |

Why it was flagged:

- Memory trick: The trick still contains a crude rejected draft ("a whore-a") and a self-correction ("better:") that learners would see. Suggested fix: trick: AHORA sounds like "a-HOUR-a": the hour that matters is the one happening now.

Reviewer's note (not a reason to flag): Ya can also mean "now" in some contexts, but ahora is clearly the standard answer for a bare "now", so no hint is needed.

The reviewer's own translation: answer "now (adverb)"; example "Right now I can't talk, I'm tired.".

### alguno-any · rank 92 · alguno

Decide in [decisions/alguno-any.txt](decisions/alguno-any.txt)

| Field | Card |
|---|---|
| Prompt | do you have [any] questions? |
| Hint | in a question, not cualquier |
| Answer | alguno |
| Kind | glue, determiner |
| Grammar | none |
| Example | ¿Tienes alguna pregunta? / Do you have any questions? |
| Spain | none |
| Trick | ALGUNO sounds like "Al, got one?": you ask Al if he has any. |

Why it was flagged:

- One right answer: The prompt's noun is questions, which is pregunta in Spanish, a feminine noun, so the right answer in this frame is alguna and not the card's alguno. Suggested fix: en: do [any] of you speak English?

Reviewer's note (not a reason to flag): If en changes to "do [any] of you speak English?", consider the matching example "¿Alguno de ustedes habla inglés?" / "Do any of you speak English?", which shows the exact form alguno.

The reviewer's own translation: answer "alguno = some, any (in questions); someone, one of them (as a pronoun)"; example "Do you have any question(s)?".

### tiempo-weather · rank 93 · tiempo

Decide in [decisions/tiempo-weather.txt](decisions/tiempo-weather.txt)

| Field | Card |
|---|---|
| Prompt | weather |
| Hint | today's conditions outside, not the climate |
| Answer | el tiempo |
| Kind | content, noun |
| Grammar | masculine, el |
| Example | Hoy hace buen tiempo. / The weather is nice today. |
| Spain | none |
| Trick | TIEMPO sounds like "temperature": the weather report gives the temperature. |

Why it was flagged:

- One right answer: In much of Latin America, especially Mexico, el clima is the everyday word for the weather, so a learner could answer el clima, and the hint's 'not the climate' doesn't rule that out because clima means weather there. Suggested fix: hint: the same word that also means time

Reviewer's note (not a reason to flag): Hace buen tiempo is understood everywhere, but many Latin American speakers would more naturally say hace buen clima, so the editor may want to mention el clima somewhere on the card.

The reviewer's own translation: answer "el tiempo: time; weather (the state of the atmosphere)"; example "Today the weather is good.".

### chico-boy · rank 94 · chico

Decide in [decisions/chico-boy.txt](decisions/chico-boy.txt)

| Field | Card |
|---|---|
| Prompt | boy |
| Hint | teen or young guy, not niño |
| Answer | el chico |
| Kind | content, noun |
| Grammar | masculine, el |
| Example | Ese chico es mi hermano. / That boy is my brother. |
| Spain | none |
| Trick | CHICO sounds like chick-o: the boy chasing chicks around the farm; a girl is a chica. |

Why it was flagged:

- One right answer: The hint rules out niño but not muchacho, which is a common Latin American word for a teen or young guy and would also be a right answer. Suggested fix: hint: teen or young guy, the everyday word, not niño or muchacho

Reviewer's note (not a reason to flag): In much of Latin America, chico is also a very common adjective meaning small, and this card does not teach that meaning.

The reviewer's own translation: answer "el chico = boy, young guy, kid (also used as an adjective meaning small)"; example "That boy is my brother.".

### llevar-spend-time · rank 96 · llevar

Decide in [decisions/llevar-spend-time.txt](decisions/llevar-spend-time.txt)

| Field | Card |
|---|---|
| Prompt | to have been (for a time) |
| Hint | llevo dos años aquí |
| Answer | llevar |
| Kind | content, verb |
| Grammar | yo llevo · tú llevas · él lleva |
| Example | Llevo dos horas esperando. / I've been waiting for two hours. |
| Spain | none |
| Trick | LLEVAR sounds like lever: you have carried the time on your back, lifting it like a lever. |

Why it was flagged:

- One right answer: The hint contains the answer itself (llevo), so the learner just copies it instead of recalling it; an English-only hint would let estar (he estado) or hacer (hace dos años que...) fit, so it has to name and exclude them. Suggested fix: hint: the verb that counts time, as in 'I've been here two years', not estar or hace

Reviewer's note (not a reason to flag): The hint now rules out the other two llevar cards (to take, to wear), since this prompt is about time, not carrying or clothing.

The reviewer's own translation: answer "llevar (with a length of time): to have been (doing something or somewhere) for that time; also to carry, to take, to wear"; example "I've been waiting for two hours.".

### tomar-take · rank 107 · tomar

Decide in [decisions/tomar-take.txt](decisions/tomar-take.txt)

| Field | Card |
|---|---|
| Prompt | to take |
| Hint | grab, take hold of, take a bus |
| Answer | tomar |
| Kind | content, verb |
| Grammar | yo tomo · tú tomas · él toma |
| Example | Toma mi mano. / Take my hand. |
| Spain | coger |
| Trick | TOMAR sounds like 'tomorrow': take what you want today, not tomorrow. |

Why it was flagged:

- One right answer: The hint leads with 'grab, take hold of', and for those words a Latin American speaker would usually answer agarrar, while a bare 'to take' could also be llevar. Suggested fix: hint: take a bus, take medicine (not carry somewhere)

Reviewer's note (not a reason to flag): You could switch the example to the transport meaning, such as "Tomo el autobús a las ocho." (I take the bus at eight.), so it matches the revised hint, though "Toma mi mano." is still correct.

The reviewer's own translation: answer "to take (a bus, medicine, a seat); to grab, take hold of; also to drink"; example "Take my hand.".

### tomar-drink · rank 107 · tomar

Decide in [decisions/tomar-drink.txt](decisions/tomar-drink.txt)

| Field | Card |
|---|---|
| Prompt | to drink |
| Hint | everyday word, have a drink |
| Answer | tomar |
| Kind | content, verb |
| Grammar | yo tomo · tú tomas · él toma |
| Example | ¿Quieres tomar un café? / Do you want to have a coffee? |
| Spain | none |
| Trick | TOMAR sounds like 'tomato': drink your tomato juice. |

Why it was flagged:

- Example sentence: The example uses tomar as an infinitive after quieres, but tomar itself should be conjugated. Suggested fix: example.es: ¿Tomas café en la mañana? / example.en: Do you drink coffee in the morning?

Reviewer's note (not a reason to flag): The hint "everyday word" is what rules out beber, which is the more formal or written word for "to drink". This matters because many learners will know beber first.

The reviewer's own translation: answer "tomar: to take; to drink, to have (a drink)"; example "Do you want to have a coffee?".

### quedar-stay · rank 117 · quedar

Decide in [decisions/quedar-stay.txt](decisions/quedar-stay.txt)

| Field | Card |
|---|---|
| Prompt | to stay |
| Hint | usually with se: quedarse |
| Answer | quedar |
| Kind | content, verb |
| Grammar | yo quedo · tú quedas · él queda |
| Example | Quédate conmigo esta noche. / Stay with me tonight. |
| Spain | none |
| Trick | QUEDAR sounds like 'K, stay there!': you tell your friend to stay put. |

Why it was flagged:

- Meaning: Plain quedar means to remain or be left (or to be located), while 'to stay' in the sense of not leaving is the pronominal quedarse, so es does not match the prompt. Suggested fix: es: quedarse
- One right answer: The hint gives the answer away by spelling out quedarse, and it contradicts es, which says quedar; 'to stay' already points to quedarse without a hint. Suggested fix: hint: null
- Grammar: For this meaning the dictionary form is quedarse, so the present forms need the reflexive pronoun. Suggested fix: es: quedarse; grammar.present: yo me quedo, tu te quedas, el se queda (irregular: false)

Reviewer's note (not a reason to flag): Once es is quedarse, this card is clearly separate from the 'to be left' card (quedar, as in quedan dos).

The reviewer's own translation: answer "quedar on its own: to remain, to be left, to be located; 'to stay' (not leave) is quedarse"; example "Stay with me tonight.".

### sobre-on-over · rank 118 · sobre

Decide in [decisions/sobre-on-over.txt](decisions/sobre-on-over.txt)

| Field | Card |
|---|---|
| Prompt | the keys [on] the table |
| Hint | on top of, over; not en |
| Answer | sobre |
| Kind | glue, preposition |
| Grammar | none |
| Example | Dejé las llaves sobre la mesa. / I left the keys on the table. |
| Spain | none |
| Trick | SOBRE looks like super, Latin for above: it sits on top of things. |

Why it was flagged:

- One right answer: The hint 'on top of, over' leads straight to 'encima de' (and in Latin America 'arriba de'), which are common, correct answers for 'the keys on top of the table', so sobre is not the only right answer. Suggested fix: hint: one-word preposition meaning on top of; not en

Reviewer's note (not a reason to flag): The trick is accurate: sobre comes from Latin super, which means above or over.

The reviewer's own translation: answer "on, on top of, over (preposition); also about"; example "I left the keys on the table.".

### ti-you · rank 121 · ti

Decide in [decisions/ti-you.txt](decisions/ti-you.txt)

| Field | Card |
|---|---|
| Prompt | this is for [you] |
| Hint | informal, after a preposition |
| Answer | ti |
| Kind | glue, pronoun |
| Grammar | none |
| Example | Este regalo es para ti. / This gift is for you. |
| Spain | none |
| Trick | TI sounds like tea: I made this cup of tea just for you. |

Why it was flagged:

- One right answer: English "you" can also be plural, and in Latin America the informal plural is ustedes ("esto es para ustedes"), so "informal" alone doesn't rule out a second right answer. Suggested fix: hint: informal, one person, after a preposition

Reviewer's note (not a reason to flag): Since this is the word's only card, the editor could mention somewhere that after con the form is contigo, not con ti, and that voseo regions say para vos.

The reviewer's own translation: answer "you (informal singular object of a preposition, as in para ti, de ti)"; example "This present is for you.".

### hasta-until · rank 130 · hasta

Decide in [decisions/hasta-until.txt](decisions/hasta-until.txt)

| Field | Card |
|---|---|
| Prompt | I work [until] eight |
| Hint | none |
| Answer | hasta |
| Kind | glue, preposition |
| Grammar | none |
| Example | ¡Hasta mañana, mi amor! / See you tomorrow, my love! |
| Spain | none |
| Trick | HASTA sounds like "hasta la vista": you won't see me until later, baby. |

Why it was flagged:

- Example sentence: The example is a fixed farewell with no conjugated verb, and its idiomatic translation hides the 'until' meaning the card teaches. Suggested fix: example.es: Hoy trabajo hasta las ocho. / example.en: Today I work until eight.

Reviewer's note (not a reason to flag): The prompt needs no hint, because 'even' is covered by the word's other card.

The reviewer's own translation: answer "until, up to (preposition); the prompt is 'Trabajo hasta las ocho'"; example "Until tomorrow, my love! (that is, See you tomorrow, my love!)".

### nosotros-we · rank 138 · nosotros

Decide in [decisions/nosotros-we.txt](decisions/nosotros-we.txt)

| Field | Card |
|---|---|
| Prompt | [we] did it, not them |
| Hint | none |
| Answer | nosotros |
| Kind | glue, pronoun |
| Grammar | none |
| Example | Nosotros vamos al cine esta noche. / We're going to the movies tonight. |
| Spain | none |
| Trick | NOSOTROS sounds like nose-a-trio: we three noses sniff around together as a group. |

Why it was flagged:

- One right answer: With no hint, 'nosotras' is also a correct answer for 'we' when the group is all female, so the prompt has two right answers. Suggested fix: hint: masculine or mixed group

Reviewer's note (not a reason to flag): The example uses nosotros without contrast, so it does not show the emphatic 'we, not them' use the prompt points to; something like 'Nosotros lo hicimos, no ellos.' would match it better.

The reviewer's own translation: answer "we (masculine or mixed group; subject pronoun, also 'us' after a preposition)"; example "We are going to the movies tonight.".

### tal-how-greeting · rank 151 · tal

Decide in [decisions/tal-how-greeting.txt](decisions/tal-how-greeting.txt)

| Field | Card |
|---|---|
| Prompt | Hi, [how] are you? |
| Hint | after qué, a casual greeting |
| Answer | tal |
| Kind | glue, adverb |
| Grammar | none |
| Example | Hola, ¿qué tal tu día? / Hi, how was your day? |
| Spain | none |
| Trick | TAL sounds like tell: qué tal? means tell me, how are you? |

Why it was flagged:

- Example sentence: The example has no conjugated verb. Suggested fix: example.es: Hola, ¿qué tal te fue en el trabajo? / example.en: Hi, how did it go at work?
- Memory trick: The trick says qué tal means 'tell me, how are you?', but neither qué nor tal means 'tell', so the learner would memorize a false meaning. Suggested fix: trick: Picture a friend shouting 'Qué TAL?' across the street and asking how TALL a day you've had, which is their way of asking how you are.

Reviewer's note (not a reason to flag): The hint is needed, since without 'after qué' the obvious answer would be cómo.

The reviewer's own translation: answer "tal: such, so; in the set phrase qué tal: how (how are you, how's it going)"; example "Hi, how's your day?".

### acabar-finish · rank 154 · acabar

Decide in [decisions/acabar-finish.txt](decisions/acabar-finish.txt)

| Field | Card |
|---|---|
| Prompt | to finish |
| Hint | not terminar; also to run out, to end up |
| Answer | acabar |
| Kind | content, verb |
| Grammar | yo acabo · tú acabas · él acaba |
| Example | ¿Ya acabaste la tarea? / Did you already finish your homework? |
| Spain | none |
| Trick | ACABAR sounds like a cab bar: you finish your drink at the bar, then take a cab home. |

Why it was flagged:

- One right answer: The hint says acabar also means to run out, but that sense belongs to the pronominal acabarse (se acabó la leche), so a learner would memorize a wrong use of plain acabar. Suggested fix: hint: not terminar; also to end up

Reviewer's note (not a reason to flag): In Rioplatense and some other varieties, plain acabar without an object is also slang for to climax, so the editor may want examples that always give it an object, as this one does.

The reviewer's own translation: answer "to finish, to end (also: to end up, with por or a gerund)"; example "Did you already finish the homework?".

### momento-moment · rank 155 · momento

Decide in [decisions/momento-moment.txt](decisions/momento-moment.txt)

| Field | Card |
|---|---|
| Prompt | moment |
| Hint | none |
| Answer | el momento |
| Kind | content, noun |
| Grammar | masculine, el |
| Example | Espera un momento, ya vengo. / Wait a moment, I'll be right there. |
| Spain | none |
| Trick | MOMENTO sounds like "memento": a keepsake that helps you remember a special moment. |

Why it was flagged:

- Example sentence: "Ya vengo" means "I'll be right back" (going and returning), not "I'll be right there", which would be "ya voy". Suggested fix: example.en: Wait a moment, I'll be right back.

Reviewer's note (not a reason to flag): "Instante" also means moment, but "el momento" is clearly the everyday answer, so no hint is needed.

The reviewer's own translation: answer "moment (masculine noun)"; example "Wait a moment, I'll be right back.".

### trabajar-work · rank 168 · trabajar

Decide in [decisions/trabajar-work.txt](decisions/trabajar-work.txt)

| Field | Card |
|---|---|
| Prompt | to work |
| Hint | none |
| Answer | trabajar |
| Kind | content, verb |
| Grammar | yo trabajo · tú trabajas · él trabaja |
| Example | Mi madre trabaja en un hotel. / My mother works at a hotel. |
| Spain | none |
| Trick | TRABAJAR sounds like "trouble, ha!": work is trouble, but you laugh and keep working. |

Why it was flagged:

- One right answer: With no hint, the bare prompt "to work" could also be answered with funcionar, a common word meaning to work as a machine or plan works. Suggested fix: hint: as in doing a job, not a machine working

Reviewer's note (not a reason to flag): The grammar strip trabajo / trabajas / trabaja is correct, and trabajar is regular in both the present and the preterite.

The reviewer's own translation: answer "to work (to do a job, to labor)"; example "My mother works in a hotel.".

### quizas-maybe · rank 175 · quizás

Decide in [decisions/quizas-maybe.txt](decisions/quizas-maybe.txt)

| Field | Card |
|---|---|
| Prompt | maybe |
| Hint | one word, not tal vez |
| Answer | quizás |
| Kind | content, adverb |
| Grammar | none |
| Example | Quizás llueva mañana. / Maybe it will rain tomorrow. |
| Spain | none |
| Trick | QUIZÁS sounds like a quiz: maybe you pass, maybe you don't. |

Why it was flagged:

- One right answer: The hint rules out tal vez but not quizá, an equally correct one-word form without the final s, so a learner could give a different right answer. Suggested fix: hint: one word ending in -s, not tal vez

Reviewer's note (not a reason to flag): Quizás with the subjunctive (llueva) is a good, natural model for learners, and quizás is the more common spelling in Latin America.

The reviewer's own translation: answer "maybe, perhaps (adverb)"; example "Maybe it will rain tomorrow.".

### preguntar-ask · rank 177 · preguntar

Decide in [decisions/preguntar-ask.txt](decisions/preguntar-ask.txt)

| Field | Card |
|---|---|
| Prompt | to ask |
| Hint | a question, not ask for something |
| Answer | preguntar |
| Kind | content, verb |
| Grammar | yo pregunto · tú preguntas · él pregunta |
| Example | ¿Puedo preguntarte algo? / Can I ask you something? |
| Spain | none |
| Trick | PREGUNTAR sounds like a pregnant tar pit: everyone asks, how did that happen? |

Why it was flagged:

- Example sentence: The example uses preguntar only in the infinitive (preguntarte after puedo), so the card's verb is not conjugated. Suggested fix: example.es: Mi hijo siempre pregunta por qué. / example.en: My son always asks why.

Reviewer's note (not a reason to flag): The hint matters here because it rules out pedir (to ask for something).

The reviewer's own translation: answer "to ask (a question), to inquire"; example "Can I ask you something?".

### ninguno-no-any · rank 184 · ninguno

Decide in [decisions/ninguno-no-any.txt](decisions/ninguno-no-any.txt)

| Field | Card |
|---|---|
| Prompt | I don't have [any] money problem |
| Hint | negative word before a noun; shortens to ningún before masculine nouns |
| Answer | ninguno |
| Kind | glue, determiner |
| Grammar | none |
| Example | No hay ningún problema. / There's no problem at all. |
| Spain | none |
| Trick | NINGUNO sounds like "nothing, you know": not a single one, nothing at all. |

Why it was flagged:

- Meaning: The prompt "I don't have [any] money problem" is broken English, since "money problem" needs to be plural or have no article, so the learner gets a garbled sentence to recall from. Suggested fix: en: I don't have [any] problem
- Memory trick: "nothing at all" mixes ninguno up with nada (nothing); ninguno means not a single one of something, not nothing. Suggested fix: trick: NINGUNO starts like "nine" and ends with "no": nine? No, not even one.

Reviewer's note (not a reason to flag): The card's es is the dictionary form ninguno, but the prompt's slot actually takes ningún, so the hint about shortening is doing real work and should stay.

The reviewer's own translation: answer "ninguno = no, not any, none (negative determiner; ningún before a masculine singular noun, ninguna before a feminine one)"; example "There isn't any problem. / There's no problem.".

### conseguir-get · rank 190 · conseguir

Decide in [decisions/conseguir-get.txt](decisions/conseguir-get.txt)

| Field | Card |
|---|---|
| Prompt | to get |
| Hint | obtain something, often with effort |
| Answer | conseguir |
| Kind | content, verb |
| Grammar | yo consigo · tú consigues · él consigue (irregular) |
| Example | ¿Dónde conseguiste esos zapatos? / Where did you get those shoes? |
| Spain | none |
| Trick | CONSEGUIR sounds like "con, see, gear": a con artist sees gear he wants and gets it. |

Why it was flagged:

- One right answer: The hint says "obtain something", which points straight to obtener, a common Spanish verb meaning exactly that, and lograr also fits "with effort", so the hint does not rule out other right answers. Suggested fix: hint: get hold of something, often with effort (not obtener or lograr)

Reviewer's note (not a reason to flag): The irregular flag is right because of the e→i stem change (consigo, consiguió), and the yo form is spelled -go, not -guo.

The reviewer's own translation: answer "conseguir: to get, obtain, get hold of; also to manage to (do something)"; example "Where did you get those shoes?".

### usar-use · rank 196 · usar

Decide in [decisions/usar-use.txt](decisions/usar-use.txt)

| Field | Card |
|---|---|
| Prompt | to use |
| Hint | none |
| Answer | usar |
| Kind | content, verb |
| Grammar | yo uso · tú usas · él usa |
| Example | ¿Puedo usar tu teléfono un momento? / Can I use your phone for a moment? |
| Spain | none |
| Trick | USAR sounds like a USER: a user is someone who uses things. |

Why it was flagged:

- Example sentence: The sentence leaves usar in the infinitive after puedo, but the card's own verb has to be conjugated in the example. Suggested fix: example.es: Uso mi teléfono todo el día. / example.en: I use my phone all day.

Reviewer's note (not a reason to flag): Utilizar (more formal) and the regional ocupar (Mexico, Chile) also mean to use, but usar is the everyday answer everyone would give, so no hint is needed.

The reviewer's own translation: answer "to use"; example "Can I use your phone for a moment?".

### realmente-really · rank 206 · realmente

Decide in [decisions/realmente-really.txt](decisions/realmente-really.txt)

| Field | Card |
|---|---|
| Prompt | really |
| Hint | one word ending in -mente |
| Answer | realmente |
| Kind | content, adverb |
| Grammar | none |
| Example | ¿Realmente quieres ir a la fiesta? / Do you really want to go to the party? |
| Spain | none |
| Trick | REALMENTE sounds like real-mental: if it's real in your mind, then you really mean it. |

Why it was flagged:

- One right answer: The hint rules out 'de verdad' and 'en serio', but 'verdaderamente' is also one common word ending in -mente that means 'really', so the prompt still has two right answers. Suggested fix: hint: one word ending in -mente, built on the Spanish word for 'real' (not verdaderamente)

Reviewer's note (not a reason to flag): In casual speech Latin Americans often say 'de verdad' or 'en serio' for 'really?', so the editor could mention this in a later card or a note on the card.

The reviewer's own translation: answer "really, truly, actually (adverb)"; example "Do you really want to go to the party?".

### cierto-true · rank 207 · cierto

Decide in [decisions/cierto-true.txt](decisions/cierto-true.txt)

| Field | Card |
|---|---|
| Prompt | true |
| Hint | as in it's true, that's right |
| Answer | cierto |
| Kind | content, adjective |
| Grammar | feminine cierta |
| Example | ¿Es cierto que te vas mañana? / Is it true that you're leaving tomorrow? |
| Spain | none |
| Trick | CIERTO sounds like certainly: if something is certainly so, it's true. |

Why it was flagged:

- One right answer: The adjective "true" with this hint could just as well be answered with "verdadero", the standard dictionary translation of "true", or with "verdad" ("es verdad"), and the hint rules out neither. Suggested fix: hint: as in es ___, it's true, that's right; not verdad or verdadero

Reviewer's note (not a reason to flag): Since \"es verdad\" is at least as common as \"es cierto\" in everyday speech, the hint needs to steer learners away from it so they aren't marked wrong for a natural answer.

The reviewer's own translation: answer "true, correct (also certain, sure; before a noun: a certain, some)"; example "Is it true that you're leaving tomorrow?".

### razon-reason · rank 208 · razón

Decide in [decisions/razon-reason.txt](decisions/razon-reason.txt)

| Field | Card |
|---|---|
| Prompt | reason |
| Hint | none |
| Answer | la razón |
| Kind | content, noun |
| Grammar | feminine, la |
| Example | No hay razón para llorar. / There's no reason to cry. |
| Spain | none |
| Trick | RAZÓN sounds like REASON with a lisp: same word, same meaning. |

Why it was flagged:

- Memory trick: Saying it sounds like reason 'with a lisp' teaches the Spain pronunciation, but in Latin American Spanish the z sounds like s. Suggested fix: trick: RAZÓN sounds like a Spanish-accented REASON (rah-SOHN), and that is just what it means.

Reviewer's note (not a reason to flag): El motivo is a less common synonym that some learners might give, but la razón is the standard answer for reason, so no hint is needed.

The reviewer's own translation: answer "reason (a cause or explanation; also good sense)"; example "There is no reason to cry.".

### quien-who-relative · rank 217 · quien

Decide in [decisions/quien-who-relative.txt](decisions/quien-who-relative.txt)

| Field | Card |
|---|---|
| Prompt | the friend with [whom] I live |
| Hint | relative pronoun after a preposition, not que; no accent |
| Answer | quien |
| Kind | glue, pronoun |
| Grammar | none |
| Example | Ella es la chica con quien hablé. / She's the girl I talked to. |
| Spain | none |
| Trick | QUIEN sounds like "key-en": the person who holds the key gets in. |

Why it was flagged:

- One right answer: The hint rules out bare que, but el que and el cual are also correct after con here (con el que vivo, con el cual vivo), and the learner could read not que as allowing el que. Suggested fix: hint: one-word relative pronoun for a person after a preposition, not el que or el cual; no accent

Reviewer's note (not a reason to flag): The friend in the prompt has no gender, so a hint naming el que and el cual covers la que and la cual too.

The reviewer's own translation: answer "who / whom (relative pronoun for a person, used after a preposition)"; example "She is the girl with whom I talked (She's the girl I talked to).".

### cualquiera-any · rank 229 · cualquiera

Decide in [decisions/cualquiera-any.txt](decisions/cualquiera-any.txt)

| Field | Card |
|---|---|
| Prompt | call me [any] day |
| Hint | any at all, whichever; shortens to cualquier before a noun |
| Answer | cualquiera |
| Kind | glue, determiner |
| Grammar | none |
| Example | Puedes venir cualquier día. / You can come any day. |
| Spain | none |
| Trick | CUALQUIERA sounds like "quality-era": in any era, any day, any quality will do. |

Why it was flagged:

- One right answer: In the frame "call me [any] day" the word comes before a noun, so the right Spanish is cualquier (llámame cualquier día), not the answer shown, cualquiera, and a learner who recalls cualquier would be marked wrong, or would learn that cualquiera día is correct. Suggested fix: en: pick [any one] of them; hint: any one at all, whichever, not a person (that is the anyone card)
- Example sentence: The sentence is natural and correctly translated, but it uses only the shortened form cualquier, so it does not show es as written and would no longer match a corrected prompt that uses the full form. Suggested fix: example.es: Puedes elegir cualquiera de los dos. example.en: You can pick either one.

Reviewer's note (not a reason to flag): Another option is to keep the noun frame and put the word after the noun (un día cualquiera), but that means an ordinary day rather than any day, so the any-one-of-them frame fits better; the hint's note that it shortens to cualquier before a noun is worth keeping on the answer side.

The reviewer's own translation: answer "any, any at all, whichever (determiner; cualquier before a noun)"; example "You can come any day.".

### preocupar-worry · rank 233 · preocupar

Decide in [decisions/preocupar-worry.txt](decisions/preocupar-worry.txt)

| Field | Card |
|---|---|
| Prompt | to worry |
| Hint | none |
| Answer | preocupar |
| Kind | content, verb |
| Grammar | yo preocupo · tú preocupas · él preocupa |
| Example | No te preocupes, todo va a estar bien. / Don't worry, everything's going to be fine. |
| Spain | none |
| Trick | PREOCUPAR sounds like pre-occupy: when you worry, your mind is preoccupied. |

Why it was flagged:

- One right answer: The bare prompt 'to worry' most naturally means the intransitive 'I worry', which Spanish says with preocuparse, so a fluent speaker could equally answer preocuparse, and nothing rules it out. Suggested fix: hint: to make someone worry, as in 'it worries me' (to worry yourself is preocuparse)
- Example sentence: The sentence uses the reflexive preocuparse ('no te preocupes'), not preocupar in its transitive meaning of worrying someone. Suggested fix: example.es: Me preocupa tu salud. / example.en: Your health worries me.

Reviewer's note (not a reason to flag): You could instead make the card preocuparse (me preocupo, te preocupas, se preocupa) and keep 'No te preocupes'. That fits the prompt 'to worry' and is probably why the word ranks so high in the subtitles list.

The reviewer's own translation: answer "to worry (someone), to concern; the intransitive 'to worry, be worried' is preocuparse"; example "Don't worry, everything is going to be fine.".

### entre-between · rank 237 · entre

Decide in [decisions/entre-between.txt](decisions/entre-between.txt)

| Field | Card |
|---|---|
| Prompt | [between] you and me |
| Hint | none |
| Answer | entre |
| Kind | glue, preposition |
| Grammar | none |
| Example | El banco está entre la farmacia y el parque. / The bank is between the pharmacy and the park. |
| Spain | none |
| Trick | ENTRE sounds like enter: you enter the gap between two things. |

Why it was flagged:

- Example uses words not met yet: The example uses words not met before this card: banco, farmacia, parque. In the frequency phase it may use at most two words not met yet. Suggested fix: npm run draft -- --examples --ids entre-between

Reviewer's note (not a reason to flag): The prompt fits the set phrase "entre tú y yo" well, and the example shows the physical meaning, so the card covers both uses.

The reviewer's own translation: answer "between, among"; example "The bank is between the pharmacy and the park.".

### listo-ready · rank 239 · listo

Decide in [decisions/listo-ready.txt](decisions/listo-ready.txt)

| Field | Card |
|---|---|
| Prompt | ready |
| Hint | none |
| Answer | listo |
| Kind | content, adjective |
| Grammar | feminine lista |
| Example | ¿Estás listo para salir? / Are you ready to go out? |
| Spain | none |
| Trick | LISTO sounds like list: once you tick off every item on your list, you're ready. |

Why it was flagged:

- One right answer: With no hint, a learner could also correctly answer preparado for "ready", and the prompt does not point to the estar sense the way the sister card points to the ser sense. Suggested fix: hint: used with estar; not preparado

Reviewer's note (not a reason to flag): The new hint would match the sister card's "used with ser" hint, so the learner can see that listo means ready with estar and clever with ser.

The reviewer's own translation: answer "ready (with estar); clever (with ser)"; example "Are you ready to go out?".

### forma-way · rank 241 · forma

Decide in [decisions/forma-way.txt](decisions/forma-way.txt)

| Field | Card |
|---|---|
| Prompt | way |
| Hint | manner, as in the way to do it; not manera, the word that also means shape |
| Answer | la forma |
| Kind | content, noun |
| Grammar | feminine, la |
| Example | No hay otra forma de hacerlo. / There's no other way to do it. |
| Spain | none |
| Trick | FORMA sounds like format: the format is the way you do something. |

Why it was flagged:

- One right answer: The hint wrongly says manera also means shape (it is forma that does), and it doesn't rule out modo or camino, both common answers for 'the way to do it'. Suggested fix: hint: manner, as in the way to do it; not manera or modo, but the word that also means shape

Reviewer's note (not a reason to flag): Pointing to the shape meaning in the hint is a good way to single out forma, because manera and modo don't share it.

The reviewer's own translation: answer "the form, shape; way, manner (feminine noun)"; example "There is no other way to do it.".

### ustedes-you-plural · rank 245 · ustedes

Decide in [decisions/ustedes-you-plural.txt](decisions/ustedes-you-plural.txt)

| Field | Card |
|---|---|
| Prompt | are [you all] coming tonight? |
| Hint | more than one person |
| Answer | ustedes |
| Kind | glue, pronoun |
| Grammar | none |
| Example | ¿Ustedes vienen a la fiesta? / Are you guys coming to the party? |
| Spain | none |
| Trick | USTEDES sounds like "use the days": you all use the days together. |

Why it was flagged:

- Latin American usage: In this informal 'you guys' sense, Spain says vosotros, which is noticeably different, so spain should not be null. Suggested fix: spain: vosotros

Reviewer's note (not a reason to flag): The hint is correct, and in Latin America ustedes is the only plural "you" for both formal and informal speech, so the prompt has exactly one answer.

The reviewer's own translation: answer "you (plural); you all, you guys"; example "Are you (all) coming to the party?".

### esposo-husband · rank 253 · esposo

Decide in [decisions/esposo-husband.txt](decisions/esposo-husband.txt)

| Field | Card |
|---|---|
| Prompt | husband |
| Hint | not marido; related to spouse |
| Answer | el esposo |
| Kind | content, noun |
| Grammar | masculine, el |
| Example | Mi esposo trabaja en un hospital. / My husband works at a hospital. |
| Spain | none |
| Trick | ESPOSO sounds like spouse-o: your male spouse is your husband. |

Why it was flagged:

- Latin American usage: In everyday speech Spain clearly prefers marido for husband, while esposo sounds formal there, so spain should not be null. Suggested fix: spain: el marido

Reviewer's note (not a reason to flag): The hint is needed and works, because it rules out marido, which is also a correct answer for husband.

The reviewer's own translation: answer "husband (spouse, male)"; example "My husband works at a hospital.".

### historia-story · rank 257 · historia

Decide in [decisions/historia-story.txt](decisions/historia-story.txt)

| Field | Card |
|---|---|
| Prompt | story |
| Hint | an account of events, not a children's tale |
| Answer | la historia |
| Kind | content, noun |
| Grammar | feminine, la |
| Example | Es una historia muy larga. / It's a very long story. |
| Spain | none |
| Trick | HISTORIA sounds like his story: every person has his story to tell. |

Why it was flagged:

- One right answer: The hint "an account of events" is almost word for word the definition of "el relato", so a strong speaker could reasonably give "relato" rather than "historia". Suggested fix: hint: the everyday word, as in "it's a long story"; not a children's tale

Reviewer's note (not a reason to flag): The hint correctly rules out "cuento", and the "history" card uses a different prompt, so the two cards do not clash.

The reviewer's own translation: answer "the story; also history (feminine noun)"; example "It's a very long story.".

### historia-history · rank 257 · historia

Decide in [decisions/historia-history.txt](decisions/historia-history.txt)

| Field | Card |
|---|---|
| Prompt | history |
| Hint | none |
| Answer | la historia |
| Kind | content, noun |
| Grammar | feminine, la |
| Example | Me encanta la historia de México. / I love Mexican history. |
| Spain | none |
| Trick | HISTORIA looks like history plus an extra A: the past with an added accent. |

Why it was flagged:

- Memory trick: Saying 'with an added accent' could make a learner think historia has a written accent mark, but it has none. Suggested fix: trick: HISTORIA is just HISTORY with the Y swapped for an -IA ending, like many Spanish feminine nouns.

Reviewer's note (not a reason to flag): The bare prompt "history" needs no hint, because the "story" card's hint already keeps the two meanings apart.

The reviewer's own translation: answer "history (the past; the study of the past); also story"; example "I love the history of Mexico.".

### fuera-out · rank 259 · fuera

Decide in [decisions/fuera-out.txt](decisions/fuera-out.txt)

| Field | Card |
|---|---|
| Prompt | out |
| Hint | as in fuera de, out of; not afuera |
| Answer | fuera |
| Kind | content, adverb |
| Grammar | none |
| Example | Mi papá está fuera de la ciudad. / My dad is out of town. |
| Spain | none |
| Trick | FUERA sounds like fury: in a fury, she threw him out of the house. |

Why it was flagged:

- One right answer: The hint contains the Spanish answer itself (fuera de), so the learner reads the answer instead of recalling it. Suggested fix: hint: as in out of town, followed by de; the shorter word, not afuera

Reviewer's note (not a reason to flag): In Latin America afuera is more common than fuera for outside on its own, so the hint does need to rule afuera out and point to the fuera de construction.

The reviewer's own translation: answer "out, outside (adverb); fuera de = out of, outside of"; example "My dad is out of the city / out of town.".

### carino-honey · rank 262 · cariño

Decide in [decisions/carino-honey.txt](decisions/carino-honey.txt)

| Field | Card |
|---|---|
| Prompt | honey |
| Hint | what you call a loved one, not the food |
| Answer | el cariño |
| Kind | content, noun |
| Grammar | masculine, el |
| Example | Cariño, ya llegué a casa. / Honey, I'm home. |
| Spain | none |
| Trick | CARIÑO sounds like "carry no": honey, I'll carry you, no problem. |

Why it was flagged:

- One right answer: The hint rules out miel, but other common pet names still fit, especially mi amor, amor, corazón, cielo and mi vida, and mi amor is at least as common as cariño in Latin America. Suggested fix: hint: what you call a loved one, the same word that means affection (not amor, cielo or corazón)

Reviewer's note (not a reason to flag): Linking this card's hint to the affection card helps the learner see that it is one word with two uses; when cariño is used to address someone, as in the example, it takes no article.

The reviewer's own translation: answer "affection, fondness; as a form of address: darling, honey, sweetheart"; example "Darling/Honey, I'm home now.".

### supuesto-of-course · rank 272 · supuesto

Decide in [decisions/supuesto-of-course.txt](decisions/supuesto-of-course.txt)

| Field | Card |
|---|---|
| Prompt | of course |
| Hint | two-word phrase, not claro |
| Answer | por supuesto |
| Kind | content, adverb |
| Grammar | none |
| Example | ¿Me ayudas? Por supuesto. / Will you help me? Of course. |
| Spain | none |
| Trick | POR SUPUESTO sounds like "for supposed": of course it's true, everyone supposed so. |

Why it was flagged:

- One right answer: The hint only rules out claro, but other two-word phrases also mean of course, such as cómo no (very common in Latin America) and desde luego. Suggested fix: hint: two-word phrase starting with por, not claro

Reviewer's note (not a reason to flag): Using a fixed two-word phrase as a content card for supuesto makes sense, because por supuesto is by far the word's most frequent use in subtitles.

The reviewer's own translation: answer "of course, certainly (fixed adverbial phrase)"; example "Will you help me? Of course.".

### supuesto-supposed · rank 272 · supuesto

Decide in [decisions/supuesto-supposed.txt](decisions/supuesto-supposed.txt)

| Field | Card |
|---|---|
| Prompt | supposed |
| Hint | alleged |
| Answer | supuesto |
| Kind | content, adjective |
| Grammar | feminine supuesta |
| Example | El supuesto ladrón era su hermano. / The supposed thief was his brother. |
| Spain | none |
| Trick | SUPUESTO sounds like "supposed-o": the supposed suspect, only supposedly guilty. |

Why it was flagged:

- One right answer: The hint "alleged" is the usual English translation of presunto, a common word in news Spanish ("el presunto ladrón"), so it could lead the learner to that word instead of supuesto. Suggested fix: hint: alleged, not presunto

Reviewer's note (not a reason to flag): This adjective sense does not overlap with the "of course" card (por supuesto), so the two cards stay apart.

The reviewer's own translation: answer "supposed, alleged (adjective)"; example "The alleged thief was his (or her) brother.".

### caer-fall · rank 281 · caer

Decide in [decisions/caer-fall.txt](decisions/caer-fall.txt)

| Field | Card |
|---|---|
| Prompt | to fall |
| Hint | none |
| Answer | caer |
| Kind | content, verb |
| Grammar | yo caigo · tú caes · él cae (irregular) |
| Example | Cuidado, el vaso se va a caer. / Careful, the glass is going to fall. |
| Spain | none |
| Trick | CAER sounds like "cry": you cry when you fall off your bike. |

Why it was flagged:

- Example sentence: The card's verb appears only as the infinitive caer (after va a), so the example doesn't show caer conjugated. Suggested fix: example.es: Cuidado, el vaso se va a caer. -> El vaso se cayó al piso. / example.en: The glass fell on the floor.

Reviewer's note (not a reason to flag): In everyday speech "to fall" is very often the reflexive caerse, so an example that uses it (se cayó) helps learners, but the bare infinitive caer is still the right answer for this card.

The reviewer's own translation: answer "to fall (to drop; reflexive caerse = to fall down, fall over)"; example "Careful, the glass is going to fall.".

### medio-kind-of · rank 282 · medio

Decide in [decisions/medio-kind-of.txt](decisions/medio-kind-of.txt)

| Field | Card |
|---|---|
| Prompt | kind of |
| Hint | informal, before an adjective: kind of tired |
| Answer | medio |
| Kind | content, adverb |
| Grammar | none |
| Example | Estoy medio cansado hoy. / I'm kind of tired today. |
| Spain | none |
| Trick | MEDIO sounds like medium: feeling medium tired means you're kind of tired. |

Why it was flagged:

- One right answer: For 'kind of' before an adjective, 'un poco', 'algo' and 'como' (estoy un poco cansado, algo cansado, como cansado) are equally common, and the hint does not rule them out. Suggested fix: hint: informal adverb, literally 'half', before an adjective: kind of tired (not un poco or algo)

Reviewer's note (not a reason to flag): As an adverb, medio stays the same in standard Spanish (medio cansada, not media cansada), so a feminine example or a short note could stop learners from making it agree.

The reviewer's own translation: answer "half, somewhat, kind of (adverb, before an adjective)"; example "I'm half tired today / I'm kind of tired today.".

### suerte-luck · rank 303 · suerte

Decide in [decisions/suerte-luck.txt](decisions/suerte-luck.txt)

| Field | Card |
|---|---|
| Prompt | luck |
| Hint | none |
| Answer | la suerte |
| Kind | content, noun |
| Grammar | feminine, la |
| Example | ¡Buena suerte en tu examen! / Good luck on your exam! |
| Spain | none |
| Trick | SUERTE sounds like "sweat-a": you sweat a lot hoping for good luck. |

Why it was flagged:

- Example sentence: The example has no conjugated verb, so it doesn't meet the requirement that it conjugate a verb. Suggested fix: example.es: ¡Que tengas suerte en tu examen! / example.en: Good luck on your exam!

The reviewer's own translation: answer "luck (noun, feminine)"; example "Good luck on your exam!".

### disculpar-excuse · rank 305 · disculpar

Decide in [decisions/disculpar-excuse.txt](decisions/disculpar-excuse.txt)

| Field | Card |
|---|---|
| Prompt | to excuse |
| Hint | none |
| Answer | disculpar |
| Kind | content, verb |
| Grammar | yo disculpo · tú disculpas · él disculpa |
| Example | Disculpe, ¿dónde está el baño? / Excuse me, where is the bathroom? |
| Spain | none |
| Trick | DISCULPAR sounds like this culprit: please excuse this culprit, he didn't mean it. |

Why it was flagged:

- One right answer: With no hint, a fluent speaker could also correctly answer "to excuse" with perdonar (as in perdona for "excuse me") or excusar. Suggested fix: hint: the -se form of this verb means "to apologize"
- Latin American usage: The example uses Disculpe, the usted command, but the card should use the informal tú register. Suggested fix: example.es: Disculpa, ¿dónde está el baño?

Reviewer's note (not a reason to flag): Disculpe is common with strangers in Latin America, but the app's rule is tú, so the example should use the tú form disculpa.

The reviewer's own translation: answer "to excuse, to forgive (a minor fault); disculparse = to apologize"; example "Excuse me (formal), where is the bathroom?".

### preparar-prepare · rank 308 · preparar

Decide in [decisions/preparar-prepare.txt](decisions/preparar-prepare.txt)

| Field | Card |
|---|---|
| Prompt | to prepare |
| Hint | none |
| Answer | preparar |
| Kind | content, verb |
| Grammar | yo preparo · tú preparas · él prepara |
| Example | Mi mamá prepara la cena todos los días. / My mom prepares dinner every day. |
| Spain | none |
| Trick | PREPARAR sounds like "prepare-ar": just add -ar to prepare and you're ready to go. |

Why it was flagged:

- Memory trick: Adding -ar to 'prepare' gives 'preparear', so the trick could teach a misspelling; preparar swaps the final e for -ar. Suggested fix: trick: PREPARAR is just prepare with its final e swapped for -ar (prepar-AR), and you're ready to go.

The reviewer's own translation: answer "to prepare, to get ready (something)"; example "My mom makes (prepares) dinner every day.".

### clase-class · rank 311 · clase

Decide in [decisions/clase-class.txt](decisions/clase-class.txt)

| Field | Card |
|---|---|
| Prompt | class |
| Hint | lesson at school |
| Answer | la clase |
| Kind | content, noun |
| Grammar | feminine, la |
| Example | Tengo clase de inglés a las ocho. / I have English class at eight. |
| Spain | none |
| Trick | CLASE sounds like class: same word, just add an E at the end of the lesson. |

Why it was flagged:

- Memory trick: The trick says clase is class plus an E, but that would spell classe, and a learner would memorize the wrong spelling, since clase has only one S. Suggested fix: trick: CLASE sounds like class: drop one S and add an E at the end of the lesson.

Reviewer's note (not a reason to flag): The hint "lesson at school" is needed, because it separates this card from the "kind, sort" card, and it fits clase, the usual word for a class session, better than lección.

The reviewer's own translation: answer "the class (a lesson or school session; also a group of students, or a kind)"; example "I have English class at eight.".

### realidad-reality · rank 314 · realidad

Decide in [decisions/realidad-reality.txt](decisions/realidad-reality.txt)

| Field | Card |
|---|---|
| Prompt | reality |
| Hint | none |
| Answer | la realidad |
| Kind | content, noun |
| Grammar | feminine, la |
| Example | En realidad, no me gusta el café. / Actually, I don't like coffee. |
| Spain | none |
| Trick | REALIDAD sounds like "real, dad": Dad tells you to face reality and keep it real. |

Why it was flagged:

- Example sentence: The example uses the fixed phrase 'en realidad' = 'actually', so neither the sentence nor its translation shows the noun meaning 'reality' that the card teaches. Suggested fix: example.es: Tienes que aceptar la realidad. / example.en: You have to accept reality.

Reviewer's note (not a reason to flag): 'En realidad' (actually) is a very common phrase, so it could be worth its own phrase card, or a mention elsewhere, rather than being the noun's only example.

The reviewer's own translation: answer "reality (noun, feminine)"; example "In reality / Actually, I don't like coffee.".

### alto-stop · rank 317 · alto

Decide in [decisions/alto-stop.txt](decisions/alto-stop.txt)

| Field | Card |
|---|---|
| Prompt | Stop! |
| Hint | one-word command shouted by police or guards |
| Answer | alto |
| Kind | content, other |
| Grammar | none |
| Example | ¡Alto! ¡Policía! / Stop! Police! |
| Spain | none |
| Trick | ALTO sounds like halt-o: the guard shouts halt so you stop. |

Why it was flagged:

- One right answer: Other one-word police commands for stopping also fit the prompt and hint, such as ¡Deténgase!, ¡Párese! and ¡Deténganse!, so 'alto' is not the only right answer. Suggested fix: en: Halt! | hint: one-word police or military command, not a verb form

Reviewer's note (not a reason to flag): The trick works well because Spanish 'alto' (stop) and English 'halt' come from the same German root.

The reviewer's own translation: answer "Halt! / Stop! (interjection, a command to stop)"; example "Stop! Police!".

### parar-stand-up · rank 325 · parar

Decide in [decisions/parar-stand-up.txt](decisions/parar-stand-up.txt)

| Field | Card |
|---|---|
| Prompt | to stand up |
| Hint | get on your feet, not levantarse |
| Answer | pararse |
| Kind | content, verb |
| Grammar | yo me paro · tú te paras · él se para |
| Example | Párate, ya llegó la maestra. / Stand up, the teacher is here. |
| Spain | ponerse de pie |
| Trick | PARARSE sounds like 'para-rise': a paratrooper rises to his feet after landing. |

Why it was flagged:

- One right answer: The hint rules out levantarse but not ponerse de pie, which is also common in Latin America and also means 'to get on your feet', so two answers still fit. Suggested fix: hint: the everyday Latin American verb, not levantarse or ponerse de pie

Reviewer's note (not a reason to flag): In Spain the everyday word for standing up is levantarse more than ponerse de pie, so the editor could use "levantarse" in the spain field instead, though either is correct.

The reviewer's own translation: answer "pararse: to stand up, to get to your feet (Latin America); also to stop or come to a halt"; example "Stand up, the teacher has arrived.".

### fin-end · rank 327 · fin

Decide in [decisions/fin-end.txt](decisions/fin-end.txt)

| Field | Card |
|---|---|
| Prompt | end |
| Hint | short word shown at the end of a movie, not final |
| Answer | el fin |
| Kind | content, noun |
| Grammar | masculine, el |
| Example | Por fin llegó el fin de semana. / The weekend finally arrived. |
| Spain | none |
| Trick | FIN sounds like a fish fin: the fin is at the very end of the fish. |

Why it was flagged:

- Example sentence: The sentence uses fin only in the set phrases por fin (finally) and fin de semana (weekend), so it never shows fin meaning plain end, and the learner gets two idioms instead of the card's meaning. Suggested fix: example.es: No es el fin del mundo. example.en: It's not the end of the world.

Reviewer's note (not a reason to flag): The hint correctly rules out el final, which is the other common Spanish word for end.

The reviewer's own translation: answer "end (the end, finish; also purpose/aim)"; example "At last the weekend arrived.".

### disparar-shoot · rank 328 · disparar

Decide in [decisions/disparar-shoot.txt](decisions/disparar-shoot.txt)

| Field | Card |
|---|---|
| Prompt | to shoot |
| Hint | none |
| Answer | disparar |
| Kind | content, verb |
| Grammar | yo disparo · tú disparas · él dispara |
| Example | ¡No dispares! Somos amigos. / Don't shoot! We're friends. |
| Spain | none |
| Trick | DISPARAR sounds like "this par": he shoots this par of bottles off the fence. |

Why it was flagged:

- One right answer: The bare prompt "to shoot" could also mean shooting a film or a photo (filmar, rodar, fotografiar), so without a hint there is more than one right answer. Suggested fix: hint: fire a gun

Reviewer's note (not a reason to flag): The trick spells "pair" as "par"; that works as a sound pun but could read as a typo.

The reviewer's own translation: answer "to shoot, to fire (a gun or weapon)"; example "Don't shoot! We're friends.".

### detener-stop · rank 330 · detener

Decide in [decisions/detener-stop.txt](decisions/detener-stop.txt)

| Field | Card |
|---|---|
| Prompt | to stop |
| Hint | halt someone or something, formal; not parar |
| Answer | detener |
| Kind | content, verb |
| Grammar | yo detengo · tú detienes · él detiene (irregular) |
| Example | ¡Deténgase! No puede pasar. / Stop! You can't go through. |
| Spain | none |
| Trick | DETENER sounds like "detain her": to detain someone is to stop them in their tracks. |

Why it was flagged:

- Latin American usage: The example uses the formal usted command (Deténgase, No puede), not the informal tú register the app requires. Suggested fix: example.es: El guardia detiene los coches en la entrada.
- Example sentence: The example uses reflexive detenerse (to stop oneself) in the usted form, not detener meaning to halt someone or something, as the hint says. Suggested fix: example.es: El guardia detiene los coches en la entrada. / example.en: The guard stops the cars at the entrance.

Reviewer's note (not a reason to flag): The trick's "detain her" leans toward the sibling "to arrest" card, but it still fits "stop" well enough.

The reviewer's own translation: answer "to stop, to halt (someone or something); also to arrest, to detain"; example "Stop (yourself)! You can't go through. (formal usted command of the reflexive detenerse)".

### adelante-come-in · rank 332 · adelante

Decide in [decisions/adelante-come-in.txt](decisions/adelante-come-in.txt)

| Field | Card |
|---|---|
| Prompt | come in! go ahead! |
| Hint | one word, said as an invitation |
| Answer | adelante |
| Kind | content, other |
| Grammar | none |
| Example | ¡Adelante, la puerta está abierta! / Come in, the door is open! |
| Spain | none |
| Trick | Someone knocks at the deli and the ant waves: ADELANTE, a deli ant saying come in, go ahead! |

Why it was flagged:

- One right answer: The hint 'one word, said as an invitation' does not rule out the very common one-word verb answers ¡Pasa! (come in) and ¡Dale! (go ahead), which a fluent speaker could easily give instead. Suggested fix: hint: one word, not a verb (not pasa or dale); the same word that means 'forward'

Reviewer's note (not a reason to flag): In everyday Latin American speech, ¡Pasa! is probably more common than ¡Adelante! for 'come in', so the hint needs to point the learner clearly to adelante.

The reviewer's own translation: answer "come in!, go ahead!, forward! (interjection inviting someone to enter or proceed)"; example "Come in, the door is open!".

### igual-anyway · rank 333 · igual

Decide in [decisions/igual-anyway.txt](decisions/igual-anyway.txt)

| Field | Card |
|---|---|
| Prompt | anyway |
| Hint | one word, still, regardless |
| Answer | igual |
| Kind | content, adverb |
| Grammar | none |
| Example | No me invitaron, pero igual voy. / They didn't invite me, but I'm going anyway. |
| Spain | none |
| Trick | IGUAL, "equal": whatever happens, it's all equal to me, so I'll do it anyway. |

Why it was flagged:

- Latin American usage: In Spain, the adverb igual mostly means 'maybe' ('igual voy' = 'maybe I'll go'), and Spain says de todas formas or de todos modos for 'anyway', so spain should not be null. Suggested fix: spain: de todas formas

Reviewer's note (not a reason to flag): The hint's "one word" is what rules out de todos modos, de todas formas and aun así, so it needs to stay.

The reviewer's own translation: answer "igual (adverb, Latin American colloquial): anyway, all the same, regardless"; example "They didn't invite me, but I'm going anyway.".

### casar-marry · rank 343 · casar

Decide in [decisions/casar-marry.txt](decisions/casar-marry.txt)

| Field | Card |
|---|---|
| Prompt | to marry |
| Hint | usually casarse, to get married |
| Answer | casar |
| Kind | content, verb |
| Grammar | yo caso · tú casas · él casa |
| Example | ¿Quieres casarte conmigo? / Will you marry me? |
| Spain | none |
| Trick | CASAR sounds like casa, house: when you marry, you move into one house together. |

Why it was flagged:

- Meaning: Bare casar is transitive and means to wed a couple or to marry off, but the meaning a beginner needs and the one the hint and example use is casarse, to get married. Suggested fix: es: casarse; en: to get married
- One right answer: The hint gives away casarse while the answer is casar, so it is unclear which form the learner should recall, and for 'to marry someone' a fluent speaker would answer casarse (con), not casar. Suggested fix: hint: null (with es: casarse, en: to get married), or hint: 'to marry someone = casarse con' if en stays 'to marry'

Reviewer's note (not a reason to flag): If es becomes casarse, the grammar strip should read me caso, te casas, se casa (still regular), and the example and trick can stay as they are.

The reviewer's own translation: answer "to marry (transitive: to wed a couple as officiant, or to marry off); 'to get married' is casarse"; example "Do you want to marry me? / Will you marry me?".

### incluso-even · rank 360 · incluso

Decide in [decisions/incluso-even.txt](decisions/incluso-even.txt)

| Field | Card |
|---|---|
| Prompt | even |
| Hint | related to include, not hasta or aún |
| Answer | incluso |
| Kind | content, adverb |
| Grammar | none |
| Example | Incluso mi abuela baila salsa. / Even my grandma dances salsa. |
| Spain | none |
| Trick | INCLUSO sounds like inclusive: everyone is included, even the people you least expect. |

Why it was flagged:

- One right answer: The hint lists aún, but with the accent aún means still or yet; the word for even is aun without the accent, so the hint teaches the wrong spelling for that meaning. Suggested fix: hint: related to include, not hasta or aun
- Example uses words not met yet: The example uses words not met before this card: abuela, baila, salsa. In the frequency phase it may use at most two words not met yet. Suggested fix: npm run draft -- --examples --ids incluso-even

Reviewer's note (not a reason to flag): Apart from the aun spelling, the hint does rule out the other common translations of even (hasta, aun), which a strict prompt needs.

The reviewer's own translation: answer "even (also: including)"; example "Even my grandma dances salsa.".

### aunque-although · rank 361 · aunque

Decide in [decisions/aunque-although.txt](decisions/aunque-although.txt)

| Field | Card |
|---|---|
| Prompt | I'll go [although] it's raining |
| Hint | none |
| Answer | aunque |
| Kind | glue, conjunction |
| Grammar | none |
| Example | Voy a ir aunque esté cansado. / I'm going to go even though I'm tired. |
| Spain | none |
| Trick | AUNQUE sounds like "own key": although you own a key, you still knock on the door. |

Why it was flagged:

- Example sentence: With the subjunctive esté the sentence means 'even if I'm tired', not 'even though I'm tired', so the translation teaches the wrong mood-meaning pairing and does not match the prompt's factual indicative use. Suggested fix: example.es: Voy a ir aunque estoy cansado.

Reviewer's note (not a reason to flag): If a subjunctive example is wanted later, it should be translated with 'even if', on a separate card.

The reviewer's own translation: answer "although / even though (with indicative); even if (with subjunctive)"; example "I'm going to go even if I'm tired.".

### telefono-phone · rank 369 · teléfono

Decide in [decisions/telefono-phone.txt](decisions/telefono-phone.txt)

| Field | Card |
|---|---|
| Prompt | phone |
| Hint | none |
| Answer | el teléfono |
| Kind | content, noun |
| Grammar | masculine, el |
| Example | ¿Me das tu número de teléfono? / Can you give me your phone number? |
| Spain | none |
| Trick | TELÉFONO sounds just like telephone: tell your friend everything on the phone. |

Why it was flagged:

- One right answer: In everyday English, a bare "phone" usually means a mobile phone, and in Latin America that is "el celular", so a learner could fairly answer "el celular" instead of "el teléfono". Suggested fix: en: telephone

Reviewer's note (not a reason to flag): Another way to fix it is to keep en as "phone" and add the hint "the general word, not specifically a mobile (that's celular)".

The reviewer's own translation: answer "telephone, phone"; example "Will you give me your phone number?".

### convertir-turn-into · rank 371 · convertir

Decide in [decisions/convertir-turn-into.txt](decisions/convertir-turn-into.txt)

| Field | Card |
|---|---|
| Prompt | to turn into |
| Hint | none |
| Answer | convertir |
| Kind | content, verb |
| Grammar | yo convierto · tú conviertes · él convierte (irregular) |
| Example | La bruja convirtió al príncipe en rana. / The witch turned the prince into a frog. |
| Spain | none |
| Trick | CONVERTIR sounds like convert: a magician converts, or turns, a rabbit into a dove. |

Why it was flagged:

- Example uses words not met yet: The example uses words not met before this card: bruja, príncipe, rana. In the frequency phase it may use at most two words not met yet. Suggested fix: npm run draft -- --examples --ids convertir-turn-into

Reviewer's note (not a reason to flag): Much of this word's subtitle frequency comes from reflexive convertirse en (to become), so the editor might mention it in a later card or note; transformar is a rarer near-synonym but is not the natural answer to "to turn into".

The reviewer's own translation: answer "to convert, to turn (something) into"; example "The witch turned the prince into a frog.".

### vuelta-return · rank 375 · vuelta

Decide in [decisions/vuelta-return.txt](decisions/vuelta-return.txt)

| Field | Card |
|---|---|
| Prompt | return |
| Hint | the trip back; de ... = back |
| Answer | la vuelta |
| Kind | content, noun |
| Grammar | feminine, la |
| Example | ¡Qué bueno que estás de vuelta! / It's so good that you're back! |
| Spain | none |
| Trick | VUELTA sounds like volver's daughter: whoever goes out comes back on the return trip. |

Why it was flagged:

- One right answer: The hint 'the trip back; de ... = back' also fits el regreso (estar de regreso is very common in Latin America) and el retorno, so more than one answer is right. Suggested fix: hint: the trip back, as in a round trip (ida y ...); de ... = back; same word as a lap or spin

Reviewer's note (not a reason to flag): The trick works through volver rather than an English sound-alike, which is weak but not false, since vuelta comes from volver.

The reviewer's own translation: answer "return, way back (also turn, lap, stroll); de vuelta = back"; example "How good that you're back!".

### cuanto-how-much-384 · rank 384 · cuanto

Decide in [decisions/cuanto-how-much-384.txt](decisions/cuanto-how-much-384.txt)

| Field | Card |
|---|---|
| Prompt | [how much] does it cost? |
| Hint | none |
| Answer | cuánto |
| Kind | glue, determiner |
| Grammar | none |
| Example | ¿Cuánto cuesta este libro? / How much does this book cost? |
| Spain | none |
| Trick | CUÁNTO sounds like quantity: asking how much is asking the quantity. |

Why it was flagged:

- Meaning: In "¿cuánto cuesta?" the word cuánto stands on its own as a question word of amount (an adverb or pronoun), not as a determiner in front of a noun as in "cuánto dinero", so the pos label is wrong. Suggested fix: pos: adverb

Reviewer's note (not a reason to flag): The prompt does not overlap with the word's other card, "en cuanto" (as soon as), and keeping the question accent on cuánto is correct here.

The reviewer's own translation: answer "cuánto = how much (interrogative); ¿Cuánto cuesta este libro? = How much does this book cost?"; example "How much does this book cost?".

### e-and · rank 387 · e

Decide in [decisions/e-and.txt](decisions/e-and.txt)

| Field | Card |
|---|---|
| Prompt | father [and] son |
| Hint | used instead of y before a word starting with an i sound (i-, hi-) |
| Answer | e |
| Kind | glue, conjunction |
| Grammar | none |
| Example | Mi papá e hijo trabajan juntos. / My dad and son work together. |
| Spain | none |
| Trick | E replaces Y before an EE sound, so you never say y-ee; padre e hijo flows smoothly. |

Why it was flagged:

- Example sentence: Mi papá e hijo is unnatural and confusing: with one possessive it reads as a single person who is both dad and son, and nobody would say it to mean my dad and my son. Suggested fix: example.es: Hablo español e inglés. example.en: I speak Spanish and English.

Reviewer's note (not a reason to flag): The hint could add that y stays before hie- words (agua y hielo), but that doesn't affect this prompt.

The reviewer's own translation: answer "and (form of y used before a word starting with an i sound)"; example "My dad and son work together. (literal; the Spanish suggests one person who is both my dad and son, or leaves 'son' without an owner)".

### odiar-hate · rank 391 · odiar

Decide in [decisions/odiar-hate.txt](decisions/odiar-hate.txt)

| Field | Card |
|---|---|
| Prompt | to hate |
| Hint | none |
| Answer | odiar |
| Kind | content, verb |
| Grammar | yo odio · tú odias · él odia |
| Example | Odio levantarme temprano los lunes. / I hate getting up early on Mondays. |
| Spain | none |
| Trick | ODIAR sounds like "oh dear": oh dear, it's Monday again, and you hate it. |

Why it was flagged:

- Example uses words not met yet: The example uses words not met before this card: levantarme, temprano, lunes. In the frequency phase it may use at most two words not met yet. Suggested fix: npm run draft -- --examples --ids odiar-hate

The reviewer's own translation: answer "to hate"; example "I hate getting up early on Mondays.".

### luz-light · rank 393 · luz

Decide in [decisions/luz-light.txt](decisions/luz-light.txt)

| Field | Card |
|---|---|
| Prompt | light |
| Hint | none |
| Answer | la luz |
| Kind | content, noun |
| Grammar | feminine, la |
| Example | Apaga la luz, por favor. / Turn off the light, please. |
| Spain | none |
| Trick | LUZ sounds like "Lucy": Lucy always flips on the light when she walks in. |

Why it was flagged:

- One right answer: The bare prompt "light" can also be read as an adjective, for weight (ligero) or colour (claro), and nothing rules those readings out. Suggested fix: hint: noun, as in turn on the light

Reviewer's note (not a reason to flag): Luz also commonly means electricity in Latin America (se fue la luz), which a later example could show, but this card's meaning is fine as written.

The reviewer's own translation: answer "the light (noun); also, colloquially, electricity or power"; example "Turn off the light, please.".

### santo-saint · rank 405 · santo

Decide in [decisions/santo-saint.txt](decisions/santo-saint.txt)

| Field | Card |
|---|---|
| Prompt | saint |
| Hint | none |
| Answer | el santo |
| Kind | content, noun |
| Grammar | masculine, el |
| Example | Mi abuela le reza a su santo favorito. / My grandma prays to her favorite saint. |
| Spain | none |
| Trick | SANTO sounds like Santa: Santa Claus is based on a saint, Saint Nicholas. |

Why it was flagged:

- Example uses words not met yet: The example uses words not met before this card: abuela, reza, favorito. In the frequency phase it may use at most two words not met yet. Suggested fix: npm run draft -- --examples --ids santo-saint

Reviewer's note (not a reason to flag): The grammar or a later card could mention that before most names santo shortens to San (San Pedro) and that the feminine is la santa.

The reviewer's own translation: answer "saint (a holy person; noun)"; example "My grandmother prays to her favorite saint.".

### foto-photo · rank 416 · foto

Decide in [decisions/foto-photo.txt](decisions/foto-photo.txt)

| Field | Card |
|---|---|
| Prompt | photo |
| Hint | none |
| Answer | la foto |
| Kind | content, noun |
| Grammar | feminine, la |
| Example | ¿Me tomas una foto con mi mamá? / Can you take a photo of me with my mom? |
| Spain | none |
| Trick | FOTO sounds like photo: just drop the h and add an o, and it is still feminine like la fotografía. |

Why it was flagged:

- Memory trick: The spelling description is wrong: dropping the h from photo gives poto, and no o is added because photo already ends in o; the real change is ph becoming f. Suggested fix: trick: FOTO is just photo spelled the Spanish way, with f instead of ph, and it is feminine because it is short for la fotografía.

Reviewer's note (not a reason to flag): Spain usually says hacer una foto where Latin America says tomar or sacar una foto, but the noun itself is the same, so spain is correctly null.

The reviewer's own translation: answer "the photo, picture (short for la fotografía)"; example "Will you take a photo of me with my mom?".

### idiota-idiot · rank 425 · idiota

Decide in [decisions/idiota-idiot.txt](decisions/idiota-idiot.txt)

| Field | Card |
|---|---|
| Prompt | idiot |
| Hint | none |
| Answer | el idiota |
| Kind | content, noun |
| Grammar | masculine, el |
| Example | No seas idiota, ella te quiere. / Don't be an idiot, she loves you. |
| Spain | none |
| Trick | IDIOTA sounds like 'idiot-a': just add an 'a' to the English idiot. |

Why it was flagged:

- Grammar: Idiota is used for both men and women (el idiota, la idiota), so marking it masculine only would teach learners to say el idiota about a woman. Suggested fix: grammar: gender m/f, article el / la (el idiota for a man, la idiota for a woman)

Reviewer's note (not a reason to flag): Idiota is also often an adjective (es muy idiota), but the noun card is fine as it stands.

The reviewer's own translation: answer "the idiot (a male idiot, or the general dictionary form)"; example "Don't be an idiot, she loves you.".

### andar-walk · rank 426 · andar

Decide in [decisions/andar-walk.txt](decisions/andar-walk.txt)

| Field | Card |
|---|---|
| Prompt | to walk around |
| Hint | to go about on foot, not caminar |
| Answer | andar |
| Kind | content, verb |
| Grammar | yo ando · tú andas · él anda (irregular) |
| Example | Me gusta andar por el parque. / I like walking around the park. |
| Spain | none |
| Trick | ANDAR sounds like "and are": and off you are, walking around town. |

Why it was flagged:

- One right answer: The hint rules out caminar but not pasear, which is a common and correct answer for walking around a place on foot, especially for pleasure. Suggested fix: hint: to go about on foot, not caminar or pasear
- Example sentence: The example uses andar as an infinitive after gusta rather than a conjugated form of andar. Suggested fix: example.es: Ando por el parque todas las mañanas. / example.en: I walk around the park every morning.

Reviewer's note (not a reason to flag): The irregular flag is right because of the preterite anduve, even though the present tense is regular; in most of Latin America caminar is the everyday word for walking, so this sense of andar is less central than the "to be (going around)" card.

The reviewer's own translation: answer "to walk, to go around (on foot); also to be (going around), to be up to"; example "Me gusta andar por el parque. = I like walking around the park.".

### andar-be-doing · rank 426 · andar

Decide in [decisions/andar-be-doing.txt](decisions/andar-be-doing.txt)

| Field | Card |
|---|---|
| Prompt | to be (going around) |
| Hint | how someone is getting on, what they're up to: ¿Cómo ___s? |
| Answer | andar |
| Kind | content, verb |
| Grammar | yo ando · tú andas · él anda (irregular) |
| Example | ¿Cómo andas? ¿Qué andas haciendo? / How are you doing? What are you up to? |
| Spain | none |
| Trick | ANDAR sounds like "and are": and how are you doing these days? |

Why it was flagged:

- One right answer: The prompt 'to be' with 'how someone is getting on' naturally gives estar, and the blank fits it too (¿Cómo estás?), so the hint does not rule out estar. Suggested fix: hint: colloquial 'to be' for how someone is doing or what they're up to, not estar: ¿Cómo ___s? (How's it going?)
- Example sentence: The example is two sentences, and the card asks for one short sentence. Suggested fix: example.es: ¿Qué andas haciendo hoy? / example.en: What are you up to today?

Reviewer's note (not a reason to flag): The irregular flag is right only because of the preterite (anduve); the present forms are regular.

The reviewer's own translation: answer "to be / to get on (colloquial), to be up to (something)"; example "How are you doing? What are you up to?".

### imaginar-imagine · rank 429 · imaginar

Decide in [decisions/imaginar-imagine.txt](decisions/imaginar-imagine.txt)

| Field | Card |
|---|---|
| Prompt | to imagine |
| Hint | none |
| Answer | imaginar |
| Kind | content, verb |
| Grammar | yo imagino · tú imaginas · él imagina |
| Example | Me imagino que estás cansado. / I imagine you're tired. |
| Spain | none |
| Trick | IMAGINAR sounds like imagine-ar: just add -ar to imagine and you're imagining in Spanish. |

Why it was flagged:

- Memory trick: Adding -ar to imagine gives the misspelling imaginear, and a learner could memorize that; the e has to be dropped first. Suggested fix: trick: IMAGINAR is just imagine with the final e swapped for -ar: imagin-AR, to imagine.

Reviewer's note (not a reason to flag): The example uses the pronominal form me imagino, which is the most natural everyday way to say I imagine or I suppose in Latin America, so it is fine for this card.

The reviewer's own translation: answer "to imagine"; example "I imagine (suppose) you're tired.".

### probablemente-probably · rank 436 · probablemente

Decide in [decisions/probablemente-probably.txt](decisions/probablemente-probably.txt)

| Field | Card |
|---|---|
| Prompt | probably |
| Hint | none |
| Answer | probablemente |
| Kind | content, adverb |
| Grammar | none |
| Example | Probablemente llueve mañana. / It'll probably rain tomorrow. |
| Spain | none |
| Trick | PROBABLEMENTE looks like probable plus -mente, Spanish's -ly ending: probably. |

Why it was flagged:

- Example sentence: The plain present 'llueve' for tomorrow's weather sounds unnatural here; speakers say 'va a llover' (or the subjunctive 'llueva'). Suggested fix: example.es: Probablemente va a llover mañana.

Reviewer's note (not a reason to flag): 'Seguramente' is also often used for 'probably' in Latin America, but 'probablemente' is the direct, standard answer for this prompt.

The reviewer's own translation: answer "probably"; example "It probably rains tomorrow.".

### diferente-different · rank 439 · diferente

Decide in [decisions/diferente-different.txt](decisions/diferente-different.txt)

| Field | Card |
|---|---|
| Prompt | different |
| Hint | the look-alike word, not distinto |
| Answer | diferente |
| Kind | content, adjective |
| Grammar | feminine diferente |
| Example | Esta ciudad es muy diferente a la mía. / This city is very different from mine. |
| Spain | none |
| Trick | DIFERENTE sounds like "different-ay": just add a Spanish "ay" to different and you've got it. |

Why it was flagged:

- Memory trick: Saying that adding "ay" to "different" gives you the word suggests the spelling "differente" with a double f and an "ay" ending, but the Spanish has one f and ends in a short "eh" sound. Suggested fix: trick: DIFERENTE is just "different" with one f dropped and an "eh" added at the end: dee-feh-REN-teh.

Reviewer's note (not a reason to flag): The hint is needed because distinto is also a common right answer, and it correctly rules distinto out.

The reviewer's own translation: answer "different"; example "This city is very different from mine.".

### millon-million · rank 440 · millón

Decide in [decisions/millon-million.txt](decisions/millon-million.txt)

| Field | Card |
|---|---|
| Prompt | million |
| Hint | none |
| Answer | el millón |
| Kind | content, noun |
| Grammar | masculine, el |
| Example | Esa casa cuesta un millón de dólares. / That house costs a million dollars. |
| Spain | none |
| Trick | MILLÓN sounds like million with a Spanish accent: just add an O and stress the end. |

Why it was flagged:

- Memory trick: The trick says to add an O to million, but English million already ends in -on, and the Spanish actually drops the second i (millón, not millión), so a learner could misspell it. Suggested fix: trick: MILLÓN is million without the second i, with the stress on the end: mee-YOHN.

Reviewer's note (not a reason to flag): The example also shows the useful pattern un millón de + noun.

The reviewer's own translation: answer "million (noun)"; example "That house costs a million dollars.".

### dolar-dollar · rank 441 · dólar

Decide in [decisions/dolar-dollar.txt](decisions/dolar-dollar.txt)

| Field | Card |
|---|---|
| Prompt | dollar |
| Hint | none |
| Answer | el dólar |
| Kind | content, noun |
| Grammar | masculine, el |
| Example | Me prestas diez dólares? / Can you lend me ten dollars? |
| Spain | none |
| Trick | DÓLAR sounds just like dollar, said with a little Spanish stress on the first syllable. |

Why it was flagged:

- Example sentence: The Spanish question is missing its opening question mark (¿). Suggested fix: example.es: ¿Me prestas diez dólares?

Reviewer's note (not a reason to flag): The plural dólares has an irregular-looking -es ending and keeps the accent, so learners may find it useful to see that in the example.

The reviewer's own translation: answer "dollar (noun, masculine)"; example "Will you lend me ten dollars?".

### tampoco-neither · rank 444 · tampoco

Decide in [decisions/tampoco-neither.txt](decisions/tampoco-neither.txt)

| Field | Card |
|---|---|
| Prompt | neither, not either |
| Hint | me neither; the negative of también |
| Answer | tampoco |
| Kind | content, adverb |
| Grammar | none |
| Example | Yo no quiero ir. Yo tampoco. / I don't want to go. Me neither. |
| Spain | none |
| Trick | TAMPOCO sounds like 'tam, poco': 'that much? too little!' Neither of us wants it either. |

Why it was flagged:

- Example sentence: The example is two lines from two different speakers with nothing to mark the change of speaker, so it reads as one person contradicting themselves, and it is not one sentence. Suggested fix: example.es: Ana no quiere ir y yo tampoco. / example.en: Ana doesn't want to go, and neither do I.

Reviewer's note (not a reason to flag): The hint is needed because it rules out ni (as in ni... ni); the trick is weak and its last sentence is clumsy, but it says nothing false.

The reviewer's own translation: answer "neither, not either (adverb: the negative counterpart of también, as in 'yo tampoco' = 'me neither')"; example "I don't want to go. I neither (Me neither).".

### asegurar-make-sure · rank 447 · asegurar

Decide in [decisions/asegurar-make-sure.txt](decisions/asegurar-make-sure.txt)

| Field | Card |
|---|---|
| Prompt | to make sure |
| Hint | none |
| Answer | asegurarse |
| Kind | content, verb |
| Grammar | yo me aseguro · tú te aseguras · él se asegura |
| Example | Asegúrate de cerrar la puerta. / Make sure you lock the door. |
| Spain | none |
| Trick | ASEGURARSE sounds like "a secure-arse": make sure everything is secure before you sit down. |

Why it was flagged:

- Example sentence: The English says "lock", but cerrar la puerta means close the door; lock would be cerrar con llave. Suggested fix: example.en: Make sure you close the door.

Reviewer's note (not a reason to flag): The trick's "arse" pun is a bit crude for a learner app, but it is not wrong.

The reviewer's own translation: answer "to make sure (oneself), to ensure"; example "Make sure to close the door.".

### presentar-present · rank 450 · presentar

Decide in [decisions/presentar-present.txt](decisions/presentar-present.txt)

| Field | Card |
|---|---|
| Prompt | to present |
| Hint | show or hand in |
| Answer | presentar |
| Kind | content, verb |
| Grammar | yo presento · tú presentas · él presenta |
| Example | Mañana presento mi proyecto en clase. / Tomorrow I present my project in class. |
| Spain | none |
| Trick | PRESENTAR looks like present plus -ar: you present your project on stage. |

Why it was flagged:

- One right answer: The hint "show or hand in" uses the usual English meanings of mostrar and entregar, so a learner could reasonably give one of those instead of presentar. Suggested fix: hint: a project, report or document

Reviewer's note (not a reason to flag): The new hint still has to separate this card from the "to introduce" card, and "a project, report or document" does that.

The reviewer's own translation: answer "to present, to submit (a project, report, evidence); also to introduce"; example "Tomorrow I'm presenting my project in class.".

### medico-doctor · rank 458 · médico

Decide in [decisions/medico-doctor.txt](decisions/medico-doctor.txt)

| Field | Card |
|---|---|
| Prompt | doctor |
| Hint | physician, not doctor |
| Answer | el médico |
| Kind | content, noun |
| Grammar | masculine, el |
| Example | Tengo que ir al médico mañana. / I have to go to the doctor tomorrow. |
| Spain | none |
| Trick | MÉDICO sounds like medic: the medic is the doctor who fixes you. |

Why it was flagged:

- One right answer: The prompt says doctor and the hint says not doctor, which contradicts itself and doesn't clearly rule out el doctor, an equally common answer. Suggested fix: hint: physician; not the cognate el doctor

Reviewer's note (not a reason to flag): The feminine noun is la médica, which the editor could mention, since many speakers also say la doctora.

The reviewer's own translation: answer "the doctor, physician (noun, masculine)"; example "I have to go to the doctor tomorrow.".

### unir-unite · rank 462 · unir

Decide in [decisions/unir-unite.txt](decisions/unir-unite.txt)

| Field | Card |
|---|---|
| Prompt | to unite |
| Hint | to join together; unirse = to join a group |
| Answer | unir |
| Kind | content, verb |
| Grammar | yo uno · tú unes · él une |
| Example | ¿Quieres unirte a nosotros? / Do you want to join us? |
| Spain | none |
| Trick | UNIR sounds like 'unit': when you unite people, they become one unit. |

Why it was flagged:

- Example sentence: The example leaves the target verb as an infinitive after quieres, and it uses the pronominal unirse (to join a group) rather than this card's meaning of unir, to unite or join together. Suggested fix: example.es: La música une a las personas. / example.en: Music unites people.

Reviewer's note (not a reason to flag): The hint's aside about unirse is correct and rules out juntar, but since it mentions another verb, the editor could shorten it to just "to join together".

The reviewer's own translation: answer "to unite, to join (together), to connect"; example "Do you want to join us?".

### tranquilo-calm · rank 467 · tranquilo

Decide in [decisions/tranquilo-calm.txt](decisions/tranquilo-calm.txt)

| Field | Card |
|---|---|
| Prompt | calm |
| Hint | none |
| Answer | tranquilo |
| Kind | content, adjective |
| Grammar | feminine tranquila |
| Example | Tranquila, todo va a estar bien. / Stay calm, everything is going to be fine. |
| Spain | none |
| Trick | TRANQUILO sounds like tranquil: a tranquil lake is perfectly calm. |

Why it was flagged:

- One right answer: With no hint, the bare prompt 'calm' also allows calmado, a common Latin American adjective, so the learner cannot tell which word is wanted. Suggested fix: hint: the everyday word, also said on its own to mean 'Relax!'

Reviewer's note (not a reason to flag): The example uses the feminine form tranquila said on its own as a reassurance, which is natural and fine, but the editor may want to note that it shows the feminine form, not es.

The reviewer's own translation: answer "calm, relaxed, quiet (adjective)"; example "(Stay) calm, everything is going to be fine.".

### estupido-stupid · rank 471 · estúpido

Decide in [decisions/estupido-stupid.txt](decisions/estupido-stupid.txt)

| Field | Card |
|---|---|
| Prompt | stupid |
| Hint | none |
| Answer | estúpido |
| Kind | content, adjective |
| Grammar | feminine estúpida |
| Example | ¡Qué idea tan estúpida! / What a stupid idea! |
| Spain | none |
| Trick | ESTÚPIDO sounds almost exactly like "stupid" with an extra "es" in front and an "o" on the end. |

Why it was flagged:

- Example sentence: The example sentence has no conjugated verb, so it does not show the word in a full clause as required. Suggested fix: example.es: No es una pregunta estúpida. / example.en: It's not a stupid question.

Reviewer's note (not a reason to flag): Tonto is a near-synonym but is closer to dumb or silly, so estúpido is the clear answer for stupid without a hint.

The reviewer's own translation: answer "stupid (adjective)"; example "What a stupid idea!".

### derecho-right-side · rank 483 · derecho

Decide in [decisions/derecho-right-side.txt](decisions/derecho-right-side.txt)

| Field | Card |
|---|---|
| Prompt | right |
| Hint | the side, not left |
| Answer | derecho |
| Kind | content, adjective |
| Grammar | feminine derecha |
| Example | Me duele el brazo derecho. / My right arm hurts. |
| Spain | none |
| Trick | DERECHO sounds like "direct, yo": most people direct things with their right hand. |

Why it was flagged:

- One right answer: The hint 'the side, not left' points to the side itself, so a learner could fairly answer the noun 'la derecha' (as in 'a la derecha') rather than the adjective 'derecho'. Suggested fix: hint: describing a noun, the side, not left, as in my right arm

Reviewer's note (not a reason to flag): The new hint also keeps this card apart from the word's other cards: el derecho (something you are entitled to) and derecho (straight ahead).

The reviewer's own translation: answer "right (on the right-hand side, as opposed to left); also straight"; example "My right arm hurts.".

### atrapar-catch · rank 484 · atrapar

Decide in [decisions/atrapar-catch.txt](decisions/atrapar-catch.txt)

| Field | Card |
|---|---|
| Prompt | to catch |
| Hint | trap, capture |
| Answer | atrapar |
| Kind | content, verb |
| Grammar | yo atrapo · tú atrapas · él atrapa |
| Example | La policía atrapó al ladrón anoche. / The police caught the thief last night. |
| Spain | none |
| Trick | ATRAPAR sounds like a trap: you catch someone by setting a trap. |

Why it was flagged:

- One right answer: The hint 'trap, capture' also points to capturar, and agarrar is an equally common Latin American answer for 'to catch'. Suggested fix: hint: a ball or a thief, as in a trap; not agarrar

Reviewer's note (not a reason to flag): Spain often says coger for 'to catch', but atrapar is also normal there, so leaving spain null is acceptable.

The reviewer's own translation: answer "to catch, to trap, to capture"; example "The police caught the thief last night.".

### bastar-be-enough · rank 485 · bastar

Decide in [decisions/bastar-be-enough.txt](decisions/bastar-be-enough.txt)

| Field | Card |
|---|---|
| Prompt | to be enough |
| Hint | one verb |
| Answer | bastar |
| Kind | content, verb |
| Grammar | yo basto · tú bastas · él basta |
| Example | ¡Basta! No quiero hablar más de eso. / Enough! I don't want to talk about that anymore. |
| Spain | none |
| Trick | BASTA sounds like pasta: one big plate of pasta is enough for anyone. |

Why it was flagged:

- One right answer: In Latin America, alcanzar is a very common one-word verb for 'to be enough' (El dinero no alcanza), and the hint 'one verb' doesn't rule it out. Suggested fix: hint: one verb, also shouted on its own to mean 'Stop it!' (not alcanzar)
- Example sentence: Here ¡Basta! is a fixed interjection meaning 'Stop it!', not the verb conjugated in a sentence with the meaning 'to be enough'. Suggested fix: example.es: Con un café me basta para empezar el día. example.en: One coffee is enough for me to start the day.

Reviewer's note (not a reason to flag): The interjection ¡Basta! is still worth teaching, maybe in the hint or as a second example, since learners hear it all the time in films and TV.

The reviewer's own translation: answer "to be enough, to suffice (Spanish usually puts the thing that is enough as the subject: basta con eso, that's enough)"; example "Enough! I don't want to talk about that anymore.".

### tirar-throw · rank 486 · tirar

Decide in [decisions/tirar-throw.txt](decisions/tirar-throw.txt)

| Field | Card |
|---|---|
| Prompt | to throw |
| Hint | a ball, a stone |
| Answer | tirar |
| Kind | content, verb |
| Grammar | yo tiro · tú tiras · él tira |
| Example | Tírame la pelota. / Throw me the ball. |
| Spain | none |
| Trick | TIRAR sounds like a T. rex roaring as it throws a rock at you. |

Why it was flagged:

- One right answer: The hint 'a ball, a stone' doesn't rule out lanzar, a common word that is just as right for throwing a ball or a stone (and aventar is common in Mexico). Suggested fix: hint: a ball, a stone; the everyday word that also means to throw away, not lanzar

Reviewer's note (not a reason to flag): The hint correctly separates this card from the 'to throw away' card, but it still needs to rule out lanzar.

The reviewer's own translation: answer "to throw, to toss (also: to throw away, to pull down)"; example "Throw me the ball.".

### senorita-miss · rank 495 · señorita

Decide in [decisions/senorita-miss.txt](decisions/senorita-miss.txt)

| Field | Card |
|---|---|
| Prompt | miss |
| Hint | polite word for a young or unmarried woman |
| Answer | la señorita |
| Kind | content, noun |
| Grammar | feminine, la |
| Example | Disculpe, señorita, ¿dónde está la estación? / Excuse me, miss, where is the station? |
| Spain | none |
| Trick | SEÑORITA sounds like 'senior eater': the polite waiter calls her miss before the senior eater orders. |

Why it was flagged:

- Latin American usage: The example uses the usted command 'Disculpe', but the card must use the informal tú register. Suggested fix: example.es: Disculpa, señorita, ¿dónde está la estación?

Reviewer's note (not a reason to flag): The hint is needed here, because it rules out 'extrañar' (to miss someone) and other senses of 'miss'.

The reviewer's own translation: answer "the young lady, miss (polite term for a young or unmarried woman)"; example "Excuse me, miss, where is the station?".

### temer-fear · rank 498 · temer

Decide in [decisions/temer-fear.txt](decisions/temer-fear.txt)

| Field | Card |
|---|---|
| Prompt | to fear |
| Hint | none |
| Answer | temer |
| Kind | content, verb |
| Grammar | yo temo · tú temes · él teme |
| Example | Me temo que no puedo ir. / I'm afraid I can't go. |
| Spain | none |
| Trick | TEMER sounds like tremor: when you fear something, your hands shake with a tremor. |

Why it was flagged:

- Example sentence: The example uses the reflexive set phrase 'me temo que', which is a polite way to say 'I'm sorry to say' and does not mean fearing something, so it does not show this card's meaning. Suggested fix: example.es: Le temo a la oscuridad. / example.en: I fear the dark.

Reviewer's note (not a reason to flag): In everyday Latin American speech people usually say 'tener miedo (de)' rather than temer, but that is a phrase and not a single verb, so temer is still the one dictionary answer for 'to fear'.

The reviewer's own translation: answer "temer = to fear, to be afraid of"; example "I'm afraid I can't go. (This is the polite 'I'm sorry to say' meaning of temerse, not real fear.)".

### bienvenido-welcome · rank 500 · bienvenido

Decide in [decisions/bienvenido-welcome.txt](decisions/bienvenido-welcome.txt)

| Field | Card |
|---|---|
| Prompt | welcome |
| Hint | none |
| Answer | bienvenido |
| Kind | content, adjective |
| Grammar | feminine bienvenida |
| Example | ¡Bienvenidos a mi casa, amigos! / Welcome to my house, friends! |
| Spain | none |
| Trick | BIENVENIDO is bien (well) plus venido (come): you have come well, so welcome! |

Why it was flagged:

- One right answer: Bare "welcome" can also be the noun ("a warm welcome"), so "la bienvenida" would also be a right answer. Suggested fix: hint: greeting a guest, as in 'Welcome!' (adjective, not the noun)
- Example sentence: The example sentence has no conjugated verb. Suggested fix: example.es: Siempre eres bienvenido aquí. / example.en: You're always welcome here.

Reviewer's note (not a reason to flag): The trick's breakdown into bien + venido (participle of venir) is accurate.

The reviewer's own translation: answer "welcome (adjective/interjection: welcome, said to someone arriving)"; example "Welcome to my house, friends!".

### referir-refer · rank 502 · referir

Decide in [decisions/referir-refer.txt](decisions/referir-refer.txt)

| Field | Card |
|---|---|
| Prompt | to refer (to) |
| Hint | none |
| Answer | referir |
| Kind | content, verb |
| Grammar | yo refiero · tú refieres · él refiere (irregular) |
| Example | ¿A qué te refieres? / What do you mean? |
| Spain | none |
| Trick | REFERIR sounds like refer: when you refer to something, you point at what you mean. |

Why it was flagged:

- Meaning: Plain referir means to refer someone somewhere or to recount something, while the everyday 'to refer to, to mean' that this card and its example teach is the reflexive referirse (a). Suggested fix: es: referirse
- One right answer: Someone who knows Spanish well would answer 'referirse (a)' for 'to refer (to)', not plain referir. Suggested fix: es: referirse
- Grammar: The strip gives non-reflexive forms (refiero, refieres, refiere), so a learner would say the wrong 'refiero a eso' instead of 'me refiero a eso'. Suggested fix: grammar.present: yo me refiero, tu te refieres, el se refiere (irregular true)

Reviewer's note (not a reason to flag): The example and its translation are good and only need es and grammar switched to referirse; the irregular flag is right (e to ie in the present, refirió in the preterite).

The reviewer's own translation: answer "referir on its own means to refer someone (to a doctor, say) or to tell or recount something; 'to refer to' or 'to mean' is the reflexive referirse a."; example "What are you referring to? / What do you mean?".

### despertar-wake-up · rank 505 · despertar

Decide in [decisions/despertar-wake-up.txt](decisions/despertar-wake-up.txt)

| Field | Card |
|---|---|
| Prompt | to wake up |
| Hint | none |
| Answer | despertar |
| Kind | content, verb |
| Grammar | yo despierto · tú despiertas · él despierta (irregular) |
| Example | ¡Despierta! Ya es tarde. / Wake up! It's already late. |
| Spain | none |
| Trick | DESPERTAR sounds like desperate star: a desperate star shakes the sleepy sun to wake it up every morning. |

Why it was flagged:

- One right answer: With no hint, a fluent speaker could also answer despertarse for 'to wake up', because that is the usual Spanish for waking up yourself. Suggested fix: hint: the base verb, without -se

Reviewer's note (not a reason to flag): The e to ie stem change (despierto) means irregular: true is correct, and ¡Despierta! is a natural informal command in Latin America, alongside ¡Despiértate!.

The reviewer's own translation: answer "to wake (someone) up, to awaken; the reflexive despertarse means to wake up yourself"; example "Wake up! It's already late.".

### proteger-protect · rank 506 · proteger

Decide in [decisions/proteger-protect.txt](decisions/proteger-protect.txt)

| Field | Card |
|---|---|
| Prompt | to protect |
| Hint | none |
| Answer | proteger |
| Kind | content, verb |
| Grammar | yo protejo · tú proteges · él protege |
| Example | Yo siempre te voy a proteger. / I'm always going to protect you. |
| Spain | none |
| Trick | PROTEGER sounds like protect-HAIR: you wear a helmet to protect your hair and head. |

Why it was flagged:

- Example sentence: The example leaves proteger in the infinitive after voy a, so the card's verb is never conjugated. Suggested fix: example.es: Mi hermano mayor siempre me protege. / example.en: My older brother always protects me.

Reviewer's note (not a reason to flag): The yo form protejo is only a spelling change (g to j before o), so irregular false is correct.

The reviewer's own translation: answer "to protect"; example "I'm always going to protect you.".

### cual-which-relative · rank 507 · cual

Decide in [decisions/cual-which-relative.txt](decisions/cual-which-relative.txt)

| Field | Card |
|---|---|
| Prompt | the reason for [which] I came |
| Hint | relative, after el/la/lo, no accent |
| Answer | cual |
| Kind | glue, pronoun |
| Grammar | none |
| Example | Llegó tarde, lo cual me molestó mucho. / He arrived late, which really bothered me. |
| Spain | none |
| Trick | CUAL sounds like the start of quality: the quality which matters most. |

Why it was flagged:

- One right answer: The prompt translates as 'la razón por la ___ vine', and 'que' fits just as well and is very common in Latin America ('por la que vine'); the hint does not rule it out, because 'que' also comes after la and has no accent. Suggested fix: hint: relative, after el/la/lo, no accent; not que

Reviewer's note (not a reason to flag): The prompt uses 'la cual' and the example uses 'lo cual', which nicely shows both patterns.

The reviewer's own translation: answer "which (relative pronoun, used after el/la/lo/los/las: el cual, la cual, lo cual)"; example "He arrived late, which bothered me a lot.".

### caballero-gentleman · rank 519 · caballero

Decide in [decisions/caballero-gentleman.txt](decisions/caballero-gentleman.txt)

| Field | Card |
|---|---|
| Prompt | gentleman |
| Hint | none |
| Answer | el caballero |
| Kind | content, noun |
| Grammar | masculine, el |
| Example | Buenas noches, damas y caballeros. / Good evening, ladies and gentlemen. |
| Spain | none |
| Trick | CABALLERO sounds like "cab a hero": a true gentleman calls a cab for you like a hero. |

Why it was flagged:

- Example sentence: The example sentence has no conjugated verb, so it does not show the word in a full sentence. Suggested fix: example.es: Tu papá es todo un caballero. / example.en: Your dad is a real gentleman.

Reviewer's note (not a reason to flag): Señor can sometimes mean "gentleman" too, but caballero is the standard answer, and it is clearly separate from the "knight" card.

The reviewer's own translation: answer "gentleman (also knight, horseman)"; example "Good evening, ladies and gentlemen.".

### partir-split · rank 542 · partir

Decide in [decisions/partir-split.txt](decisions/partir-split.txt)

| Field | Card |
|---|---|
| Prompt | to split |
| Hint | cut or break into pieces |
| Answer | partir |
| Kind | content, verb |
| Grammar | yo parto · tú partes · él parte |
| Example | ¿Partes el pastel en ocho pedazos? / Will you split the cake into eight pieces? |
| Spain | none |
| Trick | PARTIR splits something into PARTs, so everyone gets a part. |

Why it was flagged:

- One right answer: The prompt "to split" with the hint "cut or break into pieces" also fits dividir (the usual word for splitting something like a bill), cortar and romper, so it doesn't lead to partir alone. Suggested fix: hint: split something physical into pieces, like bread or a cake (not dividir, cortar or romper)

Reviewer's note (not a reason to flag): The example's English "Will you split" works as a request reading of the Spanish present-tense question.

The reviewer's own translation: answer "to split, to cut or break into pieces (also: to depart)"; example "Do you cut / Will you cut the cake into eight pieces?".

### lamentar-regret · rank 552 · lamentar

Decide in [decisions/lamentar-regret.txt](decisions/lamentar-regret.txt)

| Field | Card |
|---|---|
| Prompt | to regret |
| Hint | to be sorry about something, not to repent |
| Answer | lamentar |
| Kind | content, verb |
| Grammar | yo lamento · tú lamentas · él lamenta |
| Example | Lamento mucho tu pérdida. / I'm very sorry for your loss. |
| Spain | none |
| Trick | LAMENTAR sounds like lament: you lament what you regret. |

Why it was flagged:

- One right answer: The hint 'to be sorry about something' also points to sentir (as in 'lo siento', 'siento mucho tu pérdida'), which is the most common way to say you're sorry, so the hint leaves two right answers. Suggested fix: hint: to lament or be sorry about something (not to repent, not sentir)

Reviewer's note (not a reason to flag): Lamentar sounds a bit more formal than sentir, and condolences like this example are where it's used most in everyday speech.

The reviewer's own translation: answer "to regret, to be sorry about, to lament"; example "I'm very sorry for your loss.".

### siguiente-next · rank 557 · siguiente

Decide in [decisions/siguiente-next.txt](decisions/siguiente-next.txt)

| Field | Card |
|---|---|
| Prompt | next |
| Hint | the following one, not próximo |
| Answer | siguiente |
| Kind | content, adjective |
| Grammar | feminine siguiente |
| Example | Nos vemos la semana siguiente. / See you the following week. |
| Spain | none |
| Trick | SIGUIENTE sounds like 'see, good gente': see the good people waiting in line, then call the next one. |

Why it was flagged:

- Example sentence: In everyday speech, 'see you next week' is 'Nos vemos la próxima semana' or 'la semana que viene'; 'la semana siguiente' means the week after some other point in time, so this sentence sounds unnatural as a goodbye. Suggested fix: example.es: Me bajo en la siguiente parada. / example.en: I'm getting off at the next stop.

Reviewer's note (not a reason to flag): The hint names próximo to rule it out, which works, but it shows the learner the other answer.

The reviewer's own translation: answer "next, following (adjective)"; example "See you the following week.".

### demas-the-others · rank 565 · demás

Decide in [decisions/demas-the-others.txt](decisions/demas-the-others.txt)

| Field | Card |
|---|---|
| Prompt | don't worry about [the others] |
| Hint | the rest of the people, used after los; not otros |
| Answer | demás |
| Kind | glue, pronoun |
| Grammar | none |
| Example | No te preocupes por los demás. / Don't worry about the others. |
| Spain | none |
| Trick | DEMÁS sounds like the mass: the whole mass of everyone else, the rest of them. |

Why it was flagged:

- Meaning: The brackets cover 'the others', but the answer is only demás, and 'the' is the separate word los, so a learner would memorize demás as meaning 'the others'. Suggested fix: en: don't worry about the [others]

Reviewer's note (not a reason to flag): The hint is needed and works: it rules out otros and makes clear that the answer is the word after los.

The reviewer's own translation: answer "demás = the rest, the others (los demás = the other people, everyone else)"; example "Don't worry about the others.".

### encargar-handle · rank 572 · encargar

Decide in [decisions/encargar-handle.txt](decisions/encargar-handle.txt)

| Field | Card |
|---|---|
| Prompt | to take care of |
| Hint | handle a task; used with se: me encargo |
| Answer | encargar |
| Kind | content, verb |
| Grammar | yo encargo · tú encargas · él encarga |
| Example | Tranquilo, yo me encargo de todo. / Relax, I'll take care of everything. |
| Spain | none |
| Trick | ENCARGAR sounds like "in cargo": you take charge of the cargo and handle it yourself. |

Why it was flagged:

- Meaning: Plain encargar means to order or to entrust, while to take care of is the meaning of the pronominal verb encargarse (de), so es does not match the prompt. Suggested fix: es: encargarse
- One right answer: The hint shows the answer (me encargo), so it gives it away instead of only ruling out other answers such as cuidar or ocuparse. Suggested fix: hint: handle a task or be in charge of it; reflexive verb used with de
- Grammar: For this meaning the dictionary form is encargarse, and its present forms need the reflexive pronouns. Suggested fix: es: encargarse; grammar.present: yo me encargo, tú te encargas, él se encarga (irregular: false)

Reviewer's note (not a reason to flag): The preterite encargué is only a spelling change, so irregular: false is correct.

The reviewer's own translation: answer "encargar: to order (goods), to commission, to put someone in charge of; only the pronominal encargarse (de) means to take care of / handle"; example "Relax, I'll take care of everything.".

### personal-personal · rank 578 · personal

Decide in [decisions/personal-personal.txt](decisions/personal-personal.txt)

| Field | Card |
|---|---|
| Prompt | personal |
| Hint | none |
| Answer | personal |
| Kind | content, adjective |
| Grammar | feminine personal |
| Example | No es nada personal, es solo trabajo. / It's nothing personal, it's just business. |
| Spain | none |
| Trick | PERSONAL is spelled exactly like the English word, but stress the end: per-so-NAHL, like a personal secret you keep for last. |

Why it was flagged:

- Example sentence: The Spanish says 'es solo trabajo' (it's just work), but the translation says 'it's just business', which could teach the learner that trabajo means business. Suggested fix: example.en: It's nothing personal, it's just work.

Reviewer's note (not a reason to flag): Personal is also a noun (el personal, staff), but this adjective card is clear without a hint.

The reviewer's own translation: answer "personal (adjective: relating to a particular person, private)"; example "It's nothing personal, it's just work.".

### linea-line · rank 579 · línea

Decide in [decisions/linea-line.txt](decisions/linea-line.txt)

| Field | Card |
|---|---|
| Prompt | line |
| Hint | none |
| Answer | la línea |
| Kind | content, noun |
| Grammar | feminine, la |
| Example | Dibuja una línea recta en el papel. / Draw a straight line on the paper. |
| Spain | none |
| Trick | LÍNEA sounds like linear: a linear drawing is just one straight line. |

Why it was flagged:

- Example uses words not met yet: The example uses words not met before this card: Dibuja, recta, papel. In the frequency phase it may use at most two words not met yet. Suggested fix: npm run draft -- --examples --ids linea-line

Reviewer's note (not a reason to flag): Bare "line" most naturally gives línea, but a short hint such as "a drawn line, a phone line" would help rule out fila (a queue of people) and renglón (a line of text).

The reviewer's own translation: answer "line (a drawn mark; also a phone, bus or metro line)"; example "Draw a straight line on the paper.".

### pena-embarrassment · rank 581 · pena

Decide in [decisions/pena-embarrassment.txt](decisions/pena-embarrassment.txt)

| Field | Card |
|---|---|
| Prompt | embarrassment |
| Hint | Latin American, as in me da ___; not vergüenza |
| Answer | la pena |
| Kind | content, noun |
| Grammar | feminine, la |
| Example | Me da pena hablar en público. / I'm embarrassed to speak in public. |
| Spain | vergüenza |
| Trick | PENA sounds like pain: embarrassment is the pain of everyone looking at you. |

Why it was flagged:

- Latin American usage: Pena as embarrassment is regional (Mexico, Central America, Colombia, Venezuela), not general Latin American; in the Southern Cone and Peru me da pena means sadness and vergüenza is used, so the hint's label misleads the learner. Suggested fix: hint: Mexico, Central America, Colombia, as in me da ___; not vergüenza

Reviewer's note (not a reason to flag): Spain is correctly vergüenza, but vergüenza is also the normal word in much of South America, so the regional label in the hint matters.

The reviewer's own translation: answer "la pena: embarrassment, shyness (Mexico, Central America, Colombia, Venezuela); elsewhere sorrow, pity, penalty"; example "It embarrasses me to speak in public.".

### soler-usually · rank 587 · soler

Decide in [decisions/soler-usually.txt](decisions/soler-usually.txt)

| Field | Card |
|---|---|
| Prompt | to usually do, used to |
| Hint | none |
| Answer | soler |
| Kind | content, verb |
| Grammar | yo suelo · tú sueles · él suele (irregular) |
| Example | Yo solía vivir cerca de la playa. / I used to live near the beach. |
| Spain | none |
| Trick | SOLER sounds like solar: the sun usually rises every morning, just like it used to. |

Why it was flagged:

- Meaning: The 'used to' gloss is wrong for the verb as a whole: it only matches the imperfect solía, while suelo means 'I usually', not 'I used to', so learners would mix up the tenses. Suggested fix: en: to usually (do)

Reviewer's note (not a reason to flag): The past example is correct, but a present-tense one such as 'Suelo desayunar en casa. / I usually have breakfast at home.' would better show the core 'usually' meaning, and the trick's 'used to' wording could be cut along with the gloss.

The reviewer's own translation: answer "soler = to usually (do something), to tend to, to be in the habit of (followed by an infinitive); only its imperfect forms (solía) mean 'used to'."; example "I used to live near the beach.".

### camara-camera · rank 599 · cámara

Decide in [decisions/camara-camera.txt](decisions/camara-camera.txt)

| Field | Card |
|---|---|
| Prompt | camera |
| Hint | none |
| Answer | la cámara |
| Kind | content, noun |
| Grammar | feminine, la |
| Example | Sonríe, que hay una cámara. / Smile, there's a camera. |
| Spain | none |
| Trick | CÁMARA sounds like camera with an extra a: say cheese, the cámara is rolling. |

Why it was flagged:

- Memory trick: The trick says cámara is camera with an extra a, but the two words have the same number of letters: the e in camera becomes an a, so the spelling claim is false. Suggested fix: trick: CÁMARA is camera with the e swapped for an a: say cheese, the cámara is rolling.

Reviewer's note (not a reason to flag): In Mexico, ¡cámara! is also common slang for 'okay / deal', which the editor might mention somewhere else, but camera is the right core meaning for this card.

The reviewer's own translation: answer "the camera (also: chamber, as in a legislative chamber)"; example "Smile, there's a camera.".

### abandonar-abandon · rank 611 · abandonar

Decide in [decisions/abandonar-abandon.txt](decisions/abandonar-abandon.txt)

| Field | Card |
|---|---|
| Prompt | to abandon |
| Hint | none |
| Answer | abandonar |
| Kind | content, verb |
| Grammar | yo abandono · tú abandonas · él abandona |
| Example | Nunca te voy a abandonar. / I'm never going to abandon you. |
| Spain | none |
| Trick | ABANDONAR sounds like "abandon" plus "-ar": just add the Spanish verb ending to the English word. |

Why it was flagged:

- Example sentence: The sentence uses abandonar in the infinitive after voy a, but the card's own verb must appear conjugated. Suggested fix: example.es: Mi papá nos abandonó cuando yo era niño. / example.en: My dad abandoned us when I was a kid.

Reviewer's note (not a reason to flag): Dejar can also mean "to leave", but for the prompt "to abandon" abandonar is the clear answer, so the card needs no hint.

The reviewer's own translation: answer "to abandon, to leave (someone or something) behind, to give up"; example "I'm never going to abandon you.".

### averiguar-find-out · rank 619 · averiguar

Decide in [decisions/averiguar-find-out.txt](decisions/averiguar-find-out.txt)

| Field | Card |
|---|---|
| Prompt | to find out |
| Hint | by investigating |
| Answer | averiguar |
| Kind | content, verb |
| Grammar | yo averiguo · tú averiguas · él averigua |
| Example | Voy a averiguar quién lo hizo. / I'm going to find out who did it. |
| Spain | none |
| Trick | AVERIGUAR sounds like "a very good war": a detective wages a very good war on mystery to find out the truth. |

Why it was flagged:

- Example sentence: The example uses averiguar only as an infinitive after voy a, while the card's verb must appear conjugated. Suggested fix: example.es: Ya averigüé quién lo hizo. example.en: I already found out who did it.

Reviewer's note (not a reason to flag): The preterite yo form averigüé is only a spelling change (gu to gü), so irregular false is correct.

The reviewer's own translation: answer "to find out, to ascertain, to look into (by asking or investigating)"; example "I'm going to find out who did it.".

### bailar-dance · rank 620 · bailar

Decide in [decisions/bailar-dance.txt](decisions/bailar-dance.txt)

| Field | Card |
|---|---|
| Prompt | to dance |
| Hint | none |
| Answer | bailar |
| Kind | content, verb |
| Grammar | yo bailo · tú bailas · él baila |
| Example | ¿Quieres bailar conmigo? / Do you want to dance with me? |
| Spain | none |
| Trick | BAILAR sounds like "buy a lar(ge) ticket": you buy a large ticket to the ball so you can dance all night. |

Why it was flagged:

- Example sentence: The example uses bailar only as an infinitive after quieres, but the target verb itself should be conjugated. Suggested fix: example.es: Mi hermana baila muy bien. / example.en: My sister dances very well.

The reviewer's own translation: answer "to dance"; example "Do you want to dance with me?".

### gusto-pleasure · rank 625 · gusto

Decide in [decisions/gusto-pleasure.txt](decisions/gusto-pleasure.txt)

| Field | Card |
|---|---|
| Prompt | pleasure |
| Hint | as in mucho ___, nice to meet you |
| Answer | el gusto |
| Kind | content, noun |
| Grammar | masculine, el |
| Example | Mucho gusto, me llamo Ana. / Nice to meet you, my name is Ana. |
| Spain | none |
| Trick | GUSTO sounds like gusto: meeting someone with gusto shows the pleasure is all yours. |

Why it was flagged:

- Memory trick: The trick reverses the set phrase: you say 'the pleasure is all mine' when you meet someone, and 'all yours' gets the courtesy backwards and is confusing. Suggested fix: trick: Say 'mucho gusto' with real gusto when you meet someone, because the pleasure is all mine.

Reviewer's note (not a reason to flag): The hint is needed: without it, a learner would answer el placer for 'pleasure', and the 'mucho ___' frame rules that out.

The reviewer's own translation: answer "the pleasure; (also) taste, liking"; example "Nice to meet you (lit. much pleasure), my name is Ana.".

### limpiar-clean · rank 631 · limpiar

Decide in [decisions/limpiar-clean.txt](decisions/limpiar-clean.txt)

| Field | Card |
|---|---|
| Prompt | to clean |
| Hint | none |
| Answer | limpiar |
| Kind | content, verb |
| Grammar | yo limpio · tú limpias · él limpia |
| Example | Tengo que limpiar mi cuarto hoy. / I have to clean my room today. |
| Spain | none |
| Trick | LIMPIAR sounds like "limp pier": you clean the dirty, limp old pier until it shines. |

Why it was flagged:

- Example sentence: The example uses limpiar as an infinitive after tengo que instead of conjugating it. Suggested fix: example.es: Limpio mi cuarto todos los sábados. example.en: I clean my room every Saturday.

The reviewer's own translation: answer "to clean"; example "I have to clean my room today.".

### monton-pile · rank 638 · montón

Decide in [decisions/monton-pile.txt](decisions/monton-pile.txt)

| Field | Card |
|---|---|
| Prompt | pile |
| Hint | also a lot, as in un montón de |
| Answer | el montón |
| Kind | content, noun |
| Grammar | masculine, el |
| Example | Tengo un montón de trabajo hoy. / I have a ton of work today. |
| Spain | none |
| Trick | MONTÓN sounds like mountain: a pile so big it looks like a mountain. |

Why it was flagged:

- One right answer: The hint includes the Spanish answer itself (un montón de), so there is nothing to recall, and without it 'pile' could also be la pila or la montaña. Suggested fix: hint: a heap of things; in casual speech also means 'a ton of'

Reviewer's note (not a reason to flag): Montón really does come from monte (mountain), so the trick is accurate as well as easy to remember.

The reviewer's own translation: answer "the pile, the heap; casually, a lot (un montón de = a lot of)"; example "I have a ton of work today.".

### dulce-candy · rank 639 · dulce

Decide in [decisions/dulce-candy.txt](decisions/dulce-candy.txt)

| Field | Card |
|---|---|
| Prompt | candy |
| Hint | none |
| Answer | el dulce |
| Kind | content, noun |
| Grammar | masculine, el |
| Example | ¿Me das un dulce? / Can you give me a candy? |
| Spain | caramelo |
| Trick | DULCE sounds like "dull sea": kids on a dull seaside trip beg for candy. |

Why it was flagged:

- One right answer: With no hint, "candy" could just as well be "el caramelo" or "la golosina", both common in much of Latin America (e.g., Argentina, Peru, Venezuela), so el dulce isn't the only right answer. Suggested fix: hint: the noun form of the word for "sweet"

Reviewer's note (not a reason to flag): In Spain, "caramelo" means a hard candy specifically, and "golosina" or "chuche" is the general word, so "caramelo" is an acceptable Spain alternative but a narrow one.

The reviewer's own translation: answer "candy, sweet (a piece of candy); also a sweet dessert or preserve"; example "Will you give me a candy?".

### alejar-move-away · rank 647 · alejar

Decide in [decisions/alejar-move-away.txt](decisions/alejar-move-away.txt)

| Field | Card |
|---|---|
| Prompt | to move away |
| Hint | put distance between, not escape |
| Answer | alejarse |
| Kind | content, verb |
| Grammar | yo me alejo · tú te alejas · él se aleja |
| Example | ¡Aléjate de mi hija! / Get away from my daughter! |
| Spain | none |
| Trick | ALEJARSE sounds like 'a ledge, ah!': you scream and move away from the ledge. |

Why it was flagged:

- One right answer: In English, 'to move away' often means to relocate (mudarse), and the hint 'put distance between' doesn't rule that out, so mudarse is also a valid answer. Suggested fix: hint: get farther from someone or something, not relocate or escape

Reviewer's note (not a reason to flag): The frequency word is alejar, but the card teaches the more common reflexive alejarse, and the example uses that meaning well.

The reviewer's own translation: answer "to move away, to get away (from), to distance oneself"; example "Get away from my daughter!".

### cargo-position · rank 651 · cargo

Decide in [decisions/cargo-position.txt](decisions/cargo-position.txt)

| Field | Card |
|---|---|
| Prompt | position |
| Hint | a post or office someone holds, as in a cargo de (in charge of) |
| Answer | el cargo |
| Kind | content, noun |
| Grammar | masculine, el |
| Example | Ella ocupa un cargo importante en el gobierno. / She holds an important position in the government. |
| Spain | none |
| Trick | CARGO sounds like cargo: the person in that position carries the whole company's cargo on their shoulders. |

Why it was flagged:

- One right answer: The hint gives away the answer by quoting 'a cargo de', which actually uses the different sense 'in charge of', and it does not rule out el puesto or la posición, which are also common answers for 'position'. Suggested fix: en: office; hint: a post someone holds in government or an organization, as in to run for public office (not the room)
- Example uses words not met yet: The example uses words not met before this card: ocupa, gobierno, importante. In the frequency phase it may use at most two words not met yet. Suggested fix: npm run draft -- --examples --ids cargo-position

Reviewer's note (not a reason to flag): Using 'office' plus a public-office hint fits cargo público and keeps this card separate from the criminal 'charge' card.

The reviewer's own translation: answer "position, post, office (a role someone holds); also charge or responsibility"; example "She holds an important position in the government.".

### cargo-charge · rank 651 · cargo

Decide in [decisions/cargo-charge.txt](decisions/cargo-charge.txt)

| Field | Card |
|---|---|
| Prompt | charge |
| Hint | a criminal accusation, as in to face charges |
| Answer | el cargo |
| Kind | content, noun |
| Grammar | masculine, el |
| Example | La policía retiró los cargos contra él. / The police dropped the charges against him. |
| Spain | none |
| Trick | CARGO sounds like cargo: the smuggler caught with illegal cargo now faces serious charges. |

Why it was flagged:

- One right answer: Because the hint uses the word 'accusation', it invites 'la acusación', which is also a correct Spanish answer, so the card has two right answers. Suggested fix: hint: a legal count against someone, as in to drop the charges (not the general word for accusation)

Reviewer's note (not a reason to flag): In this sense the word usually appears in the plural (los cargos), which the example already shows.

The reviewer's own translation: answer "charge (a formal accusation); also position, post, responsibility"; example "The police withdrew the charges against him.".

### pesar-despite · rank 658 · pesar

Decide in [decisions/pesar-despite.txt](decisions/pesar-despite.txt)

| Field | Card |
|---|---|
| Prompt | [despite] the rain |
| Hint | three-word phrase |
| Answer | a pesar de |
| Kind | glue, preposition |
| Grammar | none |
| Example | Salimos a pesar de la lluvia. / We went out despite the rain. |
| Spain | none |
| Trick | A PESAR DE: even with the weight (pesar) of the problem on you, you keep going anyway. |

Why it was flagged:

- Memory trick: The trick glosses pesar as 'weight', but pesar is the verb 'to weigh' (as a noun it means 'sorrow'), and the noun for weight is el peso. Suggested fix: trick: A PESAR DE: even with a problem weighing (pesar) on you, you keep going anyway.

Reviewer's note (not a reason to flag): The hint 'three-word phrase' is useful because it rules out the shorter, more formal synonym 'pese a'.

The reviewer's own translation: answer "despite, in spite of (prepositional phrase)"; example "We went out despite the rain.".

### publico-audience · rank 664 · público

Decide in [decisions/publico-audience.txt](decisions/publico-audience.txt)

| Field | Card |
|---|---|
| Prompt | audience |
| Hint | none |
| Answer | el público |
| Kind | content, noun |
| Grammar | masculine, el |
| Example | El público aplaudió mucho. / The audience clapped a lot. |
| Spain | none |
| Trick | EL PÚBLICO is the public that shows up to watch, so the crowd in the seats is your audience. |

Why it was flagged:

- One right answer: With no hint, "audience" could also be answered "la audiencia", which is common, especially for TV or radio audiences. Suggested fix: hint: the people in the seats at a show or game

Reviewer's note (not a reason to flag): This noun card stays separate from the adjective card "public" only if the hint points to a live audience.

The reviewer's own translation: answer "el público: audience, the public (people watching a show, game or event)"; example "The audience applauded a lot.".

### calmar-calm-down · rank 668 · calmar

Decide in [decisions/calmar-calm-down.txt](decisions/calmar-calm-down.txt)

| Field | Card |
|---|---|
| Prompt | to calm down |
| Hint | none |
| Answer | calmar |
| Kind | content, verb |
| Grammar | yo calmo · tú calmas · él calma |
| Example | Cálmate, todo va a estar bien. / Calm down, everything is going to be fine. |
| Spain | none |
| Trick | CALMAR sounds like calm-ARRR: even an angry pirate needs someone to calm him down. |

Why it was flagged:

- One right answer: With no hint, "to calm down" could just as well be answered with tranquilizar, which is equally common in Latin America, or with the reflexive calmarse, which fits the intransitive English best. Suggested fix: en: to calm (someone) down; hint: the word that looks like English "calm", not tranquilizar

Reviewer's note (not a reason to flag): The example uses the reflexive cálmate (from calmarse), which is how the word usually shows up in subtitles; that is fine, but the editor might want the grammar or hint to mention calmarse = to calm down (oneself).

The reviewer's own translation: answer "to calm, to calm (someone) down, to soothe; reflexive calmarse = to calm down"; example "Calm down, everything is going to be fine.".

### guardar-keep · rank 671 · guardar

Decide in [decisions/guardar-keep.txt](decisions/guardar-keep.txt)

| Field | Card |
|---|---|
| Prompt | to keep |
| Hint | put away, store, save |
| Answer | guardar |
| Kind | content, verb |
| Grammar | yo guardo · tú guardas · él guarda |
| Example | ¿Puedes guardar un secreto? / Can you keep a secret? |
| Spain | none |
| Trick | GUARDAR sounds like guard: a guard keeps your things safe and puts them away. |

Why it was flagged:

- Example sentence: The example leaves guardar as an infinitive after puedes, but the target verb must be conjugated. Suggested fix: example.es: Siempre guardo las llaves en el cajón. / example.en: I always keep the keys in the drawer.

Reviewer's note (not a reason to flag): The hint is needed because otherwise "to keep" could also mean mantener, conservar or quedarse con, and "put away, store" points clearly to guardar.

The reviewer's own translation: answer "to keep, to put away, to store, to save (a file, a seat)"; example "Can you keep a secret?".

### detective-detective · rank 678 · detective

Decide in [decisions/detective-detective.txt](decisions/detective-detective.txt)

| Field | Card |
|---|---|
| Prompt | detective |
| Hint | none |
| Answer | el detective |
| Kind | content, noun |
| Grammar | masculine, el |
| Example | El detective encontró al ladrón. / The detective found the thief. |
| Spain | none |
| Trick | DETECTIVE is spelled just like the English word; only the stress moves to the end: deh-tek-TEE-veh. |

Why it was flagged:

- Memory trick: The trick says the stress moves to the end, but in detective the stress falls on the next-to-last syllable (ti), not the last one (ve), so a learner could stress the wrong syllable. Suggested fix: trick: DETECTIVE is spelled just like the English word, but the stress moves to TEE: deh-tek-TEE-veh.

Reviewer's note (not a reason to flag): Detective has one form for both genders (el detective for a man, la detective for a woman), so the editor could add that to the grammar or the answer side.

The reviewer's own translation: answer "the detective (male, or unspecified sex)"; example "The detective found the thief.".

### don-title · rank 681 · don

Decide in [decisions/don-title.txt](decisions/don-title.txt)

| Field | Card |
|---|---|
| Prompt | Mr. (respectful title before a first name) |
| Hint | used before a first name, as in ___ Pedro, not señor; feminine doña |
| Answer | don |
| Kind | content, other |
| Grammar | none |
| Example | Buenos días, don Pedro, ¿cómo está? / Good morning, Mr. Pedro, how are you? |
| Spain | none |
| Trick | DON sounds like Don Corleone: everyone respectfully calls the boss Don before his name. |

Why it was flagged:

- Latin American usage: The example speaks to don Pedro with usted (¿cómo está?), but the cards must use the tú register; that is natural with 'don', so the fix is a sentence that talks about him instead of to him. Suggested fix: example.es: Don Pedro vive al lado de mi casa. / example.en: Mr. Pedro lives next door to me.

Reviewer's note (not a reason to flag): The prompt needs the hint, because it tells the learner not to answer señor, which also means Mr.

The reviewer's own translation: answer "don: a respectful title used before a man's first name (roughly 'Mr.', 'Sir'); feminine doña"; example "Good morning, Don Pedro, how are you?".

### recuerdo-souvenir · rank 683 · recuerdo

Decide in [decisions/recuerdo-souvenir.txt](decisions/recuerdo-souvenir.txt)

| Field | Card |
|---|---|
| Prompt | souvenir |
| Hint | none |
| Answer | el recuerdo |
| Kind | content, noun |
| Grammar | masculine, el |
| Example | Te traje un recuerdo de México. / I brought you a souvenir from Mexico. |
| Spain | none |
| Trick | RECUERDO sounds like "record": a souvenir is a small object that records your trip. |

Why it was flagged:

- One right answer: Without a hint, "souvenir" could also get "el souvenir", a loanword that is very common across Latin America (Mexico, Argentina, Peru and others), so the prompt has two right answers. Suggested fix: hint: the native Spanish word, not the borrowed "souvenir"

Reviewer's note (not a reason to flag): The new hint also keeps this card apart from the "memory" card, which uses the same word.

The reviewer's own translation: answer "memory; souvenir, keepsake (noun)"; example "I brought you a souvenir from Mexico.".

### gracioso-funny · rank 690 · gracioso

Decide in [decisions/gracioso-funny.txt](decisions/gracioso-funny.txt)

| Field | Card |
|---|---|
| Prompt | funny |
| Hint | makes you laugh, not divertido |
| Answer | gracioso |
| Kind | content, adjective |
| Grammar | feminine graciosa |
| Example | Tu hermano es muy gracioso. / Your brother is really funny. |
| Spain | none |
| Trick | GRACIOSO sounds like gracious, but a gracious host who tells jokes all night is just plain funny. |

Why it was flagged:

- One right answer: The hint rules out divertido but not chistoso, which is a very common Latin American word for 'funny' (especially in Mexico, Colombia and Peru) and would be just as correct. Suggested fix: hint: makes you laugh; not divertido or chistoso

Reviewer's note (not a reason to flag): The trick correctly treats 'gracious' as a false friend, so the link still works.

The reviewer's own translation: answer "funny, amusing (of a person or thing that makes you laugh)"; example "Your brother is very funny.".

### ocupar-take-care · rank 692 · ocupar

Decide in [decisions/ocupar-take-care.txt](decisions/ocupar-take-care.txt)

| Field | Card |
|---|---|
| Prompt | to take care of |
| Hint | handle a task or problem, not look after someone |
| Answer | ocuparse |
| Kind | content, verb |
| Grammar | yo me ocupo · tú te ocupas · él se ocupa |
| Example | Tranquilo, yo me ocupo de todo. / Relax, I'll take care of everything. |
| Spain | none |
| Trick | OCUPARSE sounds like 'occupy myself': you occupy yourself with a problem until it's handled. |

Why it was flagged:

- One right answer: The hint doesn't rule out encargarse, which is just as common as ocuparse in Latin America for handling a task (yo me encargo de todo), so a learner could give a right answer and still be marked wrong. Suggested fix: hint: handle a task or problem; the reflexive form of 'to occupy', not encargarse

Reviewer's note (not a reason to flag): You could show ocuparse with its preposition (ocuparse de) in the answer or grammar, since the verb almost always takes de in this meaning.

The reviewer's own translation: answer "ocuparse (de): to take care of, deal with, handle (a task or matter); literally to occupy oneself"; example "Relax / Don't worry, I'll take care of everything.".

### interesante-interesting · rank 696 · interesante

Decide in [decisions/interesante-interesting.txt](decisions/interesante-interesting.txt)

| Field | Card |
|---|---|
| Prompt | interesting |
| Hint | none |
| Answer | interesante |
| Kind | content, adjective |
| Grammar | feminine interesante |
| Example | Qué libro tan interesante. / What an interesting book. |
| Spain | none |
| Trick | INTERESANTE sounds like interesting plus 'aunty': your aunty always tells the most interesting stories. |

Why it was flagged:

- Example sentence: The example has no conjugated verb, and as an exclamation it should have ¡ ! instead of a full stop. Suggested fix: example.es: Este libro es muy interesante. / example.en: This book is very interesting.

Reviewer's note (not a reason to flag): If the editor wants to keep the exclamation, "¡Qué libro tan interesante!" is natural, but it still has no conjugated verb.

The reviewer's own translation: answer "interesting"; example "What an interesting book.".

### dama-lady · rank 699 · dama

Decide in [decisions/dama-lady.txt](decisions/dama-lady.txt)

| Field | Card |
|---|---|
| Prompt | lady |
| Hint | elegant or formal word, as in ladies and gentlemen |
| Answer | la dama |
| Kind | content, noun |
| Grammar | feminine, la |
| Example | Buenas noches, damas y caballeros. / Good evening, ladies and gentlemen. |
| Spain | none |
| Trick | DAMA sounds like dame: a grand dame is an elegant lady. |

Why it was flagged:

- Example sentence: The example has no conjugated verb; it is a set greeting with no verb at all. Suggested fix: example.es: Esa dama es muy elegante. / example.en: That lady is very elegant.

Reviewer's note (not a reason to flag): The hint matters here because señora is the everyday word for lady, and the hint's "elegant or formal" is what points to dama, so it should stay.

The reviewer's own translation: answer "la dama = lady (a woman, especially in an elegant or formal sense)"; example "Good evening, ladies and gentlemen.".

### retirar-retire · rank 701 · retirar

Decide in [decisions/retirar-retire.txt](decisions/retirar-retire.txt)

| Field | Card |
|---|---|
| Prompt | to retire |
| Hint | from a job or sport, or to step away |
| Answer | retirarse |
| Kind | content, verb |
| Grammar | yo me retiro · tú te retiras · él se retira |
| Example | Mi papá se retira el próximo año. / My dad is retiring next year. |
| Spain | none |
| Trick | RETIRARSE sounds like retire: when you are tired of working, you retire. |

Why it was flagged:

- One right answer: The hint mentions retiring from a job, and for that meaning jubilarse is the standard Latin American word, so a learner could correctly answer jubilarse instead of retirarse. Suggested fix: hint: from a sport or career, or to step away (not jubilarse)

Reviewer's note (not a reason to flag): Because jubilarse is the usual word for retiring from work, the editor might move the example to a sport, such as "El futbolista se retira este año."

The reviewer's own translation: answer "to retire (from work or a sport); to withdraw, step back, leave"; example "My dad retires next year.".

### reunir-gather · rank 708 · reunir

Decide in [decisions/reunir-gather.txt](decisions/reunir-gather.txt)

| Field | Card |
|---|---|
| Prompt | to gather |
| Hint | bring people or things together |
| Answer | reunir |
| Kind | content, verb |
| Grammar | yo reúno · tú reúnes · él reúne |
| Example | Mi abuela reúne a toda la familia en Navidad. / My grandma gathers the whole family at Christmas. |
| Spain | none |
| Trick | REUNIR sounds like reunion: you gather everyone together for a big reunion. |

Why it was flagged:

- One right answer: The hint 'bring people or things together' fits juntar equally well, and juntar is very common in Latin America (juntar a la familia, juntar dinero), so the prompt has two right answers. Suggested fix: hint: bring people together, as for a reunion (not juntar)

Reviewer's note (not a reason to flag): The forms reúno, reúnes and reúne only add a written accent, so irregular: false holds up, but the accent is easy to miss and a learner may need it pointed out.

The reviewer's own translation: answer "to gather, to bring together, to collect (transitive)"; example "My grandmother gets the whole family together at Christmas.".

### totalmente-totally · rank 719 · totalmente

Decide in [decisions/totalmente-totally.txt](decisions/totalmente-totally.txt)

| Field | Card |
|---|---|
| Prompt | totally |
| Hint | none |
| Answer | totalmente |
| Kind | content, adverb |
| Grammar | none |
| Example | Tienes totalmente la razón. / You're totally right. |
| Spain | none |
| Trick | TOTALMENTE sounds like "total mental": you agree so totally, it's total mental agreement. |

Why it was flagged:

- Example sentence: "Tienes totalmente la razón" is grammatical, but it sounds stiff: speakers say "Tienes toda la razón" (which drops the target word) or "Tienes totalmente razón", and the most natural use of totalmente is in "totalmente de acuerdo". Suggested fix: example.es: Estoy totalmente de acuerdo contigo. / example.en: I totally agree with you.

Reviewer's note (not a reason to flag): An unprompted learner might answer completamente, but "totally" points clearly to the cognate totalmente, so no hint is needed.

The reviewer's own translation: answer "totally, completely, entirely (adverb)"; example "You totally have the right / You're totally right.".

### amable-kind · rank 721 · amable

Decide in [decisions/amable-kind.txt](decisions/amable-kind.txt)

| Field | Card |
|---|---|
| Prompt | kind |
| Hint | none |
| Answer | amable |
| Kind | content, adjective |
| Grammar | feminine amable |
| Example | Eres muy amable, gracias por tu ayuda. / You're very kind, thanks for your help. |
| Spain | none |
| Trick | AMABLE sounds like amiable: a kind person is amiable and easy to love. |

Why it was flagged:

- One right answer: The bare prompt "kind" could also be the noun meaning "type" (el tipo, la clase), so a learner could give a different correct answer. Suggested fix: hint: adjective, as in "a kind person"

Reviewer's note (not a reason to flag): Once the hint rules out the noun, amable is clearly the everyday answer over bondadoso or gentil.

The reviewer's own translation: answer "kind, nice, friendly (adjective)"; example "You are very kind, thanks for your help.".

### antiguo-former · rank 726 · antiguo

Decide in [decisions/antiguo-former.txt](decisions/antiguo-former.txt)

| Field | Card |
|---|---|
| Prompt | former |
| Hint | placed before the noun, as in my former boss |
| Answer | antiguo |
| Kind | content, adjective |
| Grammar | feminine antigua |
| Example | Vi a mi antiguo jefe en el mercado. / I saw my former boss at the market. |
| Spain | none |
| Trick | ANTIGUO sounds like antique: your former boss is now an antique from your past. |

Why it was flagged:

- One right answer: The hint does not rule out other common ways to say 'former': the prefix ex- (mi exjefe) is very common in Latin America, and anterior (mi anterior jefe) also works before the noun. Suggested fix: hint: an adjective placed before the noun, as in my former boss; not the prefix ex- and not anterior

Reviewer's note (not a reason to flag): The point about word order is worth keeping: antiguo before the noun means former, and after the noun it means old, which keeps this card apart from the "ancient" card.

The reviewer's own translation: answer "former, previous (before a noun); old, ancient (after a noun)"; example "I saw my former boss at the market.".

### sala-hall-room · rank 737 · sala

Decide in [decisions/sala-hall-room.txt](decisions/sala-hall-room.txt)

| Field | Card |
|---|---|
| Prompt | room |
| Hint | large public room, like a waiting room or hall |
| Answer | la sala |
| Kind | content, noun |
| Grammar | feminine, la |
| Example | Espérame en la sala de espera. / Wait for me in the waiting room. |
| Spain | none |
| Trick | SALA sounds like "salon": a big hall where crowds gather, like a waiting room or concert hall. |

Why it was flagged:

- One right answer: The hint's 'large public room... or hall' also fits el salón (salón de eventos, salón de fiestas), which is very common in Latin America, so the prompt has two right answers. Suggested fix: hint: room in a public building, as in 'waiting room' or 'operating room' (not salón)

Reviewer's note (not a reason to flag): The word "public" in the hint is what keeps this card apart from the "living room" card, so a new hint needs to keep that contrast.

The reviewer's own translation: answer "room, hall (a large room in a building or home; also living room)"; example "Wait for me in the waiting room.".

### club-club · rank 739 · club

Decide in [decisions/club-club.txt](decisions/club-club.txt)

| Field | Card |
|---|---|
| Prompt | club |
| Hint | none |
| Answer | el club |
| Kind | content, noun |
| Grammar | masculine, el |
| Example | Mi hermano juega en un club de fútbol. / My brother plays for a soccer club. |
| Spain | none |
| Trick | CLUB sounds just like the English club: same word, same meeting place for members. |

Why it was flagged:

- One right answer: The bare English prompt club also means a weapon (el garrote, la porra) or a golf club (el palo), so with no hint more than one Spanish answer is right. Suggested fix: hint: an association or team, as in a soccer club

Reviewer's note (not a reason to flag): The plural is clubes (clubs is also heard), which might be worth showing to learners.

The reviewer's own translation: answer "club (a group or association of members, e.g. a sports club or social club; also a nightclub)"; example "My brother plays on/for a soccer club.".

### reir-laugh · rank 743 · reír

Decide in [decisions/reir-laugh.txt](decisions/reir-laugh.txt)

| Field | Card |
|---|---|
| Prompt | to laugh |
| Hint | none |
| Answer | reír |
| Kind | content, verb |
| Grammar | yo río · tú ríes · él ríe (irregular) |
| Example | Mi hija ríe mucho con ese programa. / My daughter laughs a lot at that show. |
| Spain | none |
| Trick | REÍR sounds like ray-EAR: a ray of laughter rings right in your ear. |

Why it was flagged:

- Latin American usage: In everyday Latin American speech, 'to laugh' is almost always the pronominal reírse, so 'ríe mucho' without se sounds literary rather than conversational. Suggested fix: example.es: Mi hija se ríe mucho con ese programa.
- Example sentence: The sentence leaves out the 'se' that natural speech uses with this verb, so the learner memorizes a stiff pattern. Suggested fix: example.es: Mi hija se ríe mucho con ese programa.

Reviewer's note (not a reason to flag): Consider having the grammar or example show that the everyday form is reírse (me río, te ríes, se ríe), since learners will mostly hear it that way.

The reviewer's own translation: answer "to laugh"; example "My daughter laughs a lot with that show.".

### armar-put-together · rank 744 · armar

Decide in [decisions/armar-put-together.txt](decisions/armar-put-together.txt)

| Field | Card |
|---|---|
| Prompt | to put together |
| Hint | furniture, a puzzle, a plan |
| Answer | armar |
| Kind | content, verb |
| Grammar | yo armo · tú armas · él arma |
| Example | Mi papá armó la mesa en diez minutos. / My dad put the table together in ten minutes. |
| Spain | none |
| Trick | ARMAR sounds like arm: you use both arms to put the furniture together. |

Why it was flagged:

- Latin American usage: In Spain the usual word for putting together furniture or a puzzle is montar, not armar, so spain should not be null. Suggested fix: spain: montar

Reviewer's note (not a reason to flag): The hint is needed: it separates this card from the word's "to arm" card and rules out juntar (to put together in the sense of joining).

The reviewer's own translation: answer "armar: to assemble, to put together (also to arm; to set up or cause, as in armar un lío)"; example "My dad put the table together in ten minutes.".

### armar-arm · rank 744 · armar

Decide in [decisions/armar-arm.txt](decisions/armar-arm.txt)

| Field | Card |
|---|---|
| Prompt | to arm |
| Hint | with weapons |
| Answer | armar |
| Kind | content, verb |
| Grammar | yo armo · tú armas · él arma |
| Example | Cuidado, el hombre está armado. / Careful, the man is armed. |
| Spain | none |
| Trick | ARMAR looks like arm and armor: to arm someone, you hand them weapons and armor. |

Why it was flagged:

- Example sentence: The example uses only the participle armado as an adjective after estar, so armar itself is never conjugated as the rules require. Suggested fix: example.es: El gobierno armó a los rebeldes. / example.en: The government armed the rebels.

Reviewer's note (not a reason to flag): The hint "with weapons" is needed and works, because it separates this card from the word's "to put together" card.

The reviewer's own translation: answer "to arm (with weapons); also to put together, to assemble"; example "Careful, the man is armed.".

### consejo-council · rank 746 · consejo

Decide in [decisions/consejo-council.txt](decisions/consejo-council.txt)

| Field | Card |
|---|---|
| Prompt | council |
| Hint | a group that decides |
| Answer | el consejo |
| Kind | content, noun |
| Grammar | masculine, el |
| Example | El consejo se reúne mañana. / The council meets tomorrow. |
| Spain | none |
| Trick | CONSEJO sounds like "council, eh Joe?": Joe sits on the council that gives everyone advice. |

Why it was flagged:

- One right answer: The hint 'a group that decides' does not rule out el concejo, the usual Latin American word for a town or city council ('concejo municipal'), which sounds the same as consejo, and it also fits la junta or el comité. Suggested fix: hint: a governing or advisory body, like a student or security council (not a town council)

Reviewer's note (not a reason to flag): Learners may confuse consejo with the homophone concejo (town council), so a short contrast on the back of the card could help.

The reviewer's own translation: answer "council, board (a body that governs or advises); also advice"; example "The council meets tomorrow.".

### enfrentar-face · rank 747 · enfrentar

Decide in [decisions/enfrentar-face.txt](decisions/enfrentar-face.txt)

| Field | Card |
|---|---|
| Prompt | to face |
| Hint | to confront a problem or enemy |
| Answer | enfrentar |
| Kind | content, verb |
| Grammar | yo enfrento · tú enfrentas · él enfrenta |
| Example | Tienes que enfrentar tus miedos. / You have to face your fears. |
| Spain | none |
| Trick | ENFRENTAR sounds like in front: to face something, you stand right in front of it. |

Why it was flagged:

- Example sentence: The target verb appears only as an infinitive after tienes que, but the example should show enfrentar conjugated. Suggested fix: example.es: Mi hermano enfrenta sus problemas con calma. / example.en: My brother faces his problems calmly.

Reviewer's note (not a reason to flag): The hint is useful because it separates this meaning of to face from mirar hacia (to face a direction), and the less common afrontar is no real competitor in everyday Latin American speech.

The reviewer's own translation: answer "to face, to confront"; example "You have to face your fears.".

### cenar-have-dinner · rank 749 · cenar

Decide in [decisions/cenar-have-dinner.txt](decisions/cenar-have-dinner.txt)

| Field | Card |
|---|---|
| Prompt | to have dinner |
| Hint | none |
| Answer | cenar |
| Kind | content, verb |
| Grammar | yo ceno · tú cenas · él cena |
| Example | ¿Quieres cenar conmigo esta noche? / Do you want to have dinner with me tonight? |
| Spain | none |
| Trick | CENAR sounds like "see a nar-rator": you see the storyteller every evening at dinner. |

Why it was flagged:

- Example sentence: The example uses cenar only as an infinitive after quieres, but it should show cenar itself conjugated. Suggested fix: example.es: Siempre cenamos a las ocho. / example.en: We always have dinner at eight.

The reviewer's own translation: answer "to have dinner, to eat supper"; example "Do you want to have dinner with me tonight?".

### nota-grade · rank 761 · nota

Decide in [decisions/nota-grade.txt](decisions/nota-grade.txt)

| Field | Card |
|---|---|
| Prompt | grade |
| Hint | at school |
| Answer | la nota |
| Kind | content, noun |
| Grammar | feminine, la |
| Example | Saqué una buena nota en el examen. / I got a good grade on the test. |
| Spain | none |
| Trick | The teacher writes a NOTA on your test: a note telling you your grade. |

Why it was flagged:

- One right answer: The hint 'at school' does not rule out grade meaning school year, which is 'el grado' ('¿En qué grado estás?'), so the prompt has two right answers. Suggested fix: hint: score on a test

Reviewer's note (not a reason to flag): 'La calificación' is also common for a school grade, especially in Mexico, but 'la nota' is the everyday word across Latin America, so the card can keep it as the answer.

The reviewer's own translation: answer "the grade, the mark (score on schoolwork); also a note"; example "I got a good grade on the exam.".

### embargo-however · rank 765 · embargo

Decide in [decisions/embargo-however.txt](decisions/embargo-however.txt)

| Field | Card |
|---|---|
| Prompt | It's late. [However], I'm staying. |
| Hint | two words, not pero |
| Answer | sin embargo |
| Kind | glue, conjunction |
| Grammar | none |
| Example | Es caro. Sin embargo, lo voy a comprar. / It's expensive. However, I'm going to buy it. |
| Spain | none |
| Trick | SIN EMBARGO sounds like "seen an embargo": I've seen an embargo; however, the ships still sail. |

Why it was flagged:

- One right answer: The hint 'two words, not pero' still allows 'no obstante' (also two words, also 'however') and arguably 'aun así', so the prompt doesn't have exactly one answer. Suggested fix: hint: two words, not pero or no obstante

Reviewer's note (not a reason to flag): Sin embargo is a fixed connector (a conjunctive phrase), so labelling it a conjunction works, and Spain uses it the same way.

The reviewer's own translation: answer "however, nevertheless (sin embargo)"; example "It's expensive. However, I'm going to buy it.".

### manejar-handle · rank 767 · manejar

Decide in [decisions/manejar-handle.txt](decisions/manejar-handle.txt)

| Field | Card |
|---|---|
| Prompt | to handle |
| Hint | a situation or problem |
| Answer | manejar |
| Kind | content, verb |
| Grammar | yo manejo · tú manejas · él maneja |
| Example | Tranquilo, yo puedo manejarlo. / Relax, I can handle it. |
| Spain | none |
| Trick | MANEJAR sounds like "manage": you manage, or handle, any problem that comes your way. |

Why it was flagged:

- Example sentence: The example uses manejar only as an infinitive after puedo, so the card's own verb is not conjugated. Suggested fix: example.es: Tranquila, yo manejo esto. / example.en: Relax, I'll handle this.

Reviewer's note (not a reason to flag): The hint correctly separates this card from the drive card, and encargarse de and lidiar con are close synonyms but less direct for handle a situation.

The reviewer's own translation: answer "to handle, to manage (a situation, problem, tool); in Latin America also to drive"; example "Relax, I can handle it.".

### sorpresa-surprise · rank 774 · sorpresa

Decide in [decisions/sorpresa-surprise.txt](decisions/sorpresa-surprise.txt)

| Field | Card |
|---|---|
| Prompt | surprise |
| Hint | none |
| Answer | la sorpresa |
| Kind | content, noun |
| Grammar | feminine, la |
| Example | ¡Qué sorpresa verte aquí! / What a surprise to see you here! |
| Spain | none |
| Trick | SORPRESA sounds like surprise with a press: someone presses the button and confetti bursts out as a surprise. |

Why it was flagged:

- Example sentence: The example has no conjugated verb, only the infinitive verte, so it does not meet the rule that the example conjugates a verb. Suggested fix: example.es: Fue una sorpresa verte aquí. example.en: It was a surprise to see you here.

Reviewer's note (not a reason to flag): The original exclamation is perfectly natural Spanish and fails only on the conjugated-verb rule.

The reviewer's own translation: answer "surprise (noun)"; example "What a surprise to see you here!".

### regla-rule · rank 775 · regla

Decide in [decisions/regla-rule.txt](decisions/regla-rule.txt)

| Field | Card |
|---|---|
| Prompt | rule |
| Hint | none |
| Answer | la regla |
| Kind | content, noun |
| Grammar | feminine, la |
| Example | En mi casa, mis reglas. / In my house, my rules. |
| Spain | none |
| Trick | REGLA sounds like 'regular': rules keep everything regular. |

Why it was flagged:

- Example sentence: The example has no conjugated verb, which every example must have. Suggested fix: example.es: Tienes que seguir las reglas. example.en: You have to follow the rules.

Reviewer's note (not a reason to flag): Norma can also mean rule, but regla is the everyday default, so the prompt needs no hint.

The reviewer's own translation: answer "la regla: rule (also ruler, and colloquially a menstrual period)"; example "In my house, my rules.".

### testigo-witness · rank 787 · testigo

Decide in [decisions/testigo-witness.txt](decisions/testigo-witness.txt)

| Field | Card |
|---|---|
| Prompt | witness |
| Hint | none |
| Answer | el testigo |
| Kind | content, noun |
| Grammar | masculine, el |
| Example | Ella es la única testigo del accidente. / She is the only witness to the accident. |
| Spain | none |
| Trick | TESTIGO sounds like "testify, go!": the witness is told to go testify in court. |

Why it was flagged:

- Grammar: Testigo has common gender (el testigo for a man, la testigo for a woman), so listing it as only masculine is misleading, and the example's la única testigo seems to contradict it. Suggested fix: grammar: gender m/f (common gender), article el / la (el testigo, la testigo)

Reviewer's note (not a reason to flag): Keeping es as el testigo is fine as the dictionary form, but the grammar should teach the learner that the article follows the person's sex.

The reviewer's own translation: answer "witness (a person who sees an event or testifies)"; example "She is the only witness of the accident.".

### phrase-can-you-help-me · rank 144 · can-you-help-me

Decide in [decisions/phrase-can-you-help-me.txt](decisions/phrase-can-you-help-me.txt)

| Field | Card |
|---|---|
| Prompt | Can you help me, please? |
| Hint | Formal: polite, to a stranger (usted) |
| Answer | ¿Me puede ayudar, por favor? |
| Kind | phrase, phrase |
| Grammar | none |
| Example | Hola, ¿me puede ayudar, por favor? No entiendo. / Hello, can you help me, please? I don't understand. |
| Spain | none |
| Trick | none |

Why it was flagged:

- Latin American usage: The app teaches the informal tú register and uses usted only on its own word card, but this card teaches the usted form 'puede' and its hint asks for formal speech. Suggested fix: es: ¿Me puedes ayudar, por favor? / hint: Informal: to a friend (tú) / example.es: Hola, ¿me puedes ayudar, por favor? No entiendo.

Reviewer's note (not a reason to flag): Other ways to say this are also correct and a learner might give them, such as '¿Puedes ayudarme, por favor?' (the pronoun placed after the verb), so the grader should accept them.

The reviewer's own translation: answer "Can you help me, please? (formal: usted)"; example "Hi, can you help me, please? I don't understand.".

## Decided

- que-who-which (rank 3, que): approved. Flagged for one right answer.
- un-a (rank 6, un): approved. Flagged for memory trick.
- estar-be-state (rank 8, estar): approved. Flagged for example sentence.
- lo-the-thing (rank 11, lo): approved. Flagged for memory trick.
- haber-have-auxiliary (rank 12, haber): approved. Flagged for latin american usage.
- haber-there-is (rank 12, haber): approved. Flagged for grammar.
- si-yes (rank 32, sí): approved. Flagged for example sentence.
- ver-watch (rank 35, ver): approved. Flagged for one right answer.
- eso-that (rank 36, eso): approved. Flagged for one right answer.
- algo-somewhat (rank 57, algo): approved. Flagged for one right answer.
- gracias-thank-you (rank 75, gracias): approved. Flagged for example sentence.
- senor-sir (rank 76, señor): approved. Flagged for latin american usage.
- hombre-man (rank 85, hombre): approved. Flagged for memory trick.
- entonces-so (rank 86, entonces): approved. Flagged for one right answer.
- hola-hello (rank 88, hola): approved. Flagged for example sentence.
- volver-do-again (rank 90, volver): approved. Flagged for example sentence.
- mejor-best (rank 100, mejor): approved. Flagged for one right answer.
- padre-parents (rank 128, padre): approved. Flagged for one right answer, memory trick.
- entender-understand (rank 141, entender): approved. Flagged for one right answer.
- mal-badly (rank 204, mal): approved. Flagged for example sentence.
- pequeno-small (rank 205, pequeño): approved. Flagged for example sentence.
- cuenta-bill (rank 238, cuenta): approved. Flagged for example sentence.
- adios-goodbye (rank 274, adiós): approved. Flagged for example sentence.
- cerca-fence (rank 339, cerca): approved. Flagged for one right answer.
- perdon-sorry (rank 520, perdón): approved. Flagged for one right answer.
- estar-form-el (rank 8, estar): approved. Flagged for example sentence.
- poder-form-tu (rank 19, poder): approved. Flagged for example sentence.
- poder-form-el (rank 19, poder): approved. Flagged for example sentence.
- phrase-yes-please (rank 105, me-and-you): approved. Flagged for example sentence.
- phrase-no-thank-you (rank 75, me-and-you): approved. Flagged for example sentence.
- phrase-whats-your-name (rank 82, who-i-am): approved. Flagged for one right answer.
- phrase-nice-to-meet-you (rank 625, who-i-am): approved. Flagged for one right answer.
- phrase-youre-welcome (rank 66, who-i-am): approved. Flagged for example sentence.
- phrase-my-name-is-ana (rank 625, who-i-am): approved. Flagged for one right answer.
- phrase-i-want-a-coffee (rank 532, what-i-want-and-have): approved. Flagged for example sentence.
- phrase-can-you-repeat-that (rank 1006, when-i-dont-understand): approved. Flagged for words outside the top 1,000.
- phrase-do-you-speak-english (rank 907, when-i-dont-understand): approved. Flagged for example sentence.
- phrase-excuse-me-polite (rank 305, out-and-about): approved. Flagged for one right answer, latin american usage.
- phrase-i-love-you (rank 28, people-i-love): approved. Flagged for example uses words not met yet.
- phrase-ill-call-you-tomorrow (rank 171, people-i-love): approved. Flagged for one right answer.
- phrase-i-think-thats-true (rank 89, what-people-say): approved. Flagged for one right answer.
