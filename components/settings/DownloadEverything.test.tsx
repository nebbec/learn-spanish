// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { until } from "@/components/testing";
import { fixtureCard, fixtureDeck } from "@/lib/deck/fixture";
import { MEDIA_CACHE, cardMedia, deckMedia, type MediaCaches } from "@/lib/media";
import { DownloadEverything } from "./DownloadEverything";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const cards = fixtureDeck.cards;
const ALL = deckMedia(cards);
const loadCards = async () => cards;

let host: HTMLDivElement;
let root: Root;
let stored: Map<string, Response>;
let caches: MediaCaches;
let online: boolean;
/** Requests the server has not answered yet, when a test holds them back. */
let held: (() => void)[] | null;

/** Every file is ten bytes long. */
const fetchFile = async (url: string) => {
  if (held) await new Promise<void>((resolve) => held!.push(resolve));
  if (!online) throw new TypeError("Failed to fetch");
  return new Response("0123456789", { status: ALL.includes(url) ? 200 : 404 });
};

const q = (testId: string) => host.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
const text = (testId: string) => q(testId)?.textContent;

/** Clicks Download (or Try again) once the button is there. */
async function clickDownload() {
  const button = await until(() => q("download-all"), "the download button");
  act(() => button.click());
}

function mount(store: MediaCaches | null = caches) {
  act(() => root.render(<DownloadEverything loadCards={loadCards} caches={store} fetch={fetchFile} />));
}

beforeEach(() => {
  stored = new Map();
  online = true;
  held = null;
  caches = {
    async open(name) {
      expect(name).toBe(MEDIA_CACHE);
      return {
        match: async (url) => stored.get(url)?.clone(),
        put: async (url, response) => void stored.set(url, response),
      };
    },
  };
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("Download everything", () => {
  it("shows how much of the deck is on the device before anything is downloaded", async () => {
    mount();
    await until(() => q("media-status"), "the status");
    expect(text("media-status")).toBe("0 of 41 files on this device · 0 B");
    expect(text("download-all")).toBe("Download everything");
  });

  it("counts what the app has already stored by itself", async () => {
    // A content card: its still and two clips.
    for (const url of cardMedia(fixtureCard("casa-house"))) stored.set(url, new Response("0123456789"));
    mount();
    await until(() => q("media-status"), "the status");
    expect(text("media-status")).toBe("3 of 41 files on this device · 30 B");
  });

  it("downloads the whole deck, showing progress, then the total size", async () => {
    mount();
    held = [];
    await clickDownload();
    await until(() => q("download-progress"), "the progress line");
    expect(text("download-progress")).toBe("Downloading: 0 of 41 files");
    expect(q("download-all")).toBeNull();

    // Let the first few files through: the count moves and the bar follows it.
    held.splice(0).forEach((release) => release());
    await until(() => text("download-progress") !== "Downloading: 0 of 41 files", "the count to move");
    const bar = q("download-bar") as HTMLProgressElement;
    expect(bar.max).toBe(41);
    expect(bar.value).toBeGreaterThan(0);

    const waiting = held;
    held = null;
    waiting.forEach((release) => release());
    await until(() => q("media-status"), "the download to finish");

    expect(text("media-status")).toBe("All 41 files are on this device · 410 B");
    expect(q("download-all")).toBeNull();
    expect(q("download-failed")).toBeNull();
    expect([...stored.keys()].sort()).toEqual([...ALL].sort());
  });

  it("says how many files failed with no connection, and finishes on a second try", async () => {
    mount();
    online = false;
    await clickDownload();
    await until(() => q("download-failed"), "the failure message");
    expect(text("download-failed")).toContain("41 files could not be downloaded");
    expect(text("media-status")).toBe("0 of 41 files on this device · 0 B");
    expect(text("download-all")).toBe("Try again");

    online = true;
    await clickDownload();
    await until(() => text("media-status")?.startsWith("All 41 files"), "the second try to finish");
    expect(q("download-failed")).toBeNull();
  });

  it("says so when the browser cannot store files", async () => {
    mount(null);
    await until(() => q("download-unavailable"), "the message");
    expect(q("download-all")).toBeNull();
  });
});
