// @vitest-environment jsdom
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MenuScreen } from "@/components/menu";
import { LearnSession } from "@/components/session";
import { StartOver } from "@/components/settings";
import { until } from "@/components/testing";
import { fixtureDeck } from "@/lib/deck/fixture";
import { replayReviews } from "@/lib/scheduler";
import { LocalStore } from "@/lib/store";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { cards, units } = fixtureDeck;
const START = Date.UTC(2026, 9, 2, 9, 0, 0);

let store: LocalStore;
let host: HTMLDivElement;
let root: Root;
let time: number;
/** A clock that moves on a second each time it is read. */
const clock = () => (time += 1000);
const loadDeck = async () => ({ cards, units });

const q = (testId: string) => host.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
const click = (testId: string) => act(() => q(testId)!.click());

function show(screen: ReactNode) {
  act(() => root.unmount());
  root = createRoot(host);
  act(() => root.render(screen));
}

async function showMenu() {
  show(<MenuScreen onNavigate={() => {}} store={store} loadDeck={loadDeck} clock={clock} />);
  await until(() => q("menu"), "the menu to load");
}

/** Opens Learn the way LearnScreen does: states from the reviews since the latest reset. */
async function showLearn() {
  const states = replayReviews(await store.getReviewsSinceReset());
  show(<LearnSession cards={cards} units={units} states={states} onExit={() => {}} store={store} clock={clock} />);
  await until(() => q("intro-es") ?? q("card-front"), "Learn to start");
}

/** Rates every card in the batch green, passing each intro with "Got it". */
async function studyBatch() {
  let shown = 0;
  while (!q("batch-end")) {
    if (shown > 50) throw new Error("The batch never ended");
    if (q("intro")) {
      click("intro-got-it");
      continue;
    }
    click("card-front");
    click("rate-good");
    await until(() => !q("reveal"), "the rated card to leave the screen");
    shown += 1;
  }
}

beforeEach(() => {
  store = new LocalStore({ indexedDB: new IDBFactory(), IDBKeyRange, deviceId: "device-a" });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  time = START;
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  store.close();
});

describe("Start over", () => {
  it("clears progress on the fixture: nothing seen, Learn at the first card, notes kept", async () => {
    // Study unit 1 and write a note.
    await showLearn();
    await studyBatch();
    await store.saveNote(cards[0].id, "my note", clock());
    const studied = (await store.getReviews()).length;

    await showMenu();
    expect(Number(q("menu-seen")!.textContent)).toBeGreaterThan(0);
    expect(q("menu-unit")!.textContent).toContain("Unit 2");

    const onDone = vi.fn();
    show(<StartOver store={store} clock={clock} onDone={onDone} />);
    click("start-over");
    expect(q("start-over-confirm")).not.toBeNull();
    click("start-over-confirm");
    await until(() => q("start-over-done"), "the reset to be stored");
    // A sync is asked for, so the reset reaches the account's other devices (L16).
    expect(onDone).toHaveBeenCalledTimes(1);
    expect((await store.listUnsynced()).resets).toHaveLength(1);

    // The menu shows nothing seen and Learn offers unit 1 again.
    await showMenu();
    expect(Number(q("menu-seen")!.textContent)).toBe(0);
    expect(Number(q("menu-memorized")!.textContent)).toBe(0);
    expect(Number(q("menu-due")!.textContent)).toBe(0);
    expect(Number(q("menu-struggling-count")!.textContent)).toBe(0);
    expect(q("menu-unit")!.textContent).toContain("Unit 1");

    // Learn starts at the first card.
    await showLearn();
    expect(q("intro-es")!.textContent).toBe(cards[0].es);

    // The note is still there, and so are the old reviews, which no longer count.
    expect((await store.getNote(cards[0].id))?.text).toBe("my note");
    expect(await store.getReviews()).toHaveLength(studied);
    expect(await store.getReviewsSinceReset()).toEqual([]);
    expect(await store.getAllCardStates()).toEqual([]);

    // Studying after the reset counts again.
    await studyBatch();
    await showMenu();
    expect(Number(q("menu-seen")!.textContent)).toBeGreaterThan(0);
  });

  it("asks first, and Cancel stores nothing", async () => {
    await store.appendReview({ cardId: cards[0].id, direction: "forward", rating: "good", section: "learn", timestamp: clock() });
    const onDone = vi.fn();
    show(<StartOver store={store} clock={clock} onDone={onDone} />);
    expect(q("start-over-confirm")).toBeNull();
    click("start-over");
    click("start-over-cancel");
    expect(q("start-over-confirm")).toBeNull();
    expect(q("start-over")).not.toBeNull();
    expect(await store.getResets()).toEqual([]);
    expect(await store.getReviewsSinceReset()).toHaveLength(1);
    expect(onDone).not.toHaveBeenCalled();
  });

  it("says so when the reset cannot be stored", async () => {
    const onDone = vi.fn();
    show(<StartOver store={{ startOver: () => Promise.reject(new Error("blocked")) }} clock={clock} onDone={onDone} />);
    click("start-over");
    // The refusal settles at once, so the tap waits for it inside act.
    await act(async () => q("start-over-confirm")!.click());
    await until(() => q("start-over-failed"), "the failure to show");
    expect(onDone).not.toHaveBeenCalled();
  });
});
