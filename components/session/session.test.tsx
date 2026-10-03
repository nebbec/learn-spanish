// @vitest-environment jsdom
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BatchEnd, LearnSession, SessionView, summarize, useSession } from "@/components/session";
import { until } from "@/components/testing";
import type { DeckTip } from "@/lib/deck";
import { fixtureDeck } from "@/lib/deck/fixture";
import { learnQueue, testSteps, type CardStates, type IntroChoice } from "@/lib/queues";
import { isSeen, rateCard, replayReviews, type CardState } from "@/lib/scheduler";
import { LocalStore, type Direction, type Rating } from "@/lib/store";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const cards = fixtureDeck.cards;
/** The fixture in Learn order: the deck file's order, which the deck build computed. */
const LEARN_ORDER = cards.map((card) => card.id);
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

function mountLearn(
  props: { states?: CardStates; batchSize?: number; onBatchEnd?: () => void; tips?: readonly DeckTip[] } = {},
) {
  mount(
    <LearnSession
      cards={cards}
      tips={props.tips}
      states={props.states ?? new Map()}
      batchSize={props.batchSize}
      onBatchEnd={props.onBatchEnd}
      store={store}
      clock={clock}
      onExit={() => (exits += 1)}
    />,
  );
}

/** Passes every intro on screen with "Got it", until a test's front is up. */
function passIntros() {
  while (q("intro")) act(() => q("intro-got-it")!.click());
}

/** Reveals the card on screen with a tap, rates it, and returns its id. */
async function study(rating: Rating) {
  act(() => q("card-front")!.click());
  const cardId = shownCard()!;
  act(() => q(`rate-${rating}`)!.click());
  await rated();
  return cardId;
}

/**
 * Studies until the batch ends. `taps` is every rating, in order. `pick` chooses a test's
 * rating from the number of tests rated so far; `choose` passes each intro, "Got it" unless
 * it says otherwise. `steps` lists what was shown: `tip:<tip id>`, `intro:<id>` and `test:<id>`.
 */
async function studyBatch(pick: (position: number) => Rating, choose: (cardId: string) => IntroChoice = () => "got-it") {
  const tapped: { cardId: string; rating: Rating }[] = [];
  const steps: string[] = [];
  let tests = 0;
  while (!q("batch-end")) {
    if (steps.length > 100) throw new Error("The batch never ended");
    const tip = q("tip")?.dataset.tipId;
    if (tip) {
      steps.push(`tip:${tip}`);
      act(() => q("tip-continue")!.click());
      continue;
    }
    const intro = q("intro")?.dataset.cardId;
    if (intro) {
      steps.push(`intro:${intro}`);
      const choice = choose(intro);
      act(() => q(`intro-${choice}`)!.click());
      if (choice === "known") {
        tapped.push({ cardId: intro, rating: "known" });
        await until(() => q("intro")?.dataset.cardId !== intro, "the known card to leave the screen");
      }
      continue;
    }
    const rating = pick(tests);
    tests += 1;
    const cardId = await study(rating);
    steps.push(`test:${cardId}`);
    tapped.push({ cardId, rating });
  }
  return { taps: tapped, steps };
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
  // Third card red, fifth card orange, everything else green. One batch holds all 16 cards.
  const pick = (position: number): Rating => (position === 2 ? "again" : position === 4 ? "nearly" : "good");

  it("moves every card from unseen to seen, and stores exactly what was tapped", async () => {
    mountLearn({ batchSize: 16 });
    expect(await store.getReviews()).toEqual([]);
    expect(await store.getAllCardStates()).toEqual([]);

    const { taps: tapped, steps } = await studyBatch(pick);

    // Each card is introduced before its test: three intros, then their three tests.
    for (const id of LEARN_ORDER) {
      expect(steps.indexOf(`intro:${id}`)).toBeGreaterThanOrEqual(0);
      expect(steps.indexOf(`intro:${id}`)).toBeLessThan(steps.indexOf(`test:${id}`));
    }
    expect(steps.slice(0, 6)).toEqual([
      "intro:ir-form-yo",
      "intro:ir-form-tu",
      "intro:casa-house",
      "test:ir-form-yo",
      "test:ir-form-tu",
      "test:casa-house",
    ]);
    expect(steps).toHaveLength(16 + 16 + 1);

    // The tests are the fixture in Learn order, with the red card once more near the end: its
    // return joined the batch before the last card's intro put that card's test after it.
    expect(tapped.map((tap) => tap.cardId)).toEqual([...LEARN_ORDER.slice(0, -1), "casa-house", LEARN_ORDER.at(-1)]);

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
    for (const card of cards) {
      expect(isSeen(replayed.get(card.id))).toBe(true);
    }
    expect(learnQueue(cards, replayed)).toEqual([]);
  });

  it("ends on a summary that counts each card once, with no further batch to offer", async () => {
    mountLearn({ batchSize: 16 });
    await studyBatch(pick);

    expect(q("batch-end")).not.toBeNull();
    expect(q("summary-cards")!.textContent).toBe("16 new cards seen.");
    expect(q("summary-good")!.textContent).toBe("14");
    expect(q("summary-nearly")!.textContent).toBe("1");
    expect(q("summary-again")!.textContent).toBe("1");
    expect(q("summary-remaining")!.textContent).toBe("That was the last of them.");
    expect(q("another-batch")).toBeNull();
    // Every segment of the bar is filled: 16 intros, 16 tests and the red's return.
    expect(host.querySelectorAll('[data-segment="done"]').length).toBe(33);

    act(() => q("to-menu")!.click());
    expect(exits).toBe(1);
  });
});

describe("reds in a Learn batch", () => {
  it("adds a segment when a red returns, and a red on the return does not add another", async () => {
    mountLearn({ batchSize: 3 });
    // One segment per intro; each test joins as its intro is passed.
    expect(segments()).toBe(3);
    passIntros();
    expect(segments()).toBe(6);

    expect(await study("again")).toBe("ir-form-yo");
    expect(segments()).toBe(7);
    await study("good");
    await study("good");
    expect(q("batch-end")).toBeNull();

    expect(await study("again")).toBe("ir-form-yo");
    expect(segments()).toBe(7);
    expect(q("batch-end")).not.toBeNull();
    expect(await storedTaps()).toEqual([
      { cardId: "ir-form-yo", rating: "again" },
      { cardId: "ir-form-tu", rating: "good" },
      { cardId: "casa-house", rating: "good" },
      { cardId: "ir-form-yo", rating: "again" },
    ]);
    // Counted once in the summary, under its first rating.
    expect(q("summary-cards")!.textContent).toBe("3 new cards seen.");
    expect(q("summary-again")!.textContent).toBe("1");
  });
});

describe("I already know this", () => {
  it("rates the card known, takes it out of the batch, and replay agrees with the session", async () => {
    mountLearn({ batchSize: 3 });
    const { steps } = await studyBatch(() => "good", (cardId) => (cardId === "casa-house" ? "known" : "got-it"));

    // casa-house is introduced and never tested; the other two are tested after their intros.
    expect(steps).toEqual([
      "intro:ir-form-yo",
      "intro:ir-form-tu",
      "intro:casa-house",
      "test:ir-form-yo",
      "test:ir-form-tu",
    ]);
    expect(segments()).toBe(5);
    const reviews = await store.getReviews();
    expect(reviews.map(({ cardId, rating }) => ({ cardId, rating }))).toEqual([
      { cardId: "casa-house", rating: "known" },
      { cardId: "ir-form-yo", rating: "good" },
      { cardId: "ir-form-tu", rating: "good" },
    ]);
    expect(reviews[0]).toMatchObject({ direction: "forward", section: "learn" });

    // Its first rating is Easy: straight to review, a day or more away, unlike a first green.
    const known = reviews[0];
    const easy = rateCard(undefined, "casa-house", "known", known.timestamp);
    expect(easy.phase).toBe("review");
    expect(easy.due - known.timestamp).toBeGreaterThanOrEqual(24 * 3600 * 1000);
    expect(rateCard(undefined, "casa-house", "good", known.timestamp).phase).toBe("learning");

    // The session's card states, as stored, are what a replay of the reviews gives.
    const states = await store.getAllCardStates<CardState>();
    const replayed = replayReviews(reviews);
    expect(new Map(states.map((state) => [state.cardId, state]))).toEqual(replayed);
    expect(replayed.get("casa-house")).toEqual(easy);

    // Green in the summary.
    expect(q("summary-cards")!.textContent).toBe("3 new cards seen.");
    expect(q("summary-good")!.textContent).toBe("3");
  });
});

describe("the session screen", () => {
  it("introduces each new card, then shows its front, with no rating buttons until the reveal", async () => {
    mountLearn({ batchSize: 2 });
    expect(q("intro")!.dataset.cardId).toBe("ir-form-yo");
    expect(q("card-front")).toBeNull();
    expect(q("rate-good")).toBeNull();
    act(() => q("intro-got-it")!.click());
    // Two cards: the second intro, then the first card's test (fewer than three steps remain).
    expect(q("intro")!.dataset.cardId).toBe("ir-form-tu");
    act(() => q("intro-got-it")!.click());
    expect(q("intro")).toBeNull();
    expect(q("card-front")!.dataset.cardId).toBe("ir-form-yo");
    expect(q("reveal")).toBeNull();
    expect(q("rate-good")).toBeNull();

    act(() => q("card-front")!.click());
    expect(q("card-front")).toBeNull();
    expect(shownCard()).toBe("ir-form-yo");
    // The note field and report button sit in the reveal.
    expect(q("reveal")!.contains(q("card-extras"))).toBe(true);
  });

  it("stores one review when a rating is tapped twice", async () => {
    mountLearn({ batchSize: 2 });
    passIntros();
    act(() => q("card-front")!.click());
    act(() => {
      q("rate-good")!.click();
      q("rate-again")!.click();
    });
    await rated();

    expect(await storedTaps()).toEqual([{ cardId: "ir-form-yo", rating: "good" }]);
    // The next card is up: ir-form-tu.
    expect(q("card-front")!.textContent).toContain("you go");
  });

  it("closes to the menu from the frame", async () => {
    mountLearn();
    act(() => host.querySelector<HTMLElement>('[aria-label="Close"]')!.click());
    expect(exits).toBe(1);
  });

  it("offers another batch cut from the cards still unseen", async () => {
    mountLearn({ batchSize: 3 });
    await studyBatch(() => "good");
    expect(q("summary-remaining")!.textContent).toBe("13 cards left to learn.");

    act(() => q("another-batch")!.click());
    expect(q("batch-end")).toBeNull();
    expect(segments()).toBe(3);
    // The next three in the deck file's order.
    const { taps: second } = await studyBatch(() => "good");
    expect(second.map((tap) => tap.cardId)).toEqual(["phrase-going-home", "bueno-good", "ahora-now"]);
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
      { id: "r1", cardId: "ir-form-yo", direction: "forward", rating: "good", timestamp: START - 5000 },
      { id: "r2", cardId: "casa-house", direction: "forward", rating: "again", timestamp: START - 4000 },
    ]);
    mountLearn({ states: earlier, batchSize: 2 });
    const { taps: tapped } = await studyBatch(() => "good");
    expect(tapped.map((tap) => tap.cardId)).toEqual(["ir-form-tu", "phrase-going-home"]);
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
    passIntros();
    act(() => q("card-front")!.click());
    store.close();
    act(() => q("rate-good")!.click());
    await until(() => q("session-error"), "the save to fail");

    expect(shownCard()).toBe("ir-form-yo");
    // Reopened so afterEach can close it.
    store = new LocalStore({ indexedDB: new IDBFactory(), IDBKeyRange, deviceId: "device-a" });
  });
});

describe("tips in Learn", () => {
  const tips = fixtureDeck.tips;

  it("shows the tip once, before the first card naming it, and not again once that card is seen", async () => {
    mountLearn({ batchSize: 2, tips });
    // The tip is a step of the bar: tip, two intros, two tests.
    expect(q("tip")!.dataset.tipId).toBe("tip-verb-endings");
    expect(q("tip-title")!.textContent).toBe(tips[0].title);
    expect(host.querySelectorAll('[data-testid="tip-example"]')).toHaveLength(2);
    expect(segments()).toBe(3);
    const { steps, taps } = await studyBatch(() => "good");
    expect(steps).toEqual([
      "tip:tip-verb-endings",
      "intro:ir-form-yo",
      "intro:ir-form-tu",
      "test:ir-form-yo",
      "test:ir-form-tu",
    ]);
    // Never rated: only the two cards are stored.
    expect(await storedTaps()).toEqual(taps);
    expect(q("summary-cards")!.textContent).toBe("2 new cards seen.");

    act(() => q("another-batch")!.click());
    const second = await studyBatch(() => "good");
    expect(second.steps.some((step) => step.startsWith("tip:"))).toBe(false);
  });

  it("does not show the tip to a learner who has seen a card naming it", async () => {
    const earlier = replayReviews([
      { id: "r1", cardId: "ir-form-yo", direction: "forward", rating: "good", timestamp: START - 5000 },
    ]);
    mountLearn({ states: earlier, batchSize: 1, tips });
    expect(q("tip")).toBeNull();
    expect(q("intro")!.dataset.cardId).toBe("ir-form-tu");
  });

  it("opens the tip over the intro and the reveal of a card naming it", async () => {
    mountLearn({ batchSize: 1, tips });
    act(() => q("tip-continue")!.click());
    expect(q("intro")!.dataset.cardId).toBe("ir-form-yo");
    act(() => q("tip-open")!.click());
    expect(document.querySelector('[data-testid="tip-sheet"]')?.getAttribute("data-tip-id")).toBe("tip-verb-endings");
    act(() => (document.querySelector('[data-testid="tip-close"]') as HTMLElement).click());
    expect(document.querySelector('[data-testid="tip-sheet"]')).toBeNull();
    expect(q("intro")!.dataset.cardId).toBe("ir-form-yo");

    act(() => q("intro-got-it")!.click());
    act(() => q("card-front")!.click());
    act(() => q("tip-open")!.click());
    expect(document.querySelector('[data-testid="tip-sheet"]')).not.toBeNull();
    act(() => (document.querySelector('[data-testid="tip-close"]') as HTMLElement).click());
    expect(shownCard()).toBe("ir-form-yo");
  });

  it("puts no \"?\" on a card that names no tip", async () => {
    const earlier = replayReviews([
      { id: "r1", cardId: "ir-form-yo", direction: "forward", rating: "good", timestamp: START - 5000 },
      { id: "r2", cardId: "ir-form-tu", direction: "forward", rating: "good", timestamp: START - 4000 },
    ]);
    mountLearn({ states: earlier, batchSize: 1, tips });
    expect(q("intro")!.dataset.cardId).toBe("casa-house");
    expect(q("tip-open")).toBeNull();
  });
});

describe("useSession outside Learn", () => {
  function Harness({ direction, states }: { direction: Direction; states: CardStates }) {
    const session = useSession({
      steps: testSteps(cards.slice(0, 2)),
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

  it("counts known as green", () => {
    const rating = (cardId: string, value: Rating, i: number) => ({ cardId, rating: value, reviewId: `r${i}` });
    expect(summarize([rating("a", "known", 0), rating("b", "good", 1)])).toEqual({ cards: 2, good: 2, nearly: 0, again: 0 });
  });
});
