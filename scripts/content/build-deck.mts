// Builds content/deck.json from the drafts, their reviews and the decisions on
// flagged cards: every card that passed review, plus every flagged card
// approved in its decision file (with its corrections), in Learn order, up to
// the first DECK_SIZE cards in Learn order (a card still waiting for a decision
// keeps its place).
//
//   npm run deck [-- --size N] [-- --allow-drop]
//
// Refuses to write a deck the validator rejects, or one that lacks an id the
// previous build had (--allow-drop permits that, and only before the deck
// ships). Also rewrites content/review/flagged.md.
//
// Prints only card ids, field names and counts, never card text.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { buildDeck, deckText, missingMedia, readDeckFile } from "./deck-build";
import { refreshFlagged } from "./decisions";
import { DraftStore } from "./drafting";
import { ReviewStore } from "./reviewing";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** The first slice is 100 cards (E4); each content batch of 100 (S2) raises it by 100. */
const DECK_SIZE = 100;

const { values } = parseArgs({
  options: {
    "allow-drop": { type: "boolean", default: false },
    size: { type: "string", default: String(DECK_SIZE) },
    drafts: { type: "string", default: path.join(ROOT, "content", "drafts") },
    review: { type: "string", default: path.join(ROOT, "content", "review") },
    out: { type: "string", default: path.join(ROOT, "content", "deck.json") },
  },
});

const size = Number(values.size);
if (!Number.isInteger(size) || size < 1) throw new Error(`--size must be a whole number above 0, not ${values.size}`);

const drafts = new DraftStore(values.drafts);
const reviews = new ReviewStore(values.review);
const flagged = refreshFlagged(drafts, reviews);
const takesFile = path.join(ROOT, "content", "audio-takes.json");
const takes = existsSync(takesFile) ? JSON.parse(readFileSync(takesFile, "utf8")) : {};
const build = buildDeck(drafts, reviews, readDeckFile(values.out), { allowDrop: values["allow-drop"], takes, size });
const rel = (file: string) => path.relative(process.cwd(), file);
const ids = (list: string[]) => (list.length ? `: ${list.join(", ")}` : "");

const inDeck = build.passed.length + build.approved.length;
console.log(
  `Cards for the deck: ${inDeck} (${build.passed.length} passed review, ${build.approved.length} approved by you, ${build.corrected.length} of them corrected${ids(build.corrected)})`,
);
console.log(`Waiting for your decision: ${build.waiting.length}${ids(build.waiting)}`);
if (build.rejected.length) console.log(`Rejected: ${build.rejected.length}${ids(build.rejected)}`);
if (build.notReviewed.length) {
  console.log(`Not reviewed yet (run npm run review): ${build.notReviewed.length}${ids(build.notReviewed)}`);
}
if (build.problems.length) {
  console.log(`Decision files to fix (left out of the deck): ${build.problems.length} (${build.problems.join("; ")})`);
}
if (build.beyondSize.length) console.log(`Past the first ${size} in Learn order, left for a later batch: ${build.beyondSize.length}`);
if (flagged.reset.length) console.log(`Decision files remade for a new draft: ${flagged.reset.join(", ")}`);
console.log(`Flagged list: ${rel(reviews.flaggedFile)}`);

if (build.deckProblems.length) {
  console.log(`Not written: the deck validator found ${build.deckProblems.length} problems (${build.deckProblems.slice(0, 20).join("; ")})`);
  process.exitCode = 1;
} else if (!build.deck) {
  console.log(
    `Not written: ${build.dropped.length} ${build.dropped.length === 1 ? "id" : "ids"} in the previous build would be dropped${ids(build.dropped)}. Ids are permanent; pass --allow-drop only before the deck ships.`,
  );
  process.exitCode = 1;
} else {
  writeFileSync(values.out, deckText(build.deck));
  const media = missingMedia(build.deck, path.join(ROOT, "public"));
  console.log(
    `Deck: ${build.deck.cards.length} cards, version ${build.deck.version}${build.changed ? "" : " (unchanged)"}, passes the validator, written to ${rel(values.out)}`,
  );
  if (build.dropped.length) console.log(`Dropped with --allow-drop: ${build.dropped.join(", ")}`);
  console.log(`Media files not made yet: ${media.missing} of ${media.total} (art comes in F2; npm run audio -- --deck ${rel(values.out)} makes the clips)`);
}
