// @vitest-environment jsdom
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BatchEnd, LearnSession, SessionView, summarize, useSession } from "@/components/session";
import { until } from "@/components/testing";
import { fixtureDeck } from "@/lib/deck/fixture";
import { learnQueue, type CardStates } from "@/lib/queues";
import { isSeen, replayReviews, type CardState } from "@/lib/scheduler";
import { LocalStore, type Direction, type Rating } from "@/lib/store";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const cards = fixtureDeck.cards;
/** The fixture in Learn order: two content words, then one glue word. */
const LEARN_ORDER = [
  "ir-go",
  "bueno-good",
  "de-of",
  "ahora-now",
  "tiempo-time",
  "se-impersonal",
  "tiempo-weather",
  "casa-house",
  "lo-him",
  "hablar-speak",
  "problema-problem",
  "carro-car",
];
const START = Date.UTC(2026, 9, 2, 9, 0, 0);

let store: LocalStore;
let host: HTMLDivElement;
let root: Root;
let exits: number;
let time: number;
/** A clock that moves on a second each time a rating reads it. */
const clock = () => (time += 1000);

const q = (testId: string) => host.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
/** Waits for the rating to be stored, which is when the session leaves the reveal. */
const rated = () => until(() => !q("reveal"), "the rated card to leave the screen");
const shownCard = () => q("reveal")?.dataset.cardId;

function mount(node: React.ReactNode) {
  act(() => root.render(node));
}

function mountLearn(props: { states?: CardStates; batchSize?: number; onBatchEnd?: () => void } = {}) {
  mount(
    <LearnSession
      cards={cards}
      states={props.states ?? new Map()}
      batchSize={props.batchSize}
      onBatchEnd={props.onBatchEnd}
      store={store}
      clock={clock}
      onExit={() => (exits += 1)}
    />,
  );
}

/** Reveals the card on screen with a tap, rates it, and returns its id. */
async function study(rating: Rating) {
  act(() => q("card-front")!.click());
  const cardId = shownCard()!;
  act(() => q(`rate-${rating}`)!.click());
  await rated();
  return cardId;
}

/** Studies until the batch ends. `pick` chooses the rating from the number of cards studied so far. */
async function studyBatch(pick: (position: number) => Rating) {
  const tapped: { cardId: string; rating: Rating }[] = [];
  while (!q("batch-end")) {
    if (tapped.length > 50) throw new Error("The batch never ended");
    const rating = pick(tapped.length);
    tapped.push({ cardId: await study(rating), rating });
  }
  return tapped;
}

const storedTaps = async () =>
  (await store.getReviews()).map(({ cardId, rating }) => ({ cardId, rating }));

const segments = () => host.querySelectorAll("[data-segment]").length;

beforeEach(() => {
  store = new LocalStore({ indexedDB: new IDBFactory(), IDBKeyRange, deviceId: "device-a" });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  exits = 0;
  time = START;
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  store.close();
});

describe("a full Learn batch on the fixture deck", () => {
  // Third card red, fifth card orange, everything else green.
  const pick = (position: number): Rating => (position === 2 ? "again" : position === 4 ? "nearly" : "good");

  it("moves every card from unseen to seen, and stores exactly what was tapped", async () => {
    mountLearn();
    expect(await store.getReviews()).toEqual([]);
    expect(await store.getAllCardStates()).toEqual([]);

    const tapped = await studyBatch(pick);

    // The batch is the fixture in Learn order, with the red card once more at the end.
    expect(tapped.map((tap) => tap.cardId)).toEqual([...LEARN_ORDER, "de-of"]);

    const reviews = await store.getReviews();
    expect(reviews.map(({ cardId, rating }) => ({ cardId, rating }))).toEqual(tapped);
    for (const review of reviews) {
      expect(review).toMatchObject({ direction: "forward", section: "learn", deviceId: "device-a", synced: 0 });
    }
    expect(reviews.map((review) => review.timestamp)).toEqual(tapped.map((_, i) => START + 1000 * (i + 1)));

    // Every card now has state, and the cache matches a replay of the reviews.
    const states = await store.getAllCardStates<CardState>();
    expect(states.map((state) => state.cardId).sort()).toEqual([...LEARN_ORDER].sort());
    const replayed = replayReviews(reviews);
    expect(new Map(states.map((state) => [state.cardId, state]))).toEqual(replayed);
    for (const card of cards) expect(isSeen(replayed.get(card.id))).toBe(true);
    expect(learnQueue(cards, replayed)).toEqual([]);
  });

  it("ends on a summary that counts each card once, with no further batch to offer", async () => {
    mountLearn();
    await studyBatch(pick);

    expect(q("batch-end")).not.toBeNull();
    expect(q("summary-cards")!.textContent).toBe("12 new cards seen.");
    expect(q("summary-good")!.textContent).toBe("10");
    expect(q("summary-nearly")!.textContent).toBe("1");
    expect(q("summary-again")!.textContent).toBe("1");
    expect(q("summary-remaining")!.textContent).toBe("That was the last of them.");
    expect(q("another-batch")).toBeNull();
    // Every segment of the bar is filled.
    expect(host.querySelectorAll('[data-segment="done"]').length).toBe(13);

    act(() => q("to-menu")!.click());
    expect(exits).toBe(1);
  });
});

describe("reds in a Learn batch", () => {
  it("adds a segment when a red returns, and a red on the return does not add another", async () => {
    mountLearn({ batchSize: 3 });
    expect(segments()).toBe(3);

    expect(await study("again")).toBe("ir-go");
    expect(segments()).toBe(4);
    await study("good");
    await study("good");
    expect(q("batch-end")).toBeNull();

    expect(await study("again")).toBe("ir-go");
    expect(segments()).toBe(4);
    expect(q("batch-end")).not.toBeNull();
    expect(await storedTaps()).toEqual([
      { cardId: "ir-go", rating: "again" },
      { cardId: "bueno-good", rating: "good" },
      { cardId: "de-of", rating: "good" },
      { cardId: "ir-go", rating: "again" },
    ]);
    // Counted once in the summary, under its first rating.
    expect(q("summary-cards")!.textContent).toBe("3 new cards seen.");
    expect(q("summary-again")!.textContent).toBe("1");
  });
});

describe("the session screen", () => {
  it("shows the front first, with no rating buttons until the reveal", async () => {
    mountLearn({ batchSize: 2 });
    expect(q("card-front")).not.toBeNull();
    expect(q("reveal")).toBeNull();
    expect(q("rate-good")).toBeNull();

    act(() => q("card-front")!.click());
    expect(q("card-front")).toBeNull();
    expect(shownCard()).toBe("ir-go");
    // The note field and report button sit in the reveal.
    expect(q("reveal")!.contains(q("card-extras"))).toBe(true);
  });

  it("stores one review when a rating is tapped twice", async () => {
    mountLearn({ batchSize: 2 });
    act(() => q("card-front")!.click());
    act(() => {
      q("rate-good")!.click();
      q("rate-again")!.click();
    });
    await rated();

    expect(await storedTaps()).toEqual([{ cardId: "ir-go", rating: "good" }]);
    expect(q("card-front")!.textContent).toContain("good");
  });

  it("closes to the menu from the frame", async () => {
    mountLearn();
    act(() => host.querySelector<HTMLElement>('[aria-label="Close"]')!.click());
    expect(exits).toBe(1);
  });

  it("offers another batch cut from the cards still unseen", async () => {
    mountLearn({ batchSize: 3 });
    await studyBatch(() => "good");
    expect(q("summary-remaining")!.textContent).toBe("9 cards left to learn.");

    act(() => q("another-batch")!.click());
    expect(q("batch-end")).toBeNull();
    expect(segments()).toBe(3);
    // The pattern restarts: two content words, then a glue word.
    const second = await studyBatch(() => "good");
    expect(second.map((tap) => tap.cardId)).toEqual(["ahora-now", "tiempo-time", "se-impersonal"]);
  });

  it("says when each batch ends, after its ratings are stored, so a sync can take them", async () => {
    const stored: number[] = [];
    const onBatchEnd = () => void store.getReviews().then((reviews) => stored.push(reviews.length));
    mountLearn({ batchSize: 2, onBatchEnd });
    await studyBatch(() => "good");
    await until(() => stored.length === 1, "the first batch to end");
    expect(stored).toEqual([2]);

    act(() => q("another-batch")!.click());
    await studyBatch(() => "good");
    await until(() => stored.length === 2, "the second batch to end");
    expect(stored).toEqual([2, 4]);
  });

  it("starts from the progress already on the device", async () => {
    const earlier = replayReviews([
      { id: "r1", cardId: "ir-go", direction: "forward", rating: "good", timestamp: START - 5000 },
      { id: "r2", cardId: "de-of", direction: "forward", rating: "again", timestamp: START - 4000 },
    ]);
    mountLearn({ states: earlier, batchSize: 2 });
    const tapped = await studyBatch(() => "good");
    expect(tapped.map((tap) => tap.cardId)).toEqual(["bueno-good", "ahora-now"]);
  });

  it("says so when every card has been seen", async () => {
    const all = replayReviews(
      cards.map((card, i) => ({
        id: `r${i}`,
        cardId: card.id,
        direction: "forward" as const,
        rating: "good" as const,
        timestamp: START - 1000,
      })),
    );
    mountLearn({ states: all });
    expect(q("learn-empty")).not.toBeNull();
    expect(q("card-front")).toBeNull();
    act(() => q("to-menu")!.click());
    expect(exits).toBe(1);
  });

  it("keeps the card on screen and says so when a rating cannot be saved", async () => {
    mountLearn({ batchSize: 2 });
    act(() => q("card-front")!.click());
    store.close();
    act(() => q("rate-good")!.click());
    await until(() => q("session-error"), "the save to fail");

    expect(shownCard()).toBe("ir-go");
    // Reopened so afterEach can close it.
    store = new LocalStore({ indexedDB: new IDBFactory(), IDBKeyRange, deviceId: "device-a" });
  });
});

describe("useSession outside Learn", () => {
  function Harness({ direction, states }: { direction: Direction; states: CardStates }) {
    const session = useSession({
      cards: cards.slice(0, 2),
      section: "practice",
      direction,
      states,
      store,
      clock,
    });
    return (
      <SessionView session={session} store={store}>
        <BatchEnd title="Done" summary={summarize(session.ratings)} onMenu={() => {}} />
      </SessionView>
    );
  }

  it("stores reverse ratings without touching card state, and does not bring a red back", async () => {
    mount(<Harness direction="reverse" states={new Map()} />);
    // The Reverse front shows the Spanish.
    expect(q("prompt")!.getAttribute("lang")).toBe("es");

    await study("again");
    await study("good");

    expect(q("batch-end")).not.toBeNull();
    const reviews = await store.getReviews();
    expect(reviews.map(({ cardId, rating, direction, section }) => ({ cardId, rating, direction, section }))).toEqual([
      { cardId: cards[0].id, rating: "again", direction: "reverse", section: "practice" },
      { cardId: cards[1].id, rating: "good", direction: "reverse", section: "practice" },
    ]);
    expect(await store.getAllCardStates()).toEqual([]);
  });
});

describe("summarize", () => {
  it("counts each card under its first rating", () => {
    const rating = (cardId: string, value: Rating, i: number) => ({ cardId, rating: value, reviewId: `r${i}` });
    expect(
      summarize([rating("a", "again", 0), rating("b", "nearly", 1), rating("c", "good", 2), rating("a", "good", 3)]),
    ).toEqual({ cards: 3, good: 1, nearly: 1, again: 1 });
    expect(summarize([])).toEqual({ cards: 0, good: 0, nearly: 0, again: 0 });
  });
});
