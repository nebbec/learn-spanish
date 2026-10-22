# Flagged cards

The review pass flagged 43 cards: 43 waiting for you, 0 decided. This file is rewritten by `npm run review` and `npm run deck`; do not edit it.

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

### muessen-must · rank 42 · müssen

Decide in [decisions/muessen-must.txt](decisions/muessen-must.txt)

| Field | Card |
|---|---|
| Prompt | to have to |
| Hint | must |
| Answer | müssen |
| Kind | content, verb |
| Grammar | ich muss · du musst · er muss (irregular); Perfekt: hat gemusst |
| Example | Ich muss morgen früh arbeiten. / I have to work early tomorrow. |
| Regional | none |
| Trick | MUSS, as in ich muss, sounds almost like must, and that is exactly what it means. |

Why it was flagged:

- Example sentence: Morgen früh is the fixed expression for tomorrow morning, so translating it as early tomorrow misleads the learner. Suggested fix: example.en: I have to work tomorrow morning.

Reviewer's note (not a reason to flag): The hint must is useful because it rules out sollen (should), and the participle gemusst is right for müssen used alone, though with an infinitive the Perfekt uses müssen (ich habe arbeiten müssen).

The reviewer's own translation: answer "to have to, must"; example "I have to work tomorrow morning.".

### nein-no · rank 44 · nein

Decide in [decisions/nein-no.txt](decisions/nein-no.txt)

| Field | Card |
|---|---|
| Prompt | no |
| Hint | the answer, opposite of yes |
| Answer | nein |
| Kind | content, other |
| Grammar | none |
| Example | Nein, ich finde es. / No, I'll find it. |
| Regional | none |
| Trick | NEIN sounds like "nine": picture a toddler shouting no nine times in a row. |

Why it was flagged:

- Example sentence: 'Nein, ich finde es.' is awkward and unclear, because bare 'ich finde es' sounds like an unfinished opinion ('I find it...') and doesn't clearly mean 'I'll find it'. Suggested fix: example.target: Nein, ich habe keine Zeit. / example.en: No, I don't have time.

Reviewer's note (not a reason to flag): The hint is useful because it rules out kein (no as in 'no money'), and Swiss dialect 'nei' doesn't need a regional note, since standard German everywhere uses nein.

The reviewer's own translation: answer "no (as an answer, the opposite of yes)"; example "No, I find it. (Bare 'ich finde es' reads as 'I find it' or a cut-off 'I think it's...', not clearly 'I'll find it'.)".

### nach-to · rank 73 · nach

Decide in [decisions/nach-to.txt](decisions/nach-to.txt)

| Field | Card |
|---|---|
| Prompt | I'm flying [to] Berlin |
| Hint | a city or country, also home |
| Answer | nach |
| Kind | glue, preposition |
| Grammar | none |
| Example | Ich gehe morgen nach Hamburg. / I'm going to Hamburg tomorrow. |
| Regional | none |
| Trick | NACH sounds like a short "knock": you knock on the door of the city you travel to. |

Why it was flagged:

- Example sentence: For a trip to another city, Germans say fahren, not gehen; 'Ich gehe nach Hamburg' sounds like going on foot or moving there for good, so learners would pick up the wrong verb for travel. Suggested fix: example.target: Ich fahre morgen nach Hamburg.

Reviewer's note (not a reason to flag): The hint correctly rules out zu and in, and its mention of home points to nach Hause.

The reviewer's own translation: answer "to (a city or country without an article, and in nach Hause, home)"; example "I'm walking to Hamburg tomorrow / I'm going to Hamburg tomorrow (gehen suggests going on foot or moving there).".

### bitte-youre-welcome · rank 86 · bitte

Decide in [decisions/bitte-youre-welcome.txt](decisions/bitte-youre-welcome.txt)

| Field | Card |
|---|---|
| Prompt | you're welcome |
| Hint | one-word reply to danke |
| Answer | bitte |
| Kind | content, other |
| Grammar | none |
| Example | Danke für den Kaffee! – Bitte! / Thanks for the coffee! – You're welcome! |
| Regional | none |
| Trick | BITTE sounds like BIT-uh: no need to thank me, it was only a bit of help, you're welcome. |

Why it was flagged:

- One right answer: Gerne (or gern) is also a very common one-word reply to danke in Germany, so the hint does not rule it out. Suggested fix: hint: one-word reply to danke, the same word as please (not gerne)

Reviewer's note (not a reason to flag): Bitte schön and gern geschehen are also common replies, but they are two words, so the one-word part of the hint already rules them out.

The reviewer's own translation: answer "you're welcome (reply to thanks); also please, here you are, pardon?"; example "Thanks for the coffee! – You're welcome!".

### danke-thank-you · rank 96 · danke

Decide in [decisions/danke-thank-you.txt](decisions/danke-thank-you.txt)

| Field | Card |
|---|---|
| Prompt | thank you |
| Hint | none |
| Answer | danke |
| Kind | content, other |
| Grammar | none |
| Example | Danke für deine Hilfe! / Thanks for your help! |
| Regional | none |
| Trick | DANKE sounds like DAHN-keh, close to thank-ya: say thanks with a D and you've got it. |

Why it was flagged:

- Usage in Germany: In Switzerland people commonly say merci (merci vielmal) for thank you, so regional should not be null. Suggested fix: regional: { where: "Switzerland", text: "Merci (Merci vielmal for thanks a lot) is very common in everyday Swiss German, alongside danke." }
- Example uses words not met yet: The example uses words not met before this card: für, deine, Hilfe. In the starter path it may use only earlier cards' words, its own, names, numbers and at most one obvious cognate. Suggested fix: npm run draft -- --examples --ids danke-thank-you

Reviewer's note (not a reason to flag): Dankeschön and vielen Dank also mean thank you, but danke is clearly the basic expected answer, so no hint is needed.

The reviewer's own translation: answer "thank you, thanks"; example "Thanks for your help!".

### moegen-would-like · rank 104 · mögen

Decide in [decisions/moegen-would-like.txt](decisions/moegen-would-like.txt)

| Field | Card |
|---|---|
| Prompt | would like |
| Hint | polite wish, as in I would like a coffee |
| Answer | möchten |
| Kind | content, verb |
| Grammar | ich möchte · du möchtest · er möchte (irregular); Perfekt: hat gemocht |
| Example | Möchtest du einen Kaffee? / Would you like a coffee? |
| Regional | none |
| Trick | MÖCHTE sounds a bit like merch-ta: I would like some band merch. |

Why it was flagged:

- Grammar: The Perfekt haben + gemocht belongs to mögen and means liked; möchten has no Perfekt of its own, and a past wish is said with wollen (hat gewollt), so this would teach learners a wrong past form. Suggested fix: grammar.perfekt: null (or aux haben, participle gewollt, marked as coming from wollen)

Reviewer's note (not a reason to flag): The prompt can't follow the to-rule for verbs because to would like isn't English, so would like is the right exception; hätte gern also means would like, but it's a phrase, not a verb.

The reviewer's own translation: answer "would like (to), the polite wish form of mögen"; example "Would you like a coffee?".

### haus-at-home · rank 129 · Haus

Decide in [decisions/haus-at-home.txt](decisions/haus-at-home.txt)

| Field | Card |
|---|---|
| Prompt | at home |
| Hint | none |
| Answer | zu Hause |
| Kind | content, adverb |
| Grammar | none |
| Example | Bist du heute Abend zu Hause? / Are you at home tonight? |
| Regional | none |
| Trick | ZU HAUSE sounds like tsoo HOW-zeh: to the house, so you're at home. |

Why it was flagged:

- Usage in Germany: In Austria and Switzerland, daheim is the usual everyday word for at home, much more than in most of Germany, so regional should not be null. Suggested fix: regional: { where: "Austria, Switzerland", text: "daheim is the usual everyday word for at home (Bist du heute Abend daheim?)." }
- Memory trick: The trick glosses zu Hause as 'to the house', which is misleading because going (to) home is nach Hause, and zu Hause means only being at home, a distinction learners often get wrong. Suggested fix: trick: ZU HAUSE sounds like tsoo HOW-zeh: you're sitting in your own HOUSE, so you're at home.

Reviewer's note (not a reason to flag): Zuhause written as one word is also an accepted spelling of the adverb (and is standard in Austria and Switzerland), so it might be worth accepting it as the same answer.

The reviewer's own translation: answer "at home"; example "Are you at home tonight?".

### morgen-tomorrow · rank 157 · morgen

Decide in [decisions/morgen-tomorrow.txt](decisions/morgen-tomorrow.txt)

| Field | Card |
|---|---|
| Prompt | tomorrow |
| Hint | none |
| Answer | morgen |
| Kind | content, adverb |
| Grammar | none |
| Example | Ich gehe morgen nach Hamburg. / I'm going to Hamburg tomorrow. |
| Regional | none |
| Trick | MORGEN starts like "morning": tomorrow begins with the next morning. |

Why it was flagged:

- Example sentence: For a trip to another city Germans say fahren, not gehen, and 'Ich gehe nach Hamburg' tends to mean moving there, so learners would memorize the wrong verb for travel. Suggested fix: example.target: Ich fahre morgen nach Hamburg.

Reviewer's note (not a reason to flag): The lowercase adverb morgen is clearly separate from the noun der Morgen on the word's other card, so no hint is needed.

The reviewer's own translation: answer "tomorrow"; example "I'm going to Hamburg tomorrow (with gehen this can sound like moving there).".

### mutter-mother · rank 175 · Mutter

Decide in [decisions/mutter-mother.txt](decisions/mutter-mother.txt)

| Field | Card |
|---|---|
| Prompt | mother |
| Hint | none |
| Answer | die Mutter |
| Kind | content, noun |
| Grammar | feminine, die; plural die Mütter |
| Example | Meine Mutter ist aus Hamburg. / My mother is from Hamburg. |
| Regional | none |
| Trick | MUTTER sounds like MOO-ter, close to mother: picture a mother cow mooing for her calf. |

Why it was flagged:

- Memory trick: MOO-ter suggests a long oo vowel, but the u in Mutter is short (MUT-ter, as in mutt), so the trick teaches a wrong pronunciation. Suggested fix: trick: MUTTER, said MUT-ter as in mutt, is close to MOTHER: picture a mother hugging her mutt.

Reviewer's note (not a reason to flag): Mutter also means a screw nut (plural die Muttern), but that does not affect this card.

The reviewer's own translation: answer "mother"; example "My mother is from Hamburg.".

### weit-far · rank 243 · weit

Decide in [decisions/weit-far.txt](decisions/weit-far.txt)

| Field | Card |
|---|---|
| Prompt | far |
| Hint | none |
| Answer | weit |
| Kind | content, adjective |
| Grammar | none |
| Example | Ist es noch weit? / Is it still far? |
| Regional | none |
| Trick | WEIT sounds like "vite", close to "white": mountains far away look white with snow. |

Why it was flagged:

- One right answer: The bare prompt far also allows fern, a common German word for far or distant, and the card has no hint to rule it out. Suggested fix: hint: a long way, as in is it far?; not fern

Reviewer's note (not a reason to flag): The English example could read more naturally as "Is it much further?", but "Is it still far?" is an acceptable literal translation.

The reviewer's own translation: answer "far (a long way, distant); also wide"; example "Is it still far? (Is it much further?)".

### stadt-city · rank 309 · Stadt

Decide in [decisions/stadt-city.txt](decisions/stadt-city.txt)

| Field | Card |
|---|---|
| Prompt | city, town |
| Hint | none |
| Answer | die Stadt |
| Kind | content, noun |
| Grammar | feminine, die; plural die Städte |
| Example | Die Stadt ist nicht weit. / The town isn't far. |
| Regional | none |
| Trick | STADT sounds like shtaht, close to state: a big city is like a little state of its own. |

Why it was flagged:

- Memory trick: The respelling shtaht suggests a long vowel, but the a in Stadt is short, [ʃtat]. Suggested fix: trick: STADT sounds like shtat, a bit like state: a big city is like a little state of its own.

Reviewer's note (not a reason to flag): Town and city are both die Stadt, so the combined prompt has one answer, and the Spanish city picture works for it.

The reviewer's own translation: answer "city, town"; example "The city isn't far.".

### bisschen-a-bit · rank 347 · bisschen

Decide in [decisions/bisschen-a-bit.txt](decisions/bisschen-a-bit.txt)

| Field | Card |
|---|---|
| Prompt | a bit, a little |
| Hint | after ein: ein ___ |
| Answer | bisschen |
| Kind | content, adverb |
| Grammar | none |
| Example | Ich bin ein bisschen müde. / I'm a bit tired. |
| Regional | none |
| Trick | BISSCHEN sounds like "bitsy-shen": a bitsy little bite, just a bit. |

Why it was flagged:

- One right answer: The hint "ein ___" also allows "wenig", since "ein wenig" is common, correct German for a bit or a little. Suggested fix: hint: after ein: ein ___ (the everyday word, not wenig)
- Usage in Germany: In Austria people commonly say "ein bissl" (often "a bissl") instead, and in Switzerland "es bitzeli", so regional should not be null. Suggested fix: regional: { where: "Austria", text: "In everyday speech Austrians usually say ein bissl (often a bissl)." }

Reviewer's note (not a reason to flag): The trick works well because bisschen really does come from Biss (bite) plus -chen, so it literally means a little bite.

The reviewer's own translation: answer "a bit, a little (in ein bisschen; literally a little bite)"; example "I'm a little tired.".

### liebe-love · rank 357 · Liebe

Decide in [decisions/liebe-love.txt](decisions/liebe-love.txt)

| Field | Card |
|---|---|
| Prompt | love |
| Hint | none |
| Answer | die Liebe |
| Kind | content, noun |
| Grammar | feminine, die; no plural |
| Example | Die Liebe macht glücklich. / Love makes you happy. |
| Regional | none |
| Trick | LIEBE sounds like LEE-buh and is a cousin of English love; think of the lieb in beloved. |

Why it was flagged:

- Memory trick: The trick tells the learner to find lieb in beloved, but beloved has no lieb in it, so the link is misleading. Suggested fix: trick: LIEBE sounds like LEE-buh and is a cousin of English love, so picture someone saying love with a German accent.

Reviewer's note (not a reason to flag): The plural is null, which is fine: die Lieben means loved ones and is not a common plural of love.

The reviewer's own translation: answer "love (the noun)"; example "Love makes you happy.".

### deutsch-german · rank 731 · deutsch

Decide in [decisions/deutsch-german.txt](decisions/deutsch-german.txt)

| Field | Card |
|---|---|
| Prompt | German |
| Hint | none |
| Answer | deutsch |
| Kind | content, adjective |
| Grammar | none |
| Example | Ich trinke gern deutsches Bier. / I like drinking German beer. |
| Regional | none |
| Trick | DEUTSCH sounds like "DOYTCH", close to "Dutch": Pennsylvania Dutch settlers were really Germans. |

Why it was flagged:

- One right answer: The bare prompt German could also mean the language (Deutsch, with a capital, as in Ich spreche Deutsch) or a German person (der Deutsche / die Deutsche), so it needs a hint saying it is the adjective. Suggested fix: hint: adjective, as in German beer; not the language or a person

Reviewer's note (not a reason to flag): The Spanish card ingles-english means English, not German, so leaving sameAs null is right.

The reviewer's own translation: answer "German (adjective: of or from Germany, or in the German language)"; example "I like to drink German beer.".

### sein-form-er · rank 2 · sein

Decide in [decisions/sein-form-er.txt](decisions/sein-form-er.txt)

| Field | Card |
|---|---|
| Prompt | he / she is |
| Hint | none |
| Answer | er ist |
| Kind | form, verb |
| Grammar | ich bin · du bist · er ist (irregular); Perfekt: ist gewesen |
| Example | Nein, er ist Paul. / No, he's Paul. |
| Regional | none |
| Trick | Ist sounds like English is with a t at the end: er ist means he is. |

Why it was flagged:

- Example sentence: Germans normally say 'das ist Paul', not 'er ist Paul', when saying who someone is, and the opening 'Nein,' answers a question the learner never sees, so the sentence feels odd on its own. Suggested fix: example.target: Er ist mein Bruder. example.en: He's my brother.

Reviewer's note (not a reason to flag): The prompt "he / she is" with the answer "er ist" follows the app's rule for er-form cards, though a learner might answer "sie ist" and should count that as right.

The reviewer's own translation: answer "he is"; example "No, he is Paul.".

### moechten-form-ich · rank 104 · möchten

Decide in [decisions/moechten-form-ich.txt](decisions/moechten-form-ich.txt)

| Field | Card |
|---|---|
| Prompt | I would like |
| Hint | polite wish |
| Answer | ich möchte |
| Kind | form, verb |
| Grammar | ich möchte · du möchtest · er möchte (irregular); Perfekt: hat gemocht |
| Example | Ich möchte einen Kaffee. / I'd like a coffee. |
| Regional | none |
| Trick | none |

Why it was flagged:

- One right answer: The hint 'polite wish' doesn't rule out 'ich hätte gern', a very common German way to say 'I would like' (Ich hätte gern einen Kaffee), so the prompt has two right answers. Suggested fix: hint: polite wish, the modal verb möchten, not hätte gern

Reviewer's note (not a reason to flag): Möchten has no Perfekt of its own, since hat gemocht means 'liked' (from mögen) and a past wish is usually said with wollte, so the editor may want to say that the Perfekt shown is borrowed from mögen; the sibling cards should get the same hätte gern fix.

The reviewer's own translation: answer "I would like"; example "I'd like a coffee.".

### moechten-form-er · rank 104 · möchten

Decide in [decisions/moechten-form-er.txt](decisions/moechten-form-er.txt)

| Field | Card |
|---|---|
| Prompt | he / she would like |
| Hint | polite wish |
| Answer | er möchte |
| Kind | form, verb |
| Grammar | ich möchte · du möchtest · er möchte (irregular); Perfekt: hat gemocht |
| Example | Er möchte einen Kaffee, bitte. / He'd like a coffee, please. |
| Regional | none |
| Trick | none |

Why it was flagged:

- Grammar: möchten has no Perfekt of its own: hat gemocht is the Perfekt of mögen and means liked, not wanted, so a learner who memorizes it would say the wrong thing; a past wish uses wollen (hat gewollt, wollte). Suggested fix: grammar.perfekt: null (or note that the past is expressed with wollen: hat gewollt)

Reviewer's note (not a reason to flag): The hint "polite wish" is fine; it steers away from "er will" (he wants), and only "er möchte" fits the möchten strip.

The reviewer's own translation: answer "he / she would like"; example "He would like a coffee, please.".

### phrase-no-thank-you · rank 96 · me-and-you

Decide in [decisions/phrase-no-thank-you.txt](decisions/phrase-no-thank-you.txt)

| Field | Card |
|---|---|
| Prompt | No, thank you. |
| Hint | none |
| Answer | Nein, danke. |
| Kind | phrase, phrase |
| Grammar | none |
| Example | Möchtest du einen Kaffee? – Nein, danke. / Would you like a coffee? – No, thank you. |
| Regional | Switzerland: Nein, merci. |
| Trick | none |

Why it was flagged:

- Example uses words not met yet: The example uses words not met before this card: Möchtest, einen. In the starter path it may use only earlier cards' words, its own, names, numbers and at most one obvious cognate. Suggested fix: npm run draft -- --examples --ids phrase-no-thank-you

Reviewer's note (not a reason to flag): The Swiss footnote is right, since merci is the everyday thanks in Switzerland, and the card pairs well with "Ja, bitte." in the same unit.

The reviewer's own translation: answer "No, thanks."; example "Do you want a coffee? – No, thanks.".

### phrase-whats-your-name · rank 167 · who-i-am

Decide in [decisions/phrase-whats-your-name.txt](decisions/phrase-whats-your-name.txt)

| Field | Card |
|---|---|
| Prompt | What's your name? |
| Hint | informal |
| Answer | Wie heißt du? |
| Kind | phrase, phrase |
| Grammar | none |
| Example | Ich heiße Tom. Wie heißt du? / My name is Tom. What's your name? |
| Regional | none |
| Trick | Heißt sounds like the old English word hight, which meant "named", as in "a knight hight Lancelot". |

Why it was flagged:

- One right answer: The hint "informal" doesn't rule out "Wie ist dein Name?", which is also a correct and common informal answer, so the prompt has two right answers. Suggested fix: hint: informal; the everyday way: literally "How are you called?"

Reviewer's note (not a reason to flag): The example is two short sentences rather than one, but it reads naturally as an introduction, and the verb card llamar-be-named is rightly not reused for this whole phrase.

The reviewer's own translation: answer "What are you called? / What's your name? (informal)"; example "I'm called Tom. What are you called?".

### phrase-nice-to-meet-you · rank 417 · who-i-am

Decide in [decisions/phrase-nice-to-meet-you.txt](decisions/phrase-nice-to-meet-you.txt)

| Field | Card |
|---|---|
| Prompt | Nice to meet you! |
| Hint | none |
| Answer | Freut mich! |
| Kind | phrase, phrase |
| Grammar | none |
| Example | Freut mich! Ich bin aus Hamburg. / Nice to meet you! I'm from Hamburg. |
| Regional | none |
| Trick | none |

Why it was flagged:

- One right answer: Without a hint, Schön, dich kennenzulernen! or Freut mich, dich kennenzulernen! are also common, correct answers to Nice to meet you! Suggested fix: hint: The short two-word reply, not schön, dich kennenzulernen

Reviewer's note (not a reason to flag): Freut mich! works for both du and Sie, so the hint doesn't need to say informal or formal.

The reviewer's own translation: answer "Pleased to meet you! (literally: pleases me)"; example "Pleased to meet you! I'm from Hamburg.".

### phrase-im-from-berlin-and · rank 65 · who-i-am

Decide in [decisions/phrase-im-from-berlin-and.txt](decisions/phrase-im-from-berlin-and.txt)

| Field | Card |
|---|---|
| Prompt | I'm from Berlin, and you? |
| Hint | informal |
| Answer | Ich bin aus Berlin, und du? |
| Kind | phrase, phrase |
| Grammar | none |
| Example | Ich bin aus Berlin, und du? – Ich bin aus Hamburg. / I'm from Berlin, and you? – I'm from Hamburg. |
| Regional | none |
| Trick | none |

Why it was flagged:

- One right answer: "Ich komme aus Berlin, und du?" is just as common and correct for "I'm from Berlin", and the hint only rules out "und Sie?", not the verb kommen. Suggested fix: hint: informal; with sein (literally "I am"), not kommen

Reviewer's note (not a reason to flag): Make sure the sibling card "She is from Hamburg." uses the same verb (sein or kommen) as this card, so the unit stays consistent.

The reviewer's own translation: answer "I'm from Berlin, and you?"; example "I'm from Berlin, and you? – I'm from Hamburg.".

### phrase-she-is-from-hamburg · rank 65 · who-i-am

Decide in [decisions/phrase-she-is-from-hamburg.txt](decisions/phrase-she-is-from-hamburg.txt)

| Field | Card |
|---|---|
| Prompt | She is from Hamburg. |
| Hint | none |
| Answer | Sie ist aus Hamburg. |
| Kind | phrase, phrase |
| Grammar | none |
| Example | Sie ist aus Hamburg und er ist aus Berlin. / She is from Hamburg and he is from Berlin. |
| Regional | none |
| Trick | none |

Why it was flagged:

- One right answer: Without a hint, "Sie kommt aus Hamburg." is just as common and correct for "She is from Hamburg.", so the prompt has two right answers. Suggested fix: hint: with sein, not kommen

Reviewer's note (not a reason to flag): Make sure this card and the "I'm from Berlin, and you?" card use the same verb (sein or kommen), or tell them apart with hints, so the learner isn't confused.

The reviewer's own translation: answer "She is from Hamburg."; example "She is from Hamburg and he is from Berlin.".

### phrase-how-are-you · rank 34 · hello-how-are-you

Decide in [decisions/phrase-how-are-you.txt](decisions/phrase-how-are-you.txt)

| Field | Card |
|---|---|
| Prompt | How are you? |
| Hint | casual, to a friend |
| Answer | Wie geht's? |
| Kind | phrase, phrase |
| Grammar | none |
| Example | Hallo, Anna! Wie geht's? / Hi, Anna! How are you? |
| Regional | none |
| Trick | Think of the old English "How goes it?": geht means goes, and 's is short for es, it. |

Why it was flagged:

- One right answer: The hint 'casual, to a friend' fits 'Wie geht es dir?' and 'Wie geht's dir?' just as well as 'Wie geht's?', so the learner can't tell which one the card wants. Suggested fix: hint: casual short form, without dir

Reviewer's note (not a reason to flag): The example sentence is almost the same as the answer of the unit's 'Hello! How are you?' card, so the editor might want to keep the two cards clearly apart.

The reviewer's own translation: answer "How's it going? / How are you? (casual, literally: how goes it?)"; example "Hi, Anna! How's it going?".

### phrase-id-like-a-water · rank 402 · what-i-want-and-have

Decide in [decisions/phrase-id-like-a-water.txt](decisions/phrase-id-like-a-water.txt)

| Field | Card |
|---|---|
| Prompt | I'd like a water, please. |
| Hint | none |
| Answer | Ich möchte ein Wasser, bitte. |
| Kind | phrase, phrase |
| Grammar | none |
| Example | Hallo! Ich möchte ein Wasser, bitte. / Hello! I'd like a water, please. |
| Regional | none |
| Trick | none |

Why it was flagged:

- One right answer: Without a hint, "Ich hätte gern ein Wasser, bitte." is just as natural and common for "I'd like a water, please", so the prompt has two right answers. Suggested fix: hint: use möchte
- Words outside the top 1,000: The phrase uses möchten, not among the 1,000 most common words.

Reviewer's note (not a reason to flag): The Spanish card agua-water only means the noun water, not this ordering phrase, so null is the right sameAs for a phrase card.

The reviewer's own translation: answer "I'd like a water, please."; example "Hello! I'd like a water, please.".

### phrase-he-has-a-house · rank 129 · what-i-want-and-have

Decide in [decisions/phrase-he-has-a-house.txt](decisions/phrase-he-has-a-house.txt)

| Field | Card |
|---|---|
| Prompt | He has a house. |
| Hint | none |
| Answer | Er hat ein Haus. |
| Kind | phrase, phrase |
| Grammar | none |
| Example | Er hat ein Haus und ich habe Kaffee. / He has a house and I have coffee. |
| Regional | none |
| Trick | none |

Why it was flagged:

- Example sentence: Grammatically fine, but pairing a house with coffee is an odd mix that nobody would naturally say, so it doesn't work as a model sentence. Suggested fix: example.target: Er hat ein Haus mit Garten. / example.en: He has a house with a garden.

Reviewer's note (not a reason to flag): sameAs is correctly null because this is a phrase card, though the Spanish card tener-have covers the same verb if a picture is wanted elsewhere.

The reviewer's own translation: answer "He has a house."; example "He has a house and I have coffee.".

### phrase-this-is-my-mother · rank 175 · my-people

Decide in [decisions/phrase-this-is-my-mother.txt](decisions/phrase-this-is-my-mother.txt)

| Field | Card |
|---|---|
| Prompt | This is my mother. |
| Hint | none |
| Answer | Das ist meine Mutter. |
| Kind | phrase, phrase |
| Grammar | none |
| Example | Hallo! Das ist meine Mutter, Anna. / Hello! This is my mother, Anna. |
| Regional | none |
| Trick | none |

Why it was flagged:

- Words outside the top 1,000: The phrase uses das, not among the 1,000 most common words.

Reviewer's note (not a reason to flag): In the example, "Anna" can be read as the mother's name or as the person being spoken to, in German and in English alike, so both readings work.

The reviewer's own translation: answer "This is my mother."; example "Hi! This is my mother, Anna.".

### phrase-what-is-that · rank 12 · asking-questions

Decide in [decisions/phrase-what-is-that.txt](decisions/phrase-what-is-that.txt)

| Field | Card |
|---|---|
| Prompt | What is that? |
| Hint | none |
| Answer | Was ist das? |
| Kind | phrase, phrase |
| Grammar | none |
| Example | Was ist das? – Das ist Tee. / What is that? – That's tea. |
| Regional | none |
| Trick | none |

Why it was flagged:

- Words outside the top 1,000: The phrase uses das, not among the 1,000 most common words.

Reviewer's note (not a reason to flag): Was ist das? works for both "What is that?" and "What is this?", so the prompt has one clear answer.

The reviewer's own translation: answer "What is that? / What is this?"; example "What is that? – That is tea.".

### phrase-do-you-speak-english · rank 1186 · when-i-dont-understand

Decide in [decisions/phrase-do-you-speak-english.txt](decisions/phrase-do-you-speak-english.txt)

| Field | Card |
|---|---|
| Prompt | Do you speak English? |
| Hint | formal, to a stranger |
| Answer | Sprechen Sie Englisch? |
| Kind | phrase, phrase |
| Grammar | none |
| Example | Hallo, sprechen Sie Englisch? Ich spreche kein Deutsch. / Hello, do you speak English? I don't speak German. |
| Regional | none |
| Trick | none |

Why it was flagged:

- Words outside the top 1,000: The phrase uses englisch, not among the 1,000 most common words.

Reviewer's note (not a reason to flag): The example reuses the unit's own phrase "Ich spreche kein Deutsch", which works as reinforcement; the colloquial "Können Sie Englisch?" also exists, but "Sprechen Sie Englisch?" is the standard answer.

The reviewer's own translation: answer "Do you speak English? (formal)"; example "Hello, do you speak English? I don't speak German.".

### phrase-once-more-please · rank 280 · when-i-dont-understand

Decide in [decisions/phrase-once-more-please.txt](decisions/phrase-once-more-please.txt)

| Field | Card |
|---|---|
| Prompt | Once more, please. |
| Hint | none |
| Answer | Noch einmal, bitte. |
| Kind | phrase, phrase |
| Grammar | none |
| Example | Ich verstehe das nicht. Noch einmal, bitte. / I don't understand that. Once more, please. |
| Regional | none |
| Trick | Einmal starts with ein, meaning one, so noch einmal is literally still one time. |

Why it was flagged:

- Example sentence: The example is two sentences, but it should be one short sentence. Suggested fix: example.target: Entschuldigung, noch einmal, bitte. | example.en: Sorry, once more, please.

Reviewer's note (not a reason to flag): People often shorten it to "Noch mal, bitte." (or "Nochmal, bitte."), so you could accept that as a variant of the same answer.

The reviewer's own translation: answer "Once more, please. / One more time, please."; example "I don't understand that. Once more, please.".

### phrase-excuse-me-sorry · rank 451 · out-and-about

Decide in [decisions/phrase-excuse-me-sorry.txt](decisions/phrase-excuse-me-sorry.txt)

| Field | Card |
|---|---|
| Prompt | Excuse me! / Sorry! |
| Hint | none |
| Answer | Entschuldigung! |
| Kind | phrase, phrase |
| Grammar | none |
| Example | Entschuldigung, wo ist die Toilette? / Excuse me, where is the toilet? |
| Regional | Switzerland: Exgüsi |
| Trick | none |

Why it was flagged:

- One right answer: With no hint, 'Excuse me! / Sorry!' could also be answered with Entschuldige!, Entschuldigen Sie!, Verzeihung!, Tut mir leid! or the everyday loanword Sorry!, so more than one answer is right. Suggested fix: hint: the one-word noun, to get attention or apologise (not Tut mir leid or Entschuldige)

Reviewer's note (not a reason to flag): Exgüsi is Swiss German dialect, while Swiss Standard German also says Entschuldigung, so the regional text could say it is the spoken form.

The reviewer's own translation: answer "Excuse me! / Sorry! (a one-word noun used to apologise or to get someone's attention)"; example "Excuse me, where is the toilet?".

### phrase-where-is-the-toilet · rank 79 · out-and-about

Decide in [decisions/phrase-where-is-the-toilet.txt](decisions/phrase-where-is-the-toilet.txt)

| Field | Card |
|---|---|
| Prompt | Where is the toilet? |
| Hint | none |
| Answer | Wo ist die Toilette? |
| Kind | phrase, phrase |
| Grammar | none |
| Example | Wo ist hier die Toilette, bitte? / Where's the toilet around here, please? |
| Regional | Switzerland: Wo ist das WC? |
| Trick | none |

Why it was flagged:

- Words outside the top 1,000: The phrase uses toilette, not among the 1,000 most common words.

Reviewer's note (not a reason to flag): Wo ist das Klo? is the casual version among friends and Wo ist das WC? is also heard in Germany, but Toilette is the safe standard word for "toilet", so the card is fine; the Swiss footnote is reasonable since WC is the usual word there.

The reviewer's own translation: answer "Where is the toilet?"; example "Where is the toilet here, please?".

### phrase-im-going-home-now · rank 129 · where-im-going

Decide in [decisions/phrase-im-going-home-now.txt](decisions/phrase-im-going-home-now.txt)

| Field | Card |
|---|---|
| Prompt | I'm going home now. |
| Hint | none |
| Answer | Ich gehe jetzt nach Hause. |
| Kind | phrase, phrase |
| Grammar | none |
| Example | Ich bin sehr müde. Ich gehe jetzt nach Hause. / I'm very tired. I'm going home now. |
| Regional | none |
| Trick | none |

Why it was flagged:

- Example sentence: The example is two sentences, but it should be one short sentence. Suggested fix: example.target: Tschüss, ich gehe jetzt nach Hause. | example.en: Bye, I'm going home now.

Reviewer's note (not a reason to flag): "Ich fahre jetzt nach Hause" also works if you're going by car or train, and southern speakers often say "heim", but "gehe ... nach Hause" is the right everyday default, so no hint is needed.

The reviewer's own translation: answer "I'm going home now."; example "I'm very tired. I'm going home now.".

### phrase-i-live-in-berlin · rank 439 · what-i-do

Decide in [decisions/phrase-i-live-in-berlin.txt](decisions/phrase-i-live-in-berlin.txt)

| Field | Card |
|---|---|
| Prompt | I live in Berlin and work here. |
| Hint | none |
| Answer | Ich wohne in Berlin und arbeite hier. |
| Kind | phrase, phrase |
| Grammar | none |
| Example | Ich wohne in Berlin und arbeite hier. Und du? / I live in Berlin and work here. And you? |
| Regional | none |
| Trick | none |

Why it was flagged:

- One right answer: Without a hint, "Ich lebe in Berlin und arbeite hier." is just as common and correct for "I live in Berlin", so the prompt has two right answers. Suggested fix: hint: use wohnen for live

Reviewer's note (not a reason to flag): The example sentence just repeats the phrase and adds "Und du?". That's fine, but it doesn't show the phrase in any new setting.

The reviewer's own translation: answer "I live in Berlin and work here."; example "I live in Berlin and work here. And you?".

### phrase-i-get-up-early · rank 1025 · what-i-do

Decide in [decisions/phrase-i-get-up-early.txt](decisions/phrase-i-get-up-early.txt)

| Field | Card |
|---|---|
| Prompt | I get up early. |
| Hint | none |
| Answer | Ich stehe früh auf. |
| Kind | phrase, phrase |
| Grammar | none |
| Example | Ich stehe früh auf und trinke einen Kaffee. / I get up early and drink a coffee. |
| Regional | none |
| Trick | none |

Why it was flagged:

- Words outside the top 1,000: The phrase uses aufstehen, not among the 1,000 most common words.

The reviewer's own translation: answer "I get up early."; example "I get up early and drink a coffee.".

### phrase-i-dont-like-beer · rank 801 · what-i-like

Decide in [decisions/phrase-i-dont-like-beer.txt](decisions/phrase-i-dont-like-beer.txt)

| Field | Card |
|---|---|
| Prompt | I don't like beer. |
| Hint | use kein |
| Answer | Ich mag kein Bier. |
| Kind | phrase, phrase |
| Grammar | none |
| Example | Nein, danke. Ich mag kein Bier. Ich trinke Wasser. / No, thanks. I don't like beer. I'll drink water. |
| Regional | none |
| Trick | none |

Why it was flagged:

- Example sentence: The example is three sentences, but it should be one short sentence. Suggested fix: example.target: Nein danke, ich mag kein Bier. example.en: No thanks, I don't like beer.

Reviewer's note (not a reason to flag): The hint "use kein" is needed because it rules out "Ich mag Bier nicht" and "Ich trinke nicht gern Bier", and sameAs is rightly null even though the Spanish list has cerveza-beer, because phrase cards never have a sameAs.

The reviewer's own translation: answer "I don't like beer."; example "No, thanks. I don't like beer. I'm drinking water.".

### phrase-see-you-later · rank 328 · people-i-love

Decide in [decisions/phrase-see-you-later.txt](decisions/phrase-see-you-later.txt)

| Field | Card |
|---|---|
| Prompt | See you later! |
| Hint | later today |
| Answer | Bis später! |
| Kind | phrase, phrase |
| Grammar | none |
| Example | Ich rufe dich an. Bis später! / I'll call you. See you later! |
| Regional | none |
| Trick | none |

Why it was flagged:

- One right answer: The hint 'later today' doesn't rule out 'Bis nachher!', which is just as common in Germany for seeing someone again later the same day, and 'Bis gleich!' is also close. Suggested fix: hint: later today, with the everyday word for later (not nachher or gleich)

Reviewer's note (not a reason to flag): Bis später works with both du and Sie, so this card needs no informal tag, unlike the unit's other phrase cards.

The reviewer's own translation: answer "See you later! (literally: until later)"; example "I'll call you. See you later!".

### phrase-i-love-you · rank 145 · people-i-love

Decide in [decisions/phrase-i-love-you.txt](decisions/phrase-i-love-you.txt)

| Field | Card |
|---|---|
| Prompt | I love you. |
| Hint | informal |
| Answer | Ich liebe dich. |
| Kind | phrase, phrase |
| Grammar | none |
| Example | Ich liebe dich und ich vermisse dich. / I love you and I miss you. |
| Regional | none |
| Trick | none |

Why it was flagged:

- One right answer: In a unit about the people you love, the hint 'informal' only rules out Sie, so 'Ich hab dich lieb.' (the usual way to say I love you to family and friends) would also be a correct answer. Suggested fix: hint: informal, romantic (to your partner)

Reviewer's note (not a reason to flag): You could add a separate phrase card for 'Ich hab dich lieb.' (for family and friends), since it fits this unit and is how Germans say I love you to people who aren't their partner.

The reviewer's own translation: answer "I love you (said to one person you call du)."; example "I love you and I miss you.".

### phrase-how-much-is-it · rank 609 · buying-things

Decide in [decisions/phrase-how-much-is-it.txt](decisions/phrase-how-much-is-it.txt)

| Field | Card |
|---|---|
| Prompt | How much is it? |
| Hint | none |
| Answer | Was kostet das? |
| Kind | phrase, phrase |
| Grammar | none |
| Example | Entschuldigung, was kostet das? / Excuse me, how much is it? |
| Regional | none |
| Trick | Kostet sounds like costs, so Was kostet das? is literally What costs that? |

Why it was flagged:

- One right answer: Wie viel kostet das? is just as common and just as right for How much is it?, and nothing in the prompt rules it out. Suggested fix: hint: the short way, starting with was (not wie viel)
- Words outside the top 1,000: The phrase uses das, not among the 1,000 most common words.

Reviewer's note (not a reason to flag): An English prompt of How much is this? or How much is that? would match das a little more closely than it, but it is fine as it is.

The reviewer's own translation: answer "How much is that? (literally: What does that cost?)"; example "Excuse me, how much is that?".

### phrase-id-like-to-pay · rank 423 · buying-things

Decide in [decisions/phrase-id-like-to-pay.txt](decisions/phrase-id-like-to-pay.txt)

| Field | Card |
|---|---|
| Prompt | I'd like to pay, please. |
| Hint | none |
| Answer | Ich möchte bezahlen, bitte. |
| Kind | phrase, phrase |
| Grammar | none |
| Example | Entschuldigung! Ich möchte bezahlen, bitte. / Excuse me! I'd like to pay, please. |
| Regional | none |
| Trick | none |

Why it was flagged:

- Words outside the top 1,000: The phrase uses möchten, not among the 1,000 most common words.

Reviewer's note (not a reason to flag): The common short form "Zahlen, bitte!" could be worth mentioning somewhere, but "I'd like to" clearly points to "Ich möchte bezahlen, bitte."

The reviewer's own translation: answer "I would like to pay, please."; example "Excuse me! I would like to pay, please.".

### phrase-are-you-coming-along · rank 7 · making-plans

Decide in [decisions/phrase-are-you-coming-along.txt](decisions/phrase-are-you-coming-along.txt)

| Field | Card |
|---|---|
| Prompt | Are you coming along? |
| Hint | informal |
| Answer | Kommst du mit? |
| Kind | phrase, phrase |
| Grammar | none |
| Example | Ich gehe heute Abend zu einer Party. Kommst du mit? / I'm going to a party tonight. Are you coming along? |
| Regional | none |
| Trick | none |

Why it was flagged:

- Example sentence: The example is two sentences, but the card format asks for one short sentence. Suggested fix: example.target: Ich gehe heute Abend auf eine Party, kommst du mit? | example.en: I'm going to a party tonight, are you coming along?
- Words outside the top 1,000: The phrase uses mitkommen, not among the 1,000 most common words.

Reviewer's note (not a reason to flag): The informal hint is needed here, because it rules out the Sie form "Kommen Sie mit?".

The reviewer's own translation: answer "Are you coming along? / Are you coming with me (us)?"; example "I'm going to a party this evening. Are you coming along?".

### case-a-coffee-please · rank 583 · a-coffee-please

Decide in [decisions/case-a-coffee-please.txt](decisions/case-a-coffee-please.txt)

| Field | Card |
|---|---|
| Prompt | [a] coffee, please |
| Hint | none |
| Answer | einen Kaffee |
| Kind | case, determiner |
| Grammar | Akkusativ · masculine: from ein |
| Example | Ich möchte einen Kaffee, bitte. / I'd like a coffee, please. |
| Regional | none |
| Trick | none |

Why it was flagged:

- One right answer: With no verb in the prompt, nothing makes the case accusative, and "Ein Kaffee, bitte" (nominative) is also often heard when people order in Germany, so a learner could fairly give ein Kaffee instead of einen Kaffee. Suggested fix: hint: the object of an unspoken ich möchte (I'd like)

Reviewer's note (not a reason to flag): The Spanish card cafe-coffee has the same noun, but a case card's sameAs stays null, so null is right here.

The reviewer's own translation: answer "a coffee (accusative, as the object of a verb such as möchte or hätte)"; example "I would like a coffee, please.".

## Decided

Nothing yet.
