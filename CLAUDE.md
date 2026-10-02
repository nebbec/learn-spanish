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
- `components/`: React components. Component tests sit next to them as `*.test.tsx` and start with `// @vitest-environment jsdom`.
- `components/card/`: the batch frame with its segmented bar, the front of a card in both directions, and the reveal with its rating buttons. Presentational: props in, events out. The exception is `CardExtras` (note field, trick, report), which reads and writes the local store.
- `components/session/`: the `useSession` hook that runs a batch (stores each rating, updates card state, advances), the view that draws it, the batch-end screen, and the Learn and Practice sessions built from them.
- `components/motion/`: the `useMotion` hook (false with reduced motion on), the lengths of the four character moves, and the batch-end confetti. The keyframes are at the end of `app/globals.css`, inside one reduced-motion guard; add any new animation there.
- `components/menu/`: the menu: the wheel with live counts, Learn and Practice with their counts, the Practice options and the Reverse switch. `MenuScreen` loads the progress; `Menu` draws it.
- `lib/`: logic with no UI. Tests sit next to the code as `*.test.ts`.
- `lib/deck/`: card types, validator and loader. `lib/deck/fixture.ts` exports the 12-card fixture deck for tests.
- `lib/scheduler/`: the `ts-fsrs` wrapper: rating a card, replaying reviews into card state, and the seen, due, memorized and predicted-recall checks.
- `lib/queues/`: the Learn and Practice queues: which cards a session shows and in what order. Also the Practice options as URL parameters (`practiceHref`, `parsePracticeParams`).
- `lib/progress/`: seen and memorized counts per part of speech, and the wheel's slice angles and fill radii. `components/Wheel.tsx` draws it.
- `public/deck/`: `deck.json` plus its art (`img/`) and audio (`audio/`).
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
