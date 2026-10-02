# Learn Spanish: design

Status: agreed design, nothing built yet. Written 2026-10-01 from a design interview. The work is broken into [tickets](#tickets) at the end.

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
- **Batch**: about 15 cards studied in one sitting, shown Stories-style.
- **Wheel**: the progress chart on the menu.

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
| `id` | Stable slug, e.g. `estar-be-state`. Progress is keyed on this; it never changes. |
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

Decided in A2 (types in `lib/deck/types.ts`, validator in `lib/deck/validate.ts`):

- **File**: `public/deck/deck.json`, shaped `{ "version": 1, "cards": [...] }`. The app fetches it from `/deck/deck.json`; media sits beside it under `/deck/img/` and `/deck/audio/`, and `image` and `audio` hold those URL paths.
- **`grammar`** by `pos`: noun `{ gender: "m" | "f", article }`; adjective `{ feminine }`, with `es` holding the masculine form; verb `{ present: { yo, tu, el }, irregular }`, bare forms without the pronoun; null for every other part of speech.
- **`example`** is `{ es, en }` and **`audio`** is `{ word, sentence }`.
- **`pos`** is one of the nine wheel groups. Two meanings of one word share a `rank`.
- **Rules the validator enforces beyond field types**: no missing or extra fields; a noun's `es` starts with its article; a glue prompt marks exactly one target in square brackets and a content prompt has none; a content card has an image and a glue card does not; ids are unique; no two cards share the same `en` plus `hint`.

## Learning engine

Spaced repetition using FSRS (the open-source `ts-fsrs` library), running entirely on the device. The user never sees intervals.

### Ratings

Shown on the reveal as three buttons. Each has a text label as well as a colour, so the rating doesn't depend on colour vision.

| Button | Meaning | FSRS rating |
|---|---|---|
| Green | Right, without help | Good (Easy on a card's very first view) |
| Orange | Nearly: wrong ending, gender or accent, or a long think | Hard |
| Red | Didn't have it | Again |

On a card's first view the rating answers "did I already know this?". Green maps to Easy there, which gives a longer first interval than Good, so words already known get out of the way without a placement test.

### Memorized

A card is memorized when its FSRS stability is 21 days or more. Stability is the interval at which predicted recall falls to 90%, so this means "90% likely to be recalled three weeks from now". A red on a memorized card lowers its stability and drops it back to seen.

Decided in B2 (scheduler in `lib/scheduler/scheduler.ts`):

- **Library settings**: `ts-fsrs` 5 with its defaults (FSRS-6 weights, 90% target recall, short-term learning steps of 1 and 10 minutes) and interval fuzz turned off. Fuzz is random, and replay has to give the same state on every device.
- **Relearning is never memorized.** A red puts a card into FSRS's relearning phase, and a card in that phase is not memorized whatever its stability. The threshold alone is not enough: when a red lands on the same day as the card's previous rating (extra practice), FSRS lowers stability only mildly, so a card with stability of roughly 80 days or more would stay at 21 or above. The card counts as memorized again once a later rating returns it to review with stability still at 21 days or more.
- **Replay order**: forward reviews sorted by timestamp, with the event id breaking ties. A review timestamped before the card's previous one (a device with a slow clock) is applied as if it happened at the same moment as the previous one.
- **Card state** holds times as epoch milliseconds and `phase` as `learning`, `review` or `relearning`. An unseen card has no row.

### Learn

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

- **Learn pattern**: two content words, then one glue word, repeated. Each batch is cut fresh from the unseen cards, so the pattern restarts at every batch, and a default batch of 15 holds 10 content words and 5 glue words. If the content queue runs out first, the remaining glue words follow.
- **Equal ranks**: two meanings of one word share a rank and keep their deck-file order, in every queue.
- **A red returns once.** A red on the card's second showing in a Learn batch does not bring it back a third time.
- **Part of speech combines with every option**, not only the default. With no other option it gives that slice's due cards, the caught-up marker, then that slice's extra practice.
- **Shuffle, In order and Struggling have no caught-up marker**, and Struggling is in rank order.
- **Reverse does not change the queue.** It changes how a card is shown and how the rating is stored.

### Reverse

Spanish is shown first and the character stays hidden until the reveal, since it would give the answer away. Ratings are stored with `direction = reverse` and are excluded from scheduling and from the wheel.

## Screens

### Menu

- The wheel, with a headline count in the centre (memorized out of 1,000).
- **Learn** button, showing how many unseen cards remain.
- **Practice** button, showing how many cards are due.
- The Practice options listed above.
- The hero mascot.
- Sync status and settings.

### Card front

- Segmented bar across the top, one segment per card in the batch.
- English prompt and hint, or the phrase with its highlighted word for glue cards.
- The character (content words, forward direction only).
- Tap or swipe down to reveal.

Swipe-down also triggers pull-to-refresh in phone browsers. The card screen disables overscroll, and the gesture is only dependable once the app is installed to the home screen. Tap always works.

### Reveal

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

### Settings

Sign in, sync status, "download everything for offline", batch size.

## The wheel

A radial chart with one slice per part of speech.

- **Slice width** is proportional to that part of speech's share of the 1,000 cards. Small groups get a minimum width so they stay tappable and can carry a label.
- **Fill** grows from the centre outwards in two layers: a light tint for seen cards and a solid colour for memorized cards. Memorized cards are a subset of seen cards, so the solid layer always sits inside the tint.
- **Fill radius** is the square root of the fraction, times the full radius, so the filled area matches the true fraction.
- A complete solid disc means the whole deck is memorized.
- Tapping a slice starts Practice for that part of speech.

The part-of-speech groups are provisional until the deck exists: noun, verb, adjective, adverb, pronoun, preposition, conjunction, determiner, other.

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
- Audio plays on button press only.

## Offline and sync

The device is the source of truth while studying. Supabase is the backup and the way a second device catches up.

### Installable app

- Web manifest plus a service worker that caches the app shell and the deck JSON.
- Art and audio are cached a few batches ahead of the Learn position, plus everything already seen. "Download everything" caches the lot.
- On iPhone, installing to the home screen is effectively required. Safari deletes a site's script-writable storage (IndexedDB, service worker cache) after seven days of Safari use without a visit to the site; web apps added to the home screen keep their own counter and are not expected to have data deleted ([WebKit, March 2020](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)). The app should prompt for installation early.

### Data on the device (IndexedDB)

| Store | Contents |
|---|---|
| `reviews` | Append-only rating events: id (UUID), card id, direction, rating, timestamp, section, device id, synced flag. |
| `card_state` | FSRS state per card. A cache derived by replaying forward `reviews` in time order. |
| `notes` | Card id, text, updated-at, synced flag. |
| `reports` | Card id, optional comment, created-at, synced flag. |

Decided in B1 (types in `lib/store/types.ts`, store in `lib/store/db.ts`):

- **Database**: one Dexie database named `learn-spanish`, schema version 1. Primary keys: `reviews.id`, `card_state.cardId`, `notes.cardId` (one note per card), `reports.id` (a UUID, added so a report has a key).
- **Times** are numbers: milliseconds since the Unix epoch.
- **`synced`** is `0` or `1`, not a boolean, because IndexedDB cannot index booleans.
- **`rating`** is `good`, `nearly` or `again`, matching the rating colour tokens. **`direction`** is `forward` or `reverse`; **`section`** is `learn` or `practice`.
- **Device id**: a random UUID created on first use and kept in `localStorage` under `learn-spanish.device-id`.
- **`card_state`** rows only need a `cardId`; the scheduler owns the other fields.

### Data in Supabase

Tables `reviews`, `notes` and `card_reports`, each with a `user_id` column and row-level security restricting rows to their owner. Card state is not stored on the server; any device rebuilds it by replaying review events.

### Sync rules

- Unsynced rows upload whenever a connection is available; rows from other devices download.
- Reviews merge by union on event id, then card state is replayed. Two devices can never conflict.
- Notes: the latest edit wins.
- The app is fully usable before signing in. Signing in uploads everything recorded so far.

### Sign-in

Emailed one-time code, as in `crossfit_logger` (`signInWithOtp` / `verifyOtp` in `app/welcome/OnboardingFlow.tsx`). Authentication happens in the browser client; no page needs a server-side session.

## Content pipeline

A script run at build time, not part of the app.

1. **Word list**: an open, subtitle-based frequency list (spoken register), lemmatized and ranked. The licence must be re-checked before anyone other than Courtney gets access.
2. **Draft pass**: Claude splits words into meanings and writes the prompt, hint, part of speech, grammar fields, example sentence, Spain alternative and memory trick. Glue words get phrase prompts.
3. **Review pass**: a second, independent pass sees each card cold and checks it: translating back from the Spanish, and checking gender, register, Latin American usage and that the sentence sounds natural. Any disagreement flags the card.
4. **Human review**: flagged cards only (expected 5 to 10%), ideally by a Spanish speaker.
5. **Art and audio** generation for the approved cards.
6. **In-app reports**: "Something's off" writes to `card_reports`, which feeds the next deck revision.

A full native-speaker review of all cards happens before the app is opened to anyone else.

## Stack

Same as the existing apps: Next 16, React 19, Tailwind 4, Supabase, deployed on Vercel.

Additions:

- `ts-fsrs` for scheduling.
- An IndexedDB wrapper (Dexie).
- A service worker. The library is not chosen yet; it needs checking against Next 16's build.

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
- **Speech provider** (G1): decided by the listening test.
- **Service worker library** (D1): to check against Next 16.
- **Word list source and lemmatizing method** (E1).
- **Where media lives at 1,000 cards** (S1): static files in the repo are fine for the first slice (about 8 MB). At an estimated 75 MB, decide between the repo and Supabase Storage before producing the rest.

## Deferred

Considered and left out of the first version:

- A pack of common irregular verb forms (es, hay, fue, tengo) as their own cards.
- Spain as a switchable variant with its own audio.
- A placement test and intro cards for true beginners.
- Swipe-to-rate gestures.
- A typed-answer mode.
- Generating a fresh memory trick on demand.
- Separate scheduling for Reverse.

## Tickets

The first slice is 29 tickets. Scale-out to 1,000 cards is 3 more, one of which is a template run nine times. Each ticket is meant for one fresh agent session that finishes without exceeding a 100k-token context window.

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
| C1 | Card frame and front | A2 | | Todo |
| C2 | Reveal panel | A2 | | Todo |
| C3 | Notes, trick and report | B1, C2 | | Todo |
| C4 | Learn session | B1, B3, C1, C2 | | Todo |
| C5 | Practice session | C4 | | Todo |
| C6 | Menu | B4, C5 | | Todo |
| C7 | Motion | C4 | | Todo |
| D1 | Installable app and service worker | A2 | | Todo |
| D2 | Media caching | D1, B3 | | Todo |
| D3 | Supabase schema | A1 | Project and keys | Todo |
| D4 | Sign-in | D3 | | Todo |
| D5 | Sync core | B1, B2 | | Todo |
| D6 | Sync wiring | D4, D5 | Two-device check | Todo |
| E1 | Word list | A2 | | Todo |
| E2 | Draft pass | E1 | API key | Todo |
| E3 | Review pass and deck build | E2 | | Todo |
| E4 | First 100 cards | E3 | Flagged-card review | Todo |
| F1 | Art style and mascot design | none | Style choice | Todo |
| F2 | Art script and first stills | F1, E4 | Contact-sheet review | Todo |
| F3 | Hero mascot animation | F1, C6, C7 | | Todo |
| G1 | Voice test | none | Listening test, API keys | Todo |
| G2 | Audio script and first clips | G1, E4 | | Todo |
| H1 | First-slice acceptance | all above | Phone testing | Todo |
| S1 | Media hosting at 1,000 cards | H1 | Decision | Todo |
| S2 | Content batch of 100 (run nine times) | S1 | Reviews | Todo |
| S3 | Report triage | H1 | | Todo |

Once A1 and A2 are done, B1, B2, C1, C2, D1, D3 and E1 can run in parallel. F1 and G1 can start on day one.

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

**C2 Reveal panel**
- Build: everything in [Reveal](#reveal) except the note field and the report button. The grammar strip has three variants (noun, adjective, verb) and the irregular flag. Audio buttons play the card's clips. Rating buttons carry text labels. Presentational only.
- Done when: every fixture card renders correctly and a rating fires an event.

**C3 Notes, trick and report**
- Build: the note field saved to the local store as the user types; "suggest a trick" filling it from the card; "something's off" with an optional comment, saved to the reports store.
- Done when: a note and a report survive a page reload.

**C4 Learn session**
- Build: a session hook that takes a queue, drives C1 and C2, and on each rating appends the review, updates card state and advances. The `/learn` route. Reds returning at the end of the batch. The batch-end screen with its summary.
- Done when: a full Learn batch on the fixture deck moves cards from unseen to seen, and the stored reviews match what was tapped.

**C5 Practice session**
- Build: the `/practice` route reusing the C4 hook. The caught-up marker and extra practice. Shuffle, in order, struggling and part of speech as URL parameters. The Reverse toggle, storing ratings with `direction = reverse`.
- Done when: each option produces the expected order, and a Reverse session leaves card state unchanged.

**C6 Menu**
- Build: the wheel with live stats, the Learn button with its remaining count, the Practice button with its due count, the Practice options, slice tap leading to Practice for that part of speech, a settings link, and a slot for the mascot.
- Done when: counts and the wheel update after a session.

**C7 Motion**
- Build: the four shared character moves, card-to-card transitions and the batch-end celebration. All motion respects the reduced-motion setting.
- Done when: each move plays on its trigger, and none play with reduced motion on.

### Track D: offline and sync

**D1 Installable app and service worker**
- Build: the manifest and icons, following `crossfit_logger`'s `app/manifest.ts`. A service worker approach that works with Next 16, with the choice recorded under [Stack](#stack). Caching of the app shell and deck JSON. An install prompt, including add-to-home-screen instructions on iPhone.
- Done when: after one online visit to a production build, the app opens and loads the deck in airplane mode.

**D2 Media caching**
- Build: caching of art and audio for the next few Learn batches and for every seen card. "Download everything" in settings, with progress and total size.
- Done when: a batch plays with images and audio in airplane mode, and after "download everything" so does the whole deck.

**D3 Supabase schema**
- Build: migrations for `reviews`, `notes` and `card_reports`, each with `user_id` and owner-only row-level security. An `.env.example`.
- Done when: a script shows a second user cannot read or write the first user's rows.

**D4 Sign-in**
- Build: emailed one-time code in the browser client, with sign in and sign out in settings. Port from `crossfit_logger`'s `app/welcome/OnboardingFlow.tsx`: that file is over 1,100 lines, so search for `signInWithOtp` and read only that region.
- Done when: signing in works, and the session survives a reload while offline.

**D5 Sync core**
- Build: upload of unsynced reviews, notes and reports; download of rows from other devices; merge by event id followed by replay; latest edit wins for notes. Written against an interface, with a fake remote for tests.
- Done when: tests show two simulated devices with interleaved offline reviews converging on identical card state.

**D6 Sync wiring**
- Build: the Supabase implementation of the D5 interface. Triggers on sign-in, on regaining a connection, after each batch and when the app returns to the foreground. Sync status on the menu and in settings.
- Done when: ratings made offline on one real device appear on a second after both reconnect.

### Track E: content pipeline

Scripts only. Depends on A2 and nothing else in the app.

**E1 Word list**
- Build: choose the open subtitle-based frequency source and record its licence in [Content pipeline](#content-pipeline). A script that lemmatizes and ranks it into about 1,200 candidate words, leaving a margin for rejects.
- Done when: the list file exists and the top 50 look right on a printed spot check.

**E2 Draft pass**
- Build: a script that drafts cards for a range of ranks with Claude, validates each against A2, writes one file per card and can resume after a failure. Start from the prompt and output guard in `wedding-admin-app/lib/translateText.ts`.
- Done when: a 20-word run produces valid cards and prints only counts and ids.

**E3 Review pass and deck build**
- Build: the independent second pass, writing a readable list of flagged cards with the reason for each. A way to approve or correct a flagged card. A build step that assembles approved cards into the deck JSON with stable ids in Learn order.
- Done when: a 20-word run yields a flagged list and a deck file that passes the validator.

**E4 First 100 cards**
- Do: run E2 and E3 for the first 100 cards in Learn order. A person resolves the flagged cards. Commit the deck text.
- Done when: a 100-card deck passes the validator with no cards left flagged.

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

**G2 Audio script and first clips**
- Build: a script that generates the word and sentence clips for each card, evens out loudness, encodes them small and can resume. Run it for the first 100 cards.
- Done when: all 200 clips exist and the measured total is recorded against the estimate.

### Track H: acceptance

**H1 First-slice acceptance**
- Do: replace the fixture with the real 100-card deck, art and audio. Walk every item under [First slice](#first-slice) on a real phone. Fix small problems; write a new ticket for anything larger.
- Done when: every first-slice item passes.

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
