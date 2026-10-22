// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MOVE_MS } from "@/components/motion";
import { LearnSession } from "@/components/session";
import { until } from "@/components/testing";
import { fixtureCard } from "@/lib/deck/fixture";
import { LocalStore, type Rating } from "@/lib/store";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Three fixture cards, studied in this order (Learn follows the deck's order): ir-go and
// bueno-good have characters, de-of is a glue word.
const cards = ["ir-go", "bueno-good", "de-of"].map(fixtureCard);
let store: LocalStore;
let host: HTMLDivElement;
let root: Root;

const q = (testId: string) => host.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
const move = (testId = "character") => q(testId)?.dataset.move;
const front = () => q("card-front")?.dataset.cardId;
const revealed = () => q("reveal")?.dataset.cardId;
/** Moves the held clock on. A move ends only when a test does this, however long the store takes. */
const pass = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
const frontIs = (cardId: string) => until(() => front() === cardId, `the front of ${cardId}`);
const batchEnd = () => until(() => q("batch-end"), "the end of the batch");
/** Waits for a rating to be saved in full: the review, then the card's state. */
const stored = (count: number) =>
  until(
    async () => (await store.getReviews()).length === count && (await store.getAllCardStates()).length === count,
    "the rating to be stored",
  );
const tap = (testId: string) => act(() => q(testId)!.click());
const moving = () => host.querySelectorAll("[data-move], [data-enter], [data-confetti]").length;

/** Sets the reader's motion setting, as `matchMedia` reports it. jsdom has no `matchMedia` of its own. */
function setReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-reduced-motion: reduce") ? reduce : false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

function mountLearn(batchSize = 3) {
  act(() =>
    root.render(<LearnSession cards={cards} states={new Map()} batchSize={batchSize} store={store} onExit={() => {}} />),
  );
}

/** Passes each Learn intro with "Got it", until the first test's front is up. */
function passIntros() {
  while (q("intro")) tap("intro-got-it");
}

/** Rates the card on screen and sees it off: past any move, and once the rating is stored. */
async function study(rating: Rating) {
  tap("card-front");
  tap(`rate-${rating}`);
  pass(MOVE_MS.droop);
  await until(() => !q("reveal"), "the rated card to leave the screen");
}

beforeEach(() => {
  // Only the moves use timers, so holding the clock decides exactly when a move ends.
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  store = new LocalStore({ indexedDB: new IDBFactory(), IDBKeyRange, deviceId: "device-a" });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  store.close();
  Reflect.deleteProperty(window, "matchMedia");
  vi.useRealTimers();
});

describe("with motion allowed", () => {
  beforeEach(() => setReducedMotion(false));

  it("pops the character in on the intro and the front, and wiggles it on the reveal", () => {
    mountLearn();
    expect(q("intro")!.dataset.cardId).toBe("ir-go");
    expect(move()).toBe("pop");
    expect(q("intro")!.dataset.enter).toBe("card");
    passIntros();
    expect(front()).toBe("ir-go");
    expect(move()).toBe("pop");
    expect(q("card-front")!.dataset.enter).toBe("card");

    tap("card-front");
    expect(move()).toBe("wiggle");
    expect(q("reveal")!.dataset.enter).toBe("reveal");
  });

  it("jumps on green: the rating is stored at once and the next card waits for the jump", async () => {
    mountLearn();
    passIntros();
    tap("card-front");
    tap("rate-good");
    expect(move()).toBe("jump");

    await stored(1);
    expect((await store.getReviews()).map((r) => [r.cardId, r.rating])).toEqual([["ir-go", "good"]]);
    expect(revealed()).toBe("ir-go");
    expect(move()).toBe("jump");

    pass(MOVE_MS.jump - 1);
    expect(revealed()).toBe("ir-go");
    pass(1);
    expect(q("reveal")).toBeNull();
    expect(front()).toBe("bueno-good");
    expect(move()).toBe("pop");
  });

  it("droops on red, then moves on", async () => {
    mountLearn();
    passIntros();
    tap("card-front");
    tap("rate-again");
    expect(move()).toBe("droop");
    expect(revealed()).toBe("ir-go");

    await stored(1);
    expect(revealed()).toBe("ir-go");
    pass(MOVE_MS.droop);
    expect(front()).toBe("bueno-good");
  });

  it("stores one review when a rating is tapped again during the move", async () => {
    mountLearn();
    passIntros();
    tap("card-front");
    tap("rate-good");
    await stored(1);
    tap("rate-again");
    pass(MOVE_MS.droop);
    await stored(1);

    expect((await store.getReviews()).map((r) => [r.cardId, r.rating])).toEqual([["ir-go", "good"]]);
    expect(front()).toBe("bueno-good");
  });

  it("has no move for orange, or for a glue card, which has no character", async () => {
    mountLearn();
    passIntros();
    tap("card-front");
    tap("rate-nearly");
    // The clock is held, so reaching the next card shows that nothing waited on a move.
    await frontIs("bueno-good");

    await study("good");
    expect(front()).toBe("de-of");
    expect(q("character")).toBeNull();
    tap("card-front");
    tap("rate-good");
    await batchEnd();
  });

  it("celebrates at the end of the batch", async () => {
    mountLearn(2);
    passIntros();
    await study("good");
    await study("good");

    expect(q("batch-end")).not.toBeNull();
    expect(move("mascot-slot")).toBe("celebrate");
    // The celebration loop plays in the slot.
    const loop = q("mascot") as HTMLVideoElement;
    expect(loop.tagName).toBe("VIDEO");
    expect(loop.getAttribute("src")).toMatch(/^\/mascot\/celebrate\.(webm|mov)$/);
    expect(q("confetti")!.querySelectorAll("[data-confetti]").length).toBeGreaterThan(0);
    expect(q("confetti")!.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("with reduced motion on", () => {
  beforeEach(() => setReducedMotion(true));

  it("plays no move, transition or celebration through a whole batch", async () => {
    mountLearn(2);
    expect(q("intro")).not.toBeNull();
    expect(q("character")).not.toBeNull();
    expect(moving()).toBe(0);
    passIntros();
    expect(front()).toBe("ir-go");
    expect(q("character")).not.toBeNull();
    expect(moving()).toBe(0);

    tap("card-front");
    expect(q("character")).not.toBeNull();
    expect(moving()).toBe(0);

    // Green: no jump to wait for, so the next card is up as soon as the rating is stored.
    tap("rate-good");
    expect(moving()).toBe(0);
    await frontIs("bueno-good");
    expect(moving()).toBe(0);

    // Red: no droop either.
    tap("card-front");
    tap("rate-again");
    expect(moving()).toBe(0);
    await frontIs("bueno-good");

    tap("card-front");
    tap("rate-good");
    await batchEnd();
    expect(q("confetti")).toBeNull();
    expect(moving()).toBe(0);
    // A still from the celebration loop instead of the loop.
    expect(q("mascot")!.tagName).toBe("IMG");
    expect(q("mascot")!.getAttribute("src")).toBe("/mascot/celebrate.webp");
  });
});

describe("the stylesheet", () => {
  const css = readFileSync(path.join(__dirname, "..", "..", "app", "globals.css"), "utf8");
  const guard = "@media (prefers-reduced-motion: no-preference) {";
  const start = css.indexOf(guard);
  // The block ends at the first closing brace in column one after it.
  const end = css.indexOf("\n}", start);
  const block = css.slice(start, end);
  const outside = css.slice(0, start) + css.slice(end);

  it("animates only when the reader has not asked for reduced motion", () => {
    expect(start).toBeGreaterThan(-1);
    expect(block).toMatch(/animation:/);
    expect(outside).not.toMatch(/animation(-name)?:|transition:/);
  });

  it.each(Object.entries(MOVE_MS))("runs %s for the time the session waits (%i ms)", (name, ms) => {
    expect(block).toMatch(new RegExp(`\\[data-move="${name}"\\] > img \\{[^}]*animation: move-${name} ${ms}ms`));
    expect(css).toContain(`@keyframes move-${name} {`);
  });
});
