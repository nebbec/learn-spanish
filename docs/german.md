# Learn German: PRD

Status: agreed in an interview with Courtney on 2026-10-09; nothing built yet. The work is broken into [tickets](#tickets) at the end, on a board of their own.

This doc says only what differs for German. Everything else is [design.md](design.md): the terms, the learning engine, the learning path's principles, the screens, offline and sync, and the content pipeline all apply to German unchanged unless a section here says otherwise. Spanish tickets never need to read this file; German tickets read design.md first, then this file.

## Goal

The same app, for German: a playful, installable, offline-first web app that teaches the 1,000 most common German words, in the learning path's order, with the same engine, screens, cast and pipeline as Spanish.

The learner is Courtney, from zero, with the same goal as Spanish (design.md, "Learning path", "Goal"): to **speak**. Survival and travel German, and simple conversations about themselves and the people around them (family, feelings, plans). Courtney judges the German path the same way, by studying the first 100 cards from zero on the phone and then tailoring.

## Decisions

Made in the interview of 2026-10-09:

| Question | Decision |
|---|---|
| Who and what for | Courtney, from zero, same speaking goal as Spanish. |
| Shape | One repo, two builds. The same code is deployed twice, once per language. Two installed apps on the phone, each with its own icon, offline store and sync. |
| Shared | All app code, all content scripts, one Supabase project and one set of tables with a `lang` column. An improvement to the engine reaches both languages on their next deploy. |
| Per language | Content (deck, units, tips, drafts, reviews, tags, art cast, audio, mascot loops) and a small language config. |
| Variety and register | Standard German as spoken in Germany. Cards use **du**, as Spanish uses tú. **Sie** is taught by a tip and by survival chunks. The Spain footnote becomes a regional footnote (Austria or Switzerland), used rarely. |
| Nouns | The answer is article plus noun (`der Tisch`). The reveal adds the plural (`die Tische`), unrated. A wrong der, die or das is orange. |
| Verbs | Three-form present strip `ich · du · er`, separable verbs written split (`ich rufe an`), the irregular flag, and one unrated Perfekt line (`hat angerufen`, `ist gegangen`). Wir, Sie and sie (they) take the infinitive's form, which a tip teaches once. |
| Cases | **Case cards**, a new card kind: a marked English phrase whose answer is an article (and noun) or pronoun in the accusative or dative (`I see [the] man` → `den Mann`). About 30, in the starter path, each after its case's tip. No genitive. |
| Mascot | A **new German lead** in the same soft-clay style, chosen on a contact sheet as F1 chose the concha. The supporting cast stays the same: alpaca, turtle, chick and capybara. |
| Art | Stills are **reused by meaning**. A German card with the same meaning as a Spanish card takes its still, unless that still shows the concha. Concha stills and cards with no Spanish match are cast fresh, with the new lead taking about half. |
| Voice | Same provider, OpenAI `gpt-4o-mini-tts`, with a standard German instruction. Courtney picks one of 3 or 4 voices by ear on the existing test page. |
| First slice | The first 100 cards in learning-path order, end to end, studied from zero on the phone before scaling out in batches of 100. The unit plan covers the whole starter path. |
| When | Now. Spanish H1 is done and Courtney is happy with the first 100. Spanish S1 to S4 carry on beside the German track. |
| This doc | `docs/german.md` with its own board. design.md gets one pointer line. |

## Shared and per language

### The language config

One file per language, `lang/<code>.ts` (`lang/es.ts`, `lang/de.ts`), picked at build time by the environment variable `NEXT_PUBLIC_LANG` (`es` when unset, so the Spanish deployment needs no change). It holds everything the code now hard-codes for Spanish:

- **Names**: app name ("Learn German"), short name ("German"), description, the manifest and `<title>`, the install prompt's text.
- **Language tags**: the BCP 47 tag for `lang` attributes (`de`), so screen readers and the browser read the answer in German.
- **Storage names**: the Dexie database (`learn-german`), the `localStorage` prefix (`learn-german.`: muted, device id, install dismissed, last sync, auth session), the service worker's cache prefixes and the media cache (`learn-german-media`). Spanish keeps its existing names, so nothing on Courtney's phone is lost. Both languages live on separate origins in production, but they share `localhost` in development, so the names must differ.
- **Content paths**: where the deck is served (`/deck/` for Spanish, `/deck-de/` for German) and the content folder the scripts read and write (`content/` for Spanish, `content/de/` for German).
- **Mascot**: the hero's loops, posters, still and icons (`public/mascot/` for Spanish, `public/mascot-de/` for German).
- **Regional footnote label**: "Spain:" for Spanish, "Austria:" or "Switzerland:" for German, named per card (see [Card data](#card-data)).
- **The voice**: provider, voice and instruction, read by `npm run audio` and the voice test.
- **The draft, review and tag prompts' language rules**: register, variety, grammar fields and the language's examples, so the shared passes write German cards. The prompts' structure stays shared. Only the paragraphs that are about the language move into the config.

Decided in DE1 (config in `lang/`: `types.ts`, `es.ts`, `de.ts`, and `index.ts` with `LANG`, `langConfig`, `storageNames` and `NAMES`; test in `lang/lang.test.ts`):

- **Chosen at build time.** `next.config.ts` passes `NEXT_PUBLIC_LANG` on as `es` when it is unset or empty, so every build inlines a value; `lang/index.ts` reads it as `process.env.NEXT_PUBLIC_LANG` and refuses an unknown code, which fails the build. Both configs are in every bundle (about a kilobyte); only the build's is used.
- **The names on the device come from one prefix**, `storage` (`learn-spanish`, `learn-german`), spelled out by `storageNames`: the database is the prefix itself; `localStorage` keys are `<prefix>.muted`, `.device-id`, `.install-dismissed`, `.last-sync` and `.auth`; the window event is `<prefix>:synced`; the worker's cache is `<prefix>-shell-<build id>` and the media cache `<prefix>-media`. The Spanish names are exactly the ones before DE1: `lang/lang.test.ts` writes them out and loads every module that names one under each language (`NEXT_PUBLIC_LANG` unset and `de`).
- **The service worker is told its language in its address**, `/sw.js?v=<build id>&lang=<es|de>` (`serviceWorkerUrl`). `public/sw.js` is served as it is and cannot import `lang/`, so it holds a small table per language (prefix, deck path, mascot files, icons), and `lib/pwa/sw.test.ts` checks it against `lang/es.ts` and `lang/de.ts`. No language, or an unknown one, is Spanish. A worker reads art and audio under every language's deck (`/deck/` and `/deck-de/`), since a German card may use a Spanish still by its Spanish path; it stores and deletes only its own shell caches, so in development, where both share `localhost`, neither removes the other's.
- **What the config drives in the app**: the manifest (`appManifest` in `lib/pwa/manifest.ts`), `<title>` and the home-screen title, the menu heading, the install prompt, "Practise with the Spanish shown first" and the Reverse button (`language`), every `lang` attribute on text in the language being learned (`tag`), the deck's address (`DECK_URL`, `deckPath`), the mascot files (`MASCOT_FILES`) and the icons. The page's own `<html lang>` stays `en`: the screens are in English.
- **Fields for later tickets**, held in the config but not yet read by the scripts: `contentDir` (`content`, `content/de`) and `publicDeckDir` (`public/deck`, `public/deck-de`) for DE5, and `voice`. The Spanish `voice` is a copy of `VOICE` in `scripts/content/audio.mjs`, which a test keeps equal until DE5 makes the scripts read the config.
- **Placeholders in `lang/de.ts`**: the mascot and icons are the concha's (`/mascot/`, `/icon-*.png`) until DE14 makes the lead's under `/mascot-de/`, which must change the `de` row of `public/sw.js` too; the voice is `coral` with a Hochdeutsch instruction until DE11. `regionalLabel` was null for German, since each card names its region (DE3); DE4 removed it, and the reveal names the card's `where`.
- **A placeholder German deck**, `public/deck-de/deck.json`, an empty format 2 deck (version 1), so the German build loads and its worker installs. DE3 moves it to format 3 with `lang`, and DE12 replaces it with the first 100.

### Content scripts

Every content script takes `--lang de` (default `es`) and reads and writes `content/de/` in place of `content/`: `word-list.tsv`, `units.json`, `tips.json`, `drafts/`, `review/`, `tags/`, `tips/`, `deck.json`, `path.md`, `art/cast.tsv` and `art/review.tsv`. The German deck the app serves is `public/deck-de/deck.json`, with its audio under `public/deck-de/audio/` and its own stills under `public/deck-de/img/`. A reused Spanish still is named by its Spanish path (`/deck/img/casa-house.webp`).

Both deployments carry all of `public/`, so each ships the other's media until S1 (design.md, "Scale-out") moves media out of the repo. At 100 German cards this is a few MB and acceptable. S1's decision must cover both languages.

Decided in DE5 (paths in `scripts/content/script-lang.ts`, German's schemas and stand-in prompts in `scripts/content/prompts-de.ts`; test `scripts/content/german.test.ts`):

- **`--lang` picks the config, and the config picks the folders.** `parseLang` reads `--lang` (`es` when left out; an unknown code stops the script) and `contentPaths(root, lang)` gives every path from `contentDir`, `publicDeckDir` and `deckPath`: the word list, unit plan, tip list, drafts, review, tags, tips, deck, `path.md`, `audio-takes.json`, the listening page and the art files under `content/de/`, the served deck under `public/deck-de/`. Spanish's are the paths it always had. Shared by both languages: `content/.cache/` (downloads are named per language or by a hash; the art and mascot downloads go to `art-de` and `mascot-de`, since sheets are numbered per language), and `content/art/style.md` with the model sheets in `content/art/cast/`.
- **The language travels with the stores.** `DraftStore` and `TipStore` take the language (Spanish when left out), so the passes, the validators, the decision files, the deck build (`lang` in the deck, `validateDeck(deck, lang)`) and the media paths (`withMedia`, `audioPaths`, `tipAudioPaths`) follow the drafts' language without new arguments at every call. `readUnits` and `readTips` take it too, and name the missing file when a language has no plan yet.
- **Decision files are per language.** German's card lines are `gender`, `article` and `plural` for a noun; `ich`, `du`, `er`, `irregular`, `separable`, `perfekt.aux` and `perfekt.participle` for a verb; `case`, `gender` and `from` for a case card; an adjective has none. A Spanish file refuses a German line and the other way round. The flagged list names the language's decision folder, and a German file says to run `npm run deck -- --lang de`.
- **Language rules in the prompts are chosen per language in the scripts, not in `lang/*.ts`**, since the config is bundled into the app and the prompts are several kilobytes: each pass has a table by language (`DRAFT_REQUESTS`, `FORM_REQUESTS`, `PHRASE_REQUESTS`, `REVIEW_SYSTEMS`, `TAG_SYSTEMS`, `TIP_REQUESTS`). Spanish's entries are the existing prompts and schemas, byte for byte (pinned by hash in the test). German's **schemas** are real: they use the deck's names (`target`, `example.target`, `regional` as `{ where, text }` with `where` Austria or Switzerland) and German's grammar fields (gender m, f or n, article, plural, the ich, du and er forms, irregular, separable, the Perfekt), and the guards build valid German cards from them. German's **system prompts are stand-ins**: DE7 writes the German paragraphs (and may rename Claude's fields, the skip reasons, which still include `spain-only`, and the review's `back.es`). Until then `PROMPTS_READY.de` is false and `draft`, `review`, `tag` and `tips` with `--lang de` stop before calling Claude; `tag -- --check` runs.
- **Form cards per language**: `FORM_VERBS_BY_LANG.de` is empty until DE7 lists the German verbs. A German form card's id is `<verb>-form-<ich|du|er>`, its answer the pronoun and the strip's form (`ich gehe`), and the guard wants every word of it in the example. The review's id rule takes the language.
- **What waits for later tickets, and how the scripts say so**: the word list stops before downloading for German (`SOURCES_BY_LANG.de` is null until DE6); with no German lemma list the deck build and the review skip the known-words check and print why, and `--examples` stops (DE6, then DE7's cognate rule); `npm run art -- cast --lang de` stops, since German casting reuses Spanish stills by meaning and casts the German lead (DE10, DE13). The art pass works only on the language's own stills, the images under its deck path, so a reused Spanish still (`/deck/img/…`) is never rendered or published by German.
- **Audio**: the voice is `voiceOf(lang)`, read from the config; Spanish's hash inputs are the same fields in the same order, so no Spanish clip path changed (`npm run audio` reported 0 deck paths updated). German clips are `/deck-de/audio/<name>.<hash>.mp3` in `public/deck-de/audio/`, transcribed back with `language: de`, takes in `content/de/audio-takes.json`, and `--prune` looks at German's three decks (the app's, `content/de/deck.json` and `lib/deck/fixture-de.json`). The listening page finds the clips by a path relative to where it is written, and its redo command carries `--lang`.
- **Mascot**: `npm run mascot -- --lang de` reads `content/de/art/mascot/takes.json` and writes the files `lang/de.ts` names, with the lead's cutout found by the still's name (`concha.webp` from `content/art/cast/concha-cutout.webp`). A language whose mascot files are Spanish's is refused, so until DE14 a German run cannot overwrite the concha.
- **The `.mjs` scripts run through tsx** now that they read `lang/`: `npm run audio` and `npm run voice-test` with `node --import tsx`, `npm run mascot` with `tsx`, and a new `npm run word-list` (was `node scripts/content/word-list.mjs`).

### Data

**On the device**: nothing new. Separate origins and the storage names above keep the two apps apart.

**In Supabase**: the same project (`learn-spanish`, ref `sbouiweyksuiakajkrbt`) and the same tables, with a `lang` column (`es` or `de`, default `es`, so every existing row is Spanish) on `reviews`, `notes`, `card_reports` and `resets`:

- **Keys**: notes become `(user_id, lang, card_id)`, since a card id could exist in both decks (`hotel-hotel`). Reviews, reports and resets are keyed on a UUID and keep their keys.
- **Downloads are filtered by `lang`**: a device pulls only its language's rows. The `seq` cursor stays one shared sequence; a filtered page still advances it correctly.
- **A reset belongs to one language.** Start over in German never touches Spanish progress.
- **Uploads set `lang`** from the config. The row-level security policies are unchanged (owner only); `npm run check:rls` and `npm run check:sync` gain a German case.
- **Order of release**: the migration (column, default, new notes key) goes out before either deployment ships code that sends `lang`. Spanish code that does not send it keeps working, because of the default.

**Sign-in**: one account works in both apps. The German production address joins the project's redirect list. The two email templates say "your sign-in code", not "Learn Spanish".

## The German deck

### Size and order

1,000 cards from the 1,000 most common German words, the same two phases (starter path, then frequency phase), the same principles (design.md, "Learning path", "Principles"), the same intro, tips, units, form and phrase cards, and the same rule that ids are permanent once in `content/de/deck.json`.

### Word list

The same three kinds of source as E1, for German. Each needs its licence checked and recorded, as E1 did:

- **Frequency**: FrequencyWords' 2018 German list (OpenSubtitles, CC BY-SA 4.0).
- **Lemmas**: lemmatization-lists' German file (ODbL 1.0).
- **Dictionary**: LibreOffice's `de_DE` Hunspell dictionary.

German needs these rules on top of E1's:

- **Articles fold together**: `der` takes die, das, den, dem and des; `ein` takes eine, einen, einem, einer and eines; `kein` and the possessives (mein, dein, sein, ihr) likewise. This mirrors Spanish `el` taking la, los and las. The case forms come back as [case cards](#case-cards).
- **Pronoun forms that are words to say are their own words**: mich, mir, dich, dir, ihn, ihm, uns and euch. These are glue cards, as Spanish kept lo, le, me and te.
- **Capitals**: German nouns are capitalised, so a capitalised form is not taken for a name when the dictionary knows it as a noun.
- **Separable verbs are under-counted.** Subtitles split them (`ich rufe dich an`), and a form-by-form lemmatizer counts `rufe` under rufen and `an` as a preposition. The list does not try to rejoin them. The unit plan names the separable verbs the starter path needs (anrufen, ankommen, aufstehen, einkaufen…), and they are drafted out of rank order with `--ranks` or a new `--words` switch. The frequency phase takes the separable verbs that rank on their own.
- **Ihr** (the plural you) is kept as a word but has no form cards and no strip column, the way vosotros was left out of Spanish. A tip mentions it.

Decided in DE6 (sources in `scripts/content/sources.mjs`, German's rules in `scripts/content/lemmatize-de.mjs`, hand corrections in `scripts/content/overrides-de.mjs`, run as `npm run word-list -- --lang de`, output `content/de/word-list.tsv`; tests in `scripts/content/word-list.test.ts` and `known-words.test.ts`):

- **Sources**, pinned to the same commits as E1's and checked against a SHA-256 (`SOURCES_DE`): FrequencyWords' 2018 German list `de_50k.txt` (OpenSubtitles 2018, **CC BY-SA 4.0**, so `content/de/word-list.tsv` is CC BY-SA 4.0 too); lemmatization-lists' `lemmatization-de.txt` (**ODbL 1.0**); LibreOffice's `de/de_DE_frami.dic` (igerman98 by Björn Jacke with Franz Michael Baumann's additions, **GPL 2 or GPL 3**, as its header says). As with Spanish, fine for Courtney's own use and to be re-checked before anyone else gets access. The dictionary is ISO-8859-1, so a source may name its `encoding`. The frequency list is all lower case and has no apostrophes (`geht's` is counted as `geht` and `s`).
- **The summing, sharing and ranking are E1's** (`buildWordList`, which now takes a `resolve` rule and a `written` spelling; Spanish's defaults leave `content/word-list.tsv` byte for byte as it was). German's rule for a form (`candidatesDe`): an override; else the lemma list's lemmas that the dictionary knows (none: the form is itself); a declined adjective goes to its base (neue to neu), unless the form is a lemma itself, as an infinitive is (lieben is not lieb with an ending); otherwise the lemmas are shared by frequency, with the form itself among them only when the list has it as the lemma of other forms. So `Tag` keeps its count against the rare verb tagen and `hast` goes to haben rather than the noun Hast, while `ist`, `hielt` and `gesagt`, which the dictionary also lists as headwords, go to their verbs. The lemma list predates the 1996 spelling reform, so a form with `ss` it does not know is looked up with `ß` (musste as mußte).
- **The dictionary's nouns are words**: German's reader (`parseDicWords`) keeps capitalised headwords, which Spanish's leaves out as names, and skips headwords flagged as only parts of compounds or needing an affix (`mann/…o…`, the -mann of Hausmann). Names are capitalised headwords too, so they are left out by hand (`DROP_DE`: 56 names, letters, abbreviations and English or French words of dubbed films found near the top; loanwords German uses, such as Job, Team, Party and cool, stay).
- **Words are written as German writes them**: lower case when the dictionary has the word so (`ja`, `weg`, `essen`), else the lemma list's spelling, so nouns have their capital (`Mann`, `Zeit`), no article. A word that is both a verb and a noun is one row, lower case, with both kinds of forms (`essen`, `leben`, `morgen`), as Spanish words with two meanings are; the draft pass splits the meanings. 32 spellings are set by hand (`SPELLINGS_DE`), mostly nouns the dictionary also has as a rare lower-case word (`zeit` the preposition, so `Zeit`).
- **Overrides** (`OVERRIDES_DE`, 253 forms), as the ticket's rules ask: `der` takes die, das, den, dem and des; `ein`, `kein`, the possessives (mein, dein, sein, ihr, unser, euer) and dieser, jeder, welcher and solcher take their endings, and alle takes all, alles and the rest; the pronoun forms are words of their own (mich, mir, dich, dir, ihn, ihm, uns, euch, ihnen, sich, wen, wem: the list gives sie, dir and ihr to ich); the contractions (im, am, zum, zur, vom, beim) stay words, as Spanish kept del and al; `s` counts as es, `n` as ein, `hab` as haben. Then the judgments found by reading the list: words the lemma list gives to a rarer word (mal not malen, Feuer not feuern, später, weiter and lieber as words of their own, the ordinals erste, zweite, dritte, letzte and nächste with their endings), verb forms it gives to a noun (ich brauche, ruf, schau), and a few fixed shares (weiß 97% wissen; Frage and fragen, Liebe and lieben, Junge and jung, halt and halten). `sein` is one row for the verb and the possessive, and `ihr` one for the pronoun and the possessive, for the draft pass to split.
- **Separable verbs are not rejoined**, as the section above says: `rufe … an` counts under rufen and an. Some prefixed verbs rank on their own because subtitles also write them whole (anrufen 351, aufhören, kennenlernen); the unit plan names the rest (DE8).
- **The known-words check now runs for German** (`loadLemmas(root, "de")`): German's list is read the way the word list counts it, with the overrides' forms given their word as lemma (`sie` is sie, not ich) and reform spellings found under `ß`; a capitalised word is a name only when the list does not know its lower case, wherever it stands, since every noun has a capital (in Spanish a capital means a name except on a first word); and no pronouns are taken off a verb's end. The obvious-cognate rule is still Spanish's (accents and -ción); DE7 writes German's.
- **The list**: 1,200 words, 358 of them capitalised nouns. The top 300 were read for gross errors, and the rest more quickly: the top is der, sein, ich, sie, haben, ein, du, nicht, es, und, wir, was, werden, zu, er, in, können, mein, ihr, ja. Rebuilding gives a byte-identical file.

### Card data

Deck format 3, shared by both languages:

- **`es` is renamed `target`**: the answer in the language being learned. **`spain` is renamed `regional`**, `{ where, text }` or null (`{ where: "Austria", text: "Jänner" }`). The Spanish deck, drafts, reviews, tags and decision files are migrated in one commit, with every `draft` fingerprint recomputed from the migrated draft (the content is unchanged, so every review and tag stays current). The app refuses formats 1 and 2. This is an engineering decision Courtney can overrule. The alternative, keeping the name `es` in both decks, saves the migration but leaves a German deck whose answer field is called `es`.
- **The file names its language**: `{ "format": 3, "lang": "de", … }`. The app refuses a deck whose `lang` is not its build's.
- **Grammar by part of speech**, chosen by the deck's `lang`:

| `pos` | Spanish (unchanged) | German |
|---|---|---|
| noun | `{ gender: m \| f, article }` | `{ gender: m \| f \| n, article, plural }`. `plural` is the plural with its article (`die Tische`), or null for a noun with none in common use. |
| verb | `{ present: { yo, tu, el }, irregular }` | `{ present: { ich, du, er }, irregular, separable, perfekt: { aux: haben \| sein, participle } }`. Present forms are bare and split for a separable verb (`rufe an`). |
| adjective | `{ feminine }` | null. A German adjective's dictionary form does not change, and endings are never tested. |
| other | null | null |

The validator's German rules: a noun's `target` starts with its article, and `der`, `die` or `das` matches its gender. A separable verb's present forms have a space. `irregular` is true when the verb is irregular in the present or the Perfekt participle (strong or mixed).

Decided in DE3 (types in `lib/deck/types.ts`, validator in `lib/deck/validate.ts`, German fixture `lib/deck/fixture-de.json`):

- **The file is `{ "format": 3, "lang", "version", "units", "tips", "cards" }`.** Formats 1 and 2 are refused. `validateDeck(deck, expected)` checks every card by the rules of the deck's own `lang`; the app's loader passes the build's language (`LANG.code`), so the Spanish app refuses a German deck and the other way round. `validateCard`, `validateDraftCard` and `validateDraftCards` take the language as a second argument, Spanish when it is left out, since the scripts are Spanish until DE5.
- **Renamed in the card: `es` is `target`, `example.es` is `example.target`, and `spain` is `regional`**, `{ where, text }` or null. The example is renamed too (and a tip example's `es`), so no field of a German deck is named after Spanish. `where` must be one of the deck language's regions (`REGIONS`): `Spain` for Spanish, `Austria` or `Switzerland` for German. Every Spanish footnote is `{ "where": "Spain", "text": … }`. The reveal shows the card's `where` ("Austria: der Jänner"; since DE4 always, with no label in the config).
- **Types are per language**: `DraftCard<L>`, `Card<L>` and `Deck<L>` take a language, both when left out, and `grammar` follows `pos` and the language. `fixtureCard` gives a `Card<"es">` and `fixtureCardDe` a `Card<"de">`. The scripts read the drafts as `DraftCard<"es">` until DE5.
- **German rules, beyond the table above**: a noun's grammar is `{ gender, article, plural }` with `der`, `die` or `das` matching `m`, `f` or `n`, and a plural that starts `die ` or is null; a verb's is `{ present: { ich, du, er }, irregular, separable, perfekt: { aux, participle } }`, with `aux` `haben` or `sein` and, on a separable verb, a space in each present form; an adjective's is null. `irregular` is not checked against the verb.
- **German form cards**: id `<verb>-form-<ich|du|er>` (`GERMAN_FORM_ID`; there is no `hay`), and `target` is the pronoun, a space and the strip's form (`ich bin`, `ich rufe an`).
- **Case cards** (`case` in `KINDS_BY_LANG.de` only): id `case-` and one to four English words (`CASE_ID`); `pos` `determiner` or `pronoun`; the prompt marks exactly one target in square brackets, as a glue prompt; no image; `trick` may be null; grammar `{ case: akk | dat, gender: m | f | n | pl | null, from }`, where `gender` may be null only on a pronoun (`du → dich` has no gender to name). A content or glue card may not take a form, phrase or case id.
- **Claude's side is unchanged.** The draft, form, phrase, example and tip passes still ask Claude for `es`, `example.es` and `spain`, and their guards write `target`, `example.target` and `regional` (`spainFootnote`, region Spain); a field the validator refuses is reported back in Claude's names (`claudeField`). The review pass shows Claude the card under the old names (`shownCard`). So the Spanish prompts and every review's input are as before. DE7 names the fields of the German prompts.
- **Decision files** have the lines `target`, `example.target`, `regional.where` and `regional.text` (an empty `regional.text` means none).
- **The migration** was a one-off script, not kept: it renamed the fields of the 298 drafted cards, recomputed each draft's fingerprint and moved it in the 298 reviews, the 298 tags and the 53 decision files made from current drafts (8 decision files of earlier drafts were left alone, as the build leaves them); it moved `content/deck.json` and `public/deck/deck.json` to format 3 in place, keeping version 8, and `public/deck-de/deck.json` to an empty format 3 deck with `lang: "de"`. `npm run deck` then reported version 8 unchanged and wrote `content/deck.json`, `content/path.md`, `content/review/flagged.md` and every decision file byte for byte as migrated, and `npm run tag -- --check` found 298 of 298 tags current.
- **The German fixture** (`lib/deck/fixture-de.json`, `fixtureDeckDe`): unit `me-and-you`, tip `tip-accusative`, and 12 cards: `sein-form-ich`, `phrase-how-are-you`, the glue card `mit-with`, nouns of three genders (`mann-man`, `frau-woman`, `haus-house`) and `januar-january` (no plural, regional "Austria: der Jänner"), the strong verb `gehen-go`, the separable `anrufen-call`, the adjective `gut-good`, and two case cards (`case-i-see-the-man`, `case-im-calling-you`). Its media paths are placeholders under `/deck-de/`, except `haus-house` and `gehen-go`, which reuse the Spanish fixture's stills by their Spanish paths.

### What the cards look like

- **Nouns**: the prompt is the English (`table`), the answer is `der Tisch`. The reveal's grammar strip reads `der Tisch · die Tische`. A wrong article is orange ("Nearly": wrong ending, gender or accent, unchanged).
- **Verbs**: the strip reads `ich rufe an · du rufst an · er ruft an`, then a line `Perfekt: hat angerufen`, and a `separable` chip beside `irregular`. The example sentence uses a conjugated form, as in Spanish.
- **Adjectives**: just the word. Examples use correct endings.
- **Glue words**: marked prompts as in Spanish (`I see [him]` → `ihn`, `with [me]` → `mir`).
- **Form cards** (design.md, "Form cards"): `ich bin`, `du bist`, `er ist`, and so on for about ten core verbs: sein, haben, werden, können, müssen, wollen, möchten, gehen, kommen and wissen. That is about 30 cards, with ids `<verb>-form-<ich|du|er>`. Unlike Spanish, the **answer includes the pronoun** (`ich bin`, not `bin`), because German never drops it. German has no `hay`; `es gibt` is a survival chunk (a phrase card).
- **Phrase cards**: as in Spanish. The survival chunks carry Sie where travel needs it: `Sprechen Sie Englisch?`, `Können Sie das wiederholen?`, `Entschuldigung`, `Wie bitte?`, `Wie geht's?`, `Ich heiße…`, `Es gibt…`, `Ich hätte gern…`.
- **Regional footnote**: only where Austria or Switzerland differ noticeably and commonly (`Jänner`, `Grüß Gott`, `Grüezi`), shown on the reveal as "Austria: Jänner". Most cards have none.

Decided in DE4 (strip in `components/card/GrammarStrip.tsx`, used by `Reveal.tsx` and `Intro.tsx`; front in `CardFront.tsx`; test `components/card/german.test.tsx`):

- **One strip for both languages, chosen by the grammar's shape**, not by the build: a noun with `plural`, a verb whose `present` has `ich`, and a determiner or pronoun with grammar are German. So the components stay presentational and the tests draw both fixtures in one run. The Spanish strips are as before.
- **Noun**: the strip is the answer and its plural, `der Tisch · die Tische`, both in the language's `lang`; a noun with no plural reads `der Januar · no plural`. The gender is not named, since `der`, `die` or `das` already says it.
- **Verb**: `ich rufe an · du rufst an · er ruft an`, each person kept on one line so the strip wraps at the dots, then the chips `Irregular` and `Separable` (each only when true), and under it the line `Perfekt: hat angerufen`. The helper is said in the er form, as the strip's last person: `haben` is `hat`, `sein` is `ist`.
- **Form card**: the strip is its verb's, with its own person highlighted, pronoun included (`ich bin`, `du rufst an`), as the answer says it. `formPerson` reads German ids (`ich`, `du`, `er`) as well as Spanish ones.
- **Case card**: the front is the glue layout (the English with its target marked, no character), and the English under the answer keeps the mark. The intro and reveal show the case line, `Akkusativ · masculine: der → den`, with the word that changed highlighted; a pronoun's has no gender (`Akkusativ: du → dich`), and the plural reads `plural`. The changed word is the word of the answer that shares the longest start with `from` (`den` in `den Mann`, `einem` in `mit einem Freund`), or the whole answer when it is one word or nothing shares a first letter (`caseChange`). The part-of-speech chip stays `determiner` or `pronoun`.
- **Regional footnote**: the reveal names the card's own `where` ("Austria: der Jänner"; Spanish's are all `Spain`, so they read as before), and the config's `regionalLabel` is gone. As in Spanish, the intro has no footnote.
- **The tip's "?" over a card with no character** (glue, phrase and case cards; every case card names a tip): the answer starts below the "?" on the reveal, and a little lower on the intro, where "New card" sits beside it. Before, the answer's audio button ran into the "?". This applies to Spanish glue and phrase cards too.
- **Checked on a phone-sized screen** by serving the German fixture as the German build's deck (not committed) and walking both Learn batches in Chrome at 390 by 844: every intro, front and reveal, the tip and the batch end, with no sideways scroll.

### Case cards

New kind `case`, German only.

- **Prompt**: a short English phrase with the target marked, as a glue prompt (`I see [the] man`, `with [a] friend`, `I'm calling [you]`). **Answer**: the article and noun, or the pronoun, in the right case (`den Mann`, `mit einem Freund`, `dich`). Exactly one right answer, as every prompt must have.
- **What they cover**: accusative and dative of `der`, `ein` and `mein` (as the model for the possessives), across the three genders and the plural where it differs, plus the pronouns' accusative and dative (mich and mir, dich and dir, ihn and ihm). No genitive, which is rare in speech. About 30 cards.
- **Grammar**: `{ case: akk | dat, gender: m | f | n | pl, from }`, where `from` is the nominative (`der`). The reveal shows the line `Akkusativ · masculine: der → den`.
- **Id**: `case-` and one to four English words of the prompt (`case-i-see-the-man`). Part of speech `determiner` or `pronoun`, so case cards sit in those wheel slices. No image: glue layout, no character. `trick` may be null.
- **Placement**: in the starter path, each case card `requires` the noun or pronoun card it uses and names its case's tip, so it comes after both. The accusative comes early (it is needed for `Ich habe einen Bruder` and `Einen Kaffee, bitte`); the dative comes later (`mit`, `bei`, `zu`, and `Wie geht es dir?`).
- **Drafting**: a fixed list in the pipeline, like `FORM_VERBS`: Claude proposes it once from the unit plan and Courtney approves it as one list. It is then drafted, reviewed, tagged and ordered like form cards.

### Learning path

Claude drafts `content/de/units.json` and `content/de/tips.json` and Courtney edits and approves them, as in L1. The shape and rules are design.md's.

- **An illustrative opening**, not binding: 1 Me and you (ich, du, er, sie, ja, nein, hallo, danke), 2 Who I am (ich bin, du bist, er ist, ich heiße, aus), 3 How I am (Wie geht's?, gut, hier, nicht), 4 What I want and have (ich habe, ich möchte, ein, the accusative, `einen Kaffee, bitte`), …
- **Expected tips**, about 15:
  - German always says the pronoun (unlike Spanish, nothing drops)
  - verbs change with who does them
  - every noun is der, die or das, and nouns are capitalised
  - du and Sie (and that Sie, wir and sie share the infinitive)
  - the verb comes second
  - with a modal, the second verb goes to the end
  - questions start with the verb
  - nicht and kein
  - the accusative
  - separable verbs
  - the dative after mit, bei and zu
  - the Perfekt with haben and sein
  - plurals have no single rule
- **Example sentences use known words** (design.md, L7) with German's lemma list. The obvious-cognate rule changes per language: German cognates appear in the English as they are, with c for k (`Kaffee`, `Doktor`), or with `-tät` as `-ty` and `-ion` unchanged. The rule moves into the language config. The rest of the check is shared.

## Art

- **The lead**: F1's process again. Claude proposes six to eight clay candidates with German roots in the concha's spirit (memorable, a little diva). Ideas: a Brezel, a dachshund, a Black Forest cake slice, a garden gnome, a Lebkuchen heart. A contact sheet of the same six words in the locked style lets Courtney choose. The winner gets a model sheet in `content/art/cast/` beside the others, and a section in `content/art/style.md`.
- **The cast**: the lead plus the alpaca, turtle, chick and capybara, with their existing model sheets. The lead takes about half the cards, as the concha does.
- **Reuse by meaning**: the German draft pass writes `sameAs`, the id of the Spanish card with the same meaning, or null. It is given the Spanish ids and prompts. It is a draft-file field that is never shipped, and the review checks it. `npm run art -- cast --lang de` then works through these cases:

| Case | What it does |
|---|---|
| Spanish still exists, its row in `content/art/cast.tsv` names a supporting-cast member, and its take is published | Reuse the still: the German card's `image` is the Spanish path. No render. |
| Spanish still shows the concha | Cast fresh with the German lead and the same pose. |
| No Spanish match, or a match not yet illustrated | Cast fresh by fit, as F2 does. |

  German-only casting goes to `content/de/art/cast.tsv`, and renders, contact sheets and review work as in F2. A form card takes its verb's still, as in Spanish.

- **Hero mascot**: F3's process with the German lead. `npm run mascot -- --lang de` reads `content/de/art/mascot/takes.json`, generates the idle and celebration loops from the lead's cutout on the paper colour, and writes them to `public/mascot-de/` with posters, the still and the icons. Same format and sizes as F3.
- **Budget**: the reuse share is not known until the German first 100 are drafted. Spanish has 36 stills for its first 100 and the concha leads half of them, so expect roughly half of the German first 100's stills to be new renders: about 5 credits, plus about 10 for the lead's contact sheet, model sheet and loops.

## Audio

- **Provider**: OpenAI `gpt-4o-mini-tts`. The instruction asks for clear standard German (Hochdeutsch) at a natural pace, like a teacher reading a vocabulary card.
- **Ear test**: the voice-test script renders a German set of 20 tricky words and four sentences in 3 or 4 OpenAI voices. The words cover the ich- and ach-sounds, ü and ö, final devoicing (`Tag`, `Hund`), `ei` and `ie`, `sp` and `st`, long compounds, a separable verb and `der`, `die` and `das`. Courtney picks one on the existing test page, and the choice and wording go into `lang/de.ts`.
- **Pipeline**: everything else is G2, G3 and L8 unchanged: 48 kbps mono MP3, -18 LUFS, the transcribe-back check (with `language: de`), takes, the hashed paths under `public/deck-de/audio/`, and the listening page.

## Deployment

- **A second Vercel project**, `learn-german`, from the same repo and branch, with `NEXT_PUBLIC_LANG=de` and the same Supabase public keys. The production address joins Supabase's redirect list.
- **The existing project** builds with no `NEXT_PUBLIC_LANG` (or `es`) and is unchanged.
- **CI**: `npm test`, `npm run lint` and `npm run build` run once per language (`NEXT_PUBLIC_LANG=de npm run build`). A ticket is not done until both builds pass.

## First slice

Done when:

- `lang/de.ts` drives a German build that installs to the phone as "Learn German" with the new lead's icon, alongside the Spanish app, and neither touches the other's progress.
- The first 100 German cards in learning-path order are in `public/deck-de/deck.json`: drafted, reviewed, flagged cards decided, tagged and ordered. They include form cards, phrase cards with Sie chunks, case cards after the accusative tip, approved tips and known-word examples.
- Their stills exist (reused or new, contact sheets reviewed) and their clips exist (voice picked by ear, flagged clips heard).
- The lead's idle and celebration loops play on the menu and batch end.
- A full German batch can be studied in airplane mode. German ratings sync to a second device and never appear in Spanish, and a German Start over leaves Spanish alone.
- Courtney has studied the first units from zero and written down what to tailor.

## Deferred

- A switch between languages inside one app.
- Ihr forms, the genitive, adjective endings as cards, and the Präteritum beyond war and hatte (which come as words).
- Austria or Switzerland as a variant with its own audio.
- An Instagram character for the German lead (the concha's is in the `ai-influencer` repo).
- Renaming the repo or the Supabase project from `learn-spanish`.

## Tickets

Same rules as design.md, "Rules for every ticket", and the same [ticket loop](ticket-loop.md): give the loop German ticket ids and it takes them from this board. Each builder reads design.md, then this file, then its ticket. A German ticket that changes shared code must leave the Spanish build and tests passing.

### Board

| ID | Ticket | Depends on | Human | Status |
|---|---|---|---|---|
| DE1 | Language config and two builds | none | | Done |
| DE2 | `lang` in Supabase and sync | DE1 | Push migration | Todo |
| DE3 | Deck format 3 and German grammar | DE1 | | Done |
| DE4 | German card layouts | DE3 | | Done |
| DE5 | Scripts take `--lang` | DE1, DE3 | | Done |
| DE6 | German word list | DE5 | | Done except: Courtney skims the top 100 |
| DE7 | German prompts for draft, review and tag | DE5, DE6 | | Todo |
| DE8 | German unit plan and tips list | DE6 | Approve `units.json` and `tips.json` | Todo |
| DE9 | Case cards in the pipeline | DE3, DE7, DE8 | Approve the case list | Todo |
| DE10 | German lead mascot | none | Choose on contact sheet | Todo |
| DE11 | German voice | DE5 | Pick by ear | Todo |
| DE12 | German first 100 | DE7, DE8, DE9 | Flagged cards, tips, `path.md` | Todo |
| DE13 | Art for the German first 100 | DE10, DE12 | Contact-sheet review | Todo |
| DE14 | German hero loops and icons | DE10, DE1 | Pick takes | Todo |
| DE15 | Audio for the German first 100 | DE11, DE12 | Listen to flagged clips | Todo |
| DE16 | Deploy and acceptance | all above | Phone, study from zero | Todo |

DE1 and DE10 can start at once. DE2, DE3 and DE5 run beside each other after DE1. DE8 and DE11 need only the scripts and the word list, so they run while DE4 and DE7 are built.

### Track DE

**DE1 Language config and two builds**
- Build: `lang/es.ts` and `lang/de.ts` as under [The language config](#the-language-config), chosen by `NEXT_PUBLIC_LANG` (default `es`). Move every Spanish-specific name, string, storage name, cache name, deck path and mascot path in `app/`, `components/`, `lib/` and `public/sw.js` behind it, including the `lang="es"` attributes. `lang/de.ts` may hold placeholders for the mascot and voice until DE10, DE11 and DE14. Tests run under both languages where a test names a storage key or path.
- Done when: the Spanish build is unchanged byte for byte in what it stores (same database, keys and caches; checked by test), `NEXT_PUBLIC_LANG=de npm run build` passes and serves the German names, and `npm test`, `npm run lint` and both builds pass.
- Note (DE1): built as in "Decided in DE1" under [The language config](#the-language-config). Checked on 2026-10-09: `npm test` (48 files, 731 tests), `npm run lint`, `npm run typecheck`, `npm run build` (manifest "Learn Spanish", unchanged) and `NEXT_PUBLIC_LANG=de npm run build`; `next start` on the German build served `<title>Learn German</title>`, the German manifest, `/deck-de/deck.json` and the worker. Not looked at in a browser: the German build has an empty deck until DE12, so its menu shows nothing to learn.

**DE2 `lang` in Supabase and sync**
- Build: a migration adding `lang` (checked `es` or `de`, default `es`) to `reviews`, `notes`, `card_reports` and `resets`, the notes key `(user_id, lang, card_id)` and an index for filtered downloads. `SyncRemote` sends and filters by the config's language (`FakeRemote` too). `check:rls` and `check:sync` gain a German case: German rows never reach a Spanish device, and a German reset leaves Spanish replay alone.
- Done when: the migration is pushed (human), the checks pass against the real project, and the Spanish app still syncs.

**DE3 Deck format 3 and German grammar**
- Build: format 3 as under [Card data](#card-data), with the `target` and `regional` rename, the `lang` field, the German grammar shapes and validator rules, and the `case` kind. Migrate the Spanish deck, drafts, reviews, tags and decision files in one commit with fingerprints recomputed, so `npm run deck` rebuilds the same Spanish deck apart from the rename. Add a German fixture deck (`lib/deck/fixture-de.json`) with nouns of three genders, a separable and a strong verb, a glue card, a form card, a phrase card, a case card and a tip.
- Done when: both fixtures validate, the Spanish `npm run deck` reports nothing changed but the rename, and tests pass.
- Note (DE3): built as in "Decided in DE3" under [Card data](#card-data). Checked on 2026-10-09: both fixtures validate (`lib/deck/deck.test.ts`, German rules and case cards included), `npm run deck` reports "version 8 (unchanged)" with every file it writes identical to the migrated one, `npm run tag -- --check` 298 of 298, `npm test` (748), `npm run lint`, `npm run typecheck`, `npm run build` and `NEXT_PUBLIC_LANG=de npm run build`. For DE4: the reveal's German verb strip, Perfekt line and `separable` chip, the plural and the case line are not drawn yet (a German verb shows no strip; a noun shows its article and gender, `neuter` included). For DE5: decision files, `cardFromDecision`, `spainFootnote` and the deck build's `lang: "es"` are Spanish; give them the language with `--lang`. `npm run deck` needs `content/.cache/lemmatization-es.txt` (downloaded if missing).

**DE4 German card layouts**
- Build: the reveal and intro for German grammar: noun with plural, verb strip with split separable forms, the Perfekt line and `separable` chip, form cards highlighting their own form (with pronoun), case cards on the glue layout with the case line, and the regional footnote. Draw from the German fixture.
- Done when: component tests cover each layout, and the German build shows each on a phone-sized screen.
- Note (DE4): built as in "Decided in DE4" under [What the cards look like](#what-the-cards-look-like). Checked on 2026-10-09: `components/card/german.test.tsx` draws every German fixture card's intro, front and reveal (noun with and without plural, strong and separable verbs with chips and Perfekt, form card highlight, case cards on the glue layout with the case line, `caseChange`, the regional footnote, the answer clear of the "?"); the German build served the fixture as its deck (restored afterwards) and a headless Chrome at 390 by 844 walked both Learn batches with no sideways scroll and no page error. `npm test` (50 files, 809 tests), `npm run lint`, `npm run typecheck`, `npm run build` and `NEXT_PUBLIC_LANG=de npm run build` pass. Images under `/deck-de/img/` are placeholders until DE13, so most German cards show no character yet. For later tickets: `regionalLabel` is no longer in `lang/`; a German strip is told apart by its grammar's shape, so a new German grammar field needs only `GrammarStrip.tsx`.

**DE5 Scripts take `--lang`**
- Build: every content script (`draft`, `review`, `tag`, `tips`, `deck`, `audio`, `art`, `mascot`, `word-list`) takes `--lang de` and reads and writes `content/de/` and `public/deck-de/`. Language rules in the prompts come from the config. Spanish runs are unchanged with no flag.
- Done when: each script runs on the German fixture against the fake runner, and a Spanish rerun of `npm run deck` writes the same bytes.
- Note (DE5): built as in "Decided in DE5" under [Content scripts](#content-scripts). Checked on 2026-10-09: `scripts/content/german.test.ts` drafts the fixture's eight word cards, `gehen`'s three form cards and the `Wie geht's?` chunk with a fake runner into a temporary `content/de/`, reviews them (two flagged, one approved through its German decision file), tags them, drafts and approves `tip-accusative`, and builds a German deck that validates as `de`; it also covers German clip paths, German's own stills and the mascot paths, and pins the Spanish prompts and schemas by hash. Spanish reruns: `npm run deck` printed the same lines and changed no file (version 8 unchanged), `npm run tag -- --check` 298 of 298, `npm run art -- status` 36 approved, `npm run audio` 0 clips made and 0 deck paths updated. `npm test` (49 files, 761 tests), `npm run lint`, `npm run typecheck`, `npm run build` and `NEXT_PUBLIC_LANG=de npm run build` pass. For DE6: fill `SOURCES_BY_LANG.de` in `sources.mjs` (and German's rules in `word-list.mjs`), which also turns on the known-words check for German. For DE7: replace the stand-ins in `prompts-de.ts`, set `PROMPTS_READY.de`, fill `FORM_VERBS_BY_LANG.de`, and decide the German skip reasons and the review's labels (`REASON_LABELS.usage` is "Latin American usage").

**DE6 German word list**
- Do: the word list as under [Word list](#word-list), into `content/de/word-list.tsv`, with sources pinned and licences recorded in this doc.
- Done when: the list has 1,200 words, with articles folded and pronoun forms kept, and the top 300 have been read for gross errors (print counts and ids only; Courtney skims the top 100).
- Note (DE6): built as in "Decided in DE6" under [Word list](#word-list). Checked on 2026-10-10: `content/de/word-list.tsv` has 1,200 distinct words in rank order (der, ein, kein, mein and the other determiners folded; mich, mir, dich, dir, ihn, ihm, uns and euch kept; checked by `scripts/content/word-list.test.ts`), and a rebuild is byte-identical; the builder read the top 300 for gross errors over five rebuilds, fixing them with overrides, spellings and the drop list, and read ranks 301 to 1,200 more quickly. Spanish: `npm run word-list` rewrote `content/word-list.tsv` byte for byte, and `npm run deck` reported version 8 unchanged with no file changed. `npm test` (50 files, 820 tests), `npm run lint`, `npm run typecheck`, `npm run build` and `NEXT_PUBLIC_LANG=de npm run build` pass. Left for Courtney: skim the top 100 of `content/de/word-list.tsv` (column `word`; `forms` shows what each was counted from) and say what looks wrong; a fix is a line in `scripts/content/overrides-de.mjs` and `npm run word-list -- --lang de`. For DE7: the known-words check now runs for German but its cognate rule is still Spanish's (`isCognate` strips Spanish accents and knows -ción and -dad), so German cognates (Kaffee for coffee, -tät for -ty) wait for DE7; the draft id rule's `slug` turns ß into a hyphen (`weiß` would be `wei`), so German ids need ß as ss; words are written with capitals (`Mann`) while Claude's phrase `words` may differ in case from the list, so `wordRanks` should compare in lower case; `sein`, `ihr`, `essen`, `leben` and the like are one row for two kinds of word, and the skip reason `spain-only` has no German meaning yet.

**DE7 German prompts for draft, review and tag**
- Build: the German paragraphs of the draft, review and tag prompts (du, Germany, the grammar fields, `sameAs`, the regional footnote, cognates for the known-words check), and the German form verb list. Draft and review the first 20 ranks as a trial.
- Done when: the trial's cards pass the validator, and the flagged rate and reasons are noted here.

**DE8 German unit plan and tips list**
- Do: Claude drafts `content/de/units.json` and `content/de/tips.json` as L1 did, for the whole starter path, with the Sie chunks and the separable verbs it needs named in `wants`.
- Done when: `units.ts` checks pass and Courtney has approved both files.

**DE9 Case cards in the pipeline**
- Build: the case list (proposed by Claude from the unit plan, approved by Courtney), drafted, reviewed and tagged like form cards (`npm run draft -- --lang de --cases`). The ordering build places them after their tip and the cards they require.
- Done when: about 30 case cards are drafted and reviewed, and `path.md` shows each after its tip.

**DE10 German lead mascot**
- Do: candidates, a contact sheet of six words in the locked style, Courtney's choice, then the model sheet, cutout and `style.md` section, as F1 did for the concha.
- Done when: the lead and her or his model sheet are committed and recorded here.

**DE11 German voice**
- Do: the ear test under [Audio](#audio). Courtney picks; the voice and instruction go into `lang/de.ts`.
- Done when: the pick is recorded here.

**DE12 German first 100**
- Do: run L9's sequence for German (draft out of rank order for the unit plan's wants, review, flagged decisions, tips drafted and approved, tag, example redraft, deck build with `--fresh`) until `content/de/deck.json` holds the first 100 in path order.
- Done when: the build is clean, Courtney has read `path.md` and the tips, and `public/deck-de/deck.json` is published.

**DE13 Art for the German first 100**
- Do: cast with reuse by meaning, render the new stills, contact sheets, Courtney's review, publish.
- Done when: every still of the German first 100 exists, and the reused and new counts and credits are recorded here.

**DE14 German hero loops and icons**
- Do: F3's loops, posters, still and icons for the German lead (`npm run mascot -- --lang de`).
- Done when: the German build plays them offline, and the icons are the lead.

**DE15 Audio for the German first 100**
- Do: `npm run audio -- --lang de --check` for the cards and tips. Courtney hears the flagged clips.
- Done when: every clip exists, the flagged ones are heard, and sizes are recorded here.

**DE16 Deploy and acceptance**
- Do: the `learn-german` Vercel project, the redirect URL and the template wording, then the [first slice](#first-slice) checks on the phone.
- Done when: every first-slice check passes, and Courtney's tailoring notes are written under this ticket.
