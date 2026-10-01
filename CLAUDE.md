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
- `components/`: React components.
- `lib/`: logic with no UI. Tests sit next to the code as `*.test.ts`.
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
