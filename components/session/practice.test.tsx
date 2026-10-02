// @vitest-environment jsdom
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PracticeSession } from "@/components/session";
import { until } from "@/components/testing";
import { fixtureCard, fixtureDeck } from "@/lib/deck/fixture";
import { parsePracticeParams, practiceQueue } from "@/lib/queues";
import { isDue, replayReviews } from "@/lib/scheduler";
import { LocalStore, type Rating, type Review } from "@/lib/store";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const cards = fixtureDeck.cards;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const START = Date.UTC(2026, 9, 2, 9, 0, 0);

/** Forward ratings given before the Practice sitting: [card, rating, how long ago]. */
const HISTORY: [string, Rating, number][] = [
  ["de-of", "good", 30 * DAY], // rank 1, long overdue
  ["se-impersonal", "again", DAY], // rank 9, failed yesterday
  ["ir-go", "good", HOUR], // rank 30, fresh
  ["bueno-good", "nearly", 2 * DAY], // rank 48
  ["tiempo-time", "good", HOUR], // rank 70, fresh
  ["casa-house", "again", 3 * DAY], // rank 95, failed and then got
  ["casa-house", "good", 2 * DAY],
  ["hablar-speak", "good", 3 * DAY], // rank 110, not due yet, but the most faded of the three
  ["carro-car", "good", 40 * DAY], // rank 640, long overdue
];
/** Seen cards by frequency rank. The other four fixture cards are unseen. */
const SEEN = [
  "de-of",
  "se-impersonal",
  "ir-go",
  "bueno-good",
  "tiempo-time",
  "casa-house",
  "hablar-speak",
  "carro-car",
];
const DUE = ["de-of", "se-impersonal", "bueno-good", "casa-house", "carro-car"];
/** Not due: lowest predicted recall first, then rank. */
const EXTRA = ["hablar-speak", "ir-go", "tiempo-time"];

let store: LocalStore;
let host: HTMLDivElement;
let root: Root;
let exits: number;
let time: number;
let reverseChanges: boolean[];
/** A clock that moves on a second each time it is read. */
const clock = () => (time += 1000);

const q = (testId: string) => host.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
const click = (testId: string) => act(() => q(testId)!.click());

/** Stores the history, fills the card_state cache from it, and returns everything stored. */
async function seed(history = HISTORY) {
  for (const [cardId, rating, ago] of history) {
    await store.appendReview({ cardId, direction: "forward", rating, section: "learn", timestamp: START - ago });
  }
  const reviews = await store.getReviews();
  await store.replaceCardStates([...replayReviews(reviews).values()]);
  return reviews;
}

/** Mounts Practice the way the route does: options parsed from the query string. */
function mountPractice(reviews: Review[], query = "", props: { batchSize?: number; random?: () => number } = {}) {
  const { mode, pos, reverse } = parsePracticeParams(new URLSearchParams(query));
  act(() =>
    root.render(
      <PracticeSession
        cards={cards}
        states={replayReviews(reviews)}
        reviews={reviews}
        mode={mode}
        pos={pos}
        reverse={reverse}
        onReverseChange={(next) => reverseChanges.push(next)}
        onExit={() => (exits += 1)}
        store={store}
        clock={clock}
        {...props}
      />,
    ),
  );
}

/** Reveals the card on screen, rates it, and returns its id. */
async function study(rating: Rating = "good") {
  click("card-front");
  const cardId = q("reveal")!.dataset.cardId!;
  click(`rate-${rating}`);
  // The rating is stored by the time the session leaves the reveal.
  await until(() => !q("reveal"), "the rated card to leave the screen");
  return cardId;
}

/** Studies until an end screen shows, and returns the ids in the order they came up. */
async function studyBatch(rating: Rating = "good") {
  const shown: string[] = [];
  while (!q("batch-end")) {
    if (shown.length > 50) throw new Error("The batch never ended");
    shown.push(await study(rating));
  }
  return shown;
}

/** Studies batch after batch until no further one is offered. */
async function studyAll(rating: Rating = "good") {
  const shown = await studyBatch(rating);
  while (q("another-batch")) {
    click("another-batch");
    shown.push(...(await studyBatch(rating)));
  }
  return shown;
}

/** A repeatable stand-in for Math.random. */
function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

beforeEach(() => {
  store = new LocalStore({ indexedDB: new IDBFactory(), IDBKeyRange, deviceId: "device-a" });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  exits = 0;
  time = START;
  reverseChanges = [];
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  store.close();
});

describe("the history the tests start from", () => {
  it("has five due cards and three that are not", async () => {
    const states = replayReviews(await seed());
    expect(SEEN.filter((id) => isDue(states.get(id), START))).toEqual(DUE);
    expect([...states.keys()].sort()).toEqual([...SEEN].sort());
  });
});

describe("plain Practice", () => {
  it("shows due cards by rank, then the caught-up marker, then extra practice", async () => {
    mountPractice(await seed(), "", { batchSize: 3 });

    expect(await studyBatch()).toEqual(DUE.slice(0, 3));
    expect(q("caught-up")).toBeNull();
    expect(q("summary-remaining")!.textContent).toBe("2 cards still due.");

    click("another-batch");
    expect(await studyBatch()).toEqual(DUE.slice(3));
    expect(q("caught-up")).not.toBeNull();
    expect(host.textContent).toContain("You're all caught up!");
    expect(q("another-batch")!.textContent).toBe("Extra practice");

    click("another-batch");
    expect(await studyBatch()).toEqual(EXTRA);
    expect(q("caught-up")).toBeNull();
    expect(q("summary-remaining")!.textContent).toBe("That was the last of them.");
    expect(q("another-batch")).toBeNull();

    click("to-menu");
    expect(exits).toBe(1);
  });

  it("stores every rating as a forward Practice review and updates the schedule, extra practice included", async () => {
    const before = await seed();
    const statesBefore = replayReviews(before);
    mountPractice(before);
    const shown = await studyAll();
    expect(shown).toEqual([...DUE, ...EXTRA]);

    const added = (await store.getReviews()).filter((review) => review.section === "practice");
    expect(added.map((review) => review.cardId)).toEqual(shown);
    expect(added.every((review) => review.direction === "forward" && review.rating === "good")).toBe(true);

    const cached = new Map((await store.getAllCardStates()).map((state) => [state.cardId, state]));
    expect(cached).toEqual(replayReviews(await store.getReviews()));
    for (const id of SEEN) expect(cached.get(id), id).not.toEqual(statesBefore.get(id));
  });

  it("opens on the caught-up marker when nothing is due", async () => {
    const reviews = await seed(HISTORY.filter(([id]) => EXTRA.includes(id)));
    mountPractice(reviews);
    expect(q("caught-up")).not.toBeNull();
    expect(q("card-front")).toBeNull();

    click("another-batch");
    expect(q("caught-up")).toBeNull();
    expect(await studyAll()).toEqual(EXTRA);
  });

  it("says so when no card has been seen", async () => {
    mountPractice([]);
    expect(q("practice-empty")).not.toBeNull();
    expect(q("card-front")).toBeNull();
    click("to-menu");
    expect(exits).toBe(1);
  });

  it("closes to the menu part-way, keeping the ratings given", async () => {
    mountPractice(await seed());
    await study();
    act(() => host.querySelector<HTMLElement>('[aria-label="Close"]')!.click());
    expect(exits).toBe(1);
    expect((await store.getReviews()).filter((review) => review.section === "practice")).toHaveLength(1);
  });
});

describe("the Practice options, from the URL", () => {
  it("mode=in-order shows seen cards by rank, with no marker", async () => {
    mountPractice(await seed(), "mode=in-order", { batchSize: 5 });
    expect(await studyBatch()).toEqual(SEEN.slice(0, 5));
    expect(q("caught-up")).toBeNull();
    expect(q("summary-remaining")!.textContent).toBe("3 cards left.");
    click("another-batch");
    expect(await studyBatch()).toEqual(SEEN.slice(5));
    expect(q("caught-up")).toBeNull();
    expect(q("another-batch")).toBeNull();
  });

  it("mode=struggling shows the cards with a recent red, by rank", async () => {
    mountPractice(await seed(), "mode=struggling");
    expect(await studyAll()).toEqual(["se-impersonal", "casa-house"]);
    expect(q("caught-up")).toBeNull();
  });

  it("mode=shuffle shows every seen card once, in the order the random source gives", async () => {
    const reviews = await seed();
    const expected = practiceQueue(
      { cards, states: replayReviews(reviews), now: START, reviews },
      { mode: "shuffle", random: seeded(7) },
    ).cards.map((card) => card.id);
    mountPractice(reviews, "mode=shuffle", { random: seeded(7) });
    const shown = await studyAll();
    expect(shown).toEqual(expected);
    expect(shown).not.toEqual(SEEN);
    expect([...shown].sort()).toEqual([...SEEN].sort());
    expect(q("caught-up")).toBeNull();
  });

  it("pos=noun keeps to that part of speech: due, marker, extra practice", async () => {
    mountPractice(await seed(), "pos=noun");
    expect(await studyBatch()).toEqual(["casa-house", "carro-car"]);
    expect(q("caught-up")).not.toBeNull();
    click("another-batch");
    expect(await studyBatch()).toEqual(["tiempo-time"]);
    expect(q("another-batch")).toBeNull();
  });

  it("pos combines with a mode", async () => {
    mountPractice(await seed(), "mode=in-order&pos=verb");
    expect(await studyAll()).toEqual(["ir-go", "hablar-speak"]);
  });

  it("says so when the option matches no card", async () => {
    mountPractice(await seed(), "mode=struggling&pos=verb");
    expect(q("practice-empty")!.textContent).toContain("No struggling cards");
  });
});

describe("Reverse", () => {
  it("shows the Spanish first, stores reverse ratings and leaves card state unchanged", async () => {
    const before = await seed();
    const cacheBefore = await store.getAllCardStates();
    mountPractice(before, "reverse=1");

    const front = q("card-front")!;
    expect(front.dataset.cardId).toBe("de-of");
    expect(front.textContent).toContain(fixtureCard("de-of").es);
    expect(front.textContent).not.toContain("Maria");

    // Reds and all: none of it may reach the schedule.
    const shown = await studyAll("again");
    expect(shown).toEqual([...DUE, ...EXTRA]);

    const after = await store.getReviews();
    const added = after.filter((review) => review.section === "practice");
    expect(added.map((review) => review.cardId)).toEqual(shown);
    expect(added.every((review) => review.direction === "reverse" && review.rating === "again")).toBe(true);

    expect(await store.getAllCardStates()).toEqual(cacheBefore);
    expect(replayReviews(after)).toEqual(replayReviews(before));
  });

  it("does not change the queue", async () => {
    mountPractice(await seed(), "mode=struggling&reverse=1");
    expect(await studyAll()).toEqual(["se-impersonal", "casa-house"]);
  });

  it("can be switched on between batches with the toggle", async () => {
    mountPractice(await seed(), "mode=in-order", { batchSize: 4 });
    const first = await studyBatch();
    expect(q("reverse-toggle")!.getAttribute("aria-pressed")).toBe("false");
    click("reverse-toggle");
    expect(q("reverse-toggle")!.getAttribute("aria-pressed")).toBe("true");
    expect(reverseChanges).toEqual([true]);

    click("another-batch");
    const second = await studyBatch();
    const added = (await store.getReviews()).filter((review) => review.section === "practice");
    expect(added.map(({ cardId, direction }) => [cardId, direction])).toEqual([
      ...first.map((id) => [id, "forward"]),
      ...second.map((id) => [id, "reverse"]),
    ]);
  });
});
