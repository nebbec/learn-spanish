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
- **No pass writes `why`** yet: the tag pass returns only the three tags of the ticket and `want`.

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
- **`why`** stays null: no pass writes it yet. The smallest place for it is a field of the tag pass; L9 decides.
- **`content/path.md`** is rewritten by every build whose order has no problem, also when the deck is not written. It lists every unit of the plan in order (number, title, id, "Now you can …", its cards numbered by place in the order, then "Wants no drafted card fills:"), then the frequency phase. A card not in the deck says why (not reviewed yet, waiting for your decision, decision file has a problem, tip not approved, a card it requires is not in the deck, past the deck size), and a card dropped by a cap says so. A want counts as filled when a current tag of a card not rejected names that unit and want. It has no date, so a rebuild with nothing changed rewrites the same bytes. Committed, like `content/review/flagged.md`.
- **First run, 2026-10-03**: with no tags yet, the 134 drafted cards are all frequency-phase cards. The 100 cards of version 5 stay and only their order changes: sibling spacing moves later meanings back (que, por, esperar and the others now come after the other cards, since 134 drafted cards are too few to space them 50 apart). `content/deck.json` is version 6; the app's `public/deck/deck.json` stays version 5 until L17 publishes the learning path deck.

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
- **The intro screen** shows "New card", the character (popping in, as on the front), the Spanish with its audio button, the part of speech, the English with its hint, the grammar strip and the `why` line, then "I already know this" (green, soft) and "Got it" (brand). No example: it is a test's answer side. The word clip does not play by itself yet (L14), and the tip's "?" is L11's.
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

### Hear it, say it

- The word clip plays by itself on the intro and when the reveal opens; the sentence clip is a tap away.
- **A mute button is always on the card screen**, in the batch frame's top bar. Muting stops any clip playing and stops clips playing by themselves; the audio buttons still play when tapped. One switch, the same as "Play audio by itself" in settings, kept on the device in `localStorage` (`learn-spanish.muted`). On by default (not muted).
- In the starter path the forward front says "Say it out loud" under the prompt.

### Reset

- A **Start over** button in settings, with a confirmation, for starting the learning path cleanly. Courtney starts fresh; nothing on the current deck needs keeping.
- Reviews are append-only and nobody but the service role can delete on the server, so a reset is a row of its own: `resets` (`id`, `reset_at`, `device_id`) on the device and in Supabase, with the same owner-only rules and a `seq` download cursor, synced like reviews.
- Replay, the queues, the wheel and Struggling read only reviews made after the latest reset. Notes and reports are kept.

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

## Art

- **Job**: illustrate the meaning. The character makes each card distinct and gives the Spanish word something visual to attach to. It does not encode the Spanish sound; sound-alike memory tricks live in the note.
- **Production**: one locked illustration style. Each content word gets a still image generated through Higgsfield from a shared style reference, reviewed in batches. About 920 images.
- **Motion**: the app animates every still with the same small set of moves: pop in, wiggle on reveal, jump on green, droop on red.
- **Hero mascot**: one properly animated character for the menu, the caught-up marker and batch celebrations.
- **Budget**: roughly 40 MB for the full deck at about 40 KB per image. This is an estimate to check on the first 100.

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
- **Icons** are placeholders drawn by `scripts/make-icons.mjs` (a small wheel on the brand purple) until the mascot exists.

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
| `sync_state` | Added in D5: how far this device has read the server's reviews and notes. D6 adds the account those cursors and the synced flags belong to. |

Decided in B1 (types in `lib/store/types.ts`, store in `lib/store/db.ts`):

- **Database**: one Dexie database named `learn-spanish`, schema version 1. Primary keys: `reviews.id`, `card_state.cardId`, `notes.cardId` (one note per card), `reports.id` (a UUID, added so a report has a key).
- **Times** are numbers: milliseconds since the Unix epoch.
- **`synced`** is `0` or `1`, not a boolean, because IndexedDB cannot index booleans.
- **`rating`** is `good`, `nearly` or `again`, matching the rating colour tokens, or `known`, the intro's "I already know this" (since L10; see [Intro, then test](#intro-then-test)). **`direction`** is `forward` or `reverse`; **`section`** is `learn` or `practice`.
- **Device id**: a random UUID created on first use and kept in `localStorage` under `learn-spanish.device-id`.
- **`card_state`** rows only need a `cardId`; the scheduler owns the other fields.

### Data in Supabase

Tables `reviews`, `notes` and `card_reports`, each with a `user_id` column and row-level security restricting rows to their owner. Card state is not stored on the server; any device rebuilds it by replaying review events.

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

- **Art style and mascot identity** (F1): needs visual exploration.
- **Mascot animation format** (F3).
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
| This doc, read in full | about 8k |
| Left for the work itself | 60–70k |
| Planned work per ticket (half of what's left; the rest is for debugging detours) | 30–35k |

That planned budget corresponds to roughly:

- one concern, with one check that proves it is done;
- up to about 500 lines of new code, tests included;
- up to 6 files touched and 3 existing files read;
- up to 2 sections of this doc needed.

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
| F1 | Art style and mascot design | none | Style choice | Todo |
| F2 | Art script and first stills | F1, L9 | Contact-sheet review | Todo |
| F3 | Hero mascot animation | F1, C6, C7 | | Todo |
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
| L9 | Learning path content for the first 100 | L4, L7, L8 | Read tips and `path.md`, flagged cards | Todo |
| L10 | Intro step and the `known` rating | L2 | | Done except: push the migration and run `npm run check:rls` |
| L11 | Tips in the app | L2, L10 | | Done |
| L12 | Units in Learn | L2, L10 | | Todo |
| L13 | Form, phrase and contrast layouts | L2 | | Todo |
| L14 | Audio by itself, mute, say it out loud | none | | Todo |
| L15 | Reset on the device | none | | Todo |
| L16 | Reset sync | L15 | | Todo |
| L17 | Publish the learning path deck | L9, L11, L12, L13, L14, L16 | Study unit 1 from zero | Todo |
| H1 | First-slice acceptance | all above | Phone testing | Todo |
| S1 | Media hosting at 1,000 cards | H1 | Decision | Todo |
| S2 | Content batch of 100 (run nine times) | S1 | Reviews | Todo |
| S3 | Report triage | H1 | | Todo |
| S4 | Frequency-phase phrase list | L17 | Cut and approve the list | Todo |

Once A1 and A2 are done, B1, B2, C1, C2, D1, D3 and E1 can run in parallel. F1 and G1 can start on day one. Track L comes before F2 and H1, because it changes which cards are the first 100; F1 can run beside it. L1, L2, L14 and L15 can start at once.

### Track A: foundation

**A1 Scaffold**
- Build: Next 16, React 19, Tailwind 4, TypeScript, Vitest and ESLint at the versions `wedding-admin-app` uses. Placeholder routes for the menu, `/learn`, `/practice` and `/settings`. Colour, type and radius tokens in the Tailwind theme, including the three rating colours. A `CLAUDE.md` that points agents at this doc and repeats the rules above.
- Done when: tests and a production build pass, and a Vercel preview loads.
- Note (A1): tests, lint, typecheck and the production build pass. Courtney linked the repo to a Vercel project and confirmed a preview deployment loads. `vercel.json` sets the framework to Next.js; without it the deployment built but returned 404.
- Note (A1): tokens live in the `@theme` block of `app/globals.css`. The rating colours are `good` (green), `nearly` (orange) and `again` (red), each with a `-soft` tint and an `on-` text colour. Fonts are Baloo 2 (display) and Nunito (body) through `next/font/google`, which downloads them at build time and serves them from the app, so they work offline.

**A2 Deck schema and fixture deck**
- Build: card types and a runtime validator matching [Card data](#card-data). A fixture deck of 12 hand-written cards covering every variety: a regular noun, a noun with unexpected gender, a regular and an irregular verb, an adjective, an adverb, three glue words (one with no English equivalent), a two-meaning pair, and a card with a Spain footnote. Placeholder image and audio files. A deck loader.
- Done when: the validator accepts the fixture and rejects malformed cards, under test.
- Why: every app ticket builds against the fixture, so none of them waits for the content pipeline.
- Note (A2): import from `@/lib/deck` for types, `validateCard`, `validateDeck`, `parseDeck` and `loadDeck`. Tests and screens under construction import `fixtureDeck` and `fixtureCard(id)` from `@/lib/deck/fixture`. The fixture is the file the app serves, `public/deck/deck.json`, until H1 replaces it.
- Note (A2): placeholder media is one SVG per content card and two WAV tones per card, written by `node scripts/make-fixture-media.mjs`. Real stills and clips will have other extensions; nothing should assume `.svg` or `.wav`.

### Track B: engine

Pure logic with tests. No screens.

**B1 Local store**
- Build: the four IndexedDB stores from [Data on the device](#data-on-the-device-indexeddb) using Dexie, with typed functions to append a review, read reviews, save a note, add a report and list unsynced rows.
- Done when: tests pass against an in-memory IndexedDB.
- Note (B1): import from `@/lib/store`. The app uses the shared `localStore()`; tests build their own with `new LocalStore({ indexedDB: new IDBFactory(), IDBKeyRange, deviceId })` from `fake-indexeddb`, which gives each test an empty database. Methods: `appendReview`, `getReviews({ cardId?, direction? })` (oldest first, id breaking ties), `saveNote`, `getNote`, `getNotes`, `addReport`, `getReports`, `listUnsynced`, `markSynced`, and for the scheduler's cache `getCardState`, `getAllCardStates`, `putCardState`, `replaceCardStates`.
- Note (B1): `markSynced` takes the rows `listUnsynced` returned. A note edited during the upload keeps its unsynced flag. Writing rows downloaded from another device is not here; it belongs to D5.

**B2 Scheduler**
- Build: a wrapper around `ts-fsrs`. The rating mapping, including Easy for a first-view green. A replay function that turns forward reviews into card state, identical regardless of the order events were stored in. Predicates for seen, due and memorized, and predicted recall at a given time.
- Done when: tests cover the mapping, replay determinism, the 21-day threshold, and a red dropping a memorized card back to seen.
- Note (B2): import from `@/lib/scheduler`. All functions are pure and take `now` as epoch milliseconds; none reads the clock or the store. `replayReviews(reviews)` returns a `Map<cardId, CardState>` holding seen cards only, and ignores reverse reviews, so it can be fed everything from `store.getReviews()`. `rateCard(prev, cardId, rating, timestamp)` applies one forward rating (`prev` is `undefined` on a first view) and gives the same result as replaying, so a session can update one card and call `store.putCardState` without a full replay. `isSeen`, `isDue(state, now)`, `isMemorized(state)` and `predictedRecall(state, now)` all accept `undefined` for an unseen card; recall is 0 to 1, and 0 for an unseen card.
- Note (B2): always decide memorized with `isMemorized`, not by comparing `stability` to 21, because of the relearning rule under [Memorized](#memorized). After a red a card is due again in 1 to 10 minutes, so a card failed in Learn shows up as due in Practice straight away.

**B3 Queues**
- Build: the Learn queue (two rank-ordered queues, one glue word per two content words, batch size, reds returning at the end of the batch) and the Practice queue (due by rank, extra practice by recall then rank, shuffle, in order, struggling, part-of-speech filter). Pure functions over the deck, card state and reviews.
- Done when: each ordering rule in [Learn](#learn) and [Practice](#practice) has a test.
- Note (B3): import from `@/lib/queues`. All functions are pure; `states` is the map from `replayReviews` (or one built from `store.getAllCardStates()`), and `now` is epoch milliseconds. Learn: `learnBatch(cards, states, batchSize?)` gives the next batch (`learnQueue` gives every unseen card, which D2 needs for caching ahead), and after each rating the session calls `afterLearnRating(batch, index, rating)`, which returns the batch with a red appended once, or the same array.
- Note (B3): Practice: `practiceQueue({ cards, states, now, reviews }, { mode, pos, random })` returns `{ cards, caughtUpAt }`. `mode` is `due` (the default), `shuffle`, `in-order` or `struggling`, the values C5 should use as URL parameters. `caughtUpAt` is the number of due cards, so the marker goes before `cards[caughtUpAt]`; it is null in the other modes. `reviews` is only read by `struggling` and can be everything from `store.getReviews()`. The queue is not cut into batches and is a snapshot: it is not re-sorted as ratings come in, so a session builds it once when it starts.

**B4 Progress stats and wheel**
- Build: per part of speech, the total, seen and memorized counts; slice angles with a minimum width; square-root radii. An SVG wheel component with both fill layers, labels, the centre count and a tap callback per slice.
- Done when: the maths is under test and the component renders correctly for empty, partial and complete states.
- Note (B4): import the maths from `@/lib/progress` and the component from `@/components/Wheel`. `progressStats(cards, states)` returns `{ total, seen, memorized, byPos }`, where `states` is the same map the queues take; unseen cards remaining is `total - seen`. C6 renders `<Wheel stats={stats} onSliceTap={(pos) => ...} className="w-full" />`; `pos` is the value B3's `practiceQueue` takes. Without `onSliceTap` the slices are not buttons. The wheel is an SVG with a 370 by 260 viewBox (wider than tall, to leave room for labels) and scales to its container.
- Note (B4): component tests run in jsdom, which B4 added as a dev dependency. Put `// @vitest-environment jsdom` on the first line of a `*.test.tsx` file and render with `react-dom/client` inside `act`, as `components/Wheel.test.tsx` does. Other tests stay in the default Node environment.

### Track C: screens

Built against the fixture deck.

**C1 Card frame and front**
- Build: the Stories batch frame with its segmented bar. Front layouts for content cards and glue cards (with the highlighted target). The character slot. Tap and swipe-down reveal with overscroll disabled. The Reverse front: Spanish first, character hidden. Presentational only: props in, events out.
- Done when: every fixture card renders correctly in both directions and both gestures fire the reveal event.
- Note (C1): import from `@/components/card`. `<BatchFrame total index onClose?>` wraps whatever is on screen (front, reveal or batch end) and draws the segmented bar; `total` is the batch length, so it grows by one when a red returns, and `index` equal to `total` fills every segment. It is fixed to the full screen and turns overscroll off on the root element while mounted. `<CardFront card direction? onReveal />` is one button filling the frame: a tap, Enter or Space, or a downward drag of 40 px or more calls `onReveal` once. `direction` is the store's `Direction` and defaults to `forward`. `CharacterSlot` is exported for the reveal and for C7's moves, and `splitGluePrompt(en)` returns the `{ before, target, after }` of a glue phrase.
- Note (C1): the Reverse front shows only the Spanish (`card.es`), for glue cards too, with no character and no hint, since the hint is English. So the two `el tiempo` cards look identical in Reverse; that is acceptable because Reverse ratings never change the schedule. The gestures are tested with synthetic pointer events in jsdom; the swipe on a real phone is part of H1.

**C2 Reveal panel**
- Build: everything in [Reveal](#reveal) except the note field and the report button. The grammar strip has three variants (noun, adjective, verb) and the irregular flag. Audio buttons play the card's clips. Rating buttons carry text labels. Presentational only.
- Done when: every fixture card renders correctly and a rating fires an event.
- Note (C2): import `Reveal` from `@/components/card`. `<Reveal card onRate onPlay?>{children}</Reveal>` goes inside `BatchFrame` in place of `CardFront`. `onRate(rating)` gets the store's `Rating` (`good`, `nearly` or `again`), once per press; the buttons read "Didn't have it", "Nearly" and "Got it", red on the left and green on the right, and stay pinned under the card while the details scroll. `children` are drawn at the bottom of the scrolling details, above the rating buttons: that is where C3's note field and report button go.
- Note (C2): the reveal takes no `direction`; it looks the same either way, showing the character, the Spanish, the part of speech and the English prompt (a glue phrase keeps its highlighted target). Audio plays only on a button press, through `playClip(src)`, which makes a new `Audio` element and ignores a refused playback; pass `onPlay` to replace it. The noun strip reads "la · feminine", the adjective strip "bueno / buena" and the verb strip "yo voy · tú vas · él va" with an "Irregular" chip. The Reveal's root has `data-testid="reveal"` and the buttons `rate-good`, `rate-nearly`, `rate-again`, `play-word` and `play-sentence`.

**C3 Notes, trick and report**
- Build: the note field saved to the local store as the user types; "suggest a trick" filling it from the card; "something's off" with an optional comment, saved to the reports store.
- Done when: a note and a report survive a page reload.
- Note (C3): import `CardExtras` from `@/components/card` and put it inside the reveal: `<Reveal card onRate><CardExtras card={card} /></Reveal>`. It is the one component in `components/card` that touches the store: it reads and writes `localStore()` itself, so C4 passes nothing but the card. Tests pass their own with the `store` prop. It resets itself when the card changes.
- Note (C3): the note is written to the store on every keystroke, with no save button; an emptied note is saved as empty text, so the deletion syncs. "Suggest a trick" puts `card.trick` in an empty note, adds it on a new line under an existing one, and does nothing if the note already contains it. "Something's off" opens an optional comment box with Send and Cancel; sending adds one report (a card can be reported more than once) and shows "Thanks, reported." Test ids: `note`, `suggest-trick`, `report-open`, `report-comment`, `report-send`, `report-cancel`, `report-sent`.
- Note (C3): the reload check is a test that unmounts the component, closes the store, opens a new connection to the same in-memory IndexedDB and mounts again. No route shows the reveal until C4, so it has not been tried in a real browser yet.

**C4 Learn session**
- Build: a session hook that takes a queue, drives C1 and C2, and on each rating appends the review, updates card state and advances. The `/learn` route. Reds returning at the end of the batch. The batch-end screen with its summary.
- Done when: a full Learn batch on the fixture deck moves cards from unseen to seen, and the stored reviews match what was tapped.
- Note (C4): import from `@/components/session`. `useSession({ cards, section, direction?, states, afterRating?, store?, clock? })` runs one sitting over a queue and returns `{ batch, index, card, revealed, finished, direction, ratings, states, error, reveal, rate }`. `rate(rating)` appends the review, and for a forward rating also calls `rateCard` and `putCardState`, then advances; a reverse rating is stored and leaves card state alone, which is what C5 needs. `afterRating` is how Learn brings a red back (it passes `afterLearnRating`); Practice leaves it out. The queue is read once, so start a new session by remounting with a new `key`. `session.states` is the starting map plus this session's ratings.
- Note (C4): `<SessionView session onClose? store?>{batch end}</SessionView>` draws the frame and the front or reveal (with `CardExtras`) of the card on screen, and its children once the queue is finished. `<BatchEnd title summary onAnother? anotherLabel? onMenu>{line of text}</BatchEnd>` is the batch-end screen; `summarize(session.ratings)` gives its `summary`. `LearnSession` (`cards`, `states`, `onExit`, `batchSize?`) is Learn itself, and `app/learn/LearnScreen.tsx` is the pattern for a route: load the deck and the reviews in an effect, replay, then render. C5 has to place the caught-up marker itself; `SessionView` has no slot for it.
- Note (C4): the batch-end screen has an empty `data-testid="mascot-slot"` for F3 and no motion yet (C7). Batch size is `DEFAULT_BATCH_SIZE` until settings can change it. The done-when check is `components/session/session.test.tsx`, run in jsdom against an in-memory IndexedDB. In a real browser the production build serves `/learn` and the deck, but nobody has tapped through a batch there yet; that is worth doing by hand before H1.

**C5 Practice session**
- Build: the `/practice` route reusing the C4 hook. The caught-up marker and extra practice. Shuffle, in order, struggling and part of speech as URL parameters. The Reverse toggle, storing ratings with `direction = reverse`.
- Done when: each option produces the expected order, and a Reverse session leaves card state unchanged.
- Note (C5): `PracticeSession` from `@/components/session` takes `cards`, `states`, `reviews`, `mode?`, `pos?`, `reverse?`, `onReverseChange?`, `onExit`, and for tests `batchSize?`, `store?`, `clock?`, `random?`. `app/practice/PracticeScreen.tsx` is the route: it reads the options with `useSearchParams`, so `app/practice/page.tsx` wraps it in `Suspense` and the page stays static. The session is keyed on `mode` and `pos`, so a link with a different option starts a new sitting.
- Note (C5): C6 builds its links with `practiceHref({ mode?, pos?, reverse? })` from `@/lib/queues` (`parsePracticeParams` is the other direction); the wheel's slice tap is `router.push(practiceHref({ pos }))`. If the menu has its own Reverse toggle it only needs to put `reverse` in the link. `BatchEnd` gained an optional `actions` slot, drawn above its buttons. Test ids: `caught-up` (the marker, in both places), `practice-empty`, `reverse-toggle`, and `another-batch`, `to-menu` and `summary-remaining` as in Learn. Both marker screens have an empty `mascot-slot` for F3.
- Note (C5): the done-when check is `components/session/practice.test.tsx` (options parsed from a query string, as the route does) and `lib/queues/params.test.ts`. The production build serves `/practice` with parameters, but nobody has tapped through it in a real browser yet; like Learn, that is worth doing by hand before H1.

**C6 Menu**
- Build: the wheel with live stats, the Learn button with its remaining count, the Practice button with its due count, the Practice options, slice tap leading to Practice for that part of speech, a settings link, and a slot for the mascot.
- Done when: counts and the wheel update after a session.
- Note (C6): import from `@/components/menu`. `Menu` (`cards`, `states`, `reviews`, `now`, `onNavigate`) is presentational; `MenuScreen` (`onNavigate`, and for tests `store?`, `loadCards?`, `clock?`) loads the deck and the reviews and draws it; `app/MenuRoute.tsx` gives it the router. `onNavigate(href)` is only used for a slice tap; everything else is a `next/link`. The settings link goes to the `/settings` placeholder, which D2 and D4 fill.
- Note (C6): the mascot slot is an empty `data-testid="mascot-slot"` in the header for F3. There is no sync status yet; D6 adds it to the menu. `MenuScreen` reloads on `pageshow` and when the page becomes visible, so D6 can make a finished sync show up by the same route (or by remounting). Test ids: `menu`, `menu-learn`, `menu-practice`, `menu-shuffle`, `menu-in-order`, `menu-struggling`, `menu-reverse`, `menu-settings`, and the counts `menu-unseen`, `menu-due`, `menu-seen`, `menu-memorized`, `menu-struggling-count`.
- Note (C6): the done-when check is `components/menu/menu.test.tsx`: it draws the menu, runs a Learn batch and then a Practice batch against the same in-memory store, and draws the menu again. It replaces `next/link` with a plain link, because the real one sets state outside `act` when there is no router. The production build serves `/`, but nobody has looked at the menu in a real browser yet; like Learn and Practice, that is worth doing by hand before H1.

**C7 Motion**
- Build: the four shared character moves, card-to-card transitions and the batch-end celebration. All motion respects the reduced-motion setting.
- Done when: each move plays on its trigger, and none play with reduced motion on.
- Note (C7): import from `@/components/motion`: `useMotion()` is true unless the reader asked for reduced motion (false while rendering on the server and where `matchMedia` is missing, so jsdom tests see no motion unless they stub it), `MOVE_MS` holds the length of each move, and `Confetti` is the batch-end burst. `CharacterSlot` takes `move` (`pop`, `wiggle`, `jump` or `droop`) and `Reveal` takes `move` (default `wiggle`); `SessionView` passes the jump or droop and keeps the rated card on screen until it ends. F3 puts the mascot inside `mascot-slot`: on the batch-end screen that element carries `data-move="celebrate"` and bounces, so the celebration loop can replace the bounce there.
- Note (C7): the done-when check is `components/motion/motion.test.tsx`: with `matchMedia` stubbed it runs Learn batches with motion allowed and with reduced motion on, and it reads `app/globals.css` to check that nothing animates outside the reduced-motion guard and that the lengths match `MOVE_MS`. jsdom does not run CSS animations, so how the moves look has only been checked by reading the keyframes; watch them on a phone during H1, with the system's reduce-motion setting on and off.

### Track D: offline and sync

**D1 Installable app and service worker**
- Build: the manifest and icons, following `crossfit_logger`'s `app/manifest.ts`. A service worker approach that works with Next 16, with the choice recorded under [Stack](#stack). Caching of the app shell and deck JSON. An install prompt, including add-to-home-screen instructions on iPhone.
- Done when: after one online visit to a production build, the app opens and loads the deck in airplane mode.
- Note (D1): the done-when check was run in headless Chromium against `next start`: one visit to the menu, then the server was stopped and the browser set offline. The menu reloaded with the deck's counts and its fonts, the Learn link opened a card, and `/learn`, `/practice?mode=shuffle`, `/settings` and `/` each opened cold. `lib/pwa/sw.test.ts` runs `public/sw.js` itself against a pretend server and cache and covers the same rules. A real phone in airplane mode, the iPhone home-screen install and the Android install button are part of H1.
- Note (D1): for D2: put art and audio in a cache whose name does not start `learn-spanish-shell-` (for example `learn-spanish-media`), keyed by path. The worker already answers `/deck/img/` and `/deck/audio/` requests from any cache and falls back to the network, so D2 needs no change to the fetch handler unless Safari's range requests for audio need one. Media outside those two paths would go through the pages-and-deck rule and be stored in the shell cache. The worker is only registered in production builds, so test caching with `npm run build` and `npm start`, not `npm run dev`.
- Note (D1): `components/pwa` has `RegisterServiceWorker` (in the root layout) and `InstallPrompt` (in `app/MenuRoute.tsx`, above the menu); `lib/pwa` has the device check and `serviceWorkerUrl`. The build id comes from `next.config.ts` as `NEXT_PUBLIC_BUILD_ID`: the commit hash on Vercel, the build time locally. A new route must be added to `PAGES` in `public/sw.js` to open offline before it has been visited.

**D2 Media caching**
- Build: caching of art and audio for the next few Learn batches and for every seen card. "Download everything" in settings, with progress and total size.
- Done when: a batch plays with images and audio in airplane mode, and after "download everything" so does the whole deck.
- Note (D2): the done-when check was run in headless Chromium against `next start`. After one visit to the menu the server was stopped and the browser set offline: a Learn batch showed every still and played both clips of every card. Then, from an emptied media cache, "Download everything" in settings stored all 33 files (119 KB) and the whole deck played offline again. The fixture's 12 cards fit inside the 3 batches kept ahead, so in the browser "a batch" and "the whole deck" are the same cards; which files are wanted is covered by `lib/media/media.test.ts`, the button by `components/settings/DownloadEverything.test.tsx`, and the byte ranges by `lib/pwa/sw.test.ts`. Safari's audio on a real iPhone in airplane mode is part of H1.
- Note (D2): import from `@/lib/media`: `cardMedia(card)`, `deckMedia(cards)`, `wantedMedia(cards, states)`, `storeMedia(urls, { caches, fetch, onProgress })`, `mediaStatus(urls, caches)` and `keepMediaStored()`, which reads the deck and the reviews itself and is safe to call often. D6 should call `keepMediaStored()` after a sync brings in reviews from another device, so the cards seen there get their files here. `LearnSession` gained `onBatchStart`.
- Note (D2): `/settings` is now a real page holding one section, `DownloadEverything` from `@/components/settings` (test ids `media-status`, `media-size`, `download-all`, `download-progress`, `download-bar`, `download-failed`, `download-unavailable`). D4 adds sign-in under it and D6 the sync status; batch size is in no ticket yet. The status line is read when the page opens and after a download, so it can lag while the app catches up in the background.
- Note (D2): settings cannot say how big the whole deck is before it is downloaded, because nothing records file sizes. If that matters at 1,000 cards (about 75 MB), have the deck build write the total into `deck.json` (S1).

**D3 Supabase schema**
- Build: migrations for `reviews`, `notes` and `card_reports`, each with `user_id` and owner-only row-level security. An `.env.example`.
- Done when: a script shows a second user cannot read or write the first user's rows.
- Note (D3): `npm run check:rls` is the done-when check, run against the real project: 32 of 32 pass. It creates two users with the secret key, signs each in with an emailed-code token through the publishable key (no email is sent), and shows the second user and a signed-out visitor can neither read nor add, change or delete the first user's rows. It also covers the rules D6 relies on, through the calls D6 should make: `upsert(rows, { onConflict: "user_id,id", ignoreDuplicates: true })` for reviews and reports, and `upsert(rows, { onConflict: "user_id,card_id" })` for notes. A repeated upload adds nothing, an earlier or equal-time note leaves the stored one, a later note replaces it with a higher `seq`, and a review made last week but uploaded now comes after the cursor. Deleting the users removes their rows. Supabase's advisor (`supabase db advisors --linked`) reports no issues.
- Note (D3): for D4: the Magic Link email template must include `{{ .Token }}` for the email to carry a code (Courtney sets this in the dashboard). Supabase's built-in email only reaches the organisation's members and sends a few an hour. The URL and publishable key are not yet in Vercel; D4 needs them there for Production and Preview.
- Note (D3): `supabase projects api-keys` masks the secret key unless given `--reveal`.

**D4 Sign-in**
- Build: emailed one-time code in the browser client, with sign in and sign out in settings. Port from `crossfit_logger`'s `app/welcome/OnboardingFlow.tsx`: that file is over 1,100 lines, so search for `signInWithOtp` and read only that region.
- Done when: signing in works, and the session survives a reload while offline.
- Note (D4): done except the real email. `npm run check:signin` runs against the real project, 13 of 13 pass: a throwaway user gets the 8-digit code the email would carry from the admin API (no email is sent), a wrong code is refused, the code signs in through the publishable key and works once, the stored session reads the user's own rows and survives a reload with no connection, and signing out removes it and the server stops accepting it. The user is deleted at the end. In headless Chromium against `next start` a script drove the settings page the same way: the request for a code was answered by the test (so no email went out), the real code signed in, then the server was stopped, the browser set offline and the page reloaded, and settings still showed the account. `components/settings/SignIn.test.tsx` and `lib/auth/auth.test.ts` cover the rest against `fakeAuthServer` from `@/lib/auth`, including an offline reload after the access token has expired.
- Note (D4): human step left: real emails carry a link, not the code (see [Sign-in](#sign-in)). Courtney decides whether to set up her own SMTP sender; then the Magic Link template needs `{{ .Token }}`, and the code input already takes 8 digits. If she also wants the link to work, add the app's addresses (production, previews, `http://localhost:3000/settings`) to the redirect list. Neither is a code change. The public URL and key are now set in Vercel for Production and Preview. The live auth settings were not changed; `supabase/config.toml` matches them, so do not run `supabase config push` from an older copy.
- Note (D4): the real email was checked by Courtney on 2026-10-03 on production, and the emailed 8-digit code signed in. The first email carried only a link to `localhost`; after the code went into the Confirm signup template too and the site URL was set, the next one carried the code (see [Sign-in](#sign-in)).
- Note (D4): for D6: `authClient()` from `@/lib/auth` is the client to give the Supabase `SyncRemote`, so its calls carry the session. React to sign-in with `authClient().auth.onAuthStateChange` (`SIGNED_IN`), and use `storedAccount(localStorage)` for who is signed in without waiting on the network. `SignIn` sits under `DownloadEverything` on `/settings`; test ids `signin-email`, `signin-send`, `signin-sent`, `signin-code`, `signin-verify`, `signin-resend`, `signin-change-email`, `signin-account`, `signout`, `signin-error`, `signin-unavailable`.

**D5 Sync core**
- Build: upload of unsynced reviews, notes and reports; download of rows from other devices; merge by event id followed by replay; latest edit wins for notes. Written against an interface, with a fake remote for tests.
- Done when: tests show two simulated devices with interleaved offline reviews converging on identical card state.

- Note (D5): import from `@/lib/sync`. `sync(store, remote)` runs one full sync and returns `{ uploaded: { reviews, notes, reports }, downloaded: { reviews, notes }, replayed }`; it throws when the server cannot be reached. `replayed` is true when card state was rebuilt, which is when the menu should reload and D6 should call `keepMediaStored()`. `rebuildCardStates(store)` does the replay on its own. D6 implements `SyncRemote` (`pushReviews`, `pushNotes`, `pushReports`, `pullReviews(since)`, `pullNotes(since)`); the rules each method must keep are in the comments in `lib/sync/remote.ts`. A pull returns `{ rows, cursor, more }`. Rows cross the interface as `RemoteReview`, `RemoteNote` and `RemoteReport` from `@/lib/store`: the local row without `synced`, in camelCase, times in epoch milliseconds, so the Supabase implementation maps column names and time types both ways.
- Note (D5): `FakeRemote` from `@/lib/sync` is the in-memory server the tests use: share one between two `LocalStore`s to simulate two devices. It has `offline`, `failPushAfter`, a `pageSize` option, a `calls` log, and `reviews`, `notes` and `reports` to inspect. The store gained `mergeReviews(rows, cursor?)`, `mergeNotes(rows, cursor?)` and `getSyncCursor("reviews" | "notes")`.
- Note (D5): the done-when check is `lib/sync/sync.test.ts`: two stores with separate in-memory databases rate the same cards at alternating times with no connection, including the same card at the same millisecond, then sync through one `FakeRemote`. Both end with the same reviews and the same `card_state`, equal to a replay of all the reviews, whichever device syncs first. Nothing here has run against Supabase.

**D6 Sync wiring**
- Build: the Supabase implementation of the D5 interface. Triggers on sign-in, on regaining a connection, after each batch and when the app returns to the foreground. Sync status on the menu and in settings.
- Done when: ratings made offline on one real device appear on a second after both reconnect.
- Note (D6): done except the check on two real phones, which is Courtney's (part of H1). Simulated twice against the real project, with throwaway users made and signed in through the secret key's admin API and deleted afterwards (none were left). `npm run check:sync` (4 of 4 pass) runs the app's `SyncRunner` and `SupabaseRemote` for two devices, each a `LocalStore` over its own in-memory IndexedDB and a browser client over its own storage, signed in as one user: both rate the same cards at interleaved times with no connection and write notes (B's later note on the same card), a sync while offline uploads nothing, then after reconnecting both hold the same 11 reviews, the same card state (equal to a replay of all of them) and the same notes, and the server holds 11 reviews, 2 notes and 1 report. A later rating on B reaches A on the next sync, and signing A into a second account uploads everything on A to it while the first account keeps its rows. Then in headless Chromium against `next start`, two browser contexts signed in as one user through the settings page (the code request answered by the script, so no email went out): A studied a whole Learn batch with the browser offline, its menu said "Offline. 12 changes will upload when you reconnect." and the server had nothing; on reconnecting A synced by itself, the server had 12 reviews, and B's menu showed 12 seen. No page errors besides the failed requests while offline.
- Note (D6): for later tickets: import `requestSync` from `@/lib/sync` to ask for a sync (it never throws), `appSync()` for the runner, and `SYNCED_EVENT` to reload a screen when another device's rows arrive. `LearnSession` and `PracticeSession` gained `onBatchEnd`, and `SessionView` `onFinish`. `AutoSync` sits in the root layout next to `KeepMedia`; `SyncStatusLine` is under the menu's header (passed to `Menu` as `status`) and `SyncPanel` is the "Sync" section under the account in settings. Test ids `sync-status` (with `data-phase`) and `sync-now`. Live checks are `*.live.test.ts` files, left out of `npm test` and run through their npm script, which sets `LIVE_CHECK`.
- Note (D6): supabase-js may report `SIGNED_IN` again when the app comes back into view, so returning to the app can run two syncs back to back. Each is a few small requests; not worth more code.

### Track E: content pipeline

Scripts only. Depends on A2 and nothing else in the app.

**E1 Word list**
- Build: choose the open subtitle-based frequency source and record its licence in [Content pipeline](#content-pipeline). A script that lemmatizes and ranks it into about 1,200 candidate words, leaving a margin for rejects.
- Done when: the list file exists and the top 50 look right on a printed spot check.
- Note (E1): `content/word-list.tsv` holds 1,200 words. The spot check printed the top 50: el, de, que, ser, no, un, a, estar, y, en, lo, haber, tener, por, ir, qué, hacer, me, poder, se, te, con, decir, para, mi, saber, su, querer, este, todo, pero, sí, si, bien, ver, eso, yo, tu, bueno, le, del, como, aquí, más, al, ese, solo, creer, esto, deber. These are the words that head any Spanish frequency list, with the spoken register showing (qué, sí, bien, aquí, bueno, tu and te rank higher than in written lists). Rebuilding from a fresh download gave a byte-identical file. `scripts/content/word-list.test.ts` covers each lemmatizing rule on a small made-up dictionary and checks the committed file's shape (1,200 distinct words, ranks in order, counts never rising).
- Note (E1): for E2: read the list by skipping lines that start `#` and the header row; words are lower case and in dictionary form, nouns without their article. Draft in rank order. A word may need no card (an interjection, a Spain-only word, swearing) and the margin of 200 is there for that; the `forms` column shows what a word was counted from, which helps with words like fue or hecho whose counts are shared. Spain-only alternatives belong on the `spain` field, not a card of their own. The script prints only counts and words, never card text.

**E2 Draft pass**
- Build: a script that drafts cards for a range of ranks with Claude, validates each against A2, writes one file per card and can resume after a failure. Start from the prompt and output guard in `wedding-admin-app/lib/translateText.ts`.
- Done when: a 20-word run produces valid cards and prints only counts and ids.
- Note (E2): the 20-word run (ranks 1 to 20, on the Max plan) drafted all 20 words into 36 cards, none skipped and none failed; each card passes the validator and so do all 36 together. The run printed only ranks, words, card ids and counts. The committed cards come from the second run, with `--safe-mode`. That run was killed after 30 seconds with 6 words saved, and the same command resumed and drafted the other 14. Over its 20 logged calls: input 40 tokens, output 12,895, cache read 56,095, cache write 4,453, notional API cost $0.30, about 7 seconds a call, 1.8 cards per word. The 2 calls in flight when it was killed are not in the log. The first run, before `--safe-mode`, drafted the same 20 words with no failures but cost $0.88 notional (cache write 76,437); its cards were deleted, and its 20 calls, once the first lines of the usage log, were removed from it in E3.
- Note (E2): estimate for the rest of the deck. A call is about 650 output tokens and 3,000 input tokens, almost all read from the cache: about $0.015 notional. The top 20 are function words with several meanings each (1.8 cards per word); later words should average fewer, so 100 cards is roughly 55 to 75 calls, 40,000 to 50,000 output tokens and $0.85 to $1.15 notional, and 1,000 cards roughly $9 to $12 notional and an hour at 2 calls at a time.
- Note (E2): only two cards were read by an agent (`ser-be-identity` from a one-word test run, and `se-one-impersonal`), for format; both were sound. Judging the rest is E3's job. For E3: read the cards from `content/drafts/cards/`. `content/drafts/words/` says which cards came from which word and why a word was skipped, and `--redo --from N --to N` redrafts one word. Ids are slugs Claude proposes (`no-no-answer`, `que-what` for qué), so E3 may want to check them before they become permanent in the deck.

**E3 Review pass and deck build**
- Build: the independent second pass, writing a readable list of flagged cards with the reason for each. A way to approve or correct a flagged card. A build step that assembles approved cards into the deck JSON with stable ids in Learn order.
- Done when: a 20-word run yields a flagged list and a deck file that passes the validator.
- Note (E3): the run on the Max plan reviewed all 36 cards of ranks 1 to 20 in 36 calls (`el-the` alone first as a check, then the rest by resuming), with no failures: 26 passed and 10 were flagged, 28%, well above the expected 5 to 10% (these are function words with several meanings each). Reasons, a card counted under each of its reasons: one right answer 6 (5 say the hint is not needed: `el-the`, `de-from`, `no-no-answer`, `que-who-which`, `un-a`; the draft prompt also asks for no hint unless one is needed, so these are real disagreements, if harmless ones; `a-to` wants a different hint), memory trick 2 (`un-a`, `lo-the-thing`), example sentence 1 (`estar-be-state`), Latin American usage 1 (`haber-have-auxiliary`), grammar 1 (`haber-there-is`). Every id passes the id rule and the script's own checks flagged nothing. Tokens: input 72, output 27,648, cache read 84,175, cache write 27,556; notional API cost $0.79; about 2 minutes 50 seconds, 8 seconds a call. That is about $0.022 a card, so the other 964 cards would be roughly $21 notional and 75 minutes at 2 calls at a time.
- Note (E3): `npm run deck` wrote `content/deck.json`: 26 cards (6 content, 20 glue), version 1, passing the validator, and a second build gave a byte-identical file. The 10 flagged cards wait in `content/review/decisions/` for Courtney (E4); none was approved by an agent. An agent read three flagged entries (`el-the` in full, and the reasons for `haber-there-is` and `un-a`) and no other card text. For E4: `npm run draft`, then `npm run review` with the same range, then decide each card in `content/review/flagged.md`, then `npm run deck`. Draft in rank order until the deck has about 67 content cards, so its first 100 cards are the first 100 in Learn order. Whether an unneeded hint should flag a card is Courtney's call: if not, say so in the review prompt's hint line.

**E4 First 100 cards**
- Do: run E2 and E3 for the first 100 cards in Learn order. A person resolves the flagged cards. Commit the deck text.
- Done when: a 100-card deck passes the validator with no cards left flagged.
- Note (E4): first, Courtney's rule change (2026-10-03): a hint that is right but not needed no longer flags a card; it is at most the reviewer's note. Recorded in [Content pipeline](#content-pipeline), "Decided in E3", and committed on its own. In the new run 5 cards passed with a note saying their hint was not needed, which the old rule would have flagged; 90 of the 98 new reviews carry a note of some kind (about 160 characters, half of them about the hint), so a note on its own is no signal.
- Note (E4): of E3's 10 flagged cards, Courtney decided on 2026-10-03 to approve, with the card unchanged, every card whose only reason was an unneeded hint. The agent read only the "Why it was flagged" lines and entered `decision: approve`, with a `#` line saying whose decision it is, for 3: `de-from`, `el-the` and `no-no-answer`. Left pending: `un-a` (also flagged for its trick), `a-to` (the reviewer wants a different hint) and `que-who-which`, whose reason says the hint implies quien would also be right, which is a misleading hint rather than only an unneeded one; Courtney decides that one.
- Note (E4): which ranks the first 100 need. Learn order takes two content cards then one glue card, so its first 100 cards are the first 67 content cards and the first 33 glue cards by rank. Glue reached 33 at rank 27 and content reached 67 at rank 88, so ranks 1 to 88 are needed. Drafted ranks 21 to 90 in three chunks (21 to 50, 51 to 80, 81 to 90; the last two words, verdad and volver, are past what the 100 need): 70 words, 98 cards (1.4 per word), none skipped, none failed (one call for señor broke the id rule and the retry passed). Ranks 1 to 90 now hold 134 drafted cards: 71 content and 63 glue. Because the top words are mostly function words, 30 of the 63 glue cards come after the 100th in Learn order; they cannot be left undrafted, since a word's cards are drafted and reviewed together.
- Note (E4): reviewed all 98 new cards in one run: 88 passed, 10 flagged (10%, against 28% in E3): one right answer 5, memory trick 2, example sentence 2, Latin American usage 1. None failed and the script's own checks flagged nothing. All 134 drafted cards are now reviewed: 114 passed, 20 flagged, 3 of those approved, 17 waiting.
- Note (E4): the 17 cards waiting for Courtney, each counted under every reason it has (18 reasons): one right answer 8 (`a-to`, `que-who-which`, `un-a`, `ver-watch`, `creer-think-opinion`, `algo-somewhat`, `entonces-so`, `eso-that`; each suggested fix changes the hint, and only `un-a`'s says the hint is not needed), memory trick 4 (`un-a`, `lo-the-thing`, `ahora-now`, `hombre-man`), example sentence 3 (`estar-be-state`, `gracias-thank-you`, `volver-do-again`), Latin American usage 2 (`haber-have-auxiliary`, `senor-sir`), grammar 1 (`haber-there-is`). 15 of them are in the first 100 in Learn order and 2 (`eso-that` at 110, `volver-do-again` at 106) come after it. Decide them in `content/review/decisions/`, then run `npm run deck`.
- Note (E4): `npm run deck` wrote `content/deck.json`: 117 cards, version 3, passing the validator. **Of the first 100 cards in Learn order, 85 are in the deck (82 passed review, 3 approved by Courtney) and 15 wait for Courtney.** The other 32 deck cards are cards after the 100th (29 glue, 3 content) that passed review. The deck build has no limit: it takes every passed or approved card of every drafted word, so while flagged cards wait it does include cards past the 100th, and the deck's own Learn order moves them forward to fill the gaps; its first 100 cards are not yet the first 100 in Learn order. Once all 17 are decided the deck's first 100 cards are exactly the first 100 in Learn order (a rejected card lets the next one in), and the deck holds up to 134 cards, not 100. Whether the build should stop at 100 cards is Courtney's call; nothing in the app needs it to.
- Note (E4): cost on the Max plan, all Claude Opus 5.5 through `claude -p` at effort medium, 2 at a time. Draft: 71 calls (1 failed), input 142, output 35,280, cache read 175,323, cache write 39,767 tokens, notional API cost $1.06, about 4 minutes in all. Review: 98 calls (none failed), input 196, output 59,847, cache read 247,680, cache write 72,913 tokens, notional API cost $1.83, 6 minutes 17 seconds. Together $2.89 notional for 98 cards, about $0.03 a card, in line with E2's and E3's estimates. Totals over ranks 1 to 90, with E2 and E3: draft 91 calls $1.36, review 134 calls $2.62.
- Note (E4): an agent opened no card file and no flagged-list entry; it read the reasons of E3's 10 decision files and, for the one-right-answer cards, checked by script (printing only yes or no) whether each reason mentions the hint or says it is not needed. No card was approved, rejected or corrected by an agent beyond Courtney's rule for the 3 above.
- Note (E4): Courtney resolved the 17 flagged cards on 2026-10-03, with the conversation's agent applying their decisions: all 17 approved, each with the reviewer's suggested fix, except two. For `creer-think-opinion` the suggested hint contained the answer ("creo que sí"), so the hint is "believe something is so, as in I think so (not pensar)". For `estar-be-state` the example is "Estoy en casa y muy cansado." / "I'm at home and really tired.". None was a wrong translation; six taught something wrong (`haber-there-is` gave él hay for él ha; the tricks of `ahora-now` (a crude pun and a drafting leftover), `un-a`, `hombre-man` and `lo-the-thing`; the hint of `eso-that`).
- Note (E4): the deck build now stops at the first 100 cards in Learn order (see Deck size above). `content/deck.json` is 100 cards, version 5 (rebuilt with G2's clip names), 67 content and 33 glue, ranks 1 to 88, passing the validator, and a second build gave the same file. Rebuilding at 100 dropped 32 ids an earlier E4 build had included past the 100th; none had shipped, so it was built once with `--allow-drop`. 34 drafted cards past the 100th wait for the next batch, `eso-that` and `volver-do-again` among them, approved.
- Note (E4): for S2: `ahora-now`'s draft carried a rejected first attempt and "... better:" inside its trick. The review caught it, but the draft pass should refuse such leftovers itself before the next batch.

### Track F: art

**F1 Art style and mascot design**
- Do: render the same six words in three or four candidate styles through Higgsfield. Courtney picks one. Lock the style reference and prompt template, and design the hero mascot in that style.
- Done when: the style reference, the template and the mascot design are committed and noted under [Art](#art).

**F2 Art script and first stills**
- Build: a script that generates a still per content card, lays out contact sheets for review, regenerates rejects and converts approved stills to WebP at the target size. Run it for the content words in the first 100.
- Done when: every content card in the first 100 has an approved still, and the measured average size is recorded against the 40 KB estimate.

**F3 Hero mascot animation**
- Build: choose the animation format and record it under [Art](#art). Produce an idle loop and a celebration loop. Place them on the menu, the caught-up marker and the batch-end screen.
- Done when: the mascot plays in all three places and works offline.

### Track G: audio

**G1 Voice test**
- Do: generate the same 20 tricky words with each candidate provider. Build a throwaway page that plays them unlabelled. Courtney picks. Record the provider and voice under [Audio](#audio).
- Done when: the choice is recorded.
- Note (G1): Courtney chose OpenAI (`gpt-4o-mini-tts`, voice `coral`) without running the blind test, to revisit if it sounds bad in use. The key came from `crossfit_logger`'s `.env.local`. `npm run voice-test` makes the 24 test clips and the page in `content/.cache/voice-test` (not committed); with more provider keys it becomes the blind test. The decision and the measured clip sizes are under [Audio](#audio).
- Note (G1): for G2: start from `PROVIDERS.openai` and `OPENAI_INSTRUCTIONS` in `scripts/voice-test.mjs`. A single word is spoken with its article as the reveal shows it, and a bare "y" was read correctly. The clips come as 128 kbps MP3 and need re-encoding to fit the estimate.

**G2 Audio script**
- Build: a script that generates the word and sentence clips for each card, evens out loudness, encodes them small and can resume. Run it on the fixture deck. (Split from the first 100 cards' run, which is G3, so the script did not wait for E4.)
- Done when: the fixture's 24 clips exist, play in the app and are recorded against the estimate.
- Note (G2): `npm run audio` made the fixture's 24 clips, replacing the placeholder tones, and pointed `public/deck/deck.json` at them; `--check` flagged none. The decisions and the measured sizes are under [Audio](#audio). `scripts/content/audio.test.ts` covers the loudness measure against the BS.1770 reference (a full-scale 1 kHz sine reads -3.01 LUFS), the trimming, the peak ceiling, the MP3's size and the paths. Nobody has listened to the clips yet; open a reveal in `npm run dev` and press the two audio buttons.
- Note (G2): a run is safe to repeat: a clip whose file exists is skipped, and the API's raw answers are kept in `content/.cache/audio/raw`, so a change to `ENCODING` re-encodes without calling the API. One API answer for the lone word "se" was 0.3 s of silence; the script now asks again, up to three times, and never caches a silent answer. `--prune` deletes clips the app's deck no longer names; `make-fixture-media.mjs` now writes tones only for a card whose clips are still `.wav`.
- Note (G2): E3's deck build now sets each card's `audio` to `audioPaths(card, takes)` (takes from `content/audio-takes.json`), replacing E2's `/deck/audio/<id>.word.mp3`, so a rebuilt deck names the clips the audio script makes and a card whose text has not changed keeps its clips. `content/deck.json` was rebuilt this way (version 2, only the audio paths changed). For G3: `npm run audio -- --deck content/deck.json --check` makes that deck's clips into `public/deck/audio/`; `--prune` only looks at the app's deck, `public/deck/deck.json`.

**G3 First 100 cards' clips**
- Do: run `npm run audio -- --check --prune` on the 100-card deck from E4. A person listens to the flagged clips and redoes any bad one with `--redo`. Commit the clips.
- Done when: all 200 clips exist, nothing flagged is left unheard, and the measured total is recorded against the estimate under [Audio](#audio).
- Note (G3): `npm run audio -- --deck content/deck.json --check --prune` made all 200 clips in one run: 194 made with 186 speech API calls (clips with the same text share a cached answer) and 6 already there, the word clips the fixture already had with the same text (`de-of`, `ir-go`, `bueno-good`, `ahora-now`, `hablar-speak`, `casa-house`). None failed, so nothing was rerun; 14 (4 words, 10 sentences) are left a little quieter than -18 LUFS by the peak ceiling. `content/deck.json` already named every path, so the deck did not change, and `public/deck/deck.json` was not touched. Size and playing time against the estimate are under [Audio](#audio): 1.8 MB and 5 min 16 s for the 200, about 18.1 MB per 1,000 cards against 30 to 40 MB.
- Note (G3): 33 clips to hear, all word clips, listed on `content/flagged-clips.html`. 31 flagged by the transcription check, grouped by what was heard: sound-alikes in Latin American Spanish, 6 (`haber-have-auxiliary` and `haber-there-is` as "A ver", `vez-time-occasion` as "La ves", `con-with` as "kon", `ya-already` as "Ja", `y-and` as "I"); a one-syllable word heard as another syllable or language, 16 (`que-that`, `que-who-which`, `que-than` and `que-how-exclamation` as "Che" or "K", `a-to` and `a-at-time`, `en-in`, `en-on` and `en-at` as "M" or "End", `un-a` as "Ond", `me-myself` as "Ne", `te-you` and `te-yourself`, `su-his-her` as "Sue", `ir-go` as "Ich", `ya-not-anymore` as "Gia, no"); a longer word heard differently, worth the closest listen, 9 (`tener-have` as "Terner", `hacer-make` as "Ah, sen", `pensar-think` as "Ben san", `mucho-many` and `mucho-a-lot` as "Mocho", `dar-give` as "Dan", `ver-watch` as "Der", `creer-think-opinion` as "Ker", `senor-sir` as "Ey señor"). And 2 word clips over twice the median word's length (0.72 s), which the transcriber passed: `para-in-order-to` 1.8 s and `mirar-look-at` 2.0 s. No clip was silent or too short to hold the word (the shortest, "te", plays for 0.43 s), so the agent redid none, and it listened to none.
- Note (G3): how Courtney hears them: open `content/flagged-clips.html` in a browser (in Terminal, from the project folder: `open content/flagged-clips.html`, or double-click it in Finder). Press Play on each clip, then Sounds right or Say it again. At the bottom the page gives one line to send Claude with the result and, if any clip is marked Say it again, the command that redoes them: `npm run audio -- --deck content/deck.json --check --prune --redo te-you.word,mucho-many.word` (with the marked clips' names). That asks the voice for each clip again as a new take, counted in `content/audio-takes.json` (committed, since the take is part of the file name), points `content/deck.json` at the new file, deletes the old one, checks the new take and rebuilds the page, where it shows as "said again" to be heard. A take is per card id, so redoing `ir-go.word`, whose clip the fixture shares, gives the fixture a new take too the next time its audio is made; the fixture's old file stays until then. G3 is done when every listed clip sounds right.
- Note (G3): cost: the script does not report it. about 6.4 minutes of speech came back from `gpt-4o-mini-tts` (before trimming; the cache keeps 162 of the 186 answers) and 5.3 minutes went to `gpt-4o-transcribe`; at OpenAI's published estimates of about $0.015 and $0.006 a minute that is about $0.10 and $0.03, so roughly $0.13 for the 100 cards, or about $1.30 per 1,000 cards.
- Note (G3): Courtney decided on 2026-10-03 to ship the 200 clips with the 33 flagged ones unheard: they cannot judge them well, the 12-card sample sounded right to them, and their fiancée will listen to the flagged ones later on `content/flagged-clips.html`. Until then a flagged clip may say the wrong word; a bad one is redone with `--redo` as above.

### Track L: learning path

The rules are under [Learning path](#learning-path). Content tickets follow the rules for every ticket: scripts print counts and ids, never card text.

**L0 Learning path spec**
- Do: interview Courtney on making the first 1,000 words learnable from zero, and write the result into this doc.
- Done when: [Learning path](#learning-path) and this track are in the doc.
- Note (L0): done 2026-10-03. Decisions in interview order: goal is speaking (survival and travel, conversations about themselves and the people around them); a curated starter path of 150 to 200 cards, then frequency; form cards for about ten core irregular verbs; every card counts toward progress, the denominator being the deck size; tips plus a "?" link plus contrast lines; tips worked out from progress, never rated, every one read by Courtney; about 100 phrase cards, Claude drafting and Courtney approving; intro then test; known-words examples, strict in the starter path; deck order is Learn order, plus a reset (Courtney starts fresh); a unit is a batch, with a payoff screen and no gating; audio by itself with a mute button always on screen, no speech recognition; later meanings 50 cards apart; order computed by rules from tags with `units.json` the only hand-edited input; track L before F2 and H1. No native speaker is available to read the plan; the full native-speaker review before others get access stands.

**L1 Unit plan**
- Do: Claude drafts `content/units.json` (15 to 20 units, each `{ id, title, goal, tip, cap, wants, payoff }`) and the list of tip ids and titles, from the expected tips and the words of ranks 1 to about 300 in `content/word-list.tsv`. Survival chunks go in the early units' `wants`. Courtney edits and approves it.
- Done when: `units.json` is committed with Courtney's approval noted here, and a test checks its shape (unique ids, every `tip` in the tip list, caps between 4 and 16).
- Note (L1): Claude's draft is committed: `content/units.json` (18 units, caps adding up to 200) and `content/tips.json` (14 tips). `scripts/content/units.ts` checks both (`checkUnits`, `checkTips`), and `units.test.ts` runs the checks on the committed files and on broken made-up plans. The formats are under [Learning path](#learning-path), "Decided in L1".
- Note (L1): the unit order is me and you; who I am (ser forms, tip-no-pronoun); how and where I am (estar forms, tip-two-to-be); what I want and have (querer and tener forms, tip-verb-endings); my people (family, tip-el-la); what people are like (adjectives, tip-adjective-after); asking questions (tip-questions); when I don't understand (saber forms, tip-no-before-verb); can you help me? (poder forms, usted, tip-tu-usted); out and about (hay, travel places); where I'm going (ir forms, tip-going-to); what I do (hacer forms, regular verbs, tip-regular-endings); what I like (tip-gustar); how I feel; people I love (object pronouns, tip-object-pronouns); buying things (numbers to five); making plans (venir forms); what people say (decir forms).
- Note (L1): the tips are numbered here by the order they are met, not by the list under [Tips](#tips): "tip 6" (tú and usted) is the eighth tip met and "tip 12" (regular endings) the tenth. Two tips were added to the expected twelve: `tip-going-to` (ir a plus a verb, for plans) and `tip-past`, for after the starter path.
- Note (L1): left for Courtney: read and edit `content/units.json` and `content/tips.json` (the titles and `about` lines; L4 drafts the tip bodies from them), then note the approval here and set the board to Done. Points to look at: whether my-people's feminine forms (hermana, hija, amiga, esposa) need cards of their own, `¿puedes repetir?` at rank 1,006, and object pronouns (me, te) met in chunks and payoffs before their tip in unit 15.
- Note (L1): Courtney approved `content/units.json` and `content/tips.json` unchanged on 2026-10-03. They would rather study the path in the app from zero and tailor units, tips and order afterwards than review the plan in detail on paper.

**L2 Deck format v2**
- Build: in `lib/deck`, kinds `form` and `phrase`, pos `phrase`, fields `unit`, `requires`, `tip`, `why`, and the deck's `units` and `tips`. Validator rules: form ids and phrase ids as in [Learning path](#learning-path); a form card has an image and verb grammar; a phrase card has neither; every `requires` id is in the deck and earlier in the file; every `unit` and `tip` names an entry of the deck. Extend the fixture with two form cards, two phrase cards, two units and a tip. Add `phrase` to the wheel's groups.
- Done when: the validator accepts the extended fixture and rejects each broken rule, under test, and the app still builds against it.
- Note (L2): done. The validator accepts the 16-card fixture and both real deck files, and `lib/deck/deck.test.ts` rejects each broken rule (form and phrase ids, a form card with no image, not a verb or answering another person's form, a phrase card with an image, grammar or another part of speech, a word card with a phrase part of speech or a form or phrase id, a null trick on a word card, a format 1 deck, an unknown unit or tip, `requires` naming a missing card, a later card, itself or one card twice, duplicate or malformed units and tips, a tip with one or four examples). `npm test` (510), `npm run lint`, `npm run typecheck` and `npm run build` pass. The decisions are under [Card data](#card-data), "Decided in L2".
- Note (L2): the fixture (`lib/deck/fixture.json`, version 2) is in learning-path order: unit `where-i-go` (`ir-form-yo`, `ir-form-tu`, `casa-house`, `phrase-going-home`), unit `good-things` (`bueno-good`, `ahora-now`, `phrase-thats-great`), then the other nine word cards as before. The two form cards name `tip-verb-endings` (title from `content/tips.json`, body and examples written for the fixture); `ir-form-tu` has the fixture's only `why` and a trick, `ir-form-yo` none; `phrase-going-home` requires `ir-form-yo` and `casa-house`, `phrase-thats-great` requires `bueno-good`. The form cards show `ir-go`'s still. The new cards' clips and the tip's two example clips are `.wav` tones made by `node scripts/make-fixture-media.mjs`, which now also writes tip example tones and no longer redraws a still already there; L8 makes real ones. `orphanClips` (audio `--prune`) now counts a tip example's clip as named.
- Note (L2): for later tickets. L3: `validateDraftCard` already knows the form and phrase rules; write drafts without the path fields. Until L6 changes `learnQueue`, the deck build drops form and phrase drafts without listing them anywhere (not even as beyond the size), so L3 and L5 can draft and tag them but they reach the deck only with L6. L6: the fixture's file order is the order to expect from the build; tests that read "every card Learn shows" filter to content and glue cards with a comment naming L6 (`session.test.tsx`, `media.test.ts`), to undo then. L13: `CardExtras` hides "Suggest a trick" when `trick` is null; nothing else in the app treats form or phrase cards differently yet.

**L3 Form and phrase cards in the pipeline**
- Build: draft and review modes for form cards (from a fixed list of verbs in `drafting.ts`, ids made by the script) and phrase cards (from the `payoff` lines of `units.json` and a list of survival chunks), each with its own prompt and schema, written to `content/drafts/cards/` like any card and reviewed by the same review pass with checks for the new kinds.
- Done when: a run on three form cards and three phrase cards against the fake runner writes valid cards and reviews, and `npm test` covers the id rules and the prompts' inputs.
- Note (L3): done. `scripts/content/path-cards.test.ts` drafts `ir`'s three form cards and three phrase cards (a chunk and two payoffs) with a fake runner, checks every card file against `validateDraftCard` and all drafts together, resumes with no calls, reviews all six with the fake reviewer (one phrase flagged for a word past rank 1,000), and runs the deck build and decision files over them. It also covers form and phrase ids (made, and checked by kind), clashing plan lines, both prompts' inputs and both guards. `npm test` (523), `npm run lint`, `npm run typecheck` and `npm run build` pass, and `npm run deck` rebuilds the same `content/deck.json`. The decisions are under [Content pipeline](#content-pipeline), "Decided in L3".
- Note (L3): the ticket put the verb list in `drafting.ts`. It is in the new `path-cards.ts` instead, beside it, which holds both new modes. `drafting.ts` now runs any draft task (`runDraftTasks`), and the word pass is one kind of task.
- Note (L3): nothing was drafted for real, and Claude was not called. On the current plan and drafts, `--forms` would make 31 cards from 11 calls (every source card is drafted) and `--phrases` 52 cards (15 chunks, 37 payoffs) with no id clash. For L9: run the phrases only after Courtney approves `units.json` (L1), since an edited line is drafted again. Then `npm run review -- --forms` and `-- --phrases`. For L5: `words` in each phrase file lists the phrase's words in dictionary form, which helps when tagging `requires`. Phrase files keep their place in the plan as `order`, which goes stale if units are reordered, until the phrase is drafted again; only the review's grouping uses it.

**L4 Tips in the pipeline**
- Build: `npm run tips` drafts each tip of L1's list into `content/tips/<id>.txt` (one Claude call each, same caller as the draft pass); a parser for those files; the deck build takes approved tips into the deck's `tips` and holds back any card naming an unapproved one.
- Done when: drafting, parsing and the hold-back are under test with the fake runner.
- Note (L4): done. `scripts/content/tips.test.ts` drafts three tips with a fake runner (prompts, files, usage log, resume with no calls, `--redo` replacing an approved file, a refused answer asked again and kept aside), checks the guard and the parser (a person's corrections, each problem named by line or key), ships approved tips through the deck build (valid deck, an unchanged rebuild byte-identical, a revised tip a new version) and holds back the fixture's form cards when `tip-verb-endings` is not shipped. `npm test` (535), `npm run lint`, `npm run typecheck` and `npm run build` pass, and `npm run deck` rebuilds the same `content/deck.json` (version 5, 14 tips not drafted). The decisions are under [Tips](#tips), "Decided in L4".
- Note (L4): the script is `scripts/content/draft-tips.mts`, not `tips.mts`: beside `tips.ts`, an import of `./tips` resolved to the `.mts` file in Vitest.
- Note (L4): nothing was drafted for real, and Claude was not called. For L9: run `npm run tips` (14 calls) after Courtney approves `content/tips.json` (L1), since an edited `about` or title is not drafted again by itself (`--redo` does it, replacing the file). Courtney then reads each `content/tips/<id>.txt` and sets `status: approve`.
- Note (L4): for L6: `buildDeck` takes `tips` (from `tipsForDeck`) and applies the hold-back to each deck card's `tip`, which `deckCard` still sets to null, so nothing is held back until L6 puts the tag pass's tips on the cards before the hold-back (`holdBackForTips`). A held-back card that another card `requires` must hold that card back too; L6's `requires` rule does it if the hold-back runs first. For L8: tip example clips are named `/deck/audio/<tip id>.<n>.mp3` by `deckTip` in `tips.ts`; give them hashed names there or in the build, as `audioPaths` does for cards. For L11: a shipped tip may be named by no card in the deck yet.

**L5 Tag pass**
- Build: `npm run tag`: one Claude call per word, given `units.json`, the word's cards and the ids and prompts of every drafted card, returning `unit`, `requires` and `tip` for each card, written to `content/tags/<id>.json`. Script checks: every id exists, no card requires itself, unit and tip ids exist. Rerun resumes; `--redo` retags.
- Done when: a run against the fake runner writes tags and the checks reject bad ones, under test.
- Note (L5): done. `scripts/content/tagging.test.ts` tags eight made-up drafted cards (four words, a form card, a chunk and a payoff phrase) in six calls with a fake runner, checks the prompt (the same plan, tips and card list first in every call, the group's cards without media, the phrase cards' places), the tag files and usage log, resuming with no calls, `--redo`, retagging only a redrafted card's group, a refused answer asked again and kept aside, and the guard and stored-tag checks rejecting a missing, extra or repeated card, an unknown required id, a card requiring itself or one card twice, an unknown unit or tip and a wrong want; a tag for a card no longer drafted is named and deleted. It also builds the groups and prompt from the committed drafts and plan. `npm test` (545), `npm run lint`, `npm run typecheck` and `npm run build` pass. `npm run tag -- --check` on the real drafts: 134 cards in 90 groups, none tagged. The decisions are under [Learning path](#learning-path), "Decided in L5".
- Note (L5): nothing was tagged for real, and Claude was not called. A call's request is about 21,000 characters on today's 134 drafted cards; the card list grows with the deck. For L9: tag after the form cards, phrases and missing `wants` are drafted (`npm run tag`, about 90 word calls plus 11 verb and 18 unit calls), since every new card changes the card list Claude sees but not other cards' tags; a card drafted after tagging is tagged by the next run and its group's other cards keep their tags.
- Note (L5): for L6: read the tags with `TagStore` (`read(id)`) and `checkTags`; tags are keyed by draft id, so a card whose id was corrected in its decision file needs its draft id to find its tag. `want` gives the matched wants for `path.md`'s unmatched list. `requires` may name a card that is not in the deck (waiting, rejected or past the size): rule 5 holds such a card back. No pass writes `why`; L6 or L9 needs to decide where it comes from (a field in the tag pass would be the smallest change).

**L6 Ordering build**
- Build: the rules under "Order is computed, not hand-written" in `deck-build.ts`: units, caps, `requires`, the frequency phase's interleave, sibling spacing, held-back cards, growth that never drops a shipped id, and `content/path.md` with its list of unmatched `wants`. Change `learnQueue` in `lib/queues` to unseen cards in deck order, and move B3's interleave tests to the build.
- Done when: each rule has a test on a small made-up deck, and rebuilding with nothing changed writes a byte-identical file.

- Note (L6): done. `scripts/content/path-order.test.ts` has a test per rule on small made-up decks (units in plan order with requires, kind and rank ties; caps sparing phrases and required cards, default 12; the interleave, moved from B3's Learn tests, with form and phrase cards in the content queue and a card waiting for its requires; spacing of 50, counted from the starter path, `--spacing`, ignoring form and phrase cards, and at the end when cards run out; an unknown id or unit, a cycle and a unit card requiring a later card refused), path.md's text, and the fixture computing to its own file order. `scripts/content/deck-build.test.ts` builds with tag files: tags applied, units shipped, untagged and stale tags, held back for a waiting, rejected or tip-held card, a corrected id followed through `requires`, a cycle stopping the build, growth keeping the previous cards and joining new ones from the top, and a rebuild giving the same deck file and path.md. `npm test` (566), `npm run lint`, `npm run typecheck` and `npm run build` pass; `npm run deck` twice gives the same `content/deck.json` (version 6) and `content/path.md`. The decisions are under [Learning path](#learning-path), "Decided in L6".
- Note (L6): the rules are in a new `scripts/content/path-order.ts` (`pathOrder`, `interleave`, `pathMarkdown`, `CONTENT_PER_GLUE`, `SIBLING_SPACING`) rather than in `deck-build.ts`, which applies them; `learnOrder` is gone, and `CONTENT_PER_GLUE` left `lib/queues`. `learnQueue` is unseen cards in file order. The fixture's frequency phase was reordered to the computed order (ir-go, tiempo-time, de-of, hablar-speak, se-impersonal, problema-problem, carro-car, lo-him, tiempo-weather: tiempo-weather is spaced to the end), and the app tests that walk Learn on it (session, media, queues) expect file order; the motion tests use three fixture cards in their old order. The "every card Learn shows" filters of L2 are undone.
- Note (L6): for L7: the build's order is `pathOrder(...).cards` inside `buildDeck`; the known-words check can walk it (cards before each card) and list broken examples beside the other lists. For L9: run `npm run tag` before `npm run deck`, then read `content/path.md`; a unit card requiring a later card or a cycle stops the build and names the ids. Also decide where `why` comes from. For L12: `deck.units` holds only units named by a card in the deck; a unit card dropped by its cap has `unit` null. For L17: copy `content/deck.json` to `public/deck/deck.json`.

**L7 Known-words check and example redraft**
- Build: the check under "Example sentences use known words", run by the deck build (listing broken examples) and by the review pass (reason `known-words`); `npm run draft -- --examples --ids …` redrafting only `example`, with the allowed words in the prompt.
- Done when: the check is under test on made-up sentences (a cognate, a name, a number, a conjugated form of a known verb), and a redraft against the fake runner changes only the example.
- Note (L7): done. `scripts/content/known-words.test.ts` checks made-up sentences against a made-up lemma list (a conjugated form of a known verb and a plural of a known noun, one cognate allowed in the starter path but not two and no other word, names mid-sentence and at the start, digits and number words, two other words in the frequency phase but not three, the card's own strip and feminine, the order walk where a reorder breaks an example), the review pass flagging with `known-words`, the deck build listing broken examples and naming their words in path.md without changing the deck, and the redraft with a fake runner: a refused example asked again, the card file equal to the old one but for `example`, the tag moved on, the usage log, a rerun with no call and `--redo`. `npm test` (577), `npm run lint`, `npm run typecheck` and `npm run build` pass; `npm run deck` writes the same `content/deck.json` (version 6) and lists 29 broken examples. The decisions are under [Learning path](#learning-path), "Decided in L7".
- Note (L7): the word list's sources and their download moved from `word-list.mjs` to `scripts/content/sources.mjs`, so the check can read the lemma list; `word-list.mjs` writes the same `content/word-list.tsv`. The lemma list is not committed: the first `npm run deck`, `review` or `draft -- --examples` in a fresh checkout downloads it (about 10 MB) into `content/.cache/`.
- Note (L7): for L9: tag first, then `npm run deck` lists the broken examples by id; `npm run draft -- --examples --ids <those ids>`, then `npm run review` on the redrafted cards (their reviews are stale; their tags are not), then `npm run deck` again. A redraft can only use words met before the card, so redraft after the order is settled (form cards, phrases and missing wants drafted and tagged), or a later reorder breaks it again. The review's known-words reason uses the order on disk at review time; the build's list is the one to trust after a reorder.

**L8 Audio for form cards, phrase cards and tips**
- Build: the audio script speaks a phrase card's `es` as its word clip, and makes a clip per tip example at `/deck/audio/<tip id>.<n>.<hash>.mp3`, named in the deck's `tips`. The listening page includes them.
- Done when: the fixture's new cards and tip have clips, under the existing audio tests.
- Note (L8): done. `npm run audio -- --deck lib/deck/fixture.json --check --prune` made the 10 clips (8 for the form and phrase cards, 2 for the tip's examples) with 10 speech API calls, repointed the fixture and deleted the `.wav` tones. `scripts/content/audio.test.ts` now checks that every fixture card and tip example names the path the audio script gives and that the file is in `public/` (it failed before the run), a form card's and a phrase card's word clip text, tip example paths (named by tip and number, a new path for a changed text or a redone take), and the listening page's list leaving phrase word clips out of the length check; `tips.test.ts` checks the build naming a redone tip example's new clip. `npm test` (582), `npm run lint`, `npm run typecheck` and `npm run build` pass, and `npm run deck` writes the same `content/deck.json` (version 6, no tips yet). The decisions are under [Audio](#audio), "Decided in L8".
- Note (L8): the key: this worktree has no `.env.local`, so the run read `OPENAI_API_KEY` from the `g3-first-100-clips` worktree's `.env.local` (`node --env-file=…`); no key was copied. For L9: `npm run audio -- --deck content/deck.json --check --prune` makes the new form, phrase and tip clips and rewrites `content/flagged-clips.html` with the new labels; tip clips exist only for tips in the deck, so run it after the tips are approved and `npm run deck` has shipped them. Run `--check` only on `content/deck.json`, or restore the page afterwards, since it holds G3's list still waiting to be heard.

**L9 Learning path content for the first 100**
- Do: draft the form cards, the survival chunks, the payoff phrases and any `wants` the first units need that are not drafted (out of rank order); draft the tips; tag every drafted card; review; Courtney decides the flagged cards, reads every tip and reads `content/path.md`; redraft the examples the known-words check flags; build at 100 cards; make the new clips. Commit the deck text.
- Done when: `content/deck.json` is the first 100 cards in learning-path order, passing the validator, with no flagged card, unapproved tip or broken example in it.

**L10 Intro step and the `known` rating**
- Build: the intro screen (`components/card`), intros and delayed tests in `learnBatch` and `useSession`, "I already know this" storing `known`; `known` in the `Rating` type, the scheduler (Easy), summaries and colours; first-view green mapped to Good; a migration widening the `rating` check in Supabase (`npm run check:rls` still passing).
- Done when: a Learn batch on the fixture shows each new card's intro before its test, a "known" card leaves the batch with an Easy first rating, and replay agrees with the session.
- Note (L10): done except the server step. `components/session/session.test.tsx` runs a 16-card Learn batch on the fixture and checks each card's intro comes before its test (33 steps with one red), and a batch where `casa-house` is "I already know this": it is never tested, its one review is `known`, its state is the Easy outcome (review phase, a day or more away), and the stored card states equal `replayReviews` of the stored reviews. `npm test` (615), `npm run lint`, `npm run typecheck` and `npm run build` pass. The decisions are under [Intro, then test](#intro-then-test), "Decided in L10".
- Note (L10): left for Courtney. The migration `supabase/migrations/20261003191001_known_rating.sql` is written but not pushed: pushing needs the database password, typed into `supabase link --project-ref sbouiweyksuiakajkrbt` by Courtney (this worktree is not linked and has no `.env.local`). Then `supabase db push --linked` and `npm run check:rls`, which now also checks that `known` is accepted and another value refused. Push it before this branch is deployed: until then the server refuses a `known` review.
- Note (L10): for later tickets. A session's `batch` is now `Step[]` and `Session` has `step` and `introduce(choice)`; `SessionView` takes `earlierMeaning`. Tests that drive Learn pass each intro with `intro-got-it` (helpers in the session, menu and motion tests). Many test histories that relied on a first green being Easy now use `known`. L11: the tip screen is a third step kind before the first card naming it; the "?" goes on `Intro` and `Reveal`. L12: a unit batch is the unit's unseen cards as intro steps, the same `learnBatch` cut by unit. L14: autoplay the word clip on `Intro` mount and on the reveal; `Intro` takes `onPlay` like `Reveal`.

**L11 Tips in the app**
- Build: the tip screen in a Learn batch before the first card naming it, shown by the progress rule; the "?" on the intro and reveal opening it over the card; `/tips` listing reached tips (added to `PAGES` in `public/sw.js`) and a link from the menu.
- Done when: on the fixture a tip appears once before its first card and not again after that card is seen, and `/tips` lists it.
- Note (L11): done. `lib/queues/queues.test.ts` ("Learn batch: tips") checks the fixture's `tip-verb-endings` comes once, before `ir-form-yo` and not before `ir-form-tu`, and not after either is seen; `components/session/session.test.tsx` ("tips in Learn") runs it as a step, opens the "?" on the intro and the reveal, and checks the next batch has no tip; `components/tips/tips.test.tsx` checks `/tips` is empty first and lists the tip once a card naming it is seen. Decisions are under [Tips](#tips), "Decided in L11".
- Note (L11): for later tickets. `Step` is now a union: a `tip` step carries `card` (the card it comes before) and `tip`, so `step.card` still works everywhere. `LearnSession` shows tips only when given `tips`; tests that drive Learn without them are unchanged, and `studyBatch` in the session test passes a tip with `tip-continue`. The real deck ships no tips yet (L9), so the app shows none until `npm run tips` and Courtney's approval. L12: a unit batch should keep the tip step (`learnBatch`'s `tips` argument). L13: the "?" is absolutely placed at the card's top right; keep it clear of the form card's layout. L14: the tip screen's example clips do not play by themselves; mute need not cover them, since they play only on a tap.

**L12 Units in Learn**
- Build: a batch is the earliest unit with unseen cards; the unit's name in the frame and on the menu's Learn button; the "Unit complete: now you can say…" batch end with the unit's phrase cards and audio; "New in *unit*" for a card added to a finished unit; batch size only after the starter path.
- Done when: on the fixture's two units each batch is one unit, the payoff screen lists the right phrases, and the frequency phase still cuts batches by size.

**L13 Form, phrase and contrast layouts**
- Build: the form card's reveal with its own form highlighted in the strip and its verb's character; the phrase card's front and reveal in the glue layout with no character; the `why` line on the intro and reveal.
- Done when: every new fixture card renders in both directions, under test.

**L14 Audio by itself, mute, say it out loud**
- Build: the word clip plays when an intro or reveal opens; the mute button in `BatchFrame` and the matching settings switch, kept in `localStorage` under `learn-spanish.muted`; muting stops a playing clip; "Say it out loud" under the forward prompt of a card with a `unit`.
- Done when: under test, a reveal plays its word clip unmuted and not muted, a tapped button plays either way, and the mute state survives a reload.

**L15 Reset on the device**
- Build: a `resets` store (Dexie schema version bump), a "Start over" button in settings with a confirmation, and one filter used everywhere reviews are read for state (replay, queues, wheel, Struggling, media keeping) that drops reviews at or before the latest reset.
- Done when: after a reset on the fixture the menu shows nothing seen, Learn starts at the first card, and notes are still there.

**L16 Reset sync**
- Build: a `resets` table in Supabase (migration, owner-only select and insert, a `seq` cursor like reviews) and `pushResets` and `pullResets` in `SyncRemote`, `FakeRemote` and `SupabaseRemote`; a downloaded reset triggers a replay.
- Done when: in the two-device test a reset on one device clears progress on the other after both sync, and `npm run check:rls` and `npm run check:sync` pass with the new table.

**L17 Publish the learning path deck**
- Do: copy `content/deck.json` to `public/deck/deck.json`; Courtney presses Start over and studies unit 1 from zero on the phone; fix small problems and write a ticket for anything larger.
- Done when: unit 1 is studied from zero on the phone with intros, its tip, its form cards and its payoff screen, offline.

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
