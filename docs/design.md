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

Decided in C5 (session in `components/session/PracticeSession.tsx`, URL parameters in `lib/queues/params.ts`):

- **URL**: `/practice?mode=shuffle&pos=verb&reverse=1`. `mode` is `shuffle`, `in-order` or `struggling`; `pos` is a part of speech; `reverse=1` turns Reverse on. Each is optional, and a missing or unknown value gives the default (due cards, every part of speech, forward).
- **Practice runs in batches too.** The queue is built once when the screen opens and cut into batches of the batch size, each ending on the batch-end screen with a count of the cards left.
- **The caught-up marker is a screen, not a point in a scroll.** Due cards and extra practice never share a batch. The batch-end screen after the last due card is the marker ("You're all caught up!") and its button reads "Extra practice". With nothing due, Practice opens on the marker.
- **The Reverse toggle sits on the marker and on every batch-end screen**, and takes effect from the next batch. It updates the URL without restarting the sitting. A sitting can also start in Reverse from the link.
- **In Reverse the due cards stay due**, since the ratings do not reach the schedule; the marker still follows the last of them.
- **An empty queue** shows "Nothing to practise yet" (or "No struggling cards") and a way back to the menu, not the marker.

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
- **`rating`** is `good`, `nearly` or `again`, matching the rating colour tokens. **`direction`** is `forward` or `reverse`; **`section`** is `learn` or `practice`.
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
- **Files**: one review per card at `content/review/cards/<id>.json` with the findings (reason, problem, fix), the back-translation, model, effort, path and time, and `draft`, the first 16 hex characters of the SHA-256 of the drafted card's JSON. A review counts only for the draft it saw: rerunning `npm run review` reviews just the cards with no review of their current draft (so it resumes), a card redrafted with `--redo` stays out of the deck until it is reviewed again, and `--redo` on the review reviews the range again. Each call's usage goes to `content/review/usage.jsonl`, with E2's fields plus the card id. Reviews, decision files, the flagged list and the usage log are committed.
- **The flagged list** is `content/review/flagged.md`, rewritten by `npm run review` and `npm run deck`: every card waiting for a decision in full (prompt, hint, answer, kind, grammar, example, Spain, trick), why it was flagged with the reviewer's suggested fix, and the reviewer's own translation; decided cards a line each. It is for Courtney and holds card text; no script prints it.
- **Approve or correct: a plain text file per flagged card**, `content/review/decisions/<id>.txt`, made by the review run. It holds the reasons as `#` notes, a line `decision: pending`, the card as `field: value` lines (the grammar lines its part of speech uses: `gender` and `article`, `feminine`, or `yo`, `tu`, `el` and `irregular` as yes or no) and the draft's fingerprint. Courtney changes `pending` to `approve`, after correcting any line, or to `reject`, then runs `npm run deck`. An empty `hint` or `spain` means none. Chosen over a prompt in the terminal or a web page because any editor opens it, no script has to print card text, and git keeps each decision. The correction lives only in the decision file (the draft card stays as Claude wrote it) and is applied by the build. A corrected card is not reviewed again: the person's decision stands. The `id` line may be corrected too, since an id is not permanent until it is in the deck. When a flagged card is redrafted and reviewed again, its decision file is remade as pending and the run names the id.
- **The deck file is `content/deck.json`**, in the app's format (`{ "version", "cards" }`). The app keeps shipping the fixture deck in `public/deck/deck.json` until H1 replaces it with the real deck and its art and audio. The deck holds every card that passed the review of its current draft, plus every flagged card approved in its decision file, with the corrections. The build lists by id what it leaves out: cards waiting for a decision, rejected, not yet reviewed, and approved cards whose decision file has a problem (named by line number or field). It writes nothing if the deck validator fails.
- **Learn order**: the cards are written in the order Learn shows a new learner, from `learnQueue` in `lib/queues` (glue and content cards by rank, two content cards then one glue card); meanings of one word keep their draft order. Cards of later words join the end of their queue, so once the deck has enough content cards to interleave with the glue cards (about 67 content and 33 glue for 100 cards), its first 100 cards are the first 100 in Learn order and stay so as later words are added.
- **Version**: 1 on the first build, and one more whenever the cards differ from the previous `content/deck.json`. A rebuild with nothing changed writes a byte-identical file.
- **The id rule**: the word from the list without accents, a hyphen, then one to three lower-case English words naming the meaning, a to z and 0 to 9 joined by single hyphens (`estar-be-state`; `que-what` for qué). If another word already held the id when it was drafted, the draft pass appended this word's rank (`que-what-16`). The review pass checks it for every card and the build for every corrected one; the validator checks that ids are unique. **Once in `content/deck.json` an id is permanent**: the build takes ids from the draft files and never makes them up, a correction changes a card's text but not its id, and the build refuses to write a deck that lacks an id the previous build had. `--allow-drop` lets it, and only until the deck ships in H1. Redrafting with `--redo` a word whose cards are in the deck can propose new ids, which the build then refuses; correcting a card already in the deck is S3's job.
- **Media**: the deck keeps E2's media paths made from the id (`/deck/img/<id>.webp` for content cards, `/deck/audio/<id>.word.mp3` and `.sentence.mp3`). The validator checks that a content card has an image path and every card two audio paths, not that the files exist, so new cards pass without art or audio. The build prints how many of the files are missing under `public/`. F2 and G2 make the files at these paths, or change the extensions in `withMedia` and rebuild.
- **The draft usage log holds the kept run only**: E3 removed the 20 rows of E2's discarded first run from `content/drafts/usage.jsonl`, so totalling it gives the 20 calls behind the committed cards ($0.30 notional).

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
- **Service worker library** (D1): settled, none. See [Stack](#stack).
- **Word list source and lemmatizing method** (E1): settled, OpenSubtitles through FrequencyWords, lemmatized with lemmatization-lists and a Hunspell dictionary. See [Content pipeline](#content-pipeline).
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
