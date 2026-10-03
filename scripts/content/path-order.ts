// The learning path's order (L6): the rules under "Order is computed, not hand-written" in
// docs/design.md, applied to tagged cards. Pure functions: the deck build (deck-build.ts) gives them
// every drafted card that is not rejected, with its tags, and writes what they return.
//
//   1. Units in content/units.json order; within a unit, `requires` order first, then word and
//      form cards before phrase cards, then rank.
//   2. A unit tagged with more cards than its cap drops its lowest-ranked non-phrase cards (that no
//      card staying in the unit requires) to the frequency phase.
//   3. The frequency phase: content and glue cards by rank, two content then one glue (form and phrase
//      cards outside a unit join the content queue by rank). A card comes at the later of its rank
//      slot and the slot just after its last `requires`.
//   4. Sibling spacing: a word's later meaning (a content or glue card sharing its rank) comes at least
//      `spacing` cards after its previous meaning, outside the starter path.
//   5. A card is never before anything it requires: an unknown id, a cycle, or a unit card requiring a
//      card that comes later is a problem, and the build writes nothing.
//
// `pathMarkdown` writes content/path.md, the order for a person to read. It holds card text: no
// script prints it.

import type { Card } from "@/lib/deck/types";
import { DEFAULT_CAP, type Unit } from "./units";

/** In the frequency phase, this many content cards come before each glue card. */
export const CONTENT_PER_GLUE = 2;

/** A word's later meaning comes at least this many cards after its previous one (`npm run deck -- --spacing N`). */
export const SIBLING_SPACING = 50;

export type PathUnit = Pick<Unit, "id" | "cap">;

export interface PathOrder {
  /** Every card given, in Learn order. A card dropped from its unit by the cap has `unit` null. */
  cards: Card[];
  /** How many cards the starter path holds: the frequency phase starts at this index. */
  starter: number;
  /** Ids dropped from their unit by its cap, now in the frequency phase. */
  capped: string[];
  /** Why there is no order (ids only): an unknown id, a cycle, a card before what it requires. */
  problems: string[];
}

/** Two content cards, then one glue card, until one queue runs out; the rest of the other follows. */
export function interleave(content: readonly Card[], glue: readonly Card[]): Card[] {
  const out: Card[] = [];
  let c = 0;
  let g = 0;
  while (c < content.length && g < glue.length) {
    for (let i = 0; i < CONTENT_PER_GLUE && c < content.length; i += 1) out.push(content[c++]);
    out.push(glue[g++]);
  }
  return [...out, ...content.slice(c), ...glue.slice(g)];
}

/** The ids of one cycle in `requires`, first id repeated at the end, or null. */
function findCycle(cards: readonly Card[], byId: ReadonlyMap<string, Card>): string[] | null {
  const state = new Map<string, "open" | "done">();
  const stack: string[] = [];
  const visit = (id: string): string[] | null => {
    if (state.get(id) === "done") return null;
    if (state.get(id) === "open") return [...stack.slice(stack.indexOf(id)), id];
    state.set(id, "open");
    stack.push(id);
    for (const r of byId.get(id)?.requires ?? []) {
      const cycle = byId.has(r) ? visit(r) : null;
      if (cycle) return cycle;
    }
    stack.pop();
    state.set(id, "done");
    return null;
  };
  for (const card of cards) {
    const cycle = visit(card.id);
    if (cycle) return cycle;
  }
  return null;
}

export function pathOrder(
  cards: readonly Card[],
  units: readonly PathUnit[],
  { spacing = SIBLING_SPACING }: { spacing?: number } = {},
): PathOrder {
  const index = new Map(cards.map((card, i) => [card.id, i]));
  const byId = new Map(cards.map((card) => [card.id, card]));
  const problems: string[] = [];
  for (const card of cards) {
    if (card.unit !== null && !units.some((u) => u.id === card.unit)) problems.push(`${card.id}: unit ${card.unit} is not in content/units.json`);
    for (const r of card.requires) if (!byId.has(r)) problems.push(`${card.id} requires ${r}, which is not a drafted card`);
  }
  const cycle = findCycle(cards, byId);
  if (cycle) problems.push(`requires go round in a circle: ${cycle.join(" > ")}`);
  if (problems.length) return { cards: [], starter: 0, capped: [], problems };

  const at = (card: Card) => index.get(card.id)!;
  const byRank = (list: readonly Card[]) => [...list].sort((a, b) => a.rank - b.rank || at(a) - at(b));

  // Rules 1 and 2: the starter path.
  const out: Card[] = [];
  const capped: string[] = [];
  for (const unit of units) {
    let members = cards.filter((card) => card.unit === unit.id);
    const cap = unit.cap ?? DEFAULT_CAP;
    while (members.length > cap) {
      const droppable = members.filter((c) => c.kind !== "phrase" && !members.some((m) => m.requires.includes(c.id)));
      if (!droppable.length) break;
      const drop = droppable.reduce((a, b) => (b.rank > a.rank || (b.rank === a.rank && at(b) > at(a)) ? b : a));
      members = members.filter((c) => c !== drop);
      capped.push(drop.id);
    }
    // Requires order first (a card is ready once the unit's cards it requires are placed), then
    // non-phrase before phrase, then rank, then the order the cards were drafted in.
    const key = (c: Card) => [c.kind === "phrase" ? 1 : 0, c.rank, at(c)];
    const before = (a: Card, b: Card) => {
      const [ka, kb] = [key(a), key(b)];
      return ka[0] - kb[0] || ka[1] - kb[1] || ka[2] - kb[2];
    };
    const left = new Set(members);
    while (left.size) {
      const ready = [...left].filter((c) => c.requires.every((r) => !left.has(byId.get(r)!)));
      const next = ready.sort(before)[0];
      out.push(next);
      left.delete(next);
    }
  }
  const starter = out.length;

  // Rules 3 and 4: the frequency phase.
  const inStarter = new Set(out.map((c) => c.id));
  const rest = cards.filter((c) => !inStarter.has(c.id)).map((c) => (c.unit === null ? c : { ...c, unit: null }));
  const queue = interleave(
    byRank(rest.filter((c) => c.kind !== "glue")),
    byRank(rest.filter((c) => c.kind === "glue")),
  );
  const position = new Map(out.map((c, i) => [c.id, i]));
  const isMeaning = (c: Card) => c.kind === "content" || c.kind === "glue";
  /** Where the latest meaning of each rank sits. */
  const lastMeaning = new Map<number, number>();
  for (const [i, c] of out.entries()) if (isMeaning(c)) lastMeaning.set(c.rank, i);
  const ready = (c: Card) => c.requires.every((r) => position.has(r));
  const spaced = (c: Card, slot: number) => !isMeaning(c) || !lastMeaning.has(c.rank) || slot - lastMeaning.get(c.rank)! >= spacing;
  while (queue.length) {
    const slot = out.length;
    let i = queue.findIndex((c) => ready(c) && spaced(c, slot));
    // Only later meanings waiting for their spacing are left (the end of the drafts): they follow in order.
    if (i < 0) i = queue.findIndex(ready);
    const [card] = queue.splice(i, 1);
    position.set(card.id, slot);
    out.push(card);
    if (isMeaning(card)) lastMeaning.set(card.rank, slot);
  }

  // Rule 5: a unit card may require only cards placed before it.
  for (const [i, card] of out.entries()) {
    for (const r of card.requires) {
      if (position.get(r)! > i) problems.push(`${card.id} (unit ${card.unit}) requires ${r}, which comes later`);
    }
  }
  if (problems.length) return { cards: [], starter: 0, capped: [], problems };
  return { cards: out, starter, capped, problems };
}

export interface PathText {
  order: PathOrder;
  units: readonly Unit[];
  /** Why a card is not in the deck ("waiting for your decision"), by id. Cards in the deck have none. */
  notes: ReadonlyMap<string, string>;
  /** The wants some drafted card's tag fills, by unit id. */
  matched: ReadonlyMap<string, ReadonlySet<string>>;
}

/** content/path.md: the computed order by unit, then the frequency phase, with each unit's unmatched wants. */
export function pathMarkdown({ order, units, notes, matched }: PathText): string {
  const lines = [
    "# Learning path",
    "",
    "The order `npm run deck` computed from the tags (rules in docs/design.md, \"Order is computed, not hand-written\"). Rewritten by every build: edit `content/units.json` or the tags, not this file.",
    "",
    "A card marked *not in the deck* keeps its place in the order and the count, and is left out of `content/deck.json` for the reason given.",
  ];
  const capped = new Set(order.capped);
  const entry = (card: Card, i: number) => {
    const hint = card.hint ? ` (${card.hint})` : "";
    const note = [capped.has(card.id) ? "dropped from its unit by the cap" : null, notes.get(card.id) ?? null].filter(Boolean);
    return `${i + 1}. \`${card.id}\` · ${card.en}${hint} → ${card.es}${note.length ? ` · *${note.join("; ")}*` : ""}`;
  };
  for (const [n, unit] of units.entries()) {
    lines.push("", `## Unit ${n + 1} · ${unit.title} (\`${unit.id}\`)`, "", `Now you can ${unit.goal}`, "");
    const cards = order.cards.slice(0, order.starter).map((card, i) => ({ card, i })).filter(({ card }) => card.unit === unit.id);
    lines.push(...(cards.length ? cards.map(({ card, i }) => entry(card, i)) : ["No cards yet."]));
    const unmatched = unit.wants.filter((w) => !matched.get(unit.id)?.has(w));
    if (unmatched.length) lines.push("", "Wants no drafted card fills:", "", ...unmatched.map((w) => `- ${w}`));
  }
  lines.push("", "## Frequency phase", "");
  const rest = order.cards.slice(order.starter);
  lines.push(...(rest.length ? rest.map((card, i) => entry(card, order.starter + i)) : ["No cards yet."]));
  return `${lines.join("\n")}\n`;
}
