# Learn Spanish: design

Status: agreed design, nothing built yet. Written 2026-10-01 from a design interview. The work is broken into [tickets](#tickets) at the end. The [learning path](#learning-path) (units, tips, intros, form and phrase cards, track L) was added on 2026-10-03 from a second interview, after using the first 100 cards from zero showed that pure frequency order loses a true beginner.

## Goal

A playful, installable web app that teaches the 1,000 most common Spanish words, most common first, so that study time goes to the words that show up most in real speech. It works without a connection and keeps progress on the device, with Supabase as backup and sync.

The first user is Courtney. The data model supports other users from day one, but nothing else (onboarding, billing, marketing) is built for them yet.

## Terms

These are used exactly as defined here throughout the doc.

- **Card**: one meaning of one Spanish word. The unit of study and of progress.
- **Content word**: a card that can be illustrated (nouns, verbs, adjectives, most adverbs).
- **Glue word**: a function word (de, que, se, lo, por). Prompted by a phrase, never illustrated.
- **Deck**: the full set of cards plus their art and audio. Identical for every user.
- **Forward**: English shown first, Spanish recalled. The direction that counts.
- **Reverse**: Spanish shown first. Logged, but never changes the schedule or the wheel.
- **Learn**: the section for cards never seen before.
- **Practice**: the section for cards seen at least once.
- **Seen**: a card with at least one forward rating.
- **Due**: a seen card whose scheduled review time has passed.
- **Memorized**: a seen card the scheduler expects to be recalled three weeks from now (precise definition under [Learning engine](#learning-engine)).
- **Batch**: about 15 cards studied in one sitting, shown Stories-style. In the starter path, one unit.
- **Wheel**: the progress chart on the menu.
- **Form card**: a card for one present-tense form of a core irregular verb ("I am (identity)" → soy). Kind `form`.
- **Phrase card**: a card for a whole phrase ("How are you?" → ¿Cómo estás?). Kind `phrase`.
- **Unit**: a small themed group of cards that ends in something the learner can say ("Who I am"). Defined in `content/units.json`.
- **Starter path**: the units, about the first 150 to 200 cards. After it comes the **frequency phase**.
- **Tip**: a short, unrated concept screen (two verbs for "to be"). Not a card.
- **Intro**: the unrated screen that shows a new card before it is first tested.
- **Reset**: a dated marker that makes replay ignore every earlier review.

## The deck

### What a card is

One card per meaning, always in dictionary form (hablar, never hablo or habló). A Spanish word with two common meanings gets two cards. The English prompt carries a short hint whenever the bare English word would have more than one right answer:

| Prompt | Answer |
|---|---|
| to be (identity) | ser |
| to be (state, place) | estar |
| time (clock, duration) | el tiempo |
| weather | el tiempo |

Every prompt must have exactly one correct answer. That is what makes self-rating honest.

### Glue words

Glue words stay in the same deck at their frequency rank. Their prompt is a short English phrase with the target marked, because many have no standalone English equivalent:

| Prompt | Answer |
|---|---|
| the house **of** Maria | de |
| I see **him** | lo |

Glue cards use a second card layout with no character. Expect roughly 80 of them; the real number comes out of the content pipeline.

### Size, variant, grammar

- **Size**: 1,000 cards at launch. Card ids are stable so later packs can be added without touching existing progress.
- **Variant**: neutral Latin American Spanish, tú register, no vosotros. Where Spain differs noticeably, the reveal shows a footnote ("Spain: coche") and there is no second card.
- **Grammar on the reveal**, with nothing extra to rate:
  - Nouns always appear with their article (la casa, el problema).
  - Adjectives show both endings (bueno / buena).
  - Verbs show a three-form present-tense strip (yo voy · tú vas · él va), with irregular verbs flagged.
  - The example sentence always uses a conjugated form.

### Card data

The deck is a static JSON file. One entry per card:

| Field | Meaning |
|---|---|
| `id` | Stable slug, e.g. `estar-be-state`. Progress is keyed on this; it never changes. The rule is under [Content pipeline](#content-pipeline), "Decided in E3". |
| `rank` | Frequency rank of the Spanish word. |
| `kind` | `content` or `glue`. |
| `pos` | Part of speech. |
| `es` | The Spanish answer as displayed (with article for nouns). |
| `en` | The English prompt. For glue words, the phrase with the target in square brackets: `the house [of] Maria`. |
| `hint` | Disambiguating hint, or null. |
| `grammar` | Gender and article, feminine form, or present-tense strip plus an irregular flag, depending on `pos`. |
| `example` | One simple sentence, Spanish and English. |
| `spain` | Spain-only alternative, or null. |
| `trick` | One pre-written sound-alike memory trick. |
| `image` | Path to the character still. Null for glue words. |
| `audio` | Paths to two clips: the word and the example sentence. |
| `unit` | Added by the [learning path](#learning-path): the unit id, or null in the frequency phase. |
| `requires` | Added by the learning path: ids of cards that must come before this one. Often empty. |
| `tip` | Added by the learning path: the tip id this card depends on, or null. |
| `why` | Added by the learning path: a one-line contrast with a near neighbour, or null. |

Changed by the learning path (deck version 2 of the format, L2): `kind` also takes `form` and `phrase`; `pos` also takes `phrase`; a form card has an `image` (its verb's) and verb `grammar`; a phrase card has no image and null `grammar`; `trick` may be null on form and phrase cards. The file gains `units` (`{ id, title, goal }`, in order) and `tips` (`{ id, title, body, examples }`) beside `cards`, and its card order is the Learn order.

Decided in A2 (types in `lib/deck/types.ts`, validator in `lib/deck/validate.ts`):

- **File**: `public/deck/deck.json`, shaped `{ "version": 1, "cards": [...] }` (format 1; changed in L2, below). The app fetches it from `/deck/deck.json`; media sits beside it under `/deck/img/` and `/deck/audio/`, and `image` and `audio` hold those URL paths.
- **`grammar`** by `pos`: noun `{ gender: "m" | "f", article }`; adjective `{ feminine }`, with `es` holding the masculine form; verb `{ present: { yo, tu, el }, irregular }`, bare forms without the pronoun; null for every other part of speech.
- **`example`** is `{ es, en }` and **`audio`** is `{ word, sentence }`.
- **`pos`** is one of the nine wheel groups. Two meanings of one word share a `rank`.
- **Rules the validator enforces beyond field types**: no missing or extra fields; a noun's `es` starts with its article; a glue prompt marks exactly one target in square brackets and a content prompt has none; a content card has an image and a glue card does not; ids are unique; no two cards share the same `en` plus `hint`.

Decided in L2 (deck format 2; types in `lib/deck/types.ts`, validator in `lib/deck/validate.ts`):

- **File**: `{ "format": 2, "version", "units", "tips", "cards" }`. `format` is new and names the file's shape; `version` is still the deck revision. A format 1 file (no `format`, `units`, `tips` or path fields) is refused. `content/deck.json` and `public/deck/deck.json` were moved to format 2 in place, keeping version 5, with every card's `unit` and `tip` and `why` null and `requires` empty; `npm run deck` then rebuilds the same bytes.
- **Two card shapes.** `DraftCard` is a card as the draft pass writes it, without the four path fields; `Card` is `DraftCard` plus `unit`, `requires`, `tip` and `why`. Draft files stay as they are, so no review loses its fingerprint. `validateDraftCard` and `validateDraftCards` (every drafted card together: ids and prompts unique) check drafts; `validateCard` and `validateDeck` check deck cards. The deck build adds the path fields, empty, after the drafted fields (`deckCard` in `deck-build.ts`), and writes `units` and `tips` empty until L4 and L6 fill them.
- **Kind rules**: a form card's id is `<verb>-form-<yo|tu|el>` or `haber-form-hay`, its `pos` is `verb`, it has an image, and its `es` is its own person's form in `grammar.present` (not checked for `hay`). A phrase card's id is `phrase-` and one to four words, its `pos` is `phrase`, and it has no image and null grammar. Only a phrase card has `pos` `phrase`, and a content or glue card may not take a form or phrase id. Only form and phrase cards may have a null `trick`. Content, form and phrase prompts have no square brackets.
- **Deck rules**: a unit is `{ id, title, goal }` with a lower-case slug id; a tip is `{ id, title, body, examples }` with an id starting `tip-` and two or three examples, each `{ es, en, audio }`. Unit ids and tip ids are unique. A card's `unit` and `tip` name an entry of the deck, and every `requires` id is a card earlier in the file, never the card itself and never listed twice. The validator does not check that a unit's cards sit together or in unit order: a card added to a finished unit comes later.
- **Wheel**: `phrase` is the last part of speech, labelled "Phrases". The draft pass's schema still offers only `content` and `glue` and the nine word parts of speech (`WORD_CARD_KINDS`, `WORD_PARTS_OF_SPEECH`); L3 adds the form and phrase modes.
- **Until L6**, `learnQueue` still takes only content and glue cards, so Learn, the media kept ahead and the deck build's `learnOrder` leave form and phrase cards out. (Done in L6: `learnQueue` follows the file and `learnOrder` is gone.)

## Learning engine

Spaced repetition using FSRS (the open-source `ts-fsrs` library), running entirely on the device. The user never sees intervals.

### Ratings

Shown on the reveal as three buttons. Each has a text label as well as a colour, so the rating doesn't depend on colour vision.

| Button | Meaning | FSRS rating |
|---|---|---|
| Green | Right, without help | Good (Easy on a card's very first view) |
| Orange | Nearly: wrong ending, gender or accent, or a long think | Hard |
| Red | Didn't have it | Again |

Changed by the [learning path](#learning-path): the intro's "I already know this" (rating `known`) is now the only way to Easy, and green on a first test is Good. Before that change: on a card's first view the rating answered "did I already know this?". Green maps to Easy there, which gives a longer first interval than Good, so words already known get out of the way without a placement test.

### Memorized

A card is memorized when its FSRS stability is 21 days or more. Stability is the interval at which predicted recall falls to 90%, so this means "90% likely to be recalled three weeks from now". A red on a memorized card lowers its stability and drops it back to seen.

Decided in B2 (scheduler in `lib/scheduler/scheduler.ts`):

- **Library settings**: `ts-fsrs` 5 with its defaults (FSRS-6 weights, 90% target recall, short-term learning steps of 1 and 10 minutes) and interval fuzz turned off. Fuzz is random, and replay has to give the same state on every device.
- **Relearning is never memorized.** A red puts a card into FSRS's relearning phase, and a card in that phase is not memorized whatever its stability. The threshold alone is not enough: when a red lands on the same day as the card's previous rating (extra practice), FSRS lowers stability only mildly, so a card with stability of roughly 80 days or more would stay at 21 or above. The card counts as memorized again once a later rating returns it to review with stability still at 21 days or more.
- **Replay order**: forward reviews sorted by timestamp, with the event id breaking ties. A review timestamped before the card's previous one (a device with a slow clock) is applied as if it happened at the same moment as the previous one.
- **Card state** holds times as epoch milliseconds and `phase` as `learning`, `review` or `relearning`. An unseen card has no row.

### Learn

Changed by the [learning path](#learning-path): Learn takes unseen cards in the deck file's order, which the build computes; new cards get an intro before their first test; in the starter path a batch is a unit; first-view green is no longer Easy. The rules below still describe the frequency phase.

- Shows unseen cards, most common first, in mixed batches: two queues (glue words and content words), each in rank order, drawing about one glue word for every two content words until the glue queue runs out.
- Same flip interaction as Practice.
- A card rated red returns once more at the end of the same batch.
- After its first rating the card is seen and belongs to Practice.

### Practice

- Opens on due cards, most common first.
- When the due cards run out, a "You're all caught up" marker appears.
- Scrolling past the marker gives extra practice: lowest predicted recall first, frequency rank breaking ties.
- Every forward rating in Practice updates the schedule, including extra practice. FSRS accounts for elapsed time, so an early review earns a smaller gain than a due one.

Options within Practice:

| Option | Behaviour |
|---|---|
| Shuffle | Seen cards in random order. |
| In order | Seen cards by frequency rank. |
| Struggling | Seen cards with a red among their last three forward ratings. |
| Part of speech | Entered by tapping a slice of the wheel. |
| Reverse | A toggle that combines with any of the above. |

Decided in B3 (queues in `lib/queues/queues.ts`):

- **Learn pattern** (moved to the deck build in L6, which applies it to the frequency phase; Learn now follows the file): two content words, then one glue word, repeated. Each batch is cut fresh from the unseen cards, so the pattern restarts at every batch, and a default batch of 15 holds 10 content words and 5 glue words. If the content queue runs out first, the remaining glue words follow.
- **Equal ranks**: two meanings of one word share a rank and keep their deck-file order, in every queue.
- **A red returns once.** A red on the card's second showing in a Learn batch does not bring it back a third time.
- **Part of speech combines with every option**, not only the default. With no other option it gives that slice's due cards, the caught-up marker, then that slice's extra practice.
- **Shuffle, In order and Struggling have no caught-up marker**, and Struggling is in rank order.
- **Reverse does not change the queue.** It changes how a card is shown and how the rating is stored.

Decided in C5 (session in `components/session/PracticeSession.tsx`, URL parameters in `lib/queues/params.ts`):

- **URL**: `/practice?mode=shuffle&pos=verb&reverse=1`. `mode` is `shuffle`, `in-order` or `struggling`; `pos` is a part of speech; `reverse=1` turns Reverse on. Each is optional, and a missing or unknown value gives the default (due cards, every part of speech, forward).
- **Practice runs in batches too.** The queue is built once when the screen opens and cut into batches of the batch size, each ending on the batch-end screen with a count of the cards left.
- **The caught-up marker is a screen, not a point in a scroll.** Due cards and extra practice never share a batch. The batch-end screen after the last due card is the marker ("You're all caught up!") and its button reads "Extra practice". With nothing due, Practice opens on the marker.
- **The Reverse toggle sits on the marker and on every batch-end screen**, and takes effect from the next batch. It updates the URL without restarting the sitting. A sitting can also start in Reverse from the link.
- **In Reverse the due cards stay due**, since the ratings do not reach the schedule; the marker still follows the last of them.
- **An empty queue** shows "Nothing to practise yet" (or "No struggling cards") and a way back to the menu, not the marker.

### Reverse

Spanish is shown first and the character stays hidden until the reveal, since it would give the answer away. Ratings are stored with `direction = reverse` and are excluded from scheduling and from the wheel.

## Learning path

Agreed with Courtney on 2026-10-03 in a second interview, after studying the first 100 cards from zero. Built by [track L](#track-l-learning-path). Where this section and an earlier one disagree, this one wins; the earlier sections carry a pointer here.

### Why

Strict frequency order is right for *which* words to learn and wrong for *the order* to meet them in from zero. On the first 100 cards:

- `ser` is card 1. Its reveal shows `soy · eres · es` and "Soy de México y soy doctora", but yo, tú and él (ranks 37, 61, 64, drafted as glue) come after card 100, because Learn takes one glue card per two content cards in rank order and glue ranks 1 to 27 fill every glue slot.
- One card holds four things to memorize (the infinitive and three forms), and the one rated, the infinitive, is the one a beginner least needs to say.
- `ser` and `estar` arrive as cards 1 and 2 with nothing explaining the difference.
- Meanings of one word sit a few cards apart (`que` at 12, 15, 18; `por` at 54, 57, 60; `esperar` at 74, 76, 77), so they interfere, and many second meanings are advanced (`lo` before an adjective, impersonal `se`).
- A new card is first shown as a test, so a true beginner presses red on nearly every new card.

### Goal

Courtney's goal is to **speak**: survival and travel Spanish, and simple conversations about themselves and the people around them (family, feelings, plans). Understanding follows. So the foundation is pronouns, greetings and "I am / I want / I have", and the forward direction (English shown, Spanish recalled) stays the one that counts.

### Principles

1. **Frequency decides which words; teachability decides when.** The deck is still the 1,000 most common words. Nothing outside the top 1,000 is added, apart from phrases made of top-1,000 words.
2. **Nothing appears before what it needs.** A card comes after every card it `requires`.
3. **Concepts get a screen, not a card.** Tips introduce an idea once, just before it is needed.
4. **Show, then test.** A new card is shown before it is first tested.
5. **Every example is understood.** Starter examples use only words already met.
6. **Similar things apart.** Later meanings of a word come well after its first.
7. **Say it.** Audio plays by itself; the front says to say it out loud.

### Two phases

- **Starter path**: about 15 to 20 units, about the first 150 to 200 cards. Each unit has about 8 to 12 cards, introduces at most one tip, and ends with a few payoff phrases ("now you can say…"). An illustrative opening, not binding (L1 writes the real one): 1 Me and you (yo, tú, él, ella, sí, no, hola, gracias), 2 Who I am (ser's forms, de, me llamo), 3 How and where I am (estar's forms, bien, aquí, en), 4 What I want and have (querer, tener, un, mi), …
- **Frequency phase**: everything else, in rank order, two content cards then one glue card as before, with phrase cards and later meanings placed by the rules below.

### Order is computed, not hand-written

The order of the deck comes from rules applied to tagged cards, so it can be recomputed every time the deck grows (100, 200, 300 cards…). Progress is keyed on card id and Learn only reads unseen cards, so reordering never harms progress.

**The one hand-edited input** is `content/units.json`: an ordered list of units, each `{ id, title, goal, tip, cap, wants, payoff }`. `goal` is the "now you can say" line; `tip` a tip id or null; `cap` the most cards the unit takes (default 12); `wants` the words and meanings the unit is meant to hold, in plain words ("yo", "ser: I am", "me llamo"), which guide the tag pass; `payoff` the English of the unit's payoff phrases, which the draft pass turns into phrase cards. Claude drafts it; Courtney edits and approves it.

Decided in L1 (checks in `scripts/content/units.ts`, test in `scripts/content/units.test.ts`):

- **`content/units.json` is a JSON list of units** in path order, each with exactly the fields above. `id` is lower-case words joined by hyphens (`who-i-am`). `goal` completes "Now you can …": lower case, ending in a full stop. `cap` is a whole number from 4 to 16, 12 when left out. A unit introduces at most one tip and no two units introduce the same one.
- **Survival chunks sit in `wants` as `phrase: <Spanish> = <English>`** (`phrase: me llamo = my name is`), so L3 reads the list of survival chunks from the units, each in the unit it belongs to; every other want is a word, or a word and its meaning (`ser: I am (soy)`). A form card's want names its verb, its person and its form.
- **The tip list is `content/tips.json`**, a JSON list of `{ id, title, about }` in the order the tips are first met; `about` is a one- or two-sentence brief for the tip draft (L4) and is not shipped. A tip need not belong to a unit: `tip-por-para` and `tip-past` are named by cards of the frequency phase.
- **The first draft** (Claude, 2026-10-03, waiting for Courtney): 18 units with caps adding up to 200, 31 form-card wants (the ten verbs' three forms and `hay`), 15 survival chunks and 37 payoff lines; 14 tips, 12 of them introduced by a unit. Words come from ranks 1 to about 300 plus a few travel words further down the top 1,000 (café 532, baño 576, hotel 623, inglés 907). `¿puedes repetir?` is the one exception to the top 1,000: repetir is rank 1,006, kept because this section names the chunk.

**Each card carries tags**, set by a tag pass and checked by script: `unit` (a unit id or null), `requires` (card ids) and `tip` (a tip id or null).

Decided in L5 (logic in `scripts/content/tagging.ts`, run as `npm run tag` from `scripts/content/tag.mts`):

- **One call per drafted group, through the draft pass's caller and runner** (`runDraftTasks`): a word's cards, a verb's form cards, or a unit's phrase cards (the groups of `allDrafted`, so 18 phrase calls, not 52). Same CLI default, `--via api` switch, model, effort, concurrency, retries and stop rule. `--from` and `--to` keep the groups whose rank is in range (a phrase group's rank is its highest phrase's); with neither, every group. `--check` only checks the stored tags. Each call's usage goes to `content/tags/usage.jsonl`; a refused answer to `content/tags/.failed/` (ignored by git).
- **What Claude is given**: the unit plan in order (id, title, goal, tip, cap, wants, payoff lines), the tip list (id, title, `about`), then every drafted card as `id | prompt (hint) | answer` (the answer added to the ticket's ids and prompts, so a payoff's `estoy` can be matched to its form card), all identical in every call so the prefix caches; last, the group's cards in full without media paths, and for a phrase card whether it is a survival chunk or a payoff and its `words` from the draft pass. The system prompt says how to choose each field: a unit only for a card whose word and meaning one of the unit's wants names (the earliest such unit), a form card requires its pronoun card, a payoff phrase its words' cards (form cards for core-verb forms), a survival chunk nothing, word cards rarely anything, and a tip on the cards that first need its idea, at least one in the unit that introduces it.
- **A tag is `{ id, unit, want, requires, tip }`**: `want` (new, not in the ticket) is the unit's want the card fills, copied exactly, or null. It is what L6 needs to list the wants no drafted card matches. A phrase card's `unit` and `want` are not Claude's: the script takes the unit from its phrase file and the want from its plan line (the chunk's `phrase: …` want, null for a payoff).
- **Files**: `content/tags/<id>.json`, one per card, holding the tag, `draft` (the card's `cardHash`, as a review does), the group's label, model, effort, path and time. Committed, like the reviews. **A group is tagged again** when any of its cards has no tag, a tag for an earlier draft, or a tag the checks refuse; `--redo` tags it again anyway. A run deletes the tags of cards no longer drafted and prints their ids.
- **Script checks**, as the guard on Claude's answer (a refused answer is asked again) and again on every stored tag (`checkTags`, printed by id after every run): the answer names each card of the group once and no other; every `requires` id is a drafted card, not the card itself, and not listed twice; `unit` is in `units.json`, `tip` in `tips.json`; a `want` needs a unit and must be one of its wants. Cycles in `requires`, and a unit card requiring a later card, are left to L6's build.
- **No pass writes `why`** yet: the tag pass returns only the three tags of the ticket and `want`. (Changed in L9: the tag pass writes `why` too; see "Decided in L9" below.)

**The rules, applied by the deck build:**

1. Units come in `units.json` order. Within a unit: `requires` order first, then non-phrase cards before phrase cards, then rank.
2. If more cards are tagged into a unit than its `cap`, the lowest-ranked non-phrase cards drop to the frequency phase.
3. The frequency phase follows: content and glue cards by rank, two content then one glue. A card's slot is the later of its rank slot and the slot just after its last `requires`.
4. **Sibling spacing**: a word's later meanings (cards of kind `content` or `glue` sharing its rank) come at least 50 cards after its previous meaning, outside the starter path (`--spacing N` changes it). Inside a unit, `units.json` decides.
5. A card is never before anything it `requires`, and a card whose `requires` are not all in the deck is held back. The build fails on a cycle or a missing id, and the validator checks the order of the shipped file.
6. **Growth**: a card once in `content/deck.json` stays. The size (`DECK_SIZE`, `--size N`) only chooses which new cards join, from the top of the computed order. The file is then written in the computed order, so the unseen part reorders around what is already there.
7. The build writes `content/path.md`, the computed order as a readable list (unit headers, ids, prompts), for Courtney to read. It holds card text, so no script prints it. It also lists, by unit, the `wants` no drafted card matches, which tells the next draft run what to draft out of rank order (nosotros at rank 138, for example).

**Learn order is the deck file's order.** `learnQueue` takes unseen cards in file order; the interleave and spacing rules live in the build only. D2's caching ahead still uses `learnQueue`.

Decided in L6 (rules in `scripts/content/path-order.ts`, applied by `buildDeck` in `scripts/content/deck-build.ts`, run as `npm run deck`):

- **What is ordered**: every drafted card not rejected, waiting and unreviewed ones included, so each holds its place in the order and the count. A card's tags are used only when current: made for its present draft and passing L5's checks (`tagProblems`). Any other card is ordered as an untagged frequency-phase card (no unit, requires or tip) and listed by id as "not tagged". Tags name drafted ids; a card whose id was corrected in its decision file takes the corrected id, in its own `id` and in every `requires` naming it.
- **Ties**: within a unit, requires first (a card is ready once the unit's cards it requires are placed), then word and form cards before phrase cards, then rank, then draft order (a verb's yo, tu, él). In the frequency phase, equal ranks keep draft order.
- **Caps** drop the least common non-phrase cards (highest rank number) that no card staying in the unit requires; such a card's `unit` becomes null. A unit whose phrases require more than its cap keeps them all.
- **Frequency phase**: form and phrase cards outside a unit join the content queue by rank (a phrase's rank is its highest word's, so it lands near its last word, and its `requires` put it after them). The pattern is two content then one glue in the queues' order; a card waiting for its `requires` or its spacing lets the next ready card in that order take the slot, and comes at the first slot where it is ready.
- **Sibling spacing** counts from the latest meaning of the same rank (content or glue), wherever it sits, starter path included; form and phrase cards neither count nor wait. When only spaced-out meanings are left (the end of the drafts), they follow in order with less than the spacing. `--spacing N` changes it (0 turns it off).
- **Problems that stop the build** (nothing written, listed by id): a cycle in `requires`, and a unit card requiring a card placed after it (in a later unit or the frequency phase). `pathOrder` also refuses a `requires` id that is not a card and a `unit` not in `content/units.json`, which in a build never arrive, since a tag failing L5's checks is not used. The build does not move a card to fix a problem; the tags or the plan change.
- **Hold-back**: a card requiring a rejected card is held back until it is tagged again. After the tip hold-back (L4), one pass in order holds back every card whose `requires` are not all in the deck (waiting, held back, rejected), so a chain is held back whole. Held-back cards keep their place in the count, and are listed ("Held back until a card they require is in the deck").
- **Growth**: the cards of the previous `content/deck.json` stay whatever their new place, and the size adds new cards from the top of the order until the count (previous cards plus new ones, waiting and held-back ones included) reaches it. A previous card that is now held back or rejected is a dropped id, which the build refuses as before.
- **The deck's `units`** are the units of `content/units.json` that a card in the deck names, in plan order, as `{ id, title, goal }`. A changed unit counts as a new deck version, as a changed card or tip does.
- **`why`** stays null: no pass writes it yet. The smallest place for it is a field of the tag pass; L9 decides. (L9: it is a field of the tag pass; see "Decided in L9" below.)
- **`content/path.md`** is rewritten by every build whose order has no problem, also when the deck is not written. It lists every unit of the plan in order (number, title, id, "Now you can …", its cards numbered by place in the order, then "Wants no drafted card fills:"), then the frequency phase. A card not in the deck says why (not reviewed yet, waiting for your decision, decision file has a problem, tip not approved, a card it requires is not in the deck, past the deck size), and a card dropped by a cap says so. A want counts as filled when a current tag of a card not rejected names that unit and want. It has no date, so a rebuild with nothing changed rewrites the same bytes. Committed, like `content/review/flagged.md`.
- **First run, 2026-10-03**: with no tags yet, the 134 drafted cards are all frequency-phase cards. The 100 cards of version 5 stay and only their order changes: sibling spacing moves later meanings back (que, por, esperar and the others now come after the other cards, since 134 drafted cards are too few to space them 50 apart). `content/deck.json` is version 6; the app's `public/deck/deck.json` stays version 5 until L17 publishes the learning path deck.

Decided in L9 (first real run of the learning path pipeline, 2026-10-03):

- **`why` comes from the tag pass.** A tag is now `{ id, unit, want, requires, tip, why }`. The tag prompt asks for one short English sentence, under `WHY_MAX` (140) characters, only where a card is easily confused with a near neighbour met nearby (ser and estar, por and para, saber and conocer, pedir and preguntar, tú and usted), saying when to use this card's word rather than the other, and null on nearly every card. The guard trims it, takes a blank as null and refuses a line break or a longer line (`tagProblems`, field `why`); a tag stored before L9, with no `why`, counts as null. The build copies it to the card. No review pass sees it, so **`content/path.md` shows each card's tip and why line** under the card ("Tip:", "Why:"), and Courtney reads them there. The first run wrote 46 why lines on 298 cards, more than "nearly every card"; Courtney cuts them in the tags or asks for a tighter prompt.
- **Wants out of rank order: `npm run draft -- --ranks a,b,c`** drafts the words at those ranks, like `--from`/`--to` but picked. The ranks were found from `content/units.json` (each want's word before the `:`, every alternative of an `a / b` want, each word of a two-word want), less the ranks already drafted: 69 words, of ranks 91 to 907.
- **`npm run deck -- --fresh`** chooses the deck from the top of the computed order alone, as if no deck had been built, and so implies `--allow-drop` (option `fresh` of `buildDeck`). It was used once, to replace version 6 (the first 100 in frequency order, which growth would otherwise have kept whole) with the first 100 of the learning path; it is for before the deck ships, like `--allow-drop`. Version 7 is the first learning-path deck; it dropped 90 of version 6's 100 ids.
- **Tags fixed by hand** when the build stopped or an example could not be written, as "Problems that stop the build" says (the tags change, not the build): each such tag file has an `edited` field saying why, and keeps its draft fingerprint, so a run keeps it; `npm run tag -- --redo` would lose it. Four: `no-not` into `when-i-dont-understand` and `venir-come` into `making-plans` (a payoff phrase of the unit requires each, and both were frequency-phase cards, which stopped the build); `de-from` requires `ser-form-yo` and `estar-form-yo` requires `bien-well` (so their examples can use soy and bien: the example redraft needs a conjugated verb and only words met before the card).
- **What the first run found**, for the next run: the example redraft cannot write an example for the earliest cards of unit 1, which have no verb before them (`tu-you-informal` is card 5); `esposo` failed the draft pass six times on the id rule (Claude makes a separate `esposa-wife` card), so the `esposo / esposa` want is unfilled; the `por qué: why` want has no card (no drafted card means "why"). Redrafting an example of a card Courtney had approved remakes its decision file as pending when the new draft is flagged: `un-a` and `gracias-thank-you` lost their approved corrections that way, which git still holds.

### Form cards

- About ten core irregular verbs: ser, estar, ir, tener, poder, querer, hacer, decir, saber, venir, each with three cards (yo, tú, él forms), plus one for haber (`hay`). About 31 cards.
- Kind `form`, part of speech `verb`. Prompt "I am (identity)" → `soy`, "you are (identity, informal)" → `eres`, "he / she is (identity)" → `es`. Usted takes the él form; tip 6 says so.
- Id: `<verb>-form-<yo|tu|el>` (`ser-form-yo`), and `haber-form-hay`.
- A form card carries its verb's `grammar` strip, and the reveal highlights its own form. It reuses its verb's still (`image` is the infinitive card's image path), so form cards need no new art, but F2 must make the still of any verb whose form cards are in the deck even when the infinitive card is not yet.
- In the starter path a form card `requires` its pronoun card, so "yo" comes before "I am". The infinitive card comes later ("I want **to be**…").

### Phrase cards

- Kind `phrase`, part of speech `phrase` (a new wheel slice, after `other`). English prompt, Spanish phrase as `es`, glue layout with no character. The word clip speaks the whole phrase. `grammar` is null; `trick` may be null.
- About 100 in all, made only of top-1,000 words:
  - **Unit payoffs**, about 40: the `payoff` lines of `units.json`, at the end of their unit.
  - **Survival chunks**, about 15, allowed before their words: me llamo, ¿cómo estás?, lo siento, de nada, me gusta, no entiendo, ¿puedes repetir?, mucho gusto and the like. A word's later intro says where it was met ("you know this from *lo siento*").
  - **Frequency-phase phrases**, about 45, placed once every word in them is seen. Claude drafts a ranked candidate list from subtitle phrase counts and Courtney cuts and approves it as one list (S4).
- Id: `phrase-` and one to four English words (`phrase-how-are-you`). `rank` is the highest rank among its words (so it sorts sensibly), and the sibling rule ignores phrases.
- Rated like any card: orange covers a small slip in a long phrase (an ending, an accent, a dropped word).

### Tips

- About 12 to 15 short screens. Expected set: Spanish drops "I / you" (soy = I am); verbs change with who does them; every noun is el or la; two verbs for "to be"; adjectives come after the noun and match it; tú and usted; questions and ¿¡; no goes before the verb; object pronouns go before the verb (te quiero); gustar works backwards; por and para; regular -ar, -er, -ir endings. Later tips may follow the starter path (talking about the past, when `fue` arrives).
- A tip has an id (`tip-two-to-be`), a title, a body of three to five plain sentences, and two or three examples, each `{ es, en, audio }`.
- **Shown in Learn before the first card that names it**, as an unrated screen. "Shown once" is worked out from progress: a tip appears when none of the cards naming it has been seen. No new store, table or sync.
- Never rated, never counted: not in Practice, the wheel, the batch bar or the summary.
- **Read again** from a "?" on the reveal of any card naming it (opens over the card), and from a Tips list on the menu holding every tip reached (a tip is reached when a card naming it is seen), at `/tips`.
- Drafted by Claude, one file per tip as plain text like a decision file (`content/tips/<id>.txt`: `status: pending`, `title:`, body lines, `example: es | en` lines). **Courtney reads every tip** and sets `status: approve`; the build ships approved tips only, and holds back any card naming an unapproved tip.

Decided in L4 (logic in `scripts/content/tips.ts`, run as `npm run tips` from `scripts/content/draft-tips.mts`; the build's side in `deck-build.ts`):

- **One call per tip, through the draft pass's caller and runner** (`runDraftTasks`, now generic over what a task drafts): the CLI on the Max plan by default, `--via api` as the switch, the same model, effort, concurrency, retries and stop rule. `--tips id,id` picks tips; a tip is drafted when its file exists, so a rerun resumes; `--redo` drafts again and **replaces the whole file, approval and corrections included**. Each call's usage goes to `content/tips/usage.jsonl`; a refused answer to `content/tips/.failed/` (ignored by git).
- **What Claude is given**: the tip's title and `about` brief, its place in the order met, the unit that introduces it (number, title, goal) or, for `tip-por-para` and `tip-past`, that it comes after the starter path, every `want` of that unit and the earlier ones (every unit's for a frequency-phase tip) as the words met, and the other tips' titles so it keeps to its own idea. It writes `body` (three to five sentences) and `examples` (two or three, each `{ es, en }`, under eight words, from the words met plus names, numbers and at most one obvious cognate). The known-words script check (L7) does not run on tip examples; Courtney reads them.
- **The title is not drafted**: the file starts with `content/tips.json`'s title, and the file's title is what ships, so Courtney can change it there.
- **The file**: `#` notes (the tip's place, the brief, who drafted it, how to approve), then `status: pending`, `title: …`, the body one sentence per line, and `example: Spanish | English` lines. Keys are read in any case; every other line that is not a note is body, joined with spaces into the deck's one-paragraph `body`. The guard refuses a body sentence that starts like a key line and a `|` in an example. The parser checks a status of `pending` or `approve`, one status and one title line, a body, and two or three examples each with both sides; a problem is named by line number or key. It does not count sentences: the person's edit stands.
- **The deck build ships every approved tip with no problem, in `content/tips.json` order**, whether or not a card in the deck names it yet (an unnamed tip is never shown, since the app shows a tip only before a card naming it). Each example's `audio` is `/deck/audio/<tip id>.<n>.<hash>.mp3`, numbered from 1 (a hashed name since L8; see "Decided in L8" under [Audio](#audio)). A revised tip counts as a new deck version, as a changed card does. `npm run deck` prints counts and ids of tips shipped, waiting, not drafted and with problems (a file not in the tip list is a problem), and the missing-media count includes tip clips.
- **Hold-back**: a card among the first `size` in Learn order whose `tip` the deck does not ship is left out and listed by id ("Held back until their tip is approved"). Like a card waiting for a decision, it keeps its place in the count, so approving the tip later never pushes another card out.

Decided in L11 (steps in `lib/queues/queues.ts` and `lib/queues/tips.ts`; screens in `components/card/Tip.tsx` and `components/tips/TipsScreen.tsx`):

- **A tip is a third step kind**, `{ kind: "tip", card, tip }`, where `card` is the card it comes before. `learnBatch(cards, states, size, tips)` puts it before the intro of the first card in the batch that names a tip the deck ships, once per batch, while no card naming the tip is seen (`isTipReached`). A batch left after the tip but before any card naming it was rated shows the tip again next time; that is the progress rule, and no store, table or sync is added.
- **It is a segment of the batch bar**, as "Intro, then test" says (that later rule wins over "not in the batch bar" above). It is never rated: the tip screen's one button, "Got it", stores nothing and moves on (`useSession`'s `passTip`), so the summary and the wheel never count it.
- **The "?"** sits at the top right of the intro and the reveal of any card naming a shipped tip, in Learn and in Practice (`tipOf`; `SessionView`, `LearnSession` and `PracticeSession` take `tips`). It opens the tip in a sheet over the card, drawn on `document.body`, and Close, Escape or a tap outside closes it; the card underneath is unchanged.
- **`/tips`** lists every reached tip (`reachedTips`: a card naming it is seen, `known` included) in the deck's tip order, each with its title, body and examples with their clips, and says that tips appear in Learn before the card that needs them when none is reached. The menu's header has a "Tips" link beside Settings, always shown. `/tips` is one of the service worker's `PAGES`, so it opens offline.

### Contrast lines

A card gets a one-line `why` only where it contrasts with a near neighbour (ser and estar, por and para, saber and conocer, pedir and preguntar): "Use estar for how or where something is right now; ser for what it is." It shows on the intro and the reveal. Null on most cards.

Decided in L13 (`components/card/CardFront.tsx`, `Reveal.tsx`, `Intro.tsx`):

- **A form card's front is the content layout**: its verb's character over the English prompt and hint ("I go", "you go (informal)"). Its reveal and intro show the verb's whole strip, "yo voy · tú vas · él va", with the card's own person in a `sun` highlight (`own-form`). The person comes from the id (`formPerson`); `haber-form-hay` highlights nothing, since `hay` is not in haber's strip.
- **A phrase card's front is the glue layout with nothing marked**: the whole English phrase centred, its hint, no character and no `mark`. Its reveal and intro are the usual ones; with no image and no grammar they show no character and no strip, and the part-of-speech chip reads "phrase". Reverse is the same Spanish-first front as every card.
- **The `why` line** (`WhyLine`) sits under the grammar strip on both the intro and the reveal, above the reveal's example, in the paper-coloured box the example uses. Nothing is shown when `why` is null.
- **The tip's "?"** stays absolutely placed at the top right; when a card has one, the character gets side padding as wide as the button, so a wide still never runs under it.

### Intro, then test

- In Learn, a new card first appears as an **intro**: the character, the Spanish with its audio playing, the English, the grammar strip, the `why` line and the tip's "?". For a later meaning, the line "You know *esperar* = to wait. It also means:" is added, worked out from a seen card of the same rank.
- Two buttons: **Got it** puts the card's test three steps later in the batch (or at the end, if fewer steps remain); **I already know this** records the first rating as Easy and the card leaves the batch.
- The test is the usual front and reveal, and its rating is the card's first forward rating, mapped as in Practice: green is Good, not Easy. Green on first view no longer means "already knew it"; only the intro's button does.
- Stored as a new rating value, `known`, which is green in summaries and colours and Easy in FSRS. It needs the `rating` check in Supabase widened (a migration) and the `Rating` type extended. Old reviews are ignored after Courtney's reset, so the change to first-view green needs no replay of history.
- Intros and tips are steps in the segmented bar. The "a red returns once" rule is unchanged.

Decided in L10 (steps in `lib/queues/queues.ts`, run by `useSession`; the screen is `components/card/Intro.tsx`; migration `supabase/migrations/20261003191001_known_rating.sql`):

- **A batch is a list of steps**, `{ kind: "intro" | "test", card }`, one segment each. `learnBatch` returns an intro for each of the first `batchSize` unseen cards, and no tests: a card's test joins when its intro is passed. Practice passes `testSteps(cards)`, so it has no intros. With every intro passed, a batch runs three intros, their three tests, the next three intros, and so on; a batch of 15 is 30 steps before any red.
- **"Got it"** stores nothing and puts the card's test `TEST_DELAY` (3) steps later (`afterIntro`), or at the end if fewer steps remain, so a red that returned earlier can come before the last card's test. **"I already know this"** stores the rating `known` at once, forward, section `learn`, and adds no test; the card is seen and belongs to Practice. A red brings a test back once, as before; an intro is not a showing.
- **`known` is a fourth stored rating**, not a button: `RATINGS` is `good`, `nearly`, `again`, `known`, and `ButtonRating` is the reveal's three. The scheduler maps `known` to Easy and green to Good on every view, first test included (`toFsrsGrade(rating)` no longer takes a first-view flag). Summaries count `known` as green; Struggling ignores it, as any non-red. Old reviews keep their stored value, so a green stored as a first view before L10 now replays as Good; Courtney's reset (L15) makes that moot.
- **The intro screen** shows "New card", the character (popping in, as on the front), the Spanish with its audio button, the part of speech, the English with its hint, the grammar strip and the `why` line, then "I already know this" (green, soft) and "Got it" (brand). No example: it is a test's answer side. The word clip plays by itself when it opens (L14), and the tip's "?" is L11's.
- **A later meaning's line**, "You know *esperar* = to wait. It also means:", is worked out as the screen shows (`earlierMeaning`): a seen content or glue card of the same rank, the nearest one before it in the deck, so a meaning seen earlier in the same batch counts. Form and phrase cards borrow a rank and are left out on both sides. A glue card is named by its target (`de = of`).
- **Supabase** checks `reviews.rating` against the four values (the migration replaces `reviews_rating_check`), and `npm run check:rls` checks that a `known` review is accepted and any other value refused. Until the migration is pushed, the server refuses a `known` review, so it must be pushed before this ships.

### Example sentences use known words

- **Starter path**: an example may use only words of cards earlier in the deck's order, the card's own word, names and numbers, and at most one other word, which must be an obvious cognate (doctor, hotel, chocolate).
- **Frequency phase**: up to two other words.
- Checked by script, not Claude: each word of `example.es` is mapped to its lemmas with E1's lemma lists, and a word whose lemmas are all unknown counts against the limit. Over the limit flags the card with reason `known-words`.
- Order can change as the deck grows, so the build checks every example and lists the ones a reorder has broken.
- A flagged example is redrafted on its own (`npm run draft -- --examples --ids …`), with the allowed words given to Claude; nothing else of the card changes. The first 100 cards' examples are redrafted this way.

Decided in L7 (check in `scripts/content/known-words.ts`, redraft in `scripts/content/examples.ts`; the build's side in `deck-build.ts`):

- **The lemma list** is E1's `lemmatization-es.txt`, read from `content/.cache/` and downloaded there once if missing (pinned URL and SHA-256, now in `scripts/content/sources.mjs`, which `word-list.mjs` also uses). An example word's lemmas are the word itself, its lemmas in the list, and the verb of a form with pronouns attached (`cliticLemmas`, as in E1).
- **What a card makes known**: the words of its `es` (articles and every word of a phrase included), its grammar's forms (the three present forms, the feminine), and the lemmas of each. So the `soy` form card makes `ser` known, `la casa` makes `el` known (the list maps `la` to `el`), and a verb card makes every conjugated form known. A known word is one of whose lemmas is among those of the cards before it in the order, or of the card itself. The list's ambiguities make the check a little lenient (`casa` also makes `casar` known).
- **Free words**: digits; number words (cero to veinte, the tens, cien, ciento, a few hundreds, mil, millón; not `un` or `una`, which are articles); names: a capitalised word that is not the first of a sentence, or a first word (also after ¿ or ¡, or after . ! ? : …) whose lower case is not in the lemma list.
- **Obvious cognate**, decided by script: an unknown word that appears in `example.en` as it is, without accents, without a final a, e or o (problema, música), or with -ción as -tion or -dad as -ty. In the **starter path** (a card with a `unit`) an example may have one other word, and only a cognate; in the **frequency phase** two other words of any kind (`STARTER_OTHER_WORDS`, `FREQUENCY_OTHER_WORDS`).
- **The deck build** checks every card of the computed order against the cards before it (waiting and held-back cards included, since they hold their place) when given the lemma list (`npm run deck` always gives it). It lists by id the cards in the deck whose example is broken ("Examples using words not met yet"), and `content/path.md` names the words beside each broken card. It does not hold them back: a reorder can break a shipped card's example, and the fix is a redraft.
- **The review pass** computes the same order (`pathOnDisk` in `deck-build.ts`: units, tips and tags on disk, no deck size) and adds the script reason **`known-words`** ("Example uses words not met yet") to a reviewed card whose example breaks the rule, with `npm run draft -- --examples --ids <id>` as the fix. If the order has a problem, the check is skipped and the run says so.
- **The redraft**: `npm run draft -- --examples --ids a,b` (drafted ids, or the ids the build lists), one call per card through the draft pass's caller and runner (`runDraftTasks`, same switches). Claude gets the card (kind, part of speech, prompt, hint, answer, grammar), its current example and why it fails, where it is (unit or frequency phase) and the words of the cards before it as written; it returns only `example`. The guard keeps every other field of the drafted card, runs the validator and the known-words check, and refuses an example that still breaks it, which is asked again. A card whose example already passes is skipped (so a rerun resumes); `--redo` redrafts it anyway. Usage lines carry `group: "example"` and the id; a refused answer goes to `.failed/example-<id>-<n>.json`.
- **A redrafted example keeps the card's tag**: the tag's `draft` fingerprint moves to the new draft when it was current, since unit, requires and tip do not depend on the example. The review does not: the card is not in the deck until `npm run review` checks the new example. A flagged card's decision file is remade then, as for any new draft.
- **Tip examples** are not checked (L4); Courtney reads them.
- **First run, 2026-10-03**: with no tags yet every card is in the frequency phase; 29 of the 100 cards in `content/deck.json` have an example with more than two words not met yet. L9 redrafts them after tagging, when the starter path's stricter rule applies.

### Units in Learn

- **In the starter path a batch is one unit**: the unseen cards of the earliest unit that has any, with their intros and tips. The batch size setting applies only after the starter path.
- The batch frame names the unit ("Unit 3 · How and where I am"), and so does the menu's Learn button, in place of the count, while starter units remain.
- **The unit's batch end** opens with "Unit complete: now you can say…", listing the unit's phrase cards with audio, then the usual summary. Shown when the batch leaves no unseen card in the unit.
- **No gating**: the next unit opens whatever the ratings. Practice handles weak cards.
- A card added to a unit the learner has finished leads the next Learn batch, headed "New in *unit title*".

Decided in L12 (`lib/queues/units.ts`: `learnCut`, `unitName`, `isUnitComplete`, `unitPhrases`):

- **How far the learner has got** is worked out from progress, with no store of its own: the latest unit (in `deck.units` order) holding a seen card, or past every unit once a frequency-phase card is seen. Units before that point are finished.
- **The batch** is the unseen cards of the earliest unit from that point on that has any, however many; with none left, the first batch-size unseen frequency-phase cards. A card whose `unit` the deck does not list counts as frequency phase, so a deck with no units cuts every batch by size, as before.
- **Added cards**: unseen cards of finished units lead the batch, at most a batch size of them, each with "New in *unit title*" in the frame. In the frequency phase they count towards the batch size; in the starter path the whole unit follows them. A learner who had seen frequency-phase cards before the units existed meets the unit cards this way, a batch at a time.
- **The frame's title** is a line under the bar ("Unit 1 · Where I go"), kept on the batch end; none in the frequency phase. The menu's Learn button shows the same name in place of the count while a unit has unseen cards.
- **The unit's batch end** is titled "Unit complete!", then "Now you can *goal*", then the unit's phrase cards (Spanish, English and a button playing the word clip, which for a phrase speaks the whole phrase), then the usual summary. Shown when the batch's unit has no unseen card left; a "New in" card finishing an earlier unit does not bring that unit's payoff.
- **Tips** still come before the first card naming them, inside the unit's batch.

### Hear it, say it

- The word clip plays by itself on the intro and when the reveal opens; the sentence clip is a tap away.
- **A mute button is always on the card screen**, in the batch frame's top bar. Muting stops any clip playing and stops clips playing by themselves; the audio buttons still play when tapped. One switch, the same as "Play audio by itself" in settings, kept on the device in `localStorage` (`learn-spanish.muted`). On by default (not muted).
- In the starter path the forward front says "Say it out loud" under the prompt.

Decided in L14 (`components/audio/`, `components/card/BatchFrame.tsx`, `CardFront.tsx`, `components/settings/AutoplaySwitch.tsx`):

- **One player, one clip at a time.** `playClip` (now in `components/audio`) stops the clip playing before it starts the next, and remembers it so that muting can stop it. Tapped buttons and the word playing by itself go through the same `onPlay`.
- **The word plays once per intro or reveal**: when it mounts, and again only if the card changes (`useAutoplay`). The reveal drawn again for the character's jump or droop does not replay it. Practice's reveal plays it too. Muted is read at that moment, so muting mid-card stops the clip and nothing restarts it.
- **The mute button** is a speaker icon in the batch frame's top bar, between the segmented bar and the close button, on every step and on the batch end: `aria-label="Mute"` with `aria-pressed`, crossed out and red when muted. **The settings switch** is a "Sound" section at the top of settings, "Play audio by itself", on when not muted. Both read one store (`useMuted`, `useSyncExternalStore`), so they agree on screen and across tabs (the `storage` event).
- **Storage**: `learn-spanish.muted` holds `"1"` when muted and is removed when not, so a missing key means audio plays by itself. Storage that refuses the write keeps the switch for the page's life.
- **Mute covers only clips playing by themselves.** The tip screen's and the payoff's clips play only on a tap, so they are not touched.
- **"Say it out loud"** is a bold `brand` line under the hint of the forward front of any card with a `unit`: content and form cards (`ContentFace`), phrase cards (`PhraseFace`) and glue cards (`GlueFace`). Not on reverse fronts or frequency-phase cards.
- **Tests**: `vitest.setup.ts` stubs jsdom's `HTMLMediaElement.play` and `pause`, which only log "Not implemented", since every intro and reveal now plays a clip. Tests that check playback pass `onPlay` or stub `Audio`.

### Reset

- A **Start over** button in settings, with a confirmation, for starting the learning path cleanly. Courtney starts fresh; nothing on the current deck needs keeping.
- Reviews are append-only and nobody but the service role can delete on the server, so a reset is a row of its own: `resets` (`id`, `reset_at`, `device_id`) on the device and in Supabase, with the same owner-only rules and a `seq` download cursor, synced like reviews.
- Replay, the queues, the wheel and Struggling read only reviews made after the latest reset. Notes and reports are kept.

Decided in L15 (device side; sync is L16):

- **Store**: `resets` is a new IndexedDB store, Dexie schema version 3 (`id, resetAt, synced`). A row is `{ id (UUID), resetAt (ms), deviceId, synced }`; `RemoteReset` is the same without `synced`. Nothing uploads it until L16.
- **One filter**: `sinceLatestReset(reviews, resets)` in `lib/store/reset.ts` drops reviews whose `timestamp` is at or before the latest `resetAt` (a review in the reset's own millisecond is dropped). `LocalStore.getReviewsSinceReset(filter?)` applies it in one read transaction, and every reader of state uses it: Menu (counts, wheel, Struggling), Learn, Practice, Tips, media keeping and sync's `rebuildCardStates`. `getReviews` still returns every stored review, for sync and tests.
- **Start over**: `LocalStore.startOver(at?)` adds the reset row and empties the `card_state` cache in one transaction. Reviews, notes and reports stay on the device. The settings section `StartOver` (last on the page) asks first ("Yes, start over" or "Cancel") and then says "Done. Learn starts again at the first card." Local settings (batch size, mute, Reverse) are not touched.

Decided in L16 (migration `supabase/migrations/20261003194035_resets.sql`; sync in `lib/sync`):

- **Server table**: `resets` (`user_id`, `id`, `reset_at` timestamptz, `device_id`, `seq`), key `(user_id, id)`, index `(user_id, seq)`, `seq` numbered by the shared `set_sync_seq` trigger. Like reviews: owner-only select and insert, never changed, deleted only by the service role or with the user, no access for anon.
- **Remote**: `SyncRemote.pushResets(rows)` (stores the ones it does not have; a repeat changes nothing) and `pullResets(since)` (pages after the cursor, from every device), in `FakeRemote` and `SupabaseRemote` (`resetToRow`, `rowToReset`).
- **Device**: `listUnsynced` and `markSynced` carry `resets`; `LocalStore.mergeResets(rows, cursor)` adds the ones it lacks as synced and saves a `resets` cursor in `sync_state` in the same transaction (`SyncTable` is now `reviews | notes | resets`); `bindSyncAccount` marks resets unsynced and drops their cursor too. No schema bump: the cursor is one more `sync_state` row.
- **One sync**: uploads reviews, notes, reports, then resets; downloads resets, then reviews, then notes. If a reset or a forward review arrived, card state is rebuilt once (`rebuildCardStates`, which reads only reviews after the latest reset). `SyncResult` counts `uploaded.resets` and `downloaded.resets`, `replayed` is true when a reset arrived, and a downloaded reset fires `learn-spanish:synced` so the menu reloads. The status's waiting count includes resets.
- **Which reviews a reset drops** is still decided by time alone: a review from another device made at or before the latest `resetAt` stops counting when the reset arrives, and one made after it counts, even if it reached the server earlier. The latest reset from any device wins.
- **Start over asks for a sync** (`onDone`, default `requestSync`) once the reset is stored, and its confirmation now says progress goes back to zero "here and on any device you sync with".
- **Order of release**: once this code is live, every sync calls `pullResets`, so the migration must be applied before the app is deployed, or every sync fails.

## Screens

### Menu

- The wheel, with a headline count in the centre (memorized out of 1,000).
- **Learn** button, showing how many unseen cards remain.
- **Practice** button, showing how many cards are due.
- The Practice options listed above.
- The hero mascot.
- Sync status and settings.

Decided in C6 (menu in `components/menu`):

- **Counts come from replaying the stored reviews** each time the menu opens, and again whenever the page comes back into view, since cards fall due while it sits in the background. The due count is taken at that moment.
- **Shuffle, In order and Struggling are links** under the Practice button; Struggling shows how many cards it holds.
- **Reverse is a switch on the menu.** While it is on, every way into Practice from the menu (the button, the three options and a slice of the wheel) opens in Reverse. It does not affect Learn, and it is off each time the menu opens.
- **Under the wheel** a line gives the memorized and seen counts in words, since the wheel's centre shows only memorized.

Decided in U1 (interview with Courtney, 2026-10-04; built in U3, replacing C6's layout where they differ):

- **No title.** The top bar holds only a menu button (three lines, top right). It opens a bottom sheet with Tips, Settings and the sync status line, which leaves the home page; a small dot on the button shows when sync has failed.
- **The mascot is the centrepiece**: about 180 px, centred in the upper part of the screen, playing her idle loop, transparent (no disc, see U2). Under her, one Spanish line in the display font, chosen by state: **¡Hola!** when nothing is seen yet, **¡Muy bien!** when nothing is due and the current unit has no unseen cards, **¡Vamos!** otherwise. No English under it. Tapping her plays the line aloud and makes her jump (U4).
- **Then the wheel** (see [The wheel](#the-wheel), "Decided in U1") with a legend under it instead of the counts line.
- **Learn** is a full-width filled button at thumb height, with the unit name or the new-card count small under the label. Under it, one row: **Practice** (outlined, the due count) and a small square sliders button that opens a **Practice options** bottom sheet with Shuffle, In order, Struggling (with its count) and the Reverse switch.
- **Reverse keeps C6's rule** (every way into Practice from the menu, petals included, while on; off each time the menu opens), and while on, the Practice button carries a small "Reverse on" tag.
- **The whole screen fits a 390 by 844 phone without scrolling** (wheel about 280 px).
- **Theme: clean white**, picked by Courtney from the U1 mockups (warm paper was the other). Background `#FFFFFF`, ink `#141416`, soft text `#6B6B73`, lines `#ECECF0`, quiet fill `#F4F4F6`, one accent: saffron `#FFB800` with ink text on it (the Learn button, the switch). Practice and the sliders button are white with a 1.5 px `#E2E2E8` border; sheets are white with a 28 px top radius over a `rgba(20, 20, 22, 0.28)` scrim. Type: Manrope throughout (800 for "¡Vamos!" at 34 px and button labels). The clay mascot and the wheel are the only rich colour. U3 swaps the `@theme` tokens app-wide. No dark mode.

### Card front

- Segmented bar across the top, one segment per card in the batch.
- English prompt and hint, or the phrase with its highlighted word for glue cards.
- The character (content words, forward direction only).
- Tap or swipe down to reveal.

Swipe-down also triggers pull-to-refresh in phone browsers. The card screen disables overscroll, and the gesture is only dependable once the app is installed to the home screen. Tap always works.

### Reveal

Changed by the [learning path](#learning-path): the word clip plays by itself (mute button in the frame), a `why` line and a tip "?" where the card has them, and a form card highlights its own form in the strip.

- Spanish word, with article where relevant.
- Part of speech.
- Grammar strip.
- Example sentence in Spanish and English.
- Two audio buttons: word and sentence.
- Spain footnote, when there is one.
- Note field, with a "suggest a trick" button that fills in the card's pre-written trick for the user to keep or edit.
- "Something's off" button to report a bad card.
- Green, orange and red buttons at thumb height. Rating advances to the next card.

### Batch end

A short celebration with the mascot, a summary of the batch, and a choice of another batch or the menu.

Decided in C4 (session in `components/session`):

- **A rating is saved before the card advances.** The review is appended to the store first; if that fails the card stays on screen with a message and can be rated again. A second tap while the first is saving is ignored, so one showing gives one review.
- **Screens read card state by replaying reviews**, not from the `card_state` store. A session still writes `card_state` after each forward rating, but that store is a cache, and a failed write to it does not stop the session.
- **Summary**: the number of cards in the batch and a count under each rating button's label. A card that came back after a red counts once, under its first rating.
- **Another batch** is offered only while unseen cards remain. With none left, Learn shows "Nothing new to learn" and a way back to the menu.
- **Closing a batch part-way** keeps the ratings already given; the unrated cards stay unseen and lead the next batch.

Decided in C7 (motion in `components/motion`, keyframes in `app/globals.css`):

- **Plain CSS keyframes, no animation library.** A component marks what moves with a `data-move` or `data-enter` attribute and the stylesheet animates it.
- **Reduced motion is respected twice.** Every animation rule sits inside one `prefers-reduced-motion: no-preference` block, and with reduced motion on the components leave the attributes off and the confetti is not drawn.
- **The four moves and their triggers**: pop in when a front with a character appears, wiggle when the reveal opens, jump on green, droop on red. Orange has no move, and a glue card has no character to move.
- **A jump or droop holds the card for its length** (450 and 500 ms). The rating is stored the moment it is tapped; only the change of card waits, and a second tap during the move is ignored. With no move to play, the card changes as soon as the rating is stored.
- **Card to card**: the next front slides in from the right and the reveal settles into place from above.
- **Batch-end celebration**: the mascot slot bounces twice and confetti falls once behind the summary. The caught-up marker and the empty screens have none.

### Settings

Sign in, sync status, "download everything for offline", batch size.

## The wheel

A radial chart with one slice per part of speech.

- **Slice width** is proportional to that part of speech's share of the 1,000 cards. Small groups get a minimum width so they stay tappable and can carry a label.
- **Fill** grows from the centre outwards in two layers: a light tint for seen cards and a solid colour for memorized cards. Memorized cards are a subset of seen cards, so the solid layer always sits inside the tint.
- **Fill radius** is the square root of the fraction, times the full radius, so the filled area matches the true fraction.
- A complete solid disc means the whole deck is memorized.
- Tapping a slice starts Practice for that part of speech.

The part-of-speech groups are provisional until the deck exists: noun, verb, adjective, adverb, pronoun, preposition, conjunction, determiner, other. The [learning path](#learning-path) adds `phrase`, after `other`.

Decided in B4 (maths in `lib/progress/progress.ts`, component in `components/Wheel.tsx`):

- **Slice order**: clockwise from the top, in the order of the list above. A part of speech with no cards gets no slice.
- **Minimum width**: 20 degrees. A slice whose share is smaller gets 20 degrees, and the other slices share what is left in proportion to their card counts.
- **No hole in the middle.** The fill starts at the exact centre, as the square-root rule needs. The headline count is drawn over the fill with a light outline around the digits so it stays readable, and taps pass through it to the slices.
- **One colour for every slice**: the brand purple for memorized and its soft tint for seen. A colour per part of speech can come with the art style (F1).
- **Labels** sit outside the rim, so a narrow slice can still carry one.

Decided in U1 (interview with Courtney, 2026-10-04; built in U3, replacing B4's look where they differ, keeping the maths):

- **Petals, after Apple Health's wheel**: each slice is a petal with rounded corners and a gap from its neighbours, with a faint full-size ghost behind it standing for all its cards. Seen and memorized fill it outwards by the square-root rule, as before.
- **No number in the centre.** A legend under the wheel gives "x% seen" and "y% memorized", each beside a small square of its colour.
- **At 0% memorized** a small dot of the memorized colour sits in the centre, so the legend's second colour shows from the start.
- **Colour per part of speech** (picked from the U1 mockups over one accent): noun `#23A897`, verb `#F0652F`, adjective `#6DB836`, adverb `#3B7BF0`, pronoun `#8455F0`, preposition `#E8458F`, conjunction `#EDAE00`, determiner `#12A9C9`, other `#8C9AAD`, phrase `#E2444A`. The unseen part (the ghost) is one light grey `#EFEFF2` for every petal, Courtney's call; seen is the petal's colour mixed 36% into white (a solid tint, not a see-through layer, which looks muddy over the grey); memorized is full colour. The legend's squares are ink at 22% (seen) and full ink (memorized), since the rule holds for every colour, and the centre dot is ink.
- **Every petal reaches the same small inner circle** (radius 17 of 104), Courtney's call: narrow petals must not start further out than wide ones. The gaps are by angle (3.4°), so they narrow towards the centre; corners are rounded (9 px outside, up to 4 px inside). With the inner circle, the fill radius is `sqrt(r0² + f·(R² − r0²))`, which keeps area true to the fraction.
- **Percentages are of the cards shipped** (the deck the app serves, 100 today), not of the 1,000 goal, so a beginner's wheel does not look empty for months. They dip a little each time a batch of new cards ships.
- **Labels stay short words outside the rim** ("nouns", "verbs"), no icons. Tapping a petal still starts Practice for it.

## Art

- **Job**: illustrate the meaning. The character makes each card distinct and gives the Spanish word something visual to attach to. It does not encode the Spanish sound; sound-alike memory tricks live in the note.
- **Production**: one locked illustration style. Each content word gets a still image generated through Higgsfield from a shared style reference, reviewed in batches. About 920 images.
- **Motion**: the app animates every still with the same small set of moves: pop in, wiggle on reveal, jump on green, droop on red.
- **Hero mascot**: one properly animated character for the menu, the caught-up marker and batch celebrations.
- **Budget**: roughly 40 MB for the full deck at about 40 KB per image. This is an estimate to check on the first 100.

Decided in F1 (style reference, prompt template and cast in `content/art`, rules in `content/art/style.md`):

- **Style: soft 3D clay toy.** Matte plasticine with soft studio light and pastel colours. Chosen over flat vector and kawaii sticker on a contact sheet of the same six words (`content/art/style-test`).
- **Lead mascot: the concha**, a pastel-pink Mexican sweet bun with the white sugar-shell crust worn like a hairdo, a diva's lashes and red mouth, and tiny lilac cat-eye sunglasses. Chosen in a second round over the turtle and five other clay candidates (a hummingbird, an alpaca, a coquí frog, a capybara and a made-up teardrop) as the most unique and memorable. She is the hero mascot, and the lead of the app's Instagram character in the `ai-influencer` repo (`docs/learn-spanish-character.md`), so the cards and the account share one cast.
- **A cast of five on the cards**: the concha, an alpaca, the turtle, a chick and a capybara. Each has a model sheet in `content/art/cast/` (four views, four expressions), the image reference for every render of that character. Their personalities and prompt descriptions are in `content/art/style.md`.
- **Each content card shows one cast member, chosen by fit.** The concha takes about half the content cards and any card where no one else fits better; the others take the words that suit their personality (the turtle esperar and casa, the capybara comer and dormir). The choice belongs to the art pipeline, not the deck: the card's `image` already points at its still, so the card data, the validator and the app do not change. The pose shows the word, never the rating: a "sad" still is a drooping character that still jumps on green, because the four moves animate the whole still in CSS and never the character's limbs.
- **One character per render.** A sheet of six stills holds one character, so a batch's cards are grouped by character before they are cut into sheets.
- **Stills are transparent.** Cards are white and the menu is cream, so a still carries no background box. Render on plain cream, then remove the background.
- **Six stills per render.** Generate a 3 by 2 sheet of six cards' poses and cut it apart, which costs a sixth of one render per still and keeps neighbouring stills on-model. Whether six different words stay on-model on one sheet is F2's first check; the fallback is one still per render at five times the cost.
- **Model: Seedream 5.0 Flash**, 0.5 credits per render at any resolution. GPT Image 2.5 needs a paid plan. Scripted batches run on credits, not the Plus plan's Unlimited models, because Higgsfield's fair-use terms forbid automation and review Unlimited usage.
- **Estimates, from F1's renders**: about 10 credits for the first slice's roughly 67 stills and 100 to 130 for the full deck, both with a third redone. A clay still of the front view is about 14 KB at 512 px wide and 18 KB at 640 px as WebP, well under the 40 KB per image above; F2 measures the real average.
- **Hero mascot**: idle loop on the menu; celebration loop on the batch-end screen and the caught-up marker; a still pose on the empty screens ("Nothing new to learn", "Nothing to practise yet"), which have no celebration. Clay cannot be drawn as vector animation (Lottie, Rive), so the loops are short video clips generated from the concha's model sheet, with the same first and last frame so they loop cleanly, rendered on the paper colour (`#fff8ec`), then made transparent in U2 (see "Decided in U2" below), in two formats since transparent video plays differently in Safari and Chrome. With reduced motion on, a still from the clip shows instead. F3 settles the file format and the size (see "Decided in F3" below).

Decided in F2 (`npm run art`, script in `scripts/content/make-art.mts` with logic in `art.ts`, `art-images.ts` and `art-run.ts`; files in `content/art`):

- **A still is a distinct `image` path of the deck**, not a content card, so a verb's form cards share one still. The first 100 have 36.
- **Casting by Claude.** `npm run art -- cast` sends the uncast stills with the cast section of `content/art/style.md` to Claude (the draft pass's caller, CLI on the Max plan by default), which picks the character and writes the pose. The answer goes to `content/art/cast.tsv` (still, character, pose), which Courtney edits; the script never overwrites a row. The rules it gets: the concha about half, others by fit, counts in multiples of six where the fit is close, the pose shows the meaning and never a rating, no text or flags, and no places or scenery (a pose naming a train platform or a shop window comes back with the scene drawn behind and cut away). A word that needs a second figure (friend, family) gets a smaller or larger copy of the same character. First 100: concha 18, alpaca 6, chick 6, capybara 6, turtle none.
- **Six on a sheet holds.** Seedream 5.0 Flash keeps six different words on-model on one sheet with the model sheet as reference, so the one-still-per-render fallback is not needed. The sheet comes back 2496 by 1664 as six 832 px square panels with no gutters; the script finds the cut lines from the transparent sheet anyway (the quietest column and row near each third and half).
- **Background removal on the whole sheet**: Higgsfield's `image_background_remover` (1 credit a job) on the rendered sheet, before cutting, so a sheet costs 1.5 credits: 0.25 a still. That puts the full deck (about 920 stills, 154 sheets) at about 230 credits before redos and about 300 with a third redone, against F1's 100 to 130, which left the removal out. The edges on the soft clay are clean against both the card's white and the menu's cream.
- **A part-filled sheet repeats its own stills** as extra takes, so every render is six panels and Courtney gets a choice.
- **Still format: 512 by 512 WebP**, transparent, quality 82, the character trimmed and fitted with a 4% margin. **Measured average: 32.6 KB over the 36 stills**, under the 40 KB estimate (F1's 14 KB was an opaque front view with no props); the full deck at that rate is about 29 MB.
- **Review in `content/art/review.tsv`**, one row per take: Courtney writes `ok` or `redo` after looking at the contact sheets in `content/art/contact/` (`npm run art -- contact`, takes waiting for a verdict, twelve a page, each on white with a cream strip to show halos). A still with every take marked redo is rendered again by `npm run art -- render`, with the character and pose from `cast.tsv`. `npm run art -- publish` copies each still's ok take to its image path under `public/`.
- **What is kept**: the cut takes in `content/art/stills/` (`<still>.t<take>.webp`), the contact sheets, `sheets.json` (each sheet's panels and Higgsfield job ids and result URLs). The raw and background-removed sheets go to `content/.cache/art/` (ignored by git) and are downloaded again from the job URLs when missing.

Decided in F3 (`npm run mascot`, script in `scripts/content/make-mascot.mjs` with logic in `mascot.mjs`; takes in `content/art/mascot`; component `Mascot` in `components/motion`):

- **Format: MP4 (H.264, Main profile, no sound), 480 by 480, about 4 seconds at 24 fps, CRF 27, with a WebP poster of its first frame.** H.264 plays everywhere the app runs, including iPhone Safari, without a second WebM copy. 480 px is three times the largest slot (160 px). The idle loop is 102 KB and the celebration 141 KB; posters about 8 KB each.
- **Played as `<video autoplay loop muted playsinline>`**, with the poster as the first thing drawn. With reduced motion on, the poster shows instead of the video. On the empty screens ("Nothing new to learn", "Nothing to practise yet") a transparent still of the concha's front view (`public/mascot/concha.webp`, 512 px WebP, like the card stills) shows instead.
- **A soft disc instead of an exact colour match.** The video models drift the cream (#fff8ec in, about #f3eee4 out, with a slight vignette), so the script scales each channel to bring the background back to the paper colour, and the page fades the clip's edge in a disc (`.mascot-disc` in `app/globals.css`, a radial mask fading from 80% of the radius). The clip sits on the menu's paper and on the white batch-end card alike.
- **Loops**: generated from one start frame, the concha's front view with the background removed (`content/art/cast/concha-cutout.webp`, Higgsfield `image_background_remover`, 1 credit) centred on a 1024 px square of #fff8ec with headroom for jumps, passed as both the start and the end image so the clip loops. The script drops the last frame, which repeats the first. Models: **Seedance 1.5 Pro** (`seedance1_5`, 480p, 4 s, 1:1, no audio) for the idle loop and **Seedance 2.0 fast** (`seedance_2_0 --mode fast`, same settings) for the celebration, which kept her on-model through two hops and a twirl where 1.5 Pro let the crust melt into a bob. Credits, not Unlimited.
- **Sizes on screen**: menu header 96 px (was a 48 px dot), batch end and caught-up marker 144 px, empty screens 112 px. The batch end's CSS bounce is gone: the celebration loop is the celebration; the slot keeps `data-move="celebrate"` as the mark that it plays.
- **Offline**: the service worker stores the five mascot files with the pages on install (an install fails without them) and answers byte-range requests for them from the store, as it does for audio, since Safari asks for video in ranges.
- **Icons**: the concha's cutout on the paper colour, inside the middle 56% so her corners stay in a maskable icon's safe circle (`scripts/make-icons.mjs`, now with sharp). The manifest's `ICON_VERSION` is 2.
- **Takes**: `content/art/mascot/takes.json` lists every take (model, prompt, job id, URL) and which idle and celebration take the app uses; `content/art/mascot/takes.html` (opened from disk) plays each one on the paper and on white. To switch, change `use` and run `npm run mascot`.

Decided in U2 (Courtney's call, 2026-10-04: the disc read as an orb around her, worst on the celebration screens; replaces F3's format and disc, the rest of F3 stands):

- **Transparent loops in two formats**, since no one video format with transparency plays everywhere: `public/mascot/<pose>.webm` (VP9 with alpha, CRF 42) and `<pose>.mov` (HEVC with alpha, by macOS's VideoToolbox encoder, quality 45, alpha quality 0.6), 480 by 480, 96 frames at 24 fps, with a transparent WebP poster of the first frame. Measured: idle 226 KB WebM and 278 KB HEVC, celebrate 278 KB and 272 KB, posters about 20 KB. A browser fetches one format; the service worker stores both on install (about 1.1 MB in all).
- **Which format plays is read from the browser** (`mascotFormat` in `components/motion/Mascot.tsx`): HEVC in Safari and in every iPhone and iPad browser (all WebKit; an iPad asking for the desktop site is told apart by its touch points), WebM everywhere else. `canPlayType` cannot decide it: Safari plays WebM but draws its transparency black, and Chrome on a Mac plays HEVC without it. On the server the browser is unknown, so the page is drawn with the poster and the video replaces it once the page runs.
- **How the transparency is made**: Higgsfield's Video Background Remover (`video_background_remover`, 1 credit a take) returns the take on black, not with an alpha channel. `npm run mascot` mattes each frame from the two copies: alpha = 1 − (cream copy − black copy) / cream, colour = black copy / alpha, so dark parts of her (the eyes) stay solid because they are the same in both; a pixel black in the cut-out but light on cream is background, which clears the cream's darker corners. The cut-out's job and url sit beside each take in use in `takes.json` (`cutout`), and the script refuses a take in use without one.
- **Cropped to her**: each loop is cropped to a square around everything she covers in any frame, with a 4% margin, so she fills her slot (idle 424 px of the 640 px take, celebrate 526 px, since she jumps and twirls). Slots show the clip with `object-contain`.
- **No disc**: `.mascot-disc` is gone from `app/globals.css` and from every slot (menu, batch end, caught-up marker).

## Audio

- Two clips per card (word, example sentence), generated once by a script with one Latin American neural voice. About 2,000 clips, estimated 30 to 40 MB.
- Clips ship with the deck, so playback is instant, free per tap, and works offline.
- The voice is chosen by a blind listening test on 20 tricky words across candidate providers before generating the rest.
- ~~Audio plays on button press only.~~ Changed by the [learning path](#learning-path): the word clip plays by itself on the intro and the reveal, with a mute button always on the card screen.

Decided in G1 (test script `scripts/voice-test.mjs`, with its page `scripts/voice-test.html`):

- **Provider: OpenAI, `gpt-4o-mini-tts`, voice `coral`**, with the instruction to speak neutral Latin American Spanish with a Mexican accent, clearly and at a natural pace, like a teacher reading a vocabulary card (the exact wording is `OPENAI_INSTRUCTIONS` in the script). The key is `OPENAI_API_KEY` in `.env.local`.
- **Chosen without the blind listening test.** Courtney picked OpenAI as a quick bet and will reconsider if it sounds wrong in real use. The script and its page still run the blind test: it supports Azure, Google Cloud and ElevenLabs as well, each one included once its key is in `.env.local`, so a switch can be tested the same way.
- **Checked by transcribing back**: the 20 tricky words (perro and pero, y, la calle, México and el examen, el pingüino, el agua and others) and 4 example sentences were generated with the voice and transcribed with `gpt-4o-transcribe`. All 24 came back as their own text; "y" came back as "I", the right sound for the word, not the letter's name. This checks intelligibility, not accent.
- **Size**: the API's MP3s are 128 kbps, about 24 KB for a word and 53 KB for a sentence, which would make about 77 MB for 1,000 cards against the 30 to 40 MB estimate. G2 has to re-encode them smaller. There is no ffmpeg on Courtney's Mac yet.

Decided in G2 (pure parts in `scripts/content/audio.mjs`, the run in `scripts/content/make-audio.mjs`, `npm run audio`):

- **What is spoken**: the word clip speaks `es` as the reveal shows it (nouns with their article, adjectives in the masculine), and the sentence clip speaks `example.es`.
- **Format: MP3, 48 kbps constant bitrate, mono, 24 kHz** (the API's own rate). Every browser plays MP3, Safari included. The script asks the API for raw samples (`response_format: "pcm"`) rather than its MP3, so the clip is encoded once, not twice.
- **No ffmpeg.** Trimming, loudness and encoding are done in JavaScript: the MP3 encoder is `@breezystack/lamejs` (a maintained copy of lamejs, pure JavaScript, LGPL 3, used only by the script and never shipped to the app). So the script runs on any machine with Node and its steps are unit-tested.
- **Trimmed**: the quiet before the first sound and after the last is cut, keeping 80 ms each side with a 5 ms fade. Quiet is a 10 ms window more than 35 dB under the clip's loudest.
- **Even loudness: -18 LUFS integrated** (ITU-R BS.1770-4, measured in the script), with the sample peak kept at or under -1.5 dBFS. A clip whose peak would pass that ceiling is left quieter, not limited or compressed, and the run counts them. At -16 LUFS 7 of the fixture's 24 clips could not reach the target; at -18 none miss it.
- **Paths carry a hash**: `/deck/audio/<id>.<word|sentence>.<hash>.mp3`, the hash taken over the text, the voice settings, the encoding settings and the take. A corrected sentence, a new voice or a re-encode gives a clip a new path, which the app needs because it never refreshes a stored file (see D2 under [Installable app](#installable-app)). `audioPaths(card, takes)` gives a card's `audio` field.
- **Takes**: the API sometimes says a short word badly. `npm run audio -- --redo lo-him.word` asks for that clip again as take 2, recorded in `content/audio-takes.json` (committed, because the take is part of the path).
- **Checked by transcribing back**: `--check` sends each clip to `gpt-4o-transcribe` and flags any whose transcript differs from the text, ignoring case, accents and punctuation. The flagged clips are listed in `content/.cache/audio/flagged.tsv` with what was heard, for a person to listen to. A flag is a prompt to listen, not proof of a bad clip: on one run "lo" was heard as "La." and on the next as "lo", from the same audio.
- **Measured on the fixture's 12 cards**: 24 clips, 220 KB; on average 5.3 KB for a word and 13.0 KB for a sentence, which would make about 18 MB for 1,000 cards, under the 30 to 40 MB estimate. Measuring again on the first 100 is G3.

Measured and decided in G3 (the first 100 cards, `content/deck.json`):

- **Measured on the first 100 cards: 200 clips, 1,894,032 bytes (1.8 MB) and 5 minutes 16 seconds of playing time** (word clips 80 s in all, 0.80 s on average; sentence clips 235 s, 2.35 s on average; measured with macOS `afinfo`, and size over time comes to exactly 48 kbps). On average 4.7 KB for a word and 13.8 KB for a sentence, which would make **about 18.1 MB for 1,000 cards, about half the 30 to 40 MB estimate** and in line with the fixture's 17.9 MB. At that rate 1,000 cards are about 53 minutes of audio.
- **Both decks keep their clips in `public/deck/audio`**, so `--prune` now deletes only clips that neither the app's deck nor `content/deck.json` names, whichever deck the run is for (`orphanClips` in `audio.mjs`). Before, it looked only at the app's deck: run on `content/deck.json` it pruned nothing, and run on the fixture it would have deleted the 194 new clips. With both decks, `--redo` followed by `--prune` deletes the old take's file.
- **A listening page**: `--check` also writes `content/flagged-clips.html` (committed; template `scripts/content/flagged-clips.html`), which plays each clip to hear straight from `public/deck/audio` with no server: open it in a browser from the repo. Each clip shows its card id, word or sentence, the text it should say and why it is listed, with Play, Sounds right and Say it again; the choices are kept in the browser by clip file, so a new take starts unheard. The page then gives the `--redo` command for the clips marked Say it again and a one-line summary to send to Claude.
- **What is listed (`clipsToHear`)**: every clip the transcriber flagged; every word clip more than twice as long as the deck's median word clip, because a pause or an extra sound there still transcribes as the word (on the first 100, para-in-order-to.word took 1.8 s where para-for.word, the same text from another API answer, took 0.6 s); and every take made with `--redo`, flagged or not, so a new take is heard before it is kept.
- **The transcription check flags many lone short words**: 31 of the 100 word clips and none of the 100 sentences. Most transcripts are a sound-alike (haber heard as "a ver", la vez as "la ves") or one syllable heard as another (que as "Che", te as Korean "제"), which says more about transcribing one word with no context than about the clip. A person still hears every one; for S2, a check that expects fewer false alarms on word clips would save listening time.

Decided in L8 (form cards, phrase cards and tips; same files as G2):

- **Form and phrase cards need nothing new**: the word clip speaks `es` for every kind, so a form card's says its one form (voy) and a phrase card's the whole phrase. Clips with the same text share the speech API's raw answer, so `phrase-going-home`'s word clip and the tip example "Voy a casa." are one answer encoded twice, with the same hash in different names.
- **A tip example's clip** speaks the example's Spanish and is at `/deck/audio/<tip id>.<n>.<hash>.mp3`, `n` counting the tip's examples from 1, the hash made as for a card's clips (text, voice, encoding, take). `tipAudioPath` and `tipAudioPaths` in `audio.mjs` name it; `deckTip` in `tips.ts` uses them, and the deck build sets the paths again with the takes, as it does `audioPaths` for cards. Its clip name for `--redo` and `content/audio-takes.json` is `<tip id>.<n>` (`--redo tip-past.2`).
- **`npm run audio`** makes the clips of every tip in the deck file after the cards' and points each example at its clip once all of the tip's clips exist. A trial run with `--limit` leaves tips out. Tip clips are counted apart from the card clips in the size line, so the 1,000-card estimate stays per card.
- **The listening page** lists tip examples with the tag "Tip example" and the tip's id, and a phrase card's word clip with the tag "Phrase". A phrase card's word clip is not a single word, so it is neither counted in the median word clip nor listed as long (`clipsToHear`); it is still listed when the transcriber flags it or it is said again.
- **The fixture** (`lib/deck/fixture.json`) now has real clips for its two form cards, two phrase cards and the tip's two examples, made with `npm run audio -- --deck lib/deck/fixture.json --check --prune` (10 API calls, 18 KB for the two tip clips), and the ten `.wav` tones are deleted. The check flagged the four new clips with a `v` or a `b` (voy heard as "Boi", vas as "Bas", and the two tip examples likewise), which sound the same in Spanish; nobody has listened to them. The committed `content/flagged-clips.html` is still G3's page for `content/deck.json`: a `--check` run on another deck rewrites it, so it was restored after the fixture's run.

## Offline and sync

The device is the source of truth while studying. Supabase is the backup and the way a second device catches up.

### Installable app

- Web manifest plus a service worker that caches the app shell and the deck JSON.
- Art and audio are cached a few batches ahead of the Learn position, plus everything already seen. "Download everything" caches the lot.
- On iPhone, installing to the home screen is effectively required. Safari deletes a site's script-writable storage (IndexedDB, service worker cache) after seven days of Safari use without a visit to the site; web apps added to the home screen keep their own counter and are not expected to have data deleted ([WebKit, March 2020](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)). The app should prompt for installation early.

Decided in D1 (worker in `public/sw.js`, manifest in `app/manifest.ts`, prompt in `components/pwa`):

- **A hand-written service worker, no library.** The page registers it as `/sw.js?v=<build id>`, in production builds only. A new build registers a new address, which installs a new worker with its own cache (`learn-spanish-shell-<build id>`) and deletes the previous build's.
- **On install the worker stores** the four pages, the deck JSON, the manifest and the icons, then every build file (`/_next/static/...`) those pages' HTML names, and the fonts the stylesheets name. If a page or the deck cannot be fetched the install fails and the next visit tries again.
- **Pages and the deck come from the network when it answers within 3 seconds**, and from the stored copy otherwise, so a new build or a deck revision shows on the first online visit. The fresh copy replaces the stored one. Build files have a hash in their name and are served from the store without asking.
- **Everything is stored under its path without the query**, so `/practice?mode=shuffle` opens from the stored `/practice`.
- **Next's in-app navigation requests are left to the network.** With no connection they fail, Next loads the page in full instead, and the worker serves that.
- **Art and audio are read from any cache but not stored by this worker**; storing them is D2. On activation the worker deletes only caches whose name starts `learn-spanish-shell-`.
- **Install prompt**: a card at the top of the menu. On an iPhone or iPad it gives the Share, then Add to Home Screen steps and says why. Elsewhere it shows an Install button once the browser offers one (`beforeinstallprompt`). It is not shown in the installed app, and a dismissal is remembered in `localStorage` under `learn-spanish.install-dismissed`.
- **Icons** were placeholders drawn by `scripts/make-icons.mjs` (a small wheel on the brand purple) until the mascot existed; since F3 they are the concha on the paper colour (see "Decided in F3" under [Art](#art)).

Decided in D2 (logic in `lib/media`, trigger in `components/pwa/KeepMedia.tsx`, button in `components/settings`):

- **The page stores art and audio, not the worker.** They go in a cache named `learn-spanish-media`, each file under its path. The worker reads that cache and never writes or deletes it, so the files outlive every build.
- **Kept without asking**: the art and audio of the next 3 Learn batches (45 cards at the default batch size) and of every seen card. This runs when any page opens, when the app comes back into view, when a connection returns, and as each further Learn batch starts. Files already stored are skipped.
- **A file that cannot be fetched is skipped and counted**, not retried in a loop; the next run tries it again. Only a complete answer (status 200) is stored.
- **Download everything** is a button in settings. It stores every file the deck names, six at a time, and shows a count of files while it runs ("Downloading: 12 of 33 files"). The size shown is the size of what is stored, measured from the stored files, so the total for the whole deck is known once the download ends, not before. It also asks the browser to keep the storage (`navigator.storage.persist()`), which the browser may refuse.
- **Byte ranges**: the worker answers a request for part of a stored file (a `Range` header, which Safari sends for audio) with that part and status 206. Without this Safari will not play a stored clip.
- **Not done**: a file is never refreshed or removed once stored. A deck revision that changes a still or clip must give it a new path, and files a revision drops stay on the device. S3 has to settle this.

### Data on the device (IndexedDB)

| Store | Contents |
|---|---|
| `reviews` | Append-only rating events: id (UUID), card id, direction, rating, timestamp, section, device id, synced flag. |
| `card_state` | FSRS state per card. A cache derived by replaying forward `reviews` in time order. |
| `notes` | Card id, text, updated-at, synced flag. |
| `reports` | Card id, optional comment, created-at, synced flag. |
| `sync_state` | Added in D5: how far this device has read the server's reviews and notes. D6 adds the account those cursors and the synced flags belong to. L16 adds a cursor for resets. |
| `resets` | Added in L15 (schema version 3): each "Start over": id, reset-at, device id, synced flag. Synced since L16. See [Reset](#reset). |

Decided in B1 (types in `lib/store/types.ts`, store in `lib/store/db.ts`):

- **Database**: one Dexie database named `learn-spanish`, schema version 1. Primary keys: `reviews.id`, `card_state.cardId`, `notes.cardId` (one note per card), `reports.id` (a UUID, added so a report has a key).
- **Times** are numbers: milliseconds since the Unix epoch.
- **`synced`** is `0` or `1`, not a boolean, because IndexedDB cannot index booleans.
- **`rating`** is `good`, `nearly` or `again`, matching the rating colour tokens, or `known`, the intro's "I already know this" (since L10; see [Intro, then test](#intro-then-test)). **`direction`** is `forward` or `reverse`; **`section`** is `learn` or `practice`.
- **Device id**: a random UUID created on first use and kept in `localStorage` under `learn-spanish.device-id`.
- **`card_state`** rows only need a `cardId`; the scheduler owns the other fields.

### Data in Supabase

Tables `reviews`, `notes`, `card_reports` and (since L16, see [Reset](#reset)) `resets`, each with a `user_id` column and row-level security restricting rows to their owner. Card state is not stored on the server; any device rebuilds it by replaying review events.

Decided in D3 (migration in `supabase/migrations`, check in `scripts/check-rls.mjs`):

- **Project**: `learn-spanish`, ref `sbouiweyksuiakajkrbt`, eu-west-1. Migrations are SQL files in `supabase/migrations`, made with `supabase migration new` and applied with `supabase db push --linked`. The CLI connects through a temporary login role, so no database password is needed.
- **Columns** are the device's fields in snake case, with times as `timestamptz`: `reviews` (`id`, `card_id`, `direction`, `rating`, `reviewed_at`, `section`, `device_id`), `notes` (`card_id`, `text`, `updated_at`) and `card_reports` (`id`, `card_id`, `comment`, `created_at`). `user_id` defaults to the signed-in user. Ids and device ids are `uuid`; `direction`, `rating` and `section` are checked against the same values as the device.
- **Keys include the user**: `(user_id, id)` for reviews and reports, `(user_id, card_id)` for notes. Two accounts never collide on a row, so the same device's rows could be uploaded to each.
- **Download cursor**: `reviews.seq` and `notes.seq`, numbers from one sequence set by a trigger on every insert, and on every note update. A plain sequence can commit out of order (5 after 6), so the trigger first takes a lock per user held until commit: one user's uploads are numbered in the order they commit. The cursor is `seq` as text; a page is `seq > cursor` in `seq` order, indexed by `(user_id, seq)`.
- **Notes: the latest edit wins in the database.** A trigger skips any update whose `updated_at` is not later than the stored one, so an upsert can send every unsynced note and the rule in `SyncRemote.pushNotes` holds without reading first.
- **Access**: signed-in users may select and insert their own rows, and update their own notes. Nobody but the service role can delete, reviews and reports cannot be changed, and the anon role has no access at all. Policies compare `(select auth.uid())` with `user_id`.
- **Keys** (in `.env.local`, see `.env.example`): `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the app; `SUPABASE_SECRET_KEY` for scripts only, never the app or Vercel. The client library is `@supabase/supabase-js`.

### Sync rules

- Unsynced rows upload whenever a connection is available; rows from other devices download.
- Reviews merge by union on event id, then card state is replayed. Two devices can never conflict.
- Notes: the latest edit wins.
- The app is fully usable before signing in. Signing in uploads everything recorded so far.

Decided in D5 (core in `lib/sync/sync.ts`, the server's interface in `lib/sync/remote.ts`):

- **One sync is upload, then download, then replay.** Unsynced reviews, notes and reports go up 200 rows per request, and each request's rows are marked synced once the server has taken them. Then reviews and notes come down in pages. If a forward review arrived that the device did not have, every stored review is replayed and the result replaces `card_state`.
- **Every step can be repeated.** A push of rows the server already has changes nothing, and a downloaded review the device already has is skipped. So a sync that fails part-way loses nothing, and running it again, or twice at once, is safe. A failed sync throws.
- **The download cursor is the server's, not a timestamp.** A review made offline last week reaches the server after one made online today, so "reviews newer than my newest" would miss it. The server gives each page an opaque marker in the order rows arrived, and the device passes it back. D3 needs a server-assigned column for this on `reviews` and `notes` (a sequence, or an insert time set by the database), and on `notes` it must change when the note is replaced.
- **The cursor is stored with the rows.** A new store `sync_state` (database schema version 2) holds one cursor for reviews and one for notes, written in the same transaction as the page it belongs to. If the browser deletes the database the cursor goes with it and the next sync downloads everything.
- **A device downloads its own rows too**, since the server's pages are not filtered by device. They are skipped on arrival and not counted.
- **Notes**: the server keeps the note with the later `updatedAt`, and on equal times the one it already has. A device takes the server's note unless its own is later. So on a tie the first to upload wins and every device ends on the same text.
- **Reports only go up.** No device needs another device's reports.
- **Downloaded reviews keep the device id of the device that made them** and are stored as synced.
- **Not done**: the synced flags and cursors do not know which account they belong to. Signing out and into a different account on the same device would leave the first account's rows marked as uploaded. D6 has to settle this. (Settled in D6, below.)

Decided in D6 (server in `lib/sync/supabaseRemote.ts`, triggers and status in `lib/sync/runner.ts` and `components/sync`, check in `scripts/check-sync.live.test.ts`):

- **The device's progress follows the account it syncs with.** `sync_state` also records the account the synced flags and cursors refer to. Before each sync the device compares it with the signed-in account; if they differ, every review, note and report is marked unsynced and both cursors are dropped, so the sync uploads everything on the device to the new account and downloads all of that account's rows. Nothing is deleted, on the device or the server: the first account keeps what it had, and the device ends up holding both. Signing out changes nothing on the device, and signing back into the same account re-uploads nothing. Merging rather than wiping fits an app with one user; separate progress per account on one device would need a database per account and is not built.
- **When it syncs**: when the app is opened or reloaded, on sign-in and sign-out, when a connection returns, when the app comes back into view, at the end of each Learn and Practice batch (once its ratings are stored), and from "Sync now" in settings. Only while signed in, and not while the browser reports no connection. A request for a sync while one is running does not start a second; the running one goes round once more, so ratings stored after it began still go up.
- **Pages of 500 rows** on download. The cursor is the last row's `seq` as text; a short page means no more. Uploads use the calls D3 checked.
- **After a sync that brought in rows** the page fires `learn-spanish:synced` on `window` (the menu reloads its counts on it), and when card state was rebuilt the cards seen elsewhere get their art and audio (`keepMediaStored()`).
- **Status** has seven phases: unavailable (no Supabase in the build; nothing shown), signed out, not synced yet, syncing, synced (with the time, kept in `localStorage` under `learn-spanish.last-sync` per account), offline and failed, each with the number of changes waiting to upload. A failed request with no answer at all counts as offline; one the server refused is failed. Nothing retries on a timer: the next trigger tries again.

### Sign-in

Emailed one-time code, as in `crossfit_logger` (`signInWithOtp` / `verifyOtp` in `app/welcome/OnboardingFlow.tsx`). Authentication happens in the browser client; no page needs a server-side session.

Decided in D4 (logic in `lib/auth`, section in `components/settings/SignIn.tsx`, check in `scripts/check-signin.mjs`):

- **One browser client**, `authClient()`, made from the two public keys and null when a build has neither. The session lives in `localStorage` under `learn-spanish.auth` and the client refreshes it itself.
- **The code has 8 digits**, the live project's `otp_length`. The field keeps only digits, so a pasted "1234 5678" works, and Sign in waits for all eight. A new code can be asked for after 60 seconds, the project's limit on emails. Asking for a code creates the account on first use.
- **Who is signed in is read from the stored session**, not from `getSession()`. With no connection and an expired access token, `getSession()` retries the refresh for up to half a minute and then reports no session, although the session is still stored. The stored one is what settings shows, so it appears at once and offline; it goes when the server rejects it or the user signs out.
- **Signing out works offline.** The device forgets the session straight away; the server is told when it can be reached.
- **The email's link**, if it has one, points back to `/settings`, where the client is set to pick up a session from the link (not yet tried with a real email). It only works once that address is in the project's redirect list; until then a link goes to the site URL. The code is the way in that is meant to work.

Set up by Courtney after D4, in the Supabase dashboard (not mirrored in `supabase/config.toml`):

- **Email goes through Resend's SMTP**: the same Resend account and verified `wodly.net` domain as `crossfit_logger`, with its own API key and a `wodly.net` sender. Supabase's built-in email cannot have its templates changed, and sends only a few emails an hour. Resend's free plan, 100 a day and 3,000 a month, is shared with `crossfit_logger`.
- **Both templates carry the code** (`{{ .Token }}`): "Magic link or OTP" and "Confirm signup". Email confirmation is on, so the first sign-in for an address sends Confirm signup, and later ones send Magic link or OTP.
- **The site URL** is the production address, `https://learn-spanish-delta.vercel.app`, so a link in an email opens the app rather than `localhost`.

## Content pipeline

A script run at build time, not part of the app.

1. **Word list**: an open, subtitle-based frequency list (spoken register), lemmatized and ranked. The licence must be re-checked before anyone other than Courtney gets access.
2. **Draft pass**: Claude splits words into meanings and writes the prompt, hint, part of speech, grammar fields, example sentence, Spain alternative and memory trick. Glue words get phrase prompts.
3. **Review pass**: a second, independent pass sees each card cold and checks it: translating back from the Spanish, and checking gender, register, Latin American usage and that the sentence sounds natural. Any disagreement flags the card.
4. **Human review**: flagged cards only (expected 5 to 10%), ideally by a Spanish speaker.
5. **Art and audio** generation for the approved cards.
6. **In-app reports**: "Something's off" writes to `card_reports`, which feeds the next deck revision.

Decided in E1 (script `scripts/content/word-list.mjs`, rules in `scripts/content/lemmatize.mjs`, hand corrections in `scripts/content/overrides.mjs`, output `content/word-list.tsv`):

- **Frequency source**: the 2018 Spanish list from [FrequencyWords](https://github.com/hermitdave/FrequencyWords) by Hermit Dave, the 50,000 most frequent word forms with counts, made from the OpenSubtitles 2018 corpus on OPUS. **Licence: CC BY-SA 4.0** for the lists (the code is MIT). Anything derived from it, `content/word-list.tsv` included, needs attribution and the same licence; that is fine for Courtney's own use and is what step 1 says to re-check before anyone else gets access. The subtitles mix Latin American and Spain Spanish, so Spain-only words (vale, coger, enfadar) rank higher than in a Latin American corpus; the draft and review passes decide what to do with them.
- **Lemmatizing** works on forms in isolation, with no tagger. The lemma and form pairs from Michal Měchura's [lemmatization-lists](https://github.com/michmech/lemmatization-lists) (**ODbL 1.0**) give each form its possible lemmas, and the `es_MX` Hunspell dictionary from [LibreOffice](https://github.com/LibreOffice/dictionaries) (RLA-ES, **GPL 3, LGPL 3 or MPL 1.1**) says which lemmas are real lower-case words. The rules, in order: an override; a form that is a lemma itself; a regular past participle goes to its verb (he perdido); a feminine or plural goes to its masculine singular (buena to bueno), shared with a verb when one is possible; a noun headword stays itself (casa, not casar); otherwise a form with several lemmas is shared in proportion to what each lemma gets from forms that are not shared (creo goes almost all to creer). An infinitive or imperative with pronouns attached (irme, déjame, dímelo) goes to its verb. A lemma the dictionary does not know (names, English, the lemma list's mistakes) is left out.
- **Function words are kept as a learner meets them**: el takes la, los and las; un takes una, unos and unas; lo, le, me, te, se, nos, él, ella, ellos, esto and eso are words of their own, and del and al stay as words. Vosotros, os and vos are left out. Past participles used mostly as adjectives or nouns (cansado, comida) are words of their own, and some frequent forms are split by a fixed share (hecho: 70% hacer, 30% hecho); these are judgments, listed in `overrides.mjs`.
- **The list** is a tab-separated file: comment lines starting `#` with the sources and licences, a header, then `rank`, `word`, `count` and `forms` for 1,200 words. `count` is the summed occurrences in the source; `forms` gives up to eight of the forms counted, most frequent first, so the draft pass can see what a word stands for (fue is shared between ser and ir). A rank is a word's, not a card's: E2 splits words into meanings, and two meanings of a word share its rank.
- **Rerun** with `node scripts/content/word-list.mjs`, taking `--size N` (default 1,200), `--top N` (prints the first N words) and `--explain N` (prints how each of the N most frequent forms was counted, which is how the overrides were found). The three sources are downloaded once into `content/.cache/`, which git ignores, from URLs pinned to a commit, and checked against a SHA-256. The same sources give the same file.
- **Not done**: ambiguous forms were reviewed by hand among the 2,500 most frequent forms only, so words near the bottom of the list are rougher. Interjections (oh, eh, ah, ay) and swearing (mierda, joder) are still in the list, for the draft or review pass to keep or reject.

Decided in E2 (script `scripts/content/draft.mts`, run as `npm run draft -- --from 1 --to 20`; prompt, schema, output guard and files in `scripts/content/drafting.ts`; the two ways of calling Claude in `scripts/content/claude.ts`):

- **Claude is called through the Claude Code CLI on Courtney's Max plan by default, not the API.** One `claude -p` call per word, with `--model`, `--effort`, `--system-prompt` (replaces Claude Code's own), `--tools ""`, `--json-schema`, `--output-format json`, `--no-session-persistence`, `--safe-mode`, `--strict-mcp-config` and `--disable-slash-commands`. Stdin is closed, and each call runs from a new empty directory under the system temp folder, so no project `CLAUDE.md` is read. The child's environment has no `ANTHROPIC_API_KEY` or `ANTHROPIC_AUTH_TOKEN` (either would bill the API instead of the plan), and no `CLAUDECODE` or `CLAUDE_CODE_ENTRYPOINT` from a parent Claude Code. `--bare` is not used: it reads only an API key, never the claude.ai login. The answer is the result's `structured_output` field; `result`, the same answer as text, is never read or logged.
- **`--safe-mode` keeps the user's own setup out of every call** (user `CLAUDE.md`, plugins, hooks, MCP servers, skills); sign-in still uses the claude.ai login (the CLI reports `apiKeySource: none`). Without it, plugin hooks added about 3,500 tokens to each call that were written to the cache afresh every time, which made a call cost about three times as much.
- **The API is a switch**: `--via api` uses `@anthropic-ai/sdk` with `ANTHROPIC_API_KEY`, structured output through `output_config.format`, the same effort through `output_config.effort`, no `thinking` parameter (thinking is always on for Claude Opus 5.5), and an answer only when `stop_reason` is `end_turn`. It has been run only against a fake client in the tests, since this machine has no key. No fallback model is set for refusals: a refused word fails and is reported, so every card comes from one model.
- **Model and effort**: Claude Opus 5.5 by its full id, `claude-opus-5-5`, so a later change to the `opus` alias cannot change models mid-deck; effort `medium`, the API's default for this model, passed to both paths so they match. `--model` and `--effort` change them.
- **Gentle with the plan**: 2 calls at a time (`--concurrency`), up to 2 more attempts per word (`--retries`), a failed call waits 5 seconds times the attempt number before the next try, and after 4 failed calls in a row the run stops starting new ones.
- **One call per word.** Claude gets the rank, the word and its `forms` from the word list, and returns `{ skip, cards }`. `grammar` comes back flat (gender, article, feminine, present, irregular, each nullable) and the script keeps the fields the part of speech uses. At most 4 cards per word (the prompt asks for at most 3). A word can be skipped with a reason from a fixed list (`interjection`, `vulgar`, `spain-only`, `name-or-foreign`, `covered-elsewhere`, `other`) and a note; the note is kept in the word file and never printed.
- **Irregular verbs**: `irregular` is true when the verb is irregular in the present or the preterite, stem changes included (poder, tener, ir).
- **Output guard**, started from `normalizeTranslation` in `wedding-admin-app`: every text field is trimmed, loses a leading Markdown heading marker and wrapping quotes (only when that quote does not also appear inside, so a trick may quote words), and must be one non-empty line; a blank `hint` or `spain` becomes null. Then each card goes through `validateCard`. The id must be the word without accents, or that plus a hyphen and more (`tener-have`), and within one word no two cards may share an id or a prompt. A refused answer is saved under `content/drafts/.failed/` (ignored by git) for a person to read, and the word is asked again.
- **Files**: one card per file, in deck format, at `content/drafts/cards/<id>.json`; one file per word at `content/drafts/words/<rank>.json` (rank padded to four digits) with the word, its card ids, the skip, and the model, effort, path (`cli` or `api`) and time. Card files are written first and the word file last, each by writing a temporary file and renaming it. **A word is drafted when its word file exists**, so rerunning the same command resumes: an interrupted word is drafted again and its stray card files replaced. `--redo` drafts the range again and replaces each word's cards. An id another word already holds gets this word's rank appended (`que-what-16`).
- **Media paths** are filled in from the id: `/deck/img/<id>.webp` for content cards and `/deck/audio/<id>.word.mp3` and `.sentence.mp3`. The extensions are placeholders until F2 and G2 pick the formats; E3's deck build may rewrite them.
- **After each run every drafted card is checked together** with `validateDeck`, which catches a prompt that two words share. Only the id and field of each problem are printed.
- **Usage log**: `content/drafts/usage.jsonl`, one line per call with the time, rank, word, attempt, path, model, effort, whether it worked, the error kind and failing field names, input, output, cache-read and cache-write tokens, the notional cost (`total_cost_usd` from the CLI: what the API would charge; the plan is not charged it) and the duration. It never holds Claude's text. The script does not print it; the end of a run prints the totals.
- **Drafts are committed**: the card files, the word files and the usage log (36 cards are about 20 KB, so 1,000 will be about 600 KB). They are E3's input and the record of what drafting cost.
- **Scripts that import the app's TypeScript run with `tsx`** (a dev dependency). Node cannot load `lib/deck` on its own: its imports have no extensions and the validator uses a parameter property.

Decided in E3 (review pass `scripts/content/review.mts`, run as `npm run review -- --from 1 --to 20`, with prompt, schema, id rule and run in `scripts/content/reviewing.ts`; decision files and the flagged list in `scripts/content/decisions.ts`; deck build `scripts/content/build-deck.mts`, run as `npm run deck`, with its logic in `scripts/content/deck-build.ts`):

- **One review call per card, through E2's caller** (`claude.ts`): the Claude Code CLI on the Max plan by default, with the same flags, environment and empty working directory, and `--via api` as the switch. Same model (`claude-opus-5-5`), effort `medium`, 2 calls at a time, 2 more attempts, the same waits and the same stop after 4 failed calls in a row, all changeable with the same options as `npm run draft`.
- **The review is independent.** It has its own system prompt, written for checking, and never sees the draft prompt or anything from the draft call but the card. The card is shown without its id, rank or media paths, with the word, its rank and the prompts (`en` and hint) of the word's other cards, so the reviewer can judge that each prompt has one answer.
- **What it checks.** The answer's schema puts the back-translation first: the reviewer writes what `es` means on its own and translates the example sentence, then judges six areas, each with `ok`, a one-sentence `problem` and a suggested `fix`: `meaning` (the back-translation agrees with the prompt and hint; a common meaning; kind and part of speech fit), `oneAnswer` (no other common word, and no other card of the word, also answers the prompt), `grammar` (article and gender, feminine, the three present forms, the irregular flag, dictionary form), `usage` (Latin American usage in the tú register, and the `spain` field), `example` (natural, short, uses the word in this meaning, a conjugated verb, a right translation) and `trick` (leniently: in English and saying nothing false). The back-translation is written in the same call that sees the English, so it is not blind; a blind one would need a second call per card.
- **Any failed check flags the card**, and so do the script's own checks: the id rule (reason `id`) and any problem the deck validator finds across all drafted cards together (reason `deck`).
- **An unneeded hint does not flag a card** (changed by Courtney on 2026-10-03, before E4). E3's first run flagged five cards under "One right answer" only because the reviewer found their hint unnecessary. Now the review prompt says a hint the prompt does not strictly need is harmless: the reviewer passes the check and may say so in `note`, a last, nullable field of its answer. The note is kept in the review file (`note`), shown under a flagged card's reasons in the flagged list and its decision file as "Reviewer's note (not a reason to flag)", and never flags a card by itself. A hint that is wrong or misleading, or that leaves more than one right answer, still fails "One right answer" and flags the card. The draft prompt still asks for a hint only when one is needed. Reviews made before the change have no `note`.
- **Files**: one review per card at `content/review/cards/<id>.json` with the findings (reason, problem, fix), the back-translation, model, effort, path and time, and `draft`, the first 16 hex characters of the SHA-256 of the drafted card's JSON. A review counts only for the draft it saw: rerunning `npm run review` reviews just the cards with no review of their current draft (so it resumes), a card redrafted with `--redo` stays out of the deck until it is reviewed again, and `--redo` on the review reviews the range again. Each call's usage goes to `content/review/usage.jsonl`, with E2's fields plus the card id. Reviews, decision files, the flagged list and the usage log are committed.
- **The flagged list** is `content/review/flagged.md`, rewritten by `npm run review` and `npm run deck`: every card waiting for a decision in full (prompt, hint, answer, kind, grammar, example, Spain, trick), why it was flagged with the reviewer's suggested fix, and the reviewer's own translation; decided cards a line each. It is for Courtney and holds card text; no script prints it.
- **Approve or correct: a plain text file per flagged card**, `content/review/decisions/<id>.txt`, made by the review run. It holds the reasons as `#` notes, a line `decision: pending`, the card as `field: value` lines (the grammar lines its part of speech uses: `gender` and `article`, `feminine`, or `yo`, `tu`, `el` and `irregular` as yes or no) and the draft's fingerprint. Courtney changes `pending` to `approve`, after correcting any line, or to `reject`, then runs `npm run deck`. An empty `hint` or `spain` means none. Chosen over a prompt in the terminal or a web page because any editor opens it, no script has to print card text, and git keeps each decision. The correction lives only in the decision file (the draft card stays as Claude wrote it) and is applied by the build. A corrected card is not reviewed again: the person's decision stands. The `id` line may be corrected too, since an id is not permanent until it is in the deck. When a flagged card is redrafted and reviewed again, its decision file is remade as pending and the run names the id.
- **The deck file is `content/deck.json`**, in the app's format (`{ "version", "cards" }`). The app serves `public/deck/deck.json`, a copy of this file since 2026-10-03 (see the note under H1): after a rebuild, copy `content/deck.json` there to publish it, until S2 and S3 settle how a deck revision is published. The deck holds every card that passed the review of its current draft, plus every flagged card approved in its decision file, with the corrections. The build lists by id what it leaves out: cards waiting for a decision, rejected, not yet reviewed, and approved cards whose decision file has a problem (named by line number or field). It writes nothing if the deck validator fails.
- **Learn order** (changed in L6: the order is the learning path's, see "Decided in L6" under [Learning path](#learning-path)): the cards are written in the order Learn shows a new learner, from `learnQueue` in `lib/queues` (glue and content cards by rank, two content cards then one glue card); meanings of one word keep their draft order. Cards of later words join the end of their queue, so once the deck has enough content cards to interleave with the glue cards (about 67 content and 33 glue for 100 cards), its first 100 cards are the first 100 in Learn order and stay so as later words are added.
- **Deck size** (added at the end of E4, 2026-10-03): the deck holds the first `DECK_SIZE` cards in Learn order, 100 for the first slice (`scripts/content/build-deck.mts`; `npm run deck -- --size N` overrides it once). Each S2 batch raises it by 100. The first 100 are counted among every drafted card not rejected, waiting ones included, so a card still waiting keeps its place and approving it later never pushes another card out of the deck. Approved cards past that point wait in the drafts for the next batch.
- **Version**: 1 on the first build, and one more whenever the cards differ from the previous `content/deck.json`. A rebuild with nothing changed writes a byte-identical file.
- **The id rule**: the word from the list without accents, a hyphen, then one to three lower-case English words naming the meaning, a to z and 0 to 9 joined by single hyphens (`estar-be-state`; `que-what` for qué). If another word already held the id when it was drafted, the draft pass appended this word's rank (`que-what-16`). The review pass checks it for every card and the build for every corrected one; the validator checks that ids are unique. **Once in `content/deck.json` an id is permanent**: the build takes ids from the draft files and never makes them up, a correction changes a card's text but not its id, and the build refuses to write a deck that lacks an id the previous build had. `--allow-drop` lets it, and only until the deck ships in H1. Redrafting with `--redo` a word whose cards are in the deck can propose new ids, which the build then refuses; correcting a card already in the deck is S3's job.
- **Media**: the deck keeps E2's media paths made from the id (`/deck/img/<id>.webp` for content cards, `/deck/audio/<id>.word.mp3` and `.sentence.mp3`). The validator checks that a content card has an image path and every card two audio paths, not that the files exist, so new cards pass without art or audio. The build prints how many of the files are missing under `public/`. F2 and G2 make the files at these paths, or change the extensions in `withMedia` and rebuild.
- **The draft usage log holds the kept run only**: E3 removed the 20 rows of E2's discarded first run from `content/drafts/usage.jsonl`, so totalling it gives the 20 calls behind the committed cards ($0.30 notional).

Decided in L3 (form and phrase cards; modes and prompts in `scripts/content/path-cards.ts`, run by `npm run draft` and `npm run review`):

- **Form cards**: `npm run draft -- --forms [--verbs ser,estar]`, one call per verb. The verbs are the fixed list `FORM_VERBS` in `path-cards.ts` (beside `drafting.ts`, which stays the word pass), each naming the drafted card it takes its strip and still from: `ser-be-identity`, `estar-be-state`, `querer-want`, `tener-have`, `saber-know`, `poder-can`, `haber-there-is` (hay only), `ir-go`, `hacer-do`, `venir-come`, `decir-say`; 31 cards. The script makes the id, `es` (the person's form in the strip, or hay), `grammar` (a copy of the verb card's), `image` (the verb card's), `rank` (the verb's) and `spain` (null). Claude writes `en`, `hint`, `example` and `trick` (may be null), given the verb card's prompt, its three forms, the unit plan's wants for the verb and the other form verbs' prompts. Every "you" card's hint says "informal", since usted takes the él form. The guard also wants one card per form asked for, each example using its own form as a word, and no two prompts alike. A verb whose card is not drafted is listed and left out.
- **Phrase cards**: `npm run draft -- --phrases [--units who-i-am]`, one call per phrase, from `content/units.json`: each unit's survival chunks, then its payoff lines, in plan order. The id is `phrase-` and the first four words of the plan's English, apostrophes dropped (`I'm going home` is `phrase-im-going-home`); two lines giving one id stop the run before any call. Claude is given the unit (number, title, goal), the English, a chunk's Spanish (kept, with only capitals, accents and ¿ ? ¡ ! added) and every want of this unit and the earlier ones as what the learner has met. It writes `es`, `en`, `hint`, `example`, `spain`, `trick` (null unless it really helps) and `words`, every word of `es` in dictionary form, names left out. The script sets `rank` to the highest word-list rank among those words; a phrase with none in the list is refused.
- **Files**: card files go to `content/drafts/cards/` like any card. In place of a word file, a verb's form cards have `content/drafts/forms/<verb>.json` (rank, verb, source card, ids) and a phrase card `content/drafts/phrases/<id>.json` (rank, unit, place in the plan, chunk or payoff, the plan's line, its words with their ranks, and the words outside the top 1,000). A group is drafted when its file exists, and a phrase also needs its plan line and unit unchanged, so rerunning resumes and an edited line is drafted again. `--redo` drafts again. A refused answer goes to `.failed/form-<verb>-<n>.json` or `.failed/<id>-<n>.json`; usage lines carry `group` (`form` or `phrase`). Redrafting a word no longer deletes the form and phrase cards that share its rank.
- **Review**: `npm run review -- --forms [--verbs …]` or `--phrases [--units …]`, the same pass and caller. The reviewer sees a verb's form cards together and a unit's phrase cards together (the others' prompts, for "One right answer"). The review prompt describes the two kinds, and a null trick on them passes. The id rule goes by kind (`<verb>-form-<yo|tu|el>`, `haber-form-hay`, `phrase-` and one to four words). A new script reason, **`words`** ("Words outside the top 1,000"), flags a phrase with a word past rank 1,000 or not in the list: `¿puedes repetir?` (repetir, 1,006) will be flagged for Courtney to approve. A review's `rank` is now the card's own.
- **Decisions and the deck build** read every group (`allDrafted` in `reviewing.ts`): the words, then the verbs, then the units. A form card's decision file keeps its verb's still. Until L6 the build still leaves form and phrase cards out of the deck (see "Decided in L2").

A full native-speaker review of all cards happens before the app is opened to anyone else.

## Stack

Same as the existing apps: Next 16, React 19, Tailwind 4, Supabase, deployed on Vercel.

Additions:

- `ts-fsrs` for scheduling.
- An IndexedDB wrapper (Dexie).
- For the content scripts only, as dev dependencies (decided in E2): `@anthropic-ai/sdk` for the draft pass's API path, and `tsx` to run scripts that import the app's TypeScript.
- A service worker, hand-written in `public/sw.js` with no library (decided in D1). Next 16 builds with Turbopack, which the usual webpack plugins do not run under; Serwist has a Turbopack integration, but the app needs only a short list of pages and files stored, which is about 150 lines without a build step. The rules are under [Installable app](#installable-app).

Reusable from other repos:

| From | What |
|---|---|
| `crossfit_logger` | Emailed-code sign-in flow; `app/manifest.ts` and icon setup for installability. |
| `wedding-admin-app` | `lib/translateText.ts`: the Latin American / tú system prompt and the `normalizeTranslation` output guard, as a starting point for the draft pass. |

Neither app has speech or offline code. Both are new work here.

## First slice

Build every part end to end on the first 100 cards in Learn order, before producing the other 900. The slice is done when:

- The content pipeline has produced 100 cards through both AI passes and flagged review.
- The illustration style is locked and the hero mascot exists.
- The voice has been chosen by the listening test and the first 200 clips generated.
- Learn, Practice (with all options and Reverse), the reveal, notes, reports and the wheel work.
- The first 100 cards are in [learning path](#learning-path) order: a learner starting from zero meets units, tips, intros, form cards and phrase cards, and every starter example sentence uses only words met before it.
- The app installs to a phone and a full batch can be studied in airplane mode.
- Ratings made offline on one device appear on a second device after both reconnect.

## Assumed defaults

These were proposed during the interview and not explicitly confirmed. Change them here if they are wrong.

- The mapping of the five original quiz styles onto Learn and the Practice options.
- The green / orange / red rubric.
- Deck as static files in the repo, with only progress, notes and reports in Supabase.
- Append-only review events, and latest-edit-wins for notes.
- Character hidden in Reverse until the reveal.
- Memory tricks pre-written per card, so the button works offline.
- The subtitle-based word list.

## Open

Each is settled by the ticket named (see [Tickets](#tickets)).

- **Art style and mascot identity** (F1): settled, clay toy, the concha as lead mascot and a cast of five on the cards. See [Art](#art).
- **Mascot animation format** (F3): settled, looping H.264 MP4 clips on the paper colour with a WebP poster. See [Art](#art).
- **Speech provider** (G1): settled, OpenAI `gpt-4o-mini-tts` with the voice `coral`. See [Audio](#audio).
- **Service worker library** (D1): settled, none. See [Stack](#stack).
- **Word list source and lemmatizing method** (E1): settled, OpenSubtitles through FrequencyWords, lemmatized with lemmatization-lists and a Hunspell dictionary. See [Content pipeline](#content-pipeline).
- **Where media lives at 1,000 cards** (S1): static files in the repo are fine for the first slice (about 8 MB). At an estimated 75 MB, decide between the repo and Supabase Storage before producing the rest.

## Deferred

Considered and left out of the first version:

- ~~A pack of common irregular verb forms (es, hay, fue, tengo) as their own cards.~~ Brought forward as form cards for about ten core verbs, present tense only (see [Learning path](#learning-path)). Past-tense forms (fue, tuve) stay deferred.
- Spain as a switchable variant with its own audio.
- A placement test. ~~Intro cards for true beginners~~: brought forward as intros, tips and the starter path.
- Speech recognition or pronunciation scoring: patchy in browsers and needs a connection on most phones, which breaks offline-first.
- Tapping a word in an example sentence to see its meaning.
- Themed units for the whole deck: units stop after the starter path.
- Form cards for regular verbs: tip 12 (regular endings) teaches the pattern once.
- Swipe-to-rate gestures.
- A typed-answer mode.
- Generating a fresh memory trick on demand.
- Separate scheduling for Reverse.

## Tickets

The first slice is 30 tickets. Scale-out to 1,000 cards is 3 more, one of which is a template run nine times. Each ticket is meant for one fresh agent session that finishes without exceeding a 100k-token context window.

### How the tickets are sized

The numbers below are estimates, not measurements. Run `/context` in a fresh session in this repo to check the fixed overhead.

| Share of the 100k window | Estimate |
|---|---|
| Fixed overhead: system prompt, tools, skills, repo instructions | 20–30k |
| This doc, read in full | about 40k (157 KB on 2026-10-04, after M1 moved finished tickets' notes out; 229 KB, about 60k, before) |
| Left for the work itself | 60–70k |
| Planned work per ticket (half of what's left; the rest is for debugging detours) | 30–35k |

That planned budget corresponds to roughly:

- one concern, with one check that proves it is done;
- up to about 500 lines of new code, tests included;
- up to 6 files touched and 3 existing files read;
- up to 2 sections of this doc needed.

The doc has outgrown the 8k the other rows were planned around, so a session that reads it in full has less left for the work than the table says. Finished tickets' notes live in [history.md](history.md), under the same track and ticket headings (decided in M1); a ticket reads there only the notes of the tickets it depends on or whose code it touches.

A ticket that would exceed any of these was split. Logic is separated from screens for the same reason: tracks B and the sync core are verified by tests, which cost far less context than checking a UI.

### Rules for every ticket

- One fresh session per ticket. Read this doc and the ticket; open other repos only where the ticket names a file.
- Send build, test and script output to a file and read the tail, not the whole log.
- Content scripts print counts and card ids, never card bodies. A hundred cards printed is about 25k tokens.
- Art is reviewed by a person on contact sheets. An agent does not open stills one by one.
- If a session passes about 60% of its context with the ticket unfinished: commit, write a handoff note under the ticket, and split what remains into a new ticket.
- Record any decision the ticket makes (library, provider, format) in the relevant section of this doc.

### Board

"Human" marks tickets that need Courtney for a choice, a review or a credential.

| ID | Ticket | Depends on | Human | Status |
|---|---|---|---|---|
| A1 | Scaffold | none | Vercel link | Done |
| A2 | Deck schema and fixture deck | A1 | | Done |
| B1 | Local store | A2 | | Done |
| B2 | Scheduler | A2 | | Done |
| B3 | Queues | B2 | | Done |
| B4 | Progress stats and wheel | B2 | | Done |
| C1 | Card frame and front | A2 | | Done |
| C2 | Reveal panel | A2 | | Done |
| C3 | Notes, trick and report | B1, C2 | | Done |
| C4 | Learn session | B1, B3, C1, C2 | | Done |
| C5 | Practice session | C4 | | Done |
| C6 | Menu | B4, C5 | | Done |
| C7 | Motion | C4 | | Done |
| D1 | Installable app and service worker | A2 | | Done |
| D2 | Media caching | D1, B3 | | Done |
| D3 | Supabase schema | A1 | Project and keys | Done |
| D4 | Sign-in | D3 | Email sender | Done |
| D5 | Sync core | B1, B2 | | Done |
| D6 | Sync wiring | D4, D5 | Two-device check | Done except: two-device check on real phones |
| E1 | Word list | A2 | | Done |
| E2 | Draft pass | E1 | Max plan sign-in (no API key) | Done |
| E3 | Review pass and deck build | E2 | | Done |
| E4 | First 100 cards | E3 | Flagged-card review | Done |
| F1 | Art style and mascot design | none | Style choice | Done |
| F2 | Art script and first stills | F1, L9 | Contact-sheet review | Done |
| F3 | Hero mascot animation | F1, C6, C7 | | Done |
| G1 | Voice test | none | Listening test, API keys | Done (OpenAI chosen without the listening test) |
| G2 | Audio script | G1 | | Done |
| G3 | First 100 cards' clips | G2, E4 | Listen to flagged clips | Done except: 33 flagged word clips not yet heard |
| L0 | Learning path spec | none | Interview | Done |
| L1 | Unit plan | L0 | Approve `units.json` | Done |
| L2 | Deck format v2 | L0 | | Done |
| L3 | Form and phrase cards in the pipeline | L2 | | Done |
| L4 | Tips in the pipeline | L1, L2 | | Done |
| L5 | Tag pass | L1, L3 | | Done |
| L6 | Ordering build | L2, L5 | | Done |
| L7 | Known-words check and example redraft | L6 | | Done |
| L8 | Audio for form cards, phrase cards and tips | L2 | | Done |
| L9 | Learning path content for the first 100 | L4, L7, L8 | Read tips and `path.md`, flagged cards | Done |
| L10 | Intro step and the `known` rating | L2 | | Done |
| L11 | Tips in the app | L2, L10 | | Done |
| L12 | Units in Learn | L2, L10 | | Done |
| L13 | Form, phrase and contrast layouts | L2 | | Done |
| L14 | Audio by itself, mute, say it out loud | none | | Done |
| L15 | Reset on the device | none | | Done |
| L16 | Reset sync | L15 | | Done |
| L17 | Publish the learning path deck | L9, L11, L12, L13, L14, L16 | Study unit 1 from zero | Done except: deploy, Start over and study unit 1 on the phone |
| H1 | First-slice acceptance | all above | Phone testing | Todo |
| M1 | Archive finished tickets' notes | none | | Done |
| U1 | Home page mockups | none | Pick a theme | Done |
| U2 | Transparent mascot | none | Approve the cost and the cut-outs | Done except: Courtney approves the cut-outs on the phone |
| U3 | New theme and home page | U1, U2 | | Todo |
| U4 | Tap the mascot | U3 | Listen to the clips | Todo |
| S1 | Media hosting at 1,000 cards | H1 | Decision | Todo |
| S2 | Content batch of 100 (run nine times) | S1 | Reviews | Todo |
| S3 | Report triage | H1 | | Todo |
| S4 | Frequency-phase phrase list | L17 | Cut and approve the list | Todo |

Once A1 and A2 are done, B1, B2, C1, C2, D1, D3 and E1 can run in parallel. F1 and G1 can start on day one. Track L comes before F2 and H1, because it changes which cards are the first 100; F1 can run beside it. L1, L2, L14 and L15 can start at once.

### Track A: foundation

**A1 Scaffold**
- Build: Next 16, React 19, Tailwind 4, TypeScript, Vitest and ESLint at the versions `wedding-admin-app` uses. Placeholder routes for the menu, `/learn`, `/practice` and `/settings`. Colour, type and radius tokens in the Tailwind theme, including the three rating colours. A `CLAUDE.md` that points agents at this doc and repeats the rules above.
- Done when: tests and a production build pass, and a Vercel preview loads.
- Notes: in [history.md](history.md#a1-scaffold).

**A2 Deck schema and fixture deck**
- Build: card types and a runtime validator matching [Card data](#card-data). A fixture deck of 12 hand-written cards covering every variety: a regular noun, a noun with unexpected gender, a regular and an irregular verb, an adjective, an adverb, three glue words (one with no English equivalent), a two-meaning pair, and a card with a Spain footnote. Placeholder image and audio files. A deck loader.
- Done when: the validator accepts the fixture and rejects malformed cards, under test.
- Why: every app ticket builds against the fixture, so none of them waits for the content pipeline.
- Notes: in [history.md](history.md#a2-deck-schema-and-fixture-deck).

### Track B: engine

Pure logic with tests. No screens.

**B1 Local store**
- Build: the four IndexedDB stores from [Data on the device](#data-on-the-device-indexeddb) using Dexie, with typed functions to append a review, read reviews, save a note, add a report and list unsynced rows.
- Done when: tests pass against an in-memory IndexedDB.
- Notes: in [history.md](history.md#b1-local-store).

**B2 Scheduler**
- Build: a wrapper around `ts-fsrs`. The rating mapping, including Easy for a first-view green. A replay function that turns forward reviews into card state, identical regardless of the order events were stored in. Predicates for seen, due and memorized, and predicted recall at a given time.
- Done when: tests cover the mapping, replay determinism, the 21-day threshold, and a red dropping a memorized card back to seen.
- Notes: in [history.md](history.md#b2-scheduler).

**B3 Queues**
- Build: the Learn queue (two rank-ordered queues, one glue word per two content words, batch size, reds returning at the end of the batch) and the Practice queue (due by rank, extra practice by recall then rank, shuffle, in order, struggling, part-of-speech filter). Pure functions over the deck, card state and reviews.
- Done when: each ordering rule in [Learn](#learn) and [Practice](#practice) has a test.
- Notes: in [history.md](history.md#b3-queues).

**B4 Progress stats and wheel**
- Build: per part of speech, the total, seen and memorized counts; slice angles with a minimum width; square-root radii. An SVG wheel component with both fill layers, labels, the centre count and a tap callback per slice.
- Done when: the maths is under test and the component renders correctly for empty, partial and complete states.
- Notes: in [history.md](history.md#b4-progress-stats-and-wheel).

### Track C: screens

Built against the fixture deck.

**C1 Card frame and front**
- Build: the Stories batch frame with its segmented bar. Front layouts for content cards and glue cards (with the highlighted target). The character slot. Tap and swipe-down reveal with overscroll disabled. The Reverse front: Spanish first, character hidden. Presentational only: props in, events out.
- Done when: every fixture card renders correctly in both directions and both gestures fire the reveal event.
- Notes: in [history.md](history.md#c1-card-frame-and-front).

**C2 Reveal panel**
- Build: everything in [Reveal](#reveal) except the note field and the report button. The grammar strip has three variants (noun, adjective, verb) and the irregular flag. Audio buttons play the card's clips. Rating buttons carry text labels. Presentational only.
- Done when: every fixture card renders correctly and a rating fires an event.
- Notes: in [history.md](history.md#c2-reveal-panel).

**C3 Notes, trick and report**
- Build: the note field saved to the local store as the user types; "suggest a trick" filling it from the card; "something's off" with an optional comment, saved to the reports store.
- Done when: a note and a report survive a page reload.
- Notes: in [history.md](history.md#c3-notes-trick-and-report).

**C4 Learn session**
- Build: a session hook that takes a queue, drives C1 and C2, and on each rating appends the review, updates card state and advances. The `/learn` route. Reds returning at the end of the batch. The batch-end screen with its summary.
- Done when: a full Learn batch on the fixture deck moves cards from unseen to seen, and the stored reviews match what was tapped.
- Notes: in [history.md](history.md#c4-learn-session).

**C5 Practice session**
- Build: the `/practice` route reusing the C4 hook. The caught-up marker and extra practice. Shuffle, in order, struggling and part of speech as URL parameters. The Reverse toggle, storing ratings with `direction = reverse`.
- Done when: each option produces the expected order, and a Reverse session leaves card state unchanged.
- Notes: in [history.md](history.md#c5-practice-session).

**C6 Menu**
- Build: the wheel with live stats, the Learn button with its remaining count, the Practice button with its due count, the Practice options, slice tap leading to Practice for that part of speech, a settings link, and a slot for the mascot.
- Done when: counts and the wheel update after a session.
- Notes: in [history.md](history.md#c6-menu).

**C7 Motion**
- Build: the four shared character moves, card-to-card transitions and the batch-end celebration. All motion respects the reduced-motion setting.
- Done when: each move plays on its trigger, and none play with reduced motion on.
- Notes: in [history.md](history.md#c7-motion).

### Track D: offline and sync

**D1 Installable app and service worker**
- Build: the manifest and icons, following `crossfit_logger`'s `app/manifest.ts`. A service worker approach that works with Next 16, with the choice recorded under [Stack](#stack). Caching of the app shell and deck JSON. An install prompt, including add-to-home-screen instructions on iPhone.
- Done when: after one online visit to a production build, the app opens and loads the deck in airplane mode.
- Notes: in [history.md](history.md#d1-installable-app-and-service-worker).

**D2 Media caching**
- Build: caching of art and audio for the next few Learn batches and for every seen card. "Download everything" in settings, with progress and total size.
- Done when: a batch plays with images and audio in airplane mode, and after "download everything" so does the whole deck.
- Notes: in [history.md](history.md#d2-media-caching).

**D3 Supabase schema**
- Build: migrations for `reviews`, `notes` and `card_reports`, each with `user_id` and owner-only row-level security. An `.env.example`.
- Done when: a script shows a second user cannot read or write the first user's rows.
- Notes: in [history.md](history.md#d3-supabase-schema).

**D4 Sign-in**
- Build: emailed one-time code in the browser client, with sign in and sign out in settings. Port from `crossfit_logger`'s `app/welcome/OnboardingFlow.tsx`: that file is over 1,100 lines, so search for `signInWithOtp` and read only that region.
- Done when: signing in works, and the session survives a reload while offline.
- Notes: in [history.md](history.md#d4-sign-in).

**D5 Sync core**
- Build: upload of unsynced reviews, notes and reports; download of rows from other devices; merge by event id followed by replay; latest edit wins for notes. Written against an interface, with a fake remote for tests.
- Done when: tests show two simulated devices with interleaved offline reviews converging on identical card state.

- Notes: in [history.md](history.md#d5-sync-core).

**D6 Sync wiring**
- Build: the Supabase implementation of the D5 interface. Triggers on sign-in, on regaining a connection, after each batch and when the app returns to the foreground. Sync status on the menu and in settings.
- Done when: ratings made offline on one real device appear on a second after both reconnect.
- Notes: in [history.md](history.md#d6-sync-wiring).

### Track E: content pipeline

Scripts only. Depends on A2 and nothing else in the app.

**E1 Word list**
- Build: choose the open subtitle-based frequency source and record its licence in [Content pipeline](#content-pipeline). A script that lemmatizes and ranks it into about 1,200 candidate words, leaving a margin for rejects.
- Done when: the list file exists and the top 50 look right on a printed spot check.
- Notes: in [history.md](history.md#e1-word-list).

**E2 Draft pass**
- Build: a script that drafts cards for a range of ranks with Claude, validates each against A2, writes one file per card and can resume after a failure. Start from the prompt and output guard in `wedding-admin-app/lib/translateText.ts`.
- Done when: a 20-word run produces valid cards and prints only counts and ids.
- Notes: in [history.md](history.md#e2-draft-pass).

**E3 Review pass and deck build**
- Build: the independent second pass, writing a readable list of flagged cards with the reason for each. A way to approve or correct a flagged card. A build step that assembles approved cards into the deck JSON with stable ids in Learn order.
- Done when: a 20-word run yields a flagged list and a deck file that passes the validator.
- Notes: in [history.md](history.md#e3-review-pass-and-deck-build).

**E4 First 100 cards**
- Do: run E2 and E3 for the first 100 cards in Learn order. A person resolves the flagged cards. Commit the deck text.
- Done when: a 100-card deck passes the validator with no cards left flagged.
- Notes: in [history.md](history.md#e4-first-100-cards).

### Track F: art

**F1 Art style and mascot design**
- Do: render the same six words in three or four candidate styles through Higgsfield. Courtney picks one. Lock the style reference and prompt template, and design the hero mascot in that style.
- Done when: the style reference, the template and the mascot design are committed and noted under [Art](#art).
- Notes: in [history.md](history.md#f1-art-style-and-mascot-design).

**F2 Art script and first stills**
- Build: a script that gives each content card a cast member by fit (rules and personalities in `content/art/style.md`), records the choice per card id in a file Courtney can edit, generates a still per content card with one character per sheet, lays out contact sheets for review, regenerates rejects and converts approved stills to WebP at the target size. Run it for the content words in the first 100.
- Done when: every content card in the first 100 has a cast member and an approved still, the concha has about half of them, and the measured average size is recorded against the 40 KB estimate.
- Note (F2, from track L, 2026-10-04): the first 100 are now the learning path's (deck version 8: 30 content, 18 form, 27 phrase and 25 glue cards), so F2 makes **36 distinct stills**, not about 67. Phrase and glue cards have no still; a form card's `image` is its verb's still, so the still of a verb whose form cards are in the deck is needed even when the infinitive card is not (see "Form cards" under [Learning path](#learning-path)). Count the stills from the distinct `image` paths of `content/deck.json`, not from content cards. The 1,000-card estimate of about 920 images is unchanged.
- Note (F2): built `npm run art` (cast, render, contact, publish, status; see "Decided in F2" under [Art](#art)). Claude cast the 36 stills: concha 18 (50%), alpaca 6, chick 6, capybara 6, turtle none. Rendered 6 sheets of six, removed the backgrounds, cut 36 takes; 9 credits spent (970.24 to 961.24), 0.25 a still. Measured average 32.6 KB a still against the 40 KB estimate.
- Note (F2): the first sheet (concha-01) was rendered alone as the six-on-a-sheet check: on-model, so the rest followed. Two of its poses named a scene (a train platform, a bakery window), which Seedream drew and the background removal half cut away; `querer-want` t1 came out cropped. The cast rules now forbid scenery, and two later poses were changed before rendering (`necesitar-need`, `tambien-also`).
- Note (F2): left for Courtney: look at `content/art/contact/contact-01.jpg` to `-03.jpg`, write `ok` or `redo` against each take in `content/art/review.tsv` (change a redo's pose or character in `content/art/cast.tsv` first if wanted), then `npm run art -- render` for the redos, `npm run art -- contact` for the new takes, and `npm run art -- publish` once every still has an ok take. Nothing is in `public/deck/img` yet, because no take is approved.
- Note (F2): Courtney reviewed the three contact sheets on 2026-10-04 and passed all 36 stills for now (`content/art/review.tsv`, every verdict `ok`). `npm run art -- publish` copied them to `public/deck/img`: 36 stills, average 32.6 KB against the 40 KB estimate. The builder's possible redos (`querer-want` cropped, stray blobs on `aqui-here` and `cafe-coffee`, three similar chick poses) stay as they are until she asks.

**F3 Hero mascot animation**
- Build: choose the animation format and record it under [Art](#art). Produce an idle loop and a celebration loop from the concha's model sheet (`content/art/cast/concha-sheet.webp`), following the hero mascot rules under [Art](#art). Place the idle loop on the menu and the celebration loop on the caught-up marker and the batch-end screen, and a still pose on the empty screens. The menu's mascot slot is 48 px, too small for an animation to read; make it bigger. Replace D1's placeholder app icons with the concha (`scripts/make-icons.mjs`).
- Done when: the mascot plays in all three places and works offline.
- Note (F3): format, sizes, models and the offline rule are in "Decided in F3" under [Art](#art). New command `npm run mascot` (`scripts/content/make-mascot.mjs`, logic in `mascot.mjs`, ffmpeg from the new devDependency `ffmpeg-static`); new component `Mascot` (`@/components/motion`, pose `idle`, `celebrate` or `still`). The concha's front view with the background removed is `content/art/cast/concha-cutout.webp`; the icons script now draws her from it with sharp.
- Note (F3): five takes, 9.8 credits in all (961.24 to 951.44): 1 for the background removal, 1.2 for each of four Seedance 1.5 Pro takes (idle t1 and t2, celebrate t1 and t2) and 4 for one Seedance 2.0 fast take (celebrate t3). In use: `idle-t1` (gentle breathing and a sway) and `celebrate-t3` (two hops, arms up, a twirl that shows her crust from behind). Celebrate t1 and t2 morphed the sugar crust into a bob mid-jump; idle t2 has a squint and a pout.
- Note (F3): the done-when check ran in a real browser: the production build in Playwright's Chromium and WebKit at phone size. After one online visit, with the network gone (Chromium offline mode; for WebKit the server stopped, since its offline mode breaks reloads under a service worker), the idle loop plays on the menu, the celebration plays on the batch end and on Practice's caught-up marker, the still shows on "Nothing to practise yet", and with reduced motion the menu shows the poster. In the tests: `components/motion/Mascot.test.tsx`, `lib/pwa/sw.test.ts` (stored on install, ranged offline), and the menu, session, practice and motion tests check which pose each slot shows. Not tried on a real iPhone; H1 should watch the loops there with low-power mode on, which can stop muted autoplay (the poster then shows).
- Note (F3): left for Courtney: open `content/art/mascot/takes.html` from disk, and either approve the two in use or change `use` in `content/art/mascot/takes.json` and run `npm run mascot`. New takes: generate with the start frame recipe in takes.json, add them to `takes` and rerun. The menu title now wraps to two lines next to the 96 px mascot on a 390 px phone.
- Note (F3): Courtney chose `idle-t2` for the menu and kept `celebrate-t3` on 2026-10-04 (`content/art/mascot/takes.json`, then `npm run mascot`: idle.mp4 77.1 KB). The menu title no longer wraps beside the 96 px mascot: Tips and Settings moved to a line under the title, which stays on one line at 390 px (measured in Chromium and WebKit: title right edge 334 px, no sideways scroll).

### Track G: audio

**G1 Voice test**
- Do: generate the same 20 tricky words with each candidate provider. Build a throwaway page that plays them unlabelled. Courtney picks. Record the provider and voice under [Audio](#audio).
- Done when: the choice is recorded.
- Notes: in [history.md](history.md#g1-voice-test).

**G2 Audio script**
- Build: a script that generates the word and sentence clips for each card, evens out loudness, encodes them small and can resume. Run it on the fixture deck. (Split from the first 100 cards' run, which is G3, so the script did not wait for E4.)
- Done when: the fixture's 24 clips exist, play in the app and are recorded against the estimate.
- Notes: in [history.md](history.md#g2-audio-script).

**G3 First 100 cards' clips**
- Do: run `npm run audio -- --check --prune` on the 100-card deck from E4. A person listens to the flagged clips and redoes any bad one with `--redo`. Commit the clips.
- Done when: all 200 clips exist, nothing flagged is left unheard, and the measured total is recorded against the estimate under [Audio](#audio).
- Notes: in [history.md](history.md#g3-first-100-cards-clips).

### Track L: learning path

The rules are under [Learning path](#learning-path). Content tickets follow the rules for every ticket: scripts print counts and ids, never card text.

**L0 Learning path spec**
- Do: interview Courtney on making the first 1,000 words learnable from zero, and write the result into this doc.
- Done when: [Learning path](#learning-path) and this track are in the doc.
- Notes: in [history.md](history.md#l0-learning-path-spec).

**L1 Unit plan**
- Do: Claude drafts `content/units.json` (15 to 20 units, each `{ id, title, goal, tip, cap, wants, payoff }`) and the list of tip ids and titles, from the expected tips and the words of ranks 1 to about 300 in `content/word-list.tsv`. Survival chunks go in the early units' `wants`. Courtney edits and approves it.
- Done when: `units.json` is committed with Courtney's approval noted here, and a test checks its shape (unique ids, every `tip` in the tip list, caps between 4 and 16).
- Notes: in [history.md](history.md#l1-unit-plan).

**L2 Deck format v2**
- Build: in `lib/deck`, kinds `form` and `phrase`, pos `phrase`, fields `unit`, `requires`, `tip`, `why`, and the deck's `units` and `tips`. Validator rules: form ids and phrase ids as in [Learning path](#learning-path); a form card has an image and verb grammar; a phrase card has neither; every `requires` id is in the deck and earlier in the file; every `unit` and `tip` names an entry of the deck. Extend the fixture with two form cards, two phrase cards, two units and a tip. Add `phrase` to the wheel's groups.
- Done when: the validator accepts the extended fixture and rejects each broken rule, under test, and the app still builds against it.
- Notes: in [history.md](history.md#l2-deck-format-v2).

**L3 Form and phrase cards in the pipeline**
- Build: draft and review modes for form cards (from a fixed list of verbs in `drafting.ts`, ids made by the script) and phrase cards (from the `payoff` lines of `units.json` and a list of survival chunks), each with its own prompt and schema, written to `content/drafts/cards/` like any card and reviewed by the same review pass with checks for the new kinds.
- Done when: a run on three form cards and three phrase cards against the fake runner writes valid cards and reviews, and `npm test` covers the id rules and the prompts' inputs.
- Notes: in [history.md](history.md#l3-form-and-phrase-cards-in-the-pipeline).

**L4 Tips in the pipeline**
- Build: `npm run tips` drafts each tip of L1's list into `content/tips/<id>.txt` (one Claude call each, same caller as the draft pass); a parser for those files; the deck build takes approved tips into the deck's `tips` and holds back any card naming an unapproved one.
- Done when: drafting, parsing and the hold-back are under test with the fake runner.
- Notes: in [history.md](history.md#l4-tips-in-the-pipeline).

**L5 Tag pass**
- Build: `npm run tag`: one Claude call per word, given `units.json`, the word's cards and the ids and prompts of every drafted card, returning `unit`, `requires` and `tip` for each card, written to `content/tags/<id>.json`. Script checks: every id exists, no card requires itself, unit and tip ids exist. Rerun resumes; `--redo` retags.
- Done when: a run against the fake runner writes tags and the checks reject bad ones, under test.
- Notes: in [history.md](history.md#l5-tag-pass).

**L6 Ordering build**
- Build: the rules under "Order is computed, not hand-written" in `deck-build.ts`: units, caps, `requires`, the frequency phase's interleave, sibling spacing, held-back cards, growth that never drops a shipped id, and `content/path.md` with its list of unmatched `wants`. Change `learnQueue` in `lib/queues` to unseen cards in deck order, and move B3's interleave tests to the build.
- Done when: each rule has a test on a small made-up deck, and rebuilding with nothing changed writes a byte-identical file.

- Notes: in [history.md](history.md#l6-ordering-build).

**L7 Known-words check and example redraft**
- Build: the check under "Example sentences use known words", run by the deck build (listing broken examples) and by the review pass (reason `known-words`); `npm run draft -- --examples --ids …` redrafting only `example`, with the allowed words in the prompt.
- Done when: the check is under test on made-up sentences (a cognate, a name, a number, a conjugated form of a known verb), and a redraft against the fake runner changes only the example.
- Notes: in [history.md](history.md#l7-known-words-check-and-example-redraft).

**L8 Audio for form cards, phrase cards and tips**
- Build: the audio script speaks a phrase card's `es` as its word clip, and makes a clip per tip example at `/deck/audio/<tip id>.<n>.<hash>.mp3`, named in the deck's `tips`. The listening page includes them.
- Done when: the fixture's new cards and tip have clips, under the existing audio tests.
- Notes: in [history.md](history.md#l8-audio-for-form-cards-phrase-cards-and-tips).

**L9 Learning path content for the first 100**
- Do: draft the form cards, the survival chunks, the payoff phrases and any `wants` the first units need that are not drafted (out of rank order); draft the tips; tag every drafted card; review; Courtney decides the flagged cards, reads every tip and reads `content/path.md`; redraft the examples the known-words check flags; build at 100 cards; make the new clips. Commit the deck text.
- Done when: `content/deck.json` is the first 100 cards in learning-path order, passing the validator, with no flagged card, unapproved tip or broken example in it.
- Notes: in [history.md](history.md#l9-learning-path-content-for-the-first-100).

**L10 Intro step and the `known` rating**
- Build: the intro screen (`components/card`), intros and delayed tests in `learnBatch` and `useSession`, "I already know this" storing `known`; `known` in the `Rating` type, the scheduler (Easy), summaries and colours; first-view green mapped to Good; a migration widening the `rating` check in Supabase (`npm run check:rls` still passing).
- Done when: a Learn batch on the fixture shows each new card's intro before its test, a "known" card leaves the batch with an Easy first rating, and replay agrees with the session.
- Notes: in [history.md](history.md#l10-intro-step-and-the-known-rating).

**L11 Tips in the app**
- Build: the tip screen in a Learn batch before the first card naming it, shown by the progress rule; the "?" on the intro and reveal opening it over the card; `/tips` listing reached tips (added to `PAGES` in `public/sw.js`) and a link from the menu.
- Done when: on the fixture a tip appears once before its first card and not again after that card is seen, and `/tips` lists it.
- Notes: in [history.md](history.md#l11-tips-in-the-app).

**L12 Units in Learn**
- Build: a batch is the earliest unit with unseen cards; the unit's name in the frame and on the menu's Learn button; the "Unit complete: now you can say…" batch end with the unit's phrase cards and audio; "New in *unit*" for a card added to a finished unit; batch size only after the starter path.
- Done when: on the fixture's two units each batch is one unit, the payoff screen lists the right phrases, and the frequency phase still cuts batches by size.
- Notes: in [history.md](history.md#l12-units-in-learn).

**L13 Form, phrase and contrast layouts**
- Build: the form card's reveal with its own form highlighted in the strip and its verb's character; the phrase card's front and reveal in the glue layout with no character; the `why` line on the intro and reveal.
- Done when: every new fixture card renders in both directions, under test.
- Notes: in [history.md](history.md#l13-form-phrase-and-contrast-layouts).

**L14 Audio by itself, mute, say it out loud**
- Build: the word clip plays when an intro or reveal opens; the mute button in `BatchFrame` and the matching settings switch, kept in `localStorage` under `learn-spanish.muted`; muting stops a playing clip; "Say it out loud" under the forward prompt of a card with a `unit`.
- Done when: under test, a reveal plays its word clip unmuted and not muted, a tapped button plays either way, and the mute state survives a reload.
- Notes: in [history.md](history.md#l14-audio-by-itself-mute-say-it-out-loud).

**L15 Reset on the device**
- Build: a `resets` store (Dexie schema version bump), a "Start over" button in settings with a confirmation, and one filter used everywhere reviews are read for state (replay, queues, wheel, Struggling, media keeping) that drops reviews at or before the latest reset.
- Done when: after a reset on the fixture the menu shows nothing seen, Learn starts at the first card, and notes are still there.
- Notes: in [history.md](history.md#l15-reset-on-the-device).

**L16 Reset sync**
- Build: a `resets` table in Supabase (migration, owner-only select and insert, a `seq` cursor like reviews) and `pushResets` and `pullResets` in `SyncRemote`, `FakeRemote` and `SupabaseRemote`; a downloaded reset triggers a replay.
- Done when: in the two-device test a reset on one device clears progress on the other after both sync, and `npm run check:rls` and `npm run check:sync` pass with the new table.
- Notes: in [history.md](history.md#l16-reset-sync).

**L17 Publish the learning path deck**
- Do: copy `content/deck.json` to `public/deck/deck.json`; Courtney presses Start over and studies unit 1 from zero on the phone; fix small problems and write a ticket for anything larger.
- Done when: unit 1 is studied from zero on the phone with intros, its tip, its form cards and its payoff screen, offline.
- Note (L17): `content/deck.json` (version 8) copied to `public/deck/deck.json` on 2026-10-04; `npm test` (693), `npm run lint` and `npm run build` pass, and the build serves `/tips`. The migrations it needs are on the server (L10, L16). Left for Courtney: deploy, press Start over in settings, and study unit 1 from zero on the phone, offline too. Anything that feels wrong in use becomes a tweak to `content/units.json`, a tip or a card, or a new ticket.

### Track M: maintenance

**M1 Archive finished tickets' notes**
- Do: this doc has grown to about 190 KB (roughly 50k tokens), against the "about 8k" its sizing table assumes, so every ticket session starts heavy. Move the "Note (…):" lines of every ticket whose Status is Done into `docs/history.md`, under the same track and ticket headings, word for word. In this doc each Done ticket keeps its Build or Do line and its Done when line, plus one line linking to its notes in history.md. Keep every "Decided in …" block (they are the agreed design), the board, open tickets' notes (F2, F3, H1, L17, S1 to S4) and the Learning path section as they are. Update the sizing table's estimate for this doc, and point CLAUDE.md and `docs/ticket-loop.md` at history.md for anyone who needs a finished ticket's notes.
- Done when: a script, run once and described in the ticket's note, shows every line removed from this doc appears in history.md; links inside both docs resolve; and this doc's size is recorded before and after.
- Note (M1): added 2026-10-04 at Courtney's request, after track L's builders started at 100k to 200k tokens of context, mostly this doc.
- Note (M1): moved the 132 note lines of the 44 Done tickets (Status Done, Done except or Done with a remark, so D6, G1 and G3 too) into [history.md](history.md); each of those tickets now has one "Notes: in history.md" line after its other lines. Kept here: open tickets' notes (F2, F3, H1, L17, S1 to S4), M1's own notes, the "Why:" line under A2, and everything outside "Tickets", which holds every "Decided in …" block and the Learning path section. Moved lines are word for word except that a link to a section of this doc now names the file (`design.md#audio` where it had `#audio`), so it still resolves from history.md.
- Note (M1): the check is `node scripts/check-history.mjs`: it lists the lines removed from this doc between the commit before M1 (`e221464`) and the move commit (`9885461`), 132, and finds each in history.md (0 missing); then it resolves every relative link and anchor in the working tree's design.md, history.md, ticket-loop.md and CLAUDE.md (none broken). With `e221464 worktree` it compares against the working tree instead, and then also lists the two lines M1 changed on purpose after the move (the sizing row and M1's board row). Size of this doc: 229,295 bytes before, 156,744 after the move, about 159 KB with these notes.
- Note (M1): CLAUDE.md and the builder brief in ticket-loop.md now point at history.md. Archiving again later is the same move: notes of Done tickets under their headings in history.md, a link line left here.

### Track U: UI upgrade

Added 2026-10-04 at Courtney's request: the app looks clunky, starting with the menu. The agreed design is under [Menu](#menu) and [The wheel](#the-wheel), "Decided in U1". After U3, the other screens get the same treatment one at a time, most used first (card front and reveal, then batch end, then settings and tips), each with its own mockup round reusing the chosen theme; write those tickets when U3 is done.

**U1 Home page mockups**
- Do: in Claude Design, one canvas with two columns, one per theme: warm paper with the one-accent wheel, clean white with the multicolour wheel. Each column has four phone frames (390 by 844): home mid-progress (¡Vamos!, about 40% seen and 15% memorized, 12 due, a unit name on Learn), home on the first visit (¡Hola!, an empty wheel with the centre dot, 0 due), the menu sheet open, and the Practice options sheet open. Real part-of-speech groups and counts from the 100-card deck; the mascot is her transparent still.
- Done when: Courtney has picked a theme and a wheel colouring, and the pick is recorded in "Decided in U1" under [Menu](#menu) and [The wheel](#the-wheel), with the theme's colour values.
- Note (U1): the canvas is the private Claude Design artifact https://claude.ai/artifact/CaYTFa2zg7yip89qnYXkCJ (rows: warm paper, then clean white; the clean white row is the one to build). Courtney picked clean white with a colour per part of speech on 2026-10-04, then asked for two changes, both on the canvas and in "Decided in U1": every petal reaches the same inner circle, and the unseen part is one grey for all petals. The labels "prep." and "conj." are shortened to fit 390 px; "determiners" just fits.

**U2 Transparent mascot**
- Do: run the two loops in use (`idle-t2`, `celebrate-t3`) through Higgsfield's Video Background Remover (`video_background_remover`), after showing Courtney the cost (`higgsfield generate cost`). Ship each loop in two formats, since no one video format with transparency plays everywhere: WebM (VP9 with alpha) for Chrome, Android and Firefox, and HEVC with alpha for Safari and iPhone, as `<source>`s the browser picks from. Posters become transparent WebP. Remove `.mascot-disc` and its use, so no screen shows a disc. Extend `npm run mascot` to do it from `content/art/mascot/takes.json`; the service worker stores the new files.
- Done when: on white and on cream, in Chromium and WebKit, the menu loop, the batch-end celebration and the caught-up marker show no halo or box, the reduced-motion poster is transparent too, and Courtney has approved the cut-outs (her sugar crust is cream, so check its edges).
- Note (U2): 2 credits (951.44 to 949.44), approved by Courtney: one Video Background Remover job per take (idle-t2 `f05c4ff8`, celebrate-t3 `84a117d9`). The cut-outs came back on black in plain MP4, hence the matting in `scripts/content/mascot.mjs` (`matteFrame`, `visibleBox`, `squareAround`, tested in `mascot.test.ts`). The rules are in "Decided in U2" under [Art](#art). `content/art/mascot/takes.html` still shows every take opaque on the paper, for picking takes; only the two in use are made transparent.
- Note (U2): checked in a real browser: the production build in Playwright's Chromium (plays `idle.webm`) and WebKit (plays `idle.mov`); each loop drawn over saffron and over white shows the background colour at its corners and edges, with no box or disc. Frames sampled every half second from both WebM loops, laid on dark grey and saffron, show no specks or fringe, and the sugar crust's edge is whole. The posters are RGBA with transparent corners. Not tried on a real iPhone: Courtney should look at the menu and a batch end there.

**U3 New theme and home page**
- Do: swap the `@theme` tokens in `app/globals.css` to the theme picked in U1, app-wide; check every screen once and fix only what breaks (card shadow, purple tints, rating colours on the new background). Build the home page as "Decided in U1" under [Menu](#menu): the petal wheel with its legend and centre dot (`components/Wheel.tsx`; the maths in `lib/progress` stays), the 180 px mascot with the state line, the menu sheet, the Practice options sheet and the Reverse tag.
- Done when: the menu matches the chosen mockup at 390 by 844 with no scrolling, the menu tests cover the sheets, the state line and the Reverse tag, and tests, lint and build pass.

**U4 Tap the mascot**
- Do: make three clips (¡Hola!, ¡Vamos!, ¡Muy bien!) with the audio script's voice; tapping the mascot on the menu plays the line shown under her (respecting the mute switch) and plays her jump.
- Done when: a tap plays the right clip once and jumps, a tap while muted only jumps, and reduced motion leaves the jump out.

### Track H: acceptance

**H1 First-slice acceptance**
- Do: replace the fixture with the real 100-card deck, art and audio. Walk every item under [First slice](#first-slice) on a real phone. Fix small problems; write a new ticket for anything larger.
- Done when: every first-slice item passes.
- Note: the deck part of the first step was done early, on 2026-10-03, at Courtney's request, so they can start learning before the art exists. `public/deck/deck.json` is now a copy of E4's 100-card deck (version 5) with G3's 200 clips; the 12-card fixture moved to `lib/deck/fixture.json`, which the tests import, and its art and clips stay in `public/deck`. Content cards name stills F2 has not made yet: a still that fails to load leaves the character slot out (`CharacterSlot` in `components/card/CardFront.tsx`), so the card shows no broken image, and the media keeping of D2 counts the missing stills as failed files and tries them again on its next run. Ratings made on the fixture's six cards that are not in the real deck (`tiempo-time`, `tiempo-weather` and four more) stay stored but no longer show. H1 still walks the first slice once F2's art is in.

### Scale-out

After H1 is signed off.

**S1 Media hosting at 1,000 cards**
- Do: using the sizes measured in F2 and G2, decide between the repo and Supabase Storage, and implement the choice.
- Done when: the decision is recorded under [Open](#open) and media loads from its final home.

**S2 Content batch of 100** (run nine times, a fresh session each)
- Do: for the next 100 cards: draft, review, resolve flagged cards, generate art and audio, review contact sheets, and publish a deck revision.
- Done when: the deck has grown by 100 validated cards with art and audio, and existing progress is untouched.

**S3 Report triage**
- Build: a script that pulls `card_reports` into a fix list, and a way to publish corrected cards as a deck revision without changing ids.
- Done when: a reported card can be corrected and the fix reaches an installed app.

**S4 Frequency-phase phrase list**
- Do: Claude drafts a ranked list of about 60 candidate phrases from subtitle phrase counts, made only of top-1,000 words and not already in a unit; Courtney cuts it to about 45 and approves it as one list; the phrases are drafted, tagged with `requires` and reviewed like any card.
- Done when: the approved list is committed and its phrases are in the drafts, placed by the ordering build.
