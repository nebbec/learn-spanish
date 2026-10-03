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

- `app/`: routes. `/` is the menu; `/learn`, `/practice`, `/settings`.
- `app/globals.css`: design tokens in the Tailwind `@theme` block (colours, type, radius). Use the token utilities (`bg-good`, `bg-nearly`, `bg-again`, `text-ink`, `rounded-card`, `font-display`), not raw hex values.
- `components/`: React components. Component tests sit next to them as `*.test.tsx` and start with `// @vitest-environment jsdom`. They never wait a fixed time: use `until` from `components/testing.ts` to wait for the thing the test reads or clicks next, or `watchStore` when a store call leaves no mark on screen.
- `components/card/`: the batch frame with its segmented bar, the front of a card in both directions, and the reveal with its rating buttons. Presentational: props in, events out. The exception is `CardExtras` (note field, trick, report), which reads and writes the local store.
- `components/session/`: the `useSession` hook that runs a batch (stores each rating, updates card state, advances), the view that draws it, the batch-end screen, and the Learn and Practice sessions built from them.
- `components/motion/`: the `useMotion` hook (false with reduced motion on), the lengths of the four character moves, and the batch-end confetti. The keyframes are at the end of `app/globals.css`, inside one reduced-motion guard; add any new animation there.
- `components/menu/`: the menu: the wheel with live counts, Learn and Practice with their counts, the Practice options and the Reverse switch. `MenuScreen` loads the progress; `Menu` draws it.
- `components/pwa/`: registers the service worker, draws the install prompt on the menu, and (`KeepMedia`) asks for art and audio to be stored as pages open.
- `components/settings/`: the settings page's sections: `DownloadEverything` and `SignIn`.
- `components/sync/`: `AutoSync` (in the root layout) starts a sync on opening, sign-in, reconnecting and returning to the app; `SyncStatusLine` (menu) and `SyncPanel` (settings) show the status.
- `lib/auth/`: the Supabase browser client, the emailed-code sign-in and sign-out, and who is signed in, read from the stored session so it works offline. `fakeAuthServer` stands in for Supabase Auth in tests. `npm run check:signin` checks sign-in against the real project; the rules are in design.md under "Sign-in".
- `lib/media/`: which art and audio files to keep on the device (a few Learn batches ahead, every seen card, or the whole deck) and storing them in the `learn-spanish-media` cache. The rules are in design.md under "Installable app".
- `public/sw.js`: the service worker, hand-written. It stores the pages, the deck and the build files so the app opens offline, and serves the art and audio that `lib/media` stored; the rules are in design.md under "Installable app". Only registered in production builds. `lib/pwa/sw.test.ts` runs it.
- `app/manifest.ts`: the web manifest. Icons are in `public/`, drawn by `node scripts/make-icons.mjs`.
- `lib/`: logic with no UI. Tests sit next to the code as `*.test.ts`.
- `lib/deck/`: card types, validator and loader. `lib/deck/fixture.ts` exports the 12-card fixture deck for tests, from `lib/deck/fixture.json`.
- `lib/scheduler/`: the `ts-fsrs` wrapper: rating a card, replaying reviews into card state, and the seen, due, memorized and predicted-recall checks.
- `lib/sync/`: the sync core: upload unsynced rows, download the other devices' rows, replay. Written against the `SyncRemote` interface; `SupabaseRemote` is the real server and `FakeRemote` the in-memory one for tests. `SyncRunner` (`appSync()`, `requestSync()`) runs a sync for the signed-in account and holds the status. `npm run check:sync` runs two simulated devices against the real project. The rules are in design.md under "Sync rules".
- `supabase/migrations/`: the server's tables, row-level security and triggers, applied with `supabase db push --linked`. `npm run check:rls` checks them against the real project; the rules are in design.md under "Data in Supabase".
- `lib/queues/`: the Learn and Practice queues: which cards a session shows and in what order. Also the Practice options as URL parameters (`practiceHref`, `parsePracticeParams`).
- `lib/progress/`: seen and memorized counts per part of speech, and the wheel's slice angles and fill radii. `components/Wheel.tsx` draws it.
- `public/deck/`: `deck.json`, the deck the app serves (a copy of `content/deck.json`, the real 100-card deck since 2026-10-03), plus its art (`img/`) and audio (`audio/`). The fixture's art and clips are here too.
- `scripts/content/`: the content pipeline, run by hand, not part of the app. `word-list.mjs` writes `content/word-list.tsv`, the ranked candidate words; its sources are downloaded into `content/.cache/` (ignored by git). The rules are in design.md under "Content pipeline".
- `scripts/content/draft.mts` (`npm run draft -- --from 1 --to 20`): the draft pass. Claude (the Claude Code CLI on the Max plan by default, `--via api` for the API) writes cards into `content/drafts/`: one file per card under `cards/`, one per word under `words/`, and each call's token usage in `usage.jsonl`. Rerunning the same command resumes. Prompt, schema, output guard and files are in `drafting.ts`; the two ways of calling Claude are in `claude.ts`, and the tests use a fake runner, so `npm test` never calls Claude.
- `scripts/content/review.mts` (`npm run review -- --from 1 --to 20`): the review pass. A second, independent Claude call per drafted card (same caller and switches as the draft pass) writes `content/review/`: a review per card under `cards/`, a decision file per flagged card under `decisions/`, the readable list `flagged.md`, and each call's token usage in `usage.jsonl`. Rerunning resumes. Prompt, schema, id rule and run are in `reviewing.ts`; decision files and the flagged list in `decisions.ts`. Courtney decides a flagged card by editing its decision file (`decision: approve` or `reject`, with any corrections), then runs `npm run deck`.
- `scripts/content/build-deck.mts` (`npm run deck`): builds `content/deck.json` from the cards that passed review and the flagged cards approved in their decision files, in Learn order, and refuses to drop an id the previous build had; logic in `deck-build.ts`. The app still ships the fixture in `public/deck/deck.json` until H1. The review and deck tests share `review-fixture.ts`.
- `scripts/content/make-audio.mjs` (`npm run audio`): makes each card's word and sentence clips into `public/deck/audio/` and points the deck at them; logic in `audio.mjs`. The rules are in design.md under "Audio".
- `content/flagged-clips.html`: the page for hearing the clips the audio check lists (flagged, long or redone), opened from disk; written by `npm run audio -- --check` from the template `scripts/content/flagged-clips.html`. It plays the clips from `public/deck/audio/`, which holds the clips of both `public/deck/deck.json` and `content/deck.json`.
- `content/art/`: the locked art style. `style.md` holds the cast (the concha leads), the prompt template and the rules for stills; `cast/` each character's model sheet, the image reference for every render of that character. The rules are in design.md under "Art".
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
