# Flagged cards

The review pass flagged 9 cards: 9 waiting for you, 0 decided. This file is rewritten by `npm run review` and `npm run deck`; do not edit it.

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

### case-i-see-the-man · rank 82 · a-coffee-please

Decide in [decisions/case-i-see-the-man.txt](decisions/case-i-see-the-man.txt)

| Field | Card |
|---|---|
| Prompt | I see [the] man |
| Hint | none |
| Answer | den Mann |
| Kind | case, determiner |
| Grammar | Akkusativ · masculine: from der |
| Example | Siehst du den Mann da? / Do you see the man there? |
| Regional | none |
| Trick | none |

Why it was flagged:

- Example uses words not met yet: The example uses words not met before this card: Siehst, du, da. In the frequency phase it may use at most two words not met yet. Suggested fix: npm run draft -- --examples --ids case-i-see-the-man

The reviewer's own translation: answer "the man (accusative, as the object of a verb)"; example "Do you see the man there?".

### case-with-a-friend · rank 150 · with-friends

Decide in [decisions/case-with-a-friend.txt](decisions/case-with-a-friend.txt)

| Field | Card |
|---|---|
| Prompt | with [a] friend |
| Hint | a male friend |
| Answer | mit einem Freund |
| Kind | case, determiner |
| Grammar | Dativ · masculine: from ein |
| Example | Ich gehe heute mit einem Freund essen. / I'm going out to eat with a friend today. |
| Regional | none |
| Trick | none |

Why it was flagged:

- Example uses words not met yet: The example uses words not met before this card: gehe, heute, essen. In the frequency phase it may use at most two words not met yet. Suggested fix: npm run draft -- --examples --ids case-with-a-friend

Reviewer's note (not a reason to flag): The hint "a male friend" is needed, because without it "mit einer Freundin" would also be a right answer.

The reviewer's own translation: answer "with a (male) friend"; example "I'm going out to eat with a friend today.".

### case-with-my-mother · rank 175 · with-friends

Decide in [decisions/case-with-my-mother.txt](decisions/case-with-my-mother.txt)

| Field | Card |
|---|---|
| Prompt | with [my] mother |
| Hint | none |
| Answer | mit meiner Mutter |
| Kind | case, determiner |
| Grammar | Dativ · feminine: from meine |
| Example | Ich gehe heute mit meiner Mutter in die Stadt. / I'm going into town with my mother today. |
| Regional | none |
| Trick | none |

Why it was flagged:

- Example uses words not met yet: The example uses words not met before this card: gehe, heute, in, Stadt. In the frequency phase it may use at most two words not met yet. Suggested fix: npm run draft -- --examples --ids case-with-my-mother

The reviewer's own translation: answer "with my mother"; example "I'm going into town with my mother today.".

### case-with-the-child · rank 147 · with-friends

Decide in [decisions/case-with-the-child.txt](decisions/case-with-the-child.txt)

| Field | Card |
|---|---|
| Prompt | with [the] child |
| Hint | none |
| Answer | mit dem Kind |
| Kind | case, determiner |
| Grammar | Dativ · neuter: from das |
| Example | Ich gehe heute mit dem Kind nach Hause. / I'm going home with the child today. |
| Regional | none |
| Trick | none |

Why it was flagged:

- Example uses words not met yet: The example uses words not met before this card: gehe, heute, nach. In the frequency phase it may use at most two words not met yet. Suggested fix: npm run draft -- --examples --ids case-with-the-child

The reviewer's own translation: answer "with the child"; example "I'm going home with the child today.".

### case-with-a-child · rank 147 · with-friends

Decide in [decisions/case-with-a-child.txt](decisions/case-with-a-child.txt)

| Field | Card |
|---|---|
| Prompt | with [a] child |
| Hint | none |
| Answer | mit einem Kind |
| Kind | case, determiner |
| Grammar | Dativ · neuter: from ein |
| Example | Sie wohnt mit einem Kind in Berlin. / She lives in Berlin with a child. |
| Regional | none |
| Trick | none |

Why it was flagged:

- Example uses words not met yet: The example uses words not met before this card: wohnt, in, Berlin. In the frequency phase it may use at most two words not met yet. Suggested fix: npm run draft -- --examples --ids case-with-a-child

The reviewer's own translation: answer "with a child"; example "She lives in Berlin with a child.".

### case-to-my-friends · rank 150 · making-plans

Decide in [decisions/case-to-my-friends.txt](decisions/case-to-my-friends.txt)

| Field | Card |
|---|---|
| Prompt | to [my] friend's |
| Hint | a male friend |
| Answer | zu meinem Freund |
| Kind | case, determiner |
| Grammar | Dativ · masculine: from mein |
| Example | Heute Abend gehe ich zu meinem Freund. / Tonight I'm going to my friend's. |
| Regional | none |
| Trick | none |

Why it was flagged:

- Example sentence: Said on its own, "Heute Abend gehe ich zu meinem Freund" is usually heard as going to your boyfriend's, so the translation "my friend's" misleads; a name after Freund makes the friend reading natural. Suggested fix: example.target: Heute Abend gehe ich zu meinem Freund Max. example.en: Tonight I'm going to my friend Max's.

Reviewer's note (not a reason to flag): Learners may need a heads-up somewhere on the card that "mein Freund" without context often means my boyfriend, and that Germans say "ein Freund von mir" or add a name for a plain friend.

The reviewer's own translation: answer "to my (male) friend / to my boyfriend (dative after zu)"; example "Tonight I'm going to my friend's (or, as most Germans would hear it, to my boyfriend's).".

### case-with-my-friends · rank 150 · making-plans

Decide in [decisions/case-with-my-friends.txt](decisions/case-with-my-friends.txt)

| Field | Card |
|---|---|
| Prompt | with [my] friends |
| Hint | none |
| Answer | mit meinen Freunden |
| Kind | case, determiner |
| Grammar | Dativ · plural: from meine |
| Example | Heute Abend gehe ich mit meinen Freunden essen. / Tonight I'm going out to eat with my friends. |
| Regional | none |
| Trick | In the dative plural both words get an -n: meine Freunde becomes meinen Freunden. |

Why it was flagged:

- Example uses words not met yet: The example uses words not met before this card: Abend, gehe, essen. In the frequency phase it may use at most two words not met yet. Suggested fix: npm run draft -- --examples --ids case-with-my-friends

Reviewer's note (not a reason to flag): An all-female group would be mit meinen Freundinnen, but the default plural Freunden is the expected answer with no hint; the trick is a grammar tip rather than a sound link, which is fine for a case card.

The reviewer's own translation: answer "with my friends"; example "This evening I'm going out to eat with my friends.".

## Decided

Nothing yet.
