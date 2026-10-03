// Builds content/deck.json from the drafts, their reviews and the decisions on
// flagged cards: every card that passed review, plus every flagged card
// approved in its decision file (with its corrections), in the learning path's
// order computed from content/units.json and the tags in content/tags (L6).
// Cards already in the deck stay, and new ones join from the top of the order
// up to DECK_SIZE (a card still waiting for a decision keeps its place). Ships
// the tips approved in content/tips/<id>.txt and holds back any card naming
// another tip, or requiring a card not in the deck.
//
//   npm run deck [-- --size N] [-- --spacing N] [-- --allow-drop]
//
// Refuses to write a deck the validator rejects, one whose order has a problem
// (a cycle in requires, a unit card before what it requires), or one that lacks
// an id the previous build had (--allow-drop permits that, and only before the
// deck ships). Also rewrites content/review/flagged.md, and content/path.md,
// the computed order for a person to read.
//
// Prints only card ids, field names and counts, never card text.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { buildDeck, deckText, missingMedia, readDeckFile } from "./deck-build";
import { refreshFlagged } from "./decisions";
import { DraftStore } from "./drafting";
import { SIBLING_SPACING } from "./path-order";
import { ReviewStore } from "./reviewing";
import { TagStore } from "./tagging";
import { TipStore, tipsForDeck } from "./tips";
import { readTips, readUnits } from "./units";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** The first slice is 100 cards (E4); each content batch of 100 (S2) raises it by 100. */
const DECK_SIZE = 100;

const { values } = parseArgs({
  options: {
    "allow-drop": { type: "boolean", default: false },
    size: { type: "string", default: String(DECK_SIZE) },
    spacing: { type: "string", default: String(SIBLING_SPACING) },
    drafts: { type: "string", default: path.join(ROOT, "content", "drafts") },
    review: { type: "string", default: path.join(ROOT, "content", "review") },
    tips: { type: "string", default: path.join(ROOT, "content", "tips") },
    tags: { type: "string", default: path.join(ROOT, "content", "tags") },
    out: { type: "string", default: path.join(ROOT, "content", "deck.json") },
    path: { type: "string", default: path.join(ROOT, "content", "path.md") },
  },
});

const size = Number(values.size);
if (!Number.isInteger(size) || size < 1) throw new Error(`--size must be a whole number above 0, not ${values.size}`);
const spacing = Number(values.spacing);
if (!Number.isInteger(spacing) || spacing < 0) throw new Error(`--spacing must be a whole number, not ${values.spacing}`);

const drafts = new DraftStore(values.drafts);
const reviews = new ReviewStore(values.review);
const flagged = refreshFlagged(drafts, reviews);
const takesFile = path.join(ROOT, "content", "audio-takes.json");
const takes = existsSync(takesFile) ? JSON.parse(readFileSync(takesFile, "utf8")) : {};
const tipList = readTips(ROOT);
const tips = tipsForDeck(new TipStore(values.tips), tipList);
const plan = { units: readUnits(ROOT), tipList, tags: new TagStore(values.tags) };
const build = buildDeck(drafts, reviews, readDeckFile(values.out), {
  allowDrop: values["allow-drop"],
  takes,
  size,
  tips: tips.tips,
  plan,
  spacing,
});
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
if (build.beyondSize.length) console.log(`Past the deck size of ${size}, left for a later batch: ${build.beyondSize.length}`);
console.log(
  `Tips: ${tips.tips.length} approved and shipped, ${tips.pending.length} waiting for you to read${ids(tips.pending)}, ${tips.notDrafted.length} not drafted (npm run tips)`,
);
if (tips.problems.length) console.log(`Tip files to fix (not shipped): ${tips.problems.length} (${tips.problems.join("; ")})`);
if (build.heldBack.length) console.log(`Held back until their tip is approved: ${build.heldBack.length}${ids(build.heldBack)}`);
if (build.heldForRequires.length) {
  console.log(`Held back until a card they require is in the deck: ${build.heldForRequires.length}${ids(build.heldForRequires)}`);
}
if (build.notTagged.length) {
  const shown = build.notTagged.length > 20 ? ` (first 20: ${build.notTagged.slice(0, 20).join(", ")})` : ids(build.notTagged);
  console.log(`Not tagged, placed by rank in the frequency phase (npm run tag): ${build.notTagged.length}${shown}`);
}
if (build.capped.length) console.log(`Dropped from their unit by its cap: ${build.capped.length}${ids(build.capped)}`);
if (flagged.reset.length) console.log(`Decision files remade for a new draft: ${flagged.reset.join(", ")}`);
console.log(`Flagged list: ${rel(reviews.flaggedFile)}`);

if (build.pathText) {
  writeFileSync(values.path, build.pathText);
  console.log(`Learning path for reading: ${rel(values.path)}`);
}

if (build.orderProblems.length) {
  console.log(`Not written: the order has ${build.orderProblems.length} problems (${build.orderProblems.join("; ")})`);
  process.exitCode = 1;
} else if (build.deckProblems.length) {
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
