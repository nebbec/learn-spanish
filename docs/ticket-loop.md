# Ticket loop

How to run a list of tickets from [design.md](design.md) unattended, with one fresh agent per ticket.

To start it, open a Claude Code session in this repo and say, with your own ticket list:

> Use a workflow and follow docs/ticket-loop.md for tickets A1, A2, B1, B2, B3, B4.

The rest of this file is addressed to the session that receives that message.

## Why one agent per ticket

Each ticket is sized to fit one agent's 100k context window, so every ticket must run in its own fresh subagent. The repo carries the state between them (board status, commits, handoff notes), not the agents.

## Before the first ticket

- Check the list against the board in design.md. Every "Depends on" must be earlier in the list or already Done. If one is not, stop and say which.
- Create and switch to a branch named after the range, in lower case: `tickets/a1-b4` for the example above. All tickets commit to that branch. Do not push.

## For each ticket, in order

1. **Build.** Start a fresh subagent with the builder brief below.
2. **Gate.** Start a separate fresh agent that has not seen the builder's report. It runs the test suite and a production build, and checks the ticket's "Done when" line against the code. It reports pass or fail with the commands it ran and their results.
3. **Continue or stop.** If the builder reported failure or the gate failed, stop the workflow. Do not start the next ticket.

## Builder brief

Give each builder this, with the ticket ID filled in:

- Read docs/design.md in full, then your ticket under "Tickets". Follow "Rules for every ticket". Finished tickets' notes are in [history.md](history.md); read there only the notes of the tickets yours depends on or whose code it touches.
- Do only ticket `<ID>`. Do not start other tickets or change code outside its scope.
- When the ticket's "Done when" check passes, set its Status on the board to Done and commit, with the ticket ID at the start of the message.
- If you cannot finish (blocked, or past about 60% of your context), set Status to Blocked, write a handoff note under the ticket saying what is done, what is left and why, commit, and report failure.
- Report back: the ticket ID, pass or fail, the commands you ran to verify and their results, and anything the next ticket needs to know.
- Sibling repos the design doc refers to: `wedding-admin-app` is at `~/.superset/projects/wedding-admin-app` and `crossfit_logger` is at `~/Projects/crossfit_logger`. Read only the files a ticket names.

## Human steps

Some checks need Courtney: a credential, a choice, or a real device. The board's "Human" column says which tickets.

- If the rest of the ticket can be finished without the human step, finish it, skip that one check, set Status to "Done except: <what is left>", note it under the ticket, and carry on.
- If the ticket cannot make progress without the human step, treat it as blocked and stop.

For A1 this means: skip the "Vercel preview loads" check and carry on. A1 should also record the two sibling repo paths in `CLAUDE.md`.

## When the loop ends

Tell Courtney:

- which tickets are Done;
- which ticket stopped the loop, and why;
- what needs doing by hand before the next run.

## Suggested runs

| Run | Tickets | Needs first |
|---|---|---|
| 1 | A1, A2, B1, B2, B3, B4 | nothing |
| 2 | C1, C2, C3, C4, C5, C6, C7 | run 1 |
| 3 | D1, D2, D5 | run 1 |

The remaining tickets each have a human step, so run them singly or in short lists once that step is done: D3 needs a Supabase project and keys, E2 an API key, E4 a review of flagged cards, F1 a style choice, F2 a contact-sheet review, G1 the listening test, and D6 and H1 real devices.
