# Learn Spanish

An installable, offline-first web app that teaches the 1,000 most common Spanish words. Next 16, React 19, Tailwind 4, TypeScript, Vitest, ESLint.

**Read [docs/design.md](docs/design.md) first.** It is the agreed design: terms, data model, learning engine, screens, and the ticket board. Use its terms (card, deck, forward, seen, due, memorized, batch, wheel) exactly as defined there. To run tickets unattended, see [docs/ticket-loop.md](docs/ticket-loop.md).

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm test` | Vitest, single run |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Production build |

A ticket is not done until `npm test`, `npm run lint` and `npm run build` all pass.

## Layout

- `app/`: routes. `/` is the menu; `/learn`, `/practice`, `/settings`, `/tips`.
- `app/globals.css`: design tokens in the Tailwind `@theme` block (colours, type, radius). Use the token utilities (`bg-good`, `bg-nearly`, `bg-again`, `text-ink`, `rounded-card`, `font-display`), not raw hex values.
- `components/`: React components. Component tests sit next to them as `*.test.tsx` and start with `// @vitest-environment jsdom`. They never wait a fixed time: use `until` from `components/testing.ts` to wait for the thing the test reads or clicks next, or `watchStore` when a store call leaves no mark on screen.
- `components/card/`: the batch frame with its segmented bar, the intro that shows a new card before its first test (Got it, I already know this), the front of a card in both directions, the reveal with its rating buttons, and the tip screen with the "?" that opens a tip over an intro or reveal (`Tip.tsx`). Presentational: props in, events out. The exception is `CardExtras` (note field, trick, report), which reads and writes the local store; the intro and reveal also read the mute switch to play the word by themselves, and the frame draws the mute button.
- `components/audio/`: playing clips (`playClip`, one at a time), the mute switch kept in `localStorage` (`learn-spanish.muted`, `useMuted`, `setMuted`), `useAutoplay` for the word clip on the intro and reveal, and the frame's `MuteButton`. The rules are in design.md under "Hear it, say it".
- `components/session/`: the `useSession` hook that runs a batch (stores each rating, updates card state, advances), the view that draws it, the batch-end screen, and the Learn and Practice sessions built from them.
- `components/motion/`: the `useMotion` hook (false with reduced motion on), the lengths of the four character moves, and the batch-end confetti. The keyframes are at the end of `app/globals.css`, inside one reduced-motion guard; add any new animation there.
- `components/menu/`: the menu: the wheel with live counts, Learn and Practice with their counts, the Practice options and the Reverse switch. `MenuScreen` loads the progress; `Menu` draws it.
- `components/pwa/`: registers the service worker, draws the install prompt on the menu, and (`KeepMedia`) asks for art and audio to be stored as pages open.
- `components/tips/`: `TipsScreen`, the `/tips` list of every tip reached. When a tip joins a Learn batch is in `lib/queues/tips.ts` and `learnBatch`.
- `components/settings/`: the settings page's sections: `AutoplaySwitch` ("Play audio by itself", the mute button's other side), `DownloadEverything`, `SignIn` and `StartOver` (records a reset; reviews at or before the latest reset no longer count, see `lib/store/reset.ts`).
- `components/sync/`: `AutoSync` (in the root layout) starts a sync on opening, sign-in, reconnecting and returning to the app; `SyncStatusLine` (menu) and `SyncPanel` (settings) show the status.
- `lib/auth/`: the Supabase browser client, the emailed-code sign-in and sign-out, and who is signed in, read from the stored session so it works offline. `fakeAuthServer` stands in for Supabase Auth in tests. `npm run check:signin` checks sign-in against the real project; the rules are in design.md under "Sign-in".
- `lib/media/`: which art and audio files to keep on the device (a few Learn batches ahead, every seen card, or the whole deck) and storing them in the `learn-spanish-media` cache. The rules are in design.md under "Installable app".
- `public/sw.js`: the service worker, hand-written. It stores the pages, the deck and the build files so the app opens offline, and serves the art and audio that `lib/media` stored; the rules are in design.md under "Installable app". Only registered in production builds. `lib/pwa/sw.test.ts` runs it.
- `app/manifest.ts`: the web manifest. Icons are in `public/`, drawn by `node scripts/make-icons.mjs`.
- `lib/`: logic with no UI. Tests sit next to the code as `*.test.ts`.
- `lib/deck/`: card types, validator and loader (deck format 2: `DraftCard` is a card as the draft pass writes it, `Card` adds the learning path's `unit`, `requires`, `tip` and `why`). `lib/deck/fixture.ts` exports the 16-card fixture deck for tests, from `lib/deck/fixture.json`: twelve word cards plus two form cards, two phrase cards, two units and a tip.
- `lib/scheduler/`: the `ts-fsrs` wrapper: rating a card, replaying reviews into card state, and the seen, due, memorized and predicted-recall checks.
- `lib/sync/`: the sync core: upload unsynced rows, download the other devices' rows, replay. Written against the `SyncRemote` interface; `SupabaseRemote` is the real server and `FakeRemote` the in-memory one for tests. `SyncRunner` (`appSync()`, `requestSync()`) runs a sync for the signed-in account and holds the status. `npm run check:sync` runs two simulated devices against the real project. The rules are in design.md under "Sync rules".
- `supabase/migrations/`: the server's tables, row-level security and triggers, applied with `supabase db push --linked`. `npm run check:rls` checks them against the real project; the rules are in design.md under "Data in Supabase".
- `lib/queues/`: the Learn and Practice queues: which cards a session shows and in what order, with a starter-path batch being one unit (`units.ts`). Learn takes unseen cards in the deck file's order (the deck build computes it). Also the Practice options as URL parameters (`practiceHref`, `parsePracticeParams`).
- `lib/progress/`: seen and memorized counts per part of speech, and the wheel's slice angles and fill radii. `components/Wheel.tsx` draws it.
- `public/deck/`: `deck.json`, the deck the app serves (a copy of `content/deck.json`: the first 100 cards of the learning path since 2026-10-04), plus its art (`img/`) and audio (`audio/`). The fixture's art and clips are here too.
- `scripts/content/`: the content pipeline, run by hand, not part of the app. `word-list.mjs` writes `content/word-list.tsv`, the ranked candidate words; its sources are downloaded into `content/.cache/` (ignored by git). The rules are in design.md under "Content pipeline".
- `scripts/content/draft.mts` (`npm run draft -- --from 1 --to 20`, or `--ranks a,b` for words picked by rank): the draft pass. Claude (the Claude Code CLI on the Max plan by default, `--via api` for the API) writes cards into `content/drafts/`: one file per card under `cards/`, one per word under `words/`, and each call's token usage in `usage.jsonl`. Rerunning the same command resumes. Prompt, schema, output guard and files are in `drafting.ts`; the two ways of calling Claude are in `claude.ts`, and the tests use a fake runner, so `npm test` never calls Claude.
- `scripts/content/path-cards.ts`: the learning path's form cards (`npm run draft -- --forms`, from the fixed verb list `FORM_VERBS`) and phrase cards (`npm run draft -- --phrases`, from the chunks and payoffs of `content/units.json`), with their prompts, schemas and guards; group files in `content/drafts/forms/` and `content/drafts/phrases/` stand in for word files. `npm run review -- --forms` or `--phrases` reviews them. Rules in design.md under "Content pipeline", "Decided in L3".
- `scripts/content/review.mts` (`npm run review -- --from 1 --to 20`): the review pass. A second, independent Claude call per drafted card (same caller and switches as the draft pass) writes `content/review/`: a review per card under `cards/`, a decision file per flagged card under `decisions/`, the readable list `flagged.md`, and each call's token usage in `usage.jsonl`. Rerunning resumes. Prompt, schema, id rule and run are in `reviewing.ts`; decision files and the flagged list in `decisions.ts`. Courtney decides a flagged card by editing its decision file (`decision: approve` or `reject`, with any corrections), then runs `npm run deck`.
- `scripts/content/build-deck.mts` (`npm run deck`): builds `content/deck.json` from the cards that passed review and the flagged cards approved in their decision files, in the learning path's order computed from `content/units.json` and the tags (rules in `path-order.ts`), keeps every card already in the deck, and refuses to drop an id the previous build had (`--fresh` picks the deck from the top of the order alone, implying `--allow-drop`); logic in `deck-build.ts`. It also writes `content/path.md`, the computed order for Courtney to read (card text: no script prints it). The rules are in design.md under "Learning path", "Decided in L6". The review and deck tests share `review-fixture.ts`.
- `scripts/content/draft-tips.mts` (`npm run tips`): drafts each tip of `content/tips.json` into `content/tips/<id>.txt` (one call each, same caller and switches as the draft pass; rerunning resumes, `--redo` replaces the file). Courtney reads each file and sets `status: approve`; `npm run deck` ships approved tips and holds back any card naming another. Prompt, guard, file format, parser and `tipsForDeck` are in `tips.ts`; the rules are in design.md under "Tips".
- `scripts/content/tag.mts` (`npm run tag`): the tag pass. One Claude call per drafted word, verb's form cards or unit's phrase cards (same caller and switches as the draft pass) sets each card's `unit`, `want`, `requires` and `tip` in `content/tags/<id>.json`, checked by script; `--check` checks the stored tags without calls. Rerunning resumes. Logic in `tagging.ts`. The rules are in design.md under "Learning path", "Decided in L5".
- `scripts/content/known-words.ts`: the known-words check (an example uses only words met before its card, by E1's lemma list from `content/.cache/`, downloaded by `sources.mjs`), run by `npm run deck` (lists broken examples) and `npm run review` (reason `known-words`). `npm run draft -- --examples --ids a,b` redrafts only those cards' examples (`examples.ts`). The rules are in design.md under "Example sentences use known words".
- `scripts/content/make-audio.mjs` (`npm run audio`): makes each card's word and sentence clips (a phrase card's word clip is the whole phrase) and each tip example's clip into `public/deck/audio/` and points the deck at them; logic in `audio.mjs`. The rules are in design.md under "Audio".
- `content/units.json` and `content/tips.json`: the learning path's unit plan (the one hand-edited input of the ordering) and the tip list; checked by `scripts/content/units.ts`. The rules are in design.md under "Learning path".
- `content/flagged-clips.html`: the page for hearing the clips the audio check lists (flagged, long or redone), opened from disk; written by `npm run audio -- --check` from the template `scripts/content/flagged-clips.html`. It plays the clips from `public/deck/audio/`, which holds the clips of both `public/deck/deck.json` and `content/deck.json`.
- `@/` is an import alias for the repo root.

## Rules for every ticket

Repeated from design.md, "Rules for every ticket":

- One fresh session per ticket. Read design.md and the ticket; open other repos only where the ticket names a file.
- Send build, test and script output to a file and read the tail, not the whole log.
- Content scripts print counts and card ids, never card bodies. A hundred cards printed is about 25k tokens.
- Art is reviewed by a person on contact sheets. An agent does not open stills one by one.
- If a session passes about 60% of its context with the ticket unfinished: commit, write a handoff note under the ticket, and split what remains into a new ticket.
- Record any decision the ticket makes (library, provider, format) in the relevant section of design.md.

Also: do only your ticket, set its Status on the board in design.md when it is done, and start the commit message with the ticket ID.

## Sibling repos

design.md refers to two other repos. Read only the files a ticket names.

| Repo | Path |
|---|---|
| `wedding-admin-app` | `~/.superset/projects/wedding-admin-app` |
| `crossfit_logger` | `~/Projects/crossfit_logger` |

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
