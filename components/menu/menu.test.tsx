// @vitest-environment jsdom
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MenuScreen } from "@/components/menu";
import { LearnSession, PracticeSession } from "@/components/session";
import { until } from "@/components/testing";
import { fixtureDeck } from "@/lib/deck/fixture";
import { isDue, isMemorized, replayReviews } from "@/lib/scheduler";
import { LocalStore, type Rating } from "@/lib/store";

// next/link sets state outside React's test scope when it has no router around it; a plain link is enough here.
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const cards = fixtureDeck.cards;
const TOTAL = cards.length;
const DAY = 24 * 60 * 60 * 1000;
const START = Date.UTC(2026, 9, 2, 9, 0, 0);

let store: LocalStore;
let host: HTMLDivElement;
let root: Root;
let time: number;
let visited: string[];
/** A clock that moves on a second each time it is read. */
const clock = () => (time += 1000);
const loadCards = async () => cards;

const q = (testId: string) => host.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
const count = (testId: string) => Number(q(testId)!.textContent);
const href = (testId: string) => q(testId)!.getAttribute("href");
const click = (testId: string) => act(() => q(testId)!.click());

/** Replaces whatever is on screen, the way moving to another route does. */
function show(screen: ReactNode) {
  act(() => root.unmount());
  root = createRoot(host);
  act(() => root.render(screen));
}

/** Waits for the menu's counts to be drawn, however long the store takes to load them. */
async function showMenu() {
  show(<MenuScreen onNavigate={(to) => visited.push(to)} store={store} loadCards={loadCards} clock={clock} />);
  await until(() => q("menu"), "the menu to load");
}

/**
 * Rates every card that comes up until the batch ends, passing each Learn intro with
 * "Got it". `ratings` are used in turn, then green.
 */
async function studyBatch(ratings: Rating[] = []) {
  let shown = 0;
  while (!q("batch-end")) {
    if (shown > 50) throw new Error("The batch never ended");
    if (q("intro")) {
      click("intro-got-it");
      continue;
    }
    click("card-front");
    click(`rate-${ratings[shown] ?? "good"}`);
    // The rating is stored by the time the session leaves the reveal.
    await until(() => !q("reveal"), "the rated card to leave the screen");
    shown += 1;
  }
}

/** The counts the menu shows, read off the screen. */
const counts = () => ({
  unseen: count("menu-unseen"),
  due: count("menu-due"),
  seen: count("menu-seen"),
  memorized: count("menu-memorized"),
  struggling: count("menu-struggling-count"),
  centre: q("wheel-centre")!.textContent,
  wheel: q("wheel")!.getAttribute("aria-label"),
});

/** The same counts worked out from what the store holds. */
async function expected(now: number) {
  const states = replayReviews(await store.getReviews());
  const all = [...states.values()];
  return {
    seen: all.length,
    due: all.filter((state) => isDue(state, now)).length,
    memorized: all.filter((state) => isMemorized(state)).length,
  };
}

beforeEach(() => {
  store = new LocalStore({ indexedDB: new IDBFactory(), IDBKeyRange, deviceId: "device-a" });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  time = START;
  visited = [];
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  store.close();
});

describe("the menu before any studying", () => {
  it("shows the whole deck as unseen and an empty wheel", async () => {
    await showMenu();
    expect(counts()).toEqual({
      unseen: TOTAL,
      due: 0,
      seen: 0,
      memorized: 0,
      struggling: 0,
      centre: `0of ${TOTAL}`,
      wheel: `Progress: 0 of ${TOTAL} cards memorized, 0 seen`,
    });
  });

  it("links to Learn, Practice, each option and settings, and has a mascot slot", async () => {
    await showMenu();
    expect(href("menu-learn")).toBe("/learn");
    expect(href("menu-practice")).toBe("/practice");
    expect(href("menu-shuffle")).toBe("/practice?mode=shuffle");
    expect(href("menu-in-order")).toBe("/practice?mode=in-order");
    expect(href("menu-struggling")).toBe("/practice?mode=struggling");
    expect(href("menu-settings")).toBe("/settings");
    expect(q("mascot-slot")).not.toBeNull();
  });

  it("opens Practice for a part of speech when its slice is tapped", async () => {
    await showMenu();
    act(() => host.querySelector<SVGGElement>('[data-pos="verb"]')!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(visited).toEqual(["/practice?pos=verb"]);
  });

  it("adds Reverse to every Practice link while the switch is on", async () => {
    await showMenu();
    click("menu-reverse");
    expect(q("menu-reverse")!.getAttribute("aria-checked")).toBe("true");
    expect(href("menu-practice")).toBe("/practice?reverse=1");
    expect(href("menu-shuffle")).toBe("/practice?mode=shuffle&reverse=1");
    expect(href("menu-learn")).toBe("/learn");
    act(() => host.querySelector<SVGGElement>('[data-pos="noun"]')!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(visited).toEqual(["/practice?pos=noun&reverse=1"]);

    click("menu-reverse");
    expect(href("menu-practice")).toBe("/practice");
  });
});

describe("the menu after a session", () => {
  it("updates the counts and the wheel after a Learn batch", async () => {
    await showMenu();
    const before = counts();

    show(<LearnSession cards={cards} states={new Map()} onExit={() => {}} batchSize={5} store={store} clock={clock} />);
    // Two reds, which come back at the end of the batch, then greens.
    await studyBatch(["again", "again"]);

    await showMenu();
    const after = counts();
    expect(after.unseen).toBe(TOTAL - 5);
    expect(after.seen).toBe(5);
    // A red is due again within minutes, and has a red among its last three ratings.
    expect(after.struggling).toBe(2);
    expect(after.wheel).toBe(`Progress: ${after.memorized} of ${TOTAL} cards memorized, 5 seen`);
    expect(after.wheel).not.toBe(before.wheel);
    expect(after).toMatchObject(await expected(time));
  });

  it("updates the due and memorized counts after Practice", async () => {
    show(<LearnSession cards={cards} states={new Map()} onExit={() => {}} batchSize={5} store={store} clock={clock} />);
    await studyBatch();

    // A month on, every card learned is due and none is memorized yet.
    time += 30 * DAY;
    await showMenu();
    const before = counts();
    expect(before).toMatchObject({ unseen: TOTAL - 5, seen: 5, due: 5, memorized: 0 });

    const reviews = await store.getReviews();
    show(
      <PracticeSession
        cards={cards}
        states={replayReviews(reviews)}
        reviews={reviews}
        onExit={() => {}}
        store={store}
        clock={clock}
      />,
    );
    await studyBatch();

    await showMenu();
    const after = counts();
    expect(after.due).toBe(0);
    expect(after.memorized).toBe(5);
    expect(after.centre).toBe(`5of ${TOTAL}`);
    expect(after.wheel).toBe(`Progress: 5 of ${TOTAL} cards memorized, 5 seen`);
    expect(after).toMatchObject(await expected(time));
    // The solid layer of the wheel has grown from nothing.
    expect(host.querySelectorAll('[data-layer="memorized"]').length).toBeGreaterThan(0);
  });

  it("takes the counts again when the page comes back into view", async () => {
    await showMenu();
    expect(count("menu-unseen")).toBe(TOTAL);

    // A rating stored while the menu stays mounted, as sync from another device will do.
    await store.appendReview({ cardId: cards[0].id, direction: "forward", rating: "good", section: "learn", timestamp: clock() });
    act(() => void window.dispatchEvent(new Event("pageshow")));
    await until(() => count("menu-unseen") === TOTAL - 1, "the counts to be taken again");
    expect(count("menu-seen")).toBe(1);
  });

  it("leaves the counts alone after a Reverse sitting", async () => {
    show(<LearnSession cards={cards} states={new Map()} onExit={() => {}} batchSize={5} store={store} clock={clock} />);
    await studyBatch();
    time += 30 * DAY;
    await showMenu();
    const before = counts();

    const reviews = await store.getReviews();
    show(
      <PracticeSession
        cards={cards}
        states={replayReviews(reviews)}
        reviews={reviews}
        reverse
        onExit={() => {}}
        store={store}
        clock={clock}
      />,
    );
    await studyBatch(["again", "again", "again", "again", "again"]);

    await showMenu();
    expect(counts()).toEqual(before);
  });
});
