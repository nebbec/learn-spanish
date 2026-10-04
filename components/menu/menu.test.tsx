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
/** The fixture with no units, so every Learn batch is cut by size and the Learn button shows the count. */
const loadPlain = async () => ({ cards, units: [] });
const loadWithUnits = async () => ({ cards, units: fixtureDeck.units });

const q = (testId: string) => host.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
const count = (testId: string) => Number(q(testId)!.textContent);
const href = (testId: string) => q(testId)!.getAttribute("href");
const click = (testId: string) => act(() => q(testId)!.click());
const tapPetal = (pos: string) =>
  act(() => host.querySelector<SVGGElement>(`[data-pos="${pos}"]`)!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
const press = (key: string) =>
  act(() => void document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })));
/** Runs `read` with the Practice options sheet open, then closes it by its scrim. */
function inPracticeSheet<T>(read: () => T): T {
  click("practice-options");
  const result = read();
  click("practice-sheet-scrim");
  return result;
}

/** Replaces whatever is on screen, the way moving to another route does. */
function show(screen: ReactNode) {
  act(() => root.unmount());
  root = createRoot(host);
  act(() => root.render(screen));
}

/** Waits for the menu's counts to be drawn, however long the store takes to load them. */
async function showMenu(loadDeck: typeof loadWithUnits = loadPlain, extra: { status?: ReactNode; syncFailed?: boolean } = {}) {
  show(<MenuScreen onNavigate={(to) => visited.push(to)} store={store} loadDeck={loadDeck} clock={clock} {...extra} />);
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

/** The counts the menu shows, read off the screen: the wheel's label carries seen and memorized. */
function counts() {
  const wheel = q("wheel")!.getAttribute("aria-label")!;
  const [, memorized, , seen] = wheel.match(/^Progress: (\d+) of (\d+) cards memorized, (\d+) seen$/)!.map(Number);
  return {
    unseen: count("menu-unseen"),
    due: Number(q("menu-due")!.dataset.count),
    seen,
    memorized,
    struggling: inPracticeSheet(() => count("menu-struggling-count")),
    legend: `${q("legend-seen")!.textContent} · ${q("legend-memorized")!.textContent}`,
    wheel,
  };
}

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
  it("shows the whole deck as unseen, an empty wheel and ¡Hola!", async () => {
    await showMenu();
    expect(counts()).toEqual({
      unseen: TOTAL,
      due: 0,
      seen: 0,
      memorized: 0,
      struggling: 0,
      legend: "0% seen · 0% memorized",
      wheel: `Progress: 0 of ${TOTAL} cards memorized, 0 seen`,
    });
    expect(q("menu-greeting")!.textContent).toBe("¡Hola!");
    expect(q("menu-due")!.textContent).toBe("Nothing due yet");
    expect(q("wheel-centre-dot")).not.toBeNull();
  });

  it("links to Learn and Practice, and has the idle mascot and no title", async () => {
    await showMenu();
    expect(href("menu-learn")).toBe("/learn");
    expect(href("menu-practice")).toBe("/practice");
    expect(q("mascot-slot")!.querySelector<HTMLElement>('[data-testid="mascot"]')!.dataset.pose).toBe("idle");
    expect(host.querySelectorAll("h1")).toHaveLength(1);
    expect(host.querySelector("h1")!.getAttribute("lang")).toBe("es");
    // Tips, Settings and the options are in the sheets, which start closed.
    expect(q("menu-sheet")).toBeNull();
    expect(q("practice-sheet")).toBeNull();
    expect(q("menu-settings")).toBeNull();
  });

  it("opens Practice for a part of speech when its petal is tapped", async () => {
    await showMenu();
    tapPetal("verb");
    expect(visited).toEqual(["/practice?pos=verb"]);
  });
});

describe("the menu sheet", () => {
  it("opens from the menu button with Tips, Settings and the sync status, and closes on its scrim", async () => {
    await showMenu(loadPlain, { status: <p data-testid="sync-status">Synced just now.</p> });
    expect(q("menu-open")!.getAttribute("aria-expanded")).toBe("false");
    click("menu-open");
    expect(q("menu-open")!.getAttribute("aria-expanded")).toBe("true");
    const sheet = q("menu-sheet")!;
    expect(sheet.getAttribute("role")).toBe("dialog");
    expect(sheet.getAttribute("aria-modal")).toBe("true");
    expect(href("menu-tips")).toBe("/tips");
    expect(href("menu-settings")).toBe("/settings");
    expect(sheet.contains(q("sync-status"))).toBe(true);
    // The page behind the sheet is out of reach.
    expect(q("menu")!.hasAttribute("inert")).toBe(true);

    click("menu-sheet-scrim");
    expect(q("menu-sheet")).toBeNull();
    expect(q("menu")!.hasAttribute("inert")).toBe(false);
  });

  it("closes on Escape and on its handle, handing focus back to the button that opened it", async () => {
    await showMenu();
    act(() => q("menu-open")!.focus());
    click("menu-open");
    expect(document.activeElement).toBe(q("menu-sheet"));
    press("Escape");
    expect(q("menu-sheet")).toBeNull();
    expect(document.activeElement).toBe(q("menu-open"));

    click("menu-open");
    act(() => q("menu-sheet")!.querySelector<HTMLElement>('button[aria-label="Close"]')!.click());
    expect(q("menu-sheet")).toBeNull();
  });

  it("puts a dot on the menu button when sync has failed", async () => {
    await showMenu();
    expect(q("menu-sync-dot")).toBeNull();
    expect(q("menu-open")!.getAttribute("aria-label")).toBe("Menu");

    await showMenu(loadPlain, { syncFailed: true });
    expect(q("menu-sync-dot")).not.toBeNull();
    expect(q("menu-open")!.getAttribute("aria-label")).toBe("Menu, sync failed");
  });
});

describe("the Practice options sheet", () => {
  it("links to each option, with the struggling count", async () => {
    await showMenu();
    click("practice-options");
    expect(q("practice-sheet")!.getAttribute("aria-labelledby")).toBe("practice-options-heading");
    expect(href("menu-shuffle")).toBe("/practice?mode=shuffle");
    expect(href("menu-in-order")).toBe("/practice?mode=in-order");
    expect(href("menu-struggling")).toBe("/practice?mode=struggling");
    expect(q("menu-struggling")!.textContent).toContain("0 cards with a recent red");
  });

  it("adds Reverse to every Practice link while the switch is on, and tags the Practice button", async () => {
    await showMenu();
    expect(q("menu-reverse-tag")).toBeNull();
    click("practice-options");
    expect(q("menu-reverse")!.getAttribute("aria-checked")).toBe("false");
    click("menu-reverse");
    expect(q("menu-reverse")!.getAttribute("aria-checked")).toBe("true");
    expect(href("menu-shuffle")).toBe("/practice?mode=shuffle&reverse=1");
    expect(href("menu-struggling")).toBe("/practice?mode=struggling&reverse=1");
    click("practice-sheet-scrim");

    expect(q("menu-reverse-tag")!.textContent).toBe("Reverse on");
    expect(href("menu-practice")).toBe("/practice?reverse=1");
    expect(href("menu-learn")).toBe("/learn");
    tapPetal("noun");
    expect(visited).toEqual(["/practice?pos=noun&reverse=1"]);

    // The switch keeps its place while the sheet is shut and opened again.
    click("practice-options");
    expect(q("menu-reverse")!.getAttribute("aria-checked")).toBe("true");
    click("menu-reverse");
    click("practice-sheet-scrim");
    expect(q("menu-reverse-tag")).toBeNull();
    expect(href("menu-practice")).toBe("/practice");
  });

  it("starts with Reverse off each time the menu opens", async () => {
    await showMenu();
    click("practice-options");
    click("menu-reverse");
    await showMenu();
    expect(q("menu-reverse-tag")).toBeNull();
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
    expect(q("menu-due")!.textContent).toBe("5 due");
    expect(q("menu-greeting")!.textContent).toBe("¡Vamos!");

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
    expect(after.legend).toBe("31% seen · 31% memorized");
    expect(after.wheel).toBe(`Progress: 5 of ${TOTAL} cards memorized, 5 seen`);
    expect(after).toMatchObject(await expected(time));
    // The full-colour layer of the wheel has grown from nothing, so the centre dot has gone.
    expect([...host.querySelectorAll('[data-layer="memorized"]')].some((path) => path.getAttribute("d"))).toBe(true);
    expect(q("wheel-centre-dot")).toBeNull();
    expect(q("menu-due")!.textContent).toBe("Nothing due");
  });

  it("takes the counts again when the page comes back into view", async () => {
    await showMenu();
    expect(count("menu-unseen")).toBe(TOTAL);

    // A rating stored while the menu stays mounted, as sync from another device will do.
    await store.appendReview({ cardId: cards[0].id, direction: "forward", rating: "good", section: "learn", timestamp: clock() });
    act(() => void window.dispatchEvent(new Event("pageshow")));
    await until(() => count("menu-unseen") === TOTAL - 1, "the counts to be taken again");
    expect(counts().seen).toBe(1);
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

describe("the Learn button in the starter path", () => {
  it("names the unit the next batch studies in place of the count, then the count after the last unit", async () => {
    await showMenu(loadWithUnits);
    expect(q("menu-unit")?.textContent).toBe("Unit 1 · Where I go");
    expect(q("menu-unseen")).toBeNull();

    show(<LearnSession cards={cards} units={fixtureDeck.units} states={new Map()} onExit={() => {}} store={store} clock={clock} />);
    await studyBatch();
    await showMenu(loadWithUnits);
    expect(q("menu-unit")?.textContent).toBe("Unit 2 · Good things");

    show(
      <LearnSession
        cards={cards}
        units={fixtureDeck.units}
        states={replayReviews(await store.getReviews())}
        onExit={() => {}}
        store={store}
        clock={clock}
      />,
    );
    await studyBatch();
    await showMenu(loadWithUnits);
    expect(q("menu-unit")).toBeNull();
    expect(count("menu-unseen")).toBe(TOTAL - 7);
  });
});

describe("the line under the mascot", () => {
  it("says ¡Hola!, then ¡Vamos! part-way through a unit, ¡Muy bien! once it is done, and ¡Vamos! when cards fall due", async () => {
    await showMenu(loadWithUnits);
    expect(q("menu-greeting")!.textContent).toBe("¡Hola!");

    // One card of unit 1 seen: the unit still has unseen cards.
    await store.appendReview({ cardId: "casa-house", direction: "forward", rating: "good", section: "learn", timestamp: clock() });
    await showMenu(loadWithUnits);
    expect(q("menu-greeting")!.textContent).toBe("¡Vamos!");
    expect(q("menu-greeting")!.dataset.greeting).toBe("vamos");

    show(
      <LearnSession
        cards={cards}
        units={fixtureDeck.units}
        states={replayReviews(await store.getReviews())}
        onExit={() => {}}
        store={store}
        clock={clock}
      />,
    );
    await studyBatch();
    // Unit 1 finished and nothing due yet: a good place to stop.
    await showMenu(loadWithUnits);
    expect(q("menu-unit")?.textContent).toBe("Unit 2 · Good things");
    expect(Number(q("menu-due")!.dataset.count)).toBe(0);
    expect(q("menu-greeting")!.textContent).toBe("¡Muy bien!");

    time += 30 * DAY;
    await showMenu(loadWithUnits);
    expect(q("menu-greeting")!.textContent).toBe("¡Vamos!");
  });
});
