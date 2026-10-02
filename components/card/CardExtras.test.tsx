// @vitest-environment jsdom
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CardExtras, Reveal, withTrick } from "@/components/card";
import { fixtureCard } from "@/lib/deck/fixture";
import { LocalStore } from "@/lib/store";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const casa = fixtureCard("casa-house");
const ir = fixtureCard("ir-go");

let idb: IDBFactory;
let store: LocalStore;
let host: HTMLDivElement;
let root: Root;

/** A fresh connection to the same in-memory database: what a page gets after a reload. */
const openStore = () => new LocalStore({ indexedDB: idb, IDBKeyRange, deviceId: "device-a" });

/** Lets the store's reads and writes finish and React show the result. */
const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 30)));

async function mount(card = casa) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() =>
    root.render(
      <Reveal card={card} onRate={() => {}}>
        <CardExtras card={card} store={store} />
      </Reveal>,
    ),
  );
  await settle();
}

function unmount() {
  act(() => root.unmount());
  host.remove();
}

/** Throws the page away and opens it again on a new store connection. */
async function reload(card = casa) {
  await settle();
  unmount();
  store.close();
  store = openStore();
  await mount(card);
}

const q = <T extends HTMLElement = HTMLElement>(testId: string) =>
  host.querySelector<T>(`[data-testid="${testId}"]`);
const click = (testId: string) => act(async () => q(testId)!.click());
const note = () => q<HTMLTextAreaElement>("note")!;

/** Types into a textarea the way a browser does, so React's onChange fires. */
function type(testId: string, value: string) {
  const area = q<HTMLTextAreaElement>(testId)!;
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
  act(() => {
    setter.call(area, value);
    area.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

beforeEach(() => {
  idb = new IDBFactory();
  store = openStore();
});

afterEach(() => {
  unmount();
  store.close();
});

describe("note field", () => {
  it("sits inside the reveal and starts empty", async () => {
    await mount();
    expect(q("reveal")!.contains(q("card-extras"))).toBe(true);
    expect(note().value).toBe("");
    expect(await store.getNote(casa.id)).toBeUndefined();
  });

  it("saves as the user types, with no save button, and survives a reload", async () => {
    await mount();
    type("note", "casa");
    type("note", "casa sounds like castle");
    await reload();

    expect(note().value).toBe("casa sounds like castle");
    const saved = await store.getNote(casa.id);
    expect(saved).toMatchObject({ cardId: casa.id, text: "casa sounds like castle", synced: 0 });
  });

  it("keeps the last thing typed when keystrokes come quickly", async () => {
    await mount();
    for (const value of ["a", "ab", "abc", "abcd"]) type("note", value);
    await reload();
    expect(note().value).toBe("abcd");
  });

  it("saves an emptied note as empty", async () => {
    await mount();
    type("note", "wrong");
    type("note", "");
    await reload();
    expect(note().value).toBe("");
    expect((await store.getNote(casa.id))?.text).toBe("");
  });

  it("keeps one note per card", async () => {
    await mount();
    type("note", "house note");
    await reload(ir);
    expect(note().value).toBe("");
    type("note", "go note");
    await reload(casa);
    expect(note().value).toBe("house note");
  });

  it("shows the next card's note when the card changes without a remount", async () => {
    await store.saveNote(ir.id, "go note");
    await mount();
    type("note", "house note");
    act(() => root.render(<CardExtras card={ir} store={store} />));
    await settle();
    expect(note().value).toBe("go note");
    expect((await store.getNote(casa.id))?.text).toBe("house note");
  });
});

describe("suggest a trick", () => {
  it("fills an empty note with the card's trick and saves it", async () => {
    await mount();
    await click("suggest-trick");
    expect(note().value).toBe(casa.trick);
    await reload();
    expect(note().value).toBe(casa.trick);
  });

  it("can be edited afterwards, and the edit is what is kept", async () => {
    await mount();
    await click("suggest-trick");
    type("note", `${casa.trick} (mine)`);
    await reload();
    expect(note().value).toBe(`${casa.trick} (mine)`);
  });

  it("adds the trick under an existing note, and only once", async () => {
    await mount();
    type("note", "my own idea");
    await click("suggest-trick");
    await click("suggest-trick");
    expect(note().value).toBe(`my own idea\n${casa.trick}`);
    await reload();
    expect(note().value).toBe(`my own idea\n${casa.trick}`);
  });

  it("withTrick handles empty, blank and already-present text", () => {
    expect(withTrick("", "T")).toBe("T");
    expect(withTrick("  \n", "T")).toBe("T");
    expect(withTrick("mine\n", "T")).toBe("mine\nT");
    expect(withTrick("mine\nT", "T")).toBe("mine\nT");
  });
});

describe("something's off", () => {
  it("saves a report with a comment, which survives a reload", async () => {
    await mount();
    expect(q("report-comment")).toBeNull();
    await click("report-open");
    type("report-comment", "  The example sounds odd  ");
    await click("report-send");
    await settle();
    expect(q("report-sent")).not.toBeNull();
    expect(q("report-comment")).toBeNull();

    await reload();
    const reports = await store.getReports();
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ cardId: casa.id, comment: "The example sounds odd", synced: 0 });
  });

  it("saves a report with no comment", async () => {
    await mount();
    await click("report-open");
    await click("report-send");
    await settle();
    expect(await store.getReports()).toMatchObject([{ cardId: casa.id, comment: null }]);
  });

  it("saves nothing when cancelled", async () => {
    await mount();
    await click("report-open");
    type("report-comment", "never mind");
    await click("report-cancel");
    await settle();
    expect(q("report-comment")).toBeNull();
    expect(await store.getReports()).toEqual([]);
  });

  it("allows a second report on the same card", async () => {
    await mount();
    for (const comment of ["first", "second"]) {
      await click("report-open");
      type("report-comment", comment);
      await click("report-send");
      await settle();
    }
    expect((await store.getReports()).map((r) => r.comment).sort()).toEqual(["first", "second"]);
  });

  it("says so when the report cannot be saved, and keeps the comment", async () => {
    const broken = {
      getNote: () => store.getNote(casa.id),
      saveNote: (cardId: string, text: string) => store.saveNote(cardId, text),
      addReport: () => Promise.reject(new Error("storage full")),
    };
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    act(() => root.render(<CardExtras card={casa} store={broken} />));
    await settle();
    await click("report-open");
    type("report-comment", "odd");
    await click("report-send");
    await settle();
    expect(q("report-failed")).not.toBeNull();
    expect(q<HTMLTextAreaElement>("report-comment")!.value).toBe("odd");
  });
});
