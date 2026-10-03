import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ROUTES } from "@/lib/routes";

// Runs public/sw.js itself against a pretend browser: a server that can be
// switched off, and a cache store. The real-browser check is in the D1 notes.

const SOURCE = readFileSync(path.join(__dirname, "..", "..", "public", "sw.js"), "utf8");
const ORIGIN = "https://app.test";

const CHUNK = "/_next/static/chunks/main-abc123.js";
const LAZY_CHUNK = "/_next/static/chunks/lazy-def456.js";
const CSS = "/_next/static/css/app-789.css";
const FONT = "/_next/static/media/nunito-latin.woff2";

const page = (name: string) =>
  `<html><head><link rel="stylesheet" href="${CSS}?dpl=1"><script src="${CHUNK}"></script></head>` +
  `<body>${name}<script>self.__next_f.push([1,"[\\"${LAZY_CHUNK}\\"]"])</script></body></html>`;

function site(): Record<string, string> {
  return {
    "/": page("menu"),
    "/learn": page("learn"),
    "/practice": page("practice"),
    "/settings": page("settings"),
    "/tips": page("tips"),
    "/deck/deck.json": '{"version":1,"cards":[]}',
    "/manifest.webmanifest": "{}",
    "/icon-192.png": "png",
    "/icon-512.png": "png",
    "/apple-touch-icon.png": "png",
    [CHUNK]: "main()",
    [LAZY_CHUNK]: "lazy()",
    [CSS]: `@font-face{src:url(../media/nunito-latin.woff2) format("woff2")}`,
    [FONT]: "font",
    "/deck/img/casa.svg": "<svg/>",
  };
}

type Stored = Map<string, Response>;

const pathOf = (key: string | { url: string }) => new URL(typeof key === "string" ? key : key.url, ORIGIN).pathname;

class FakeCaches {
  stores = new Map<string, Stored>();
  async open(name: string) {
    if (!this.stores.has(name)) this.stores.set(name, new Map());
    const store = this.stores.get(name)!;
    return {
      put: async (key: string, response: Response) => void store.set(pathOf(key), response),
      match: async (key: string) => store.get(pathOf(key))?.clone(),
    };
  }
  async match(key: string) {
    for (const store of this.stores.values()) {
      const hit = store.get(pathOf(key));
      if (hit) return hit.clone();
    }
    return undefined;
  }
  async keys() {
    return [...this.stores.keys()];
  }
  async delete(name: string) {
    return this.stores.delete(name);
  }
}

interface FetchEventLike {
  request: { url: string; method: string; mode: string; headers: Headers };
  respondWith(response: Promise<Response>): void;
  waitUntil(work: Promise<unknown>): void;
}

function browser(version = "one") {
  const files = site();
  const caches = new FakeCaches();
  const listeners = new Map<string, (event: never) => void>();
  const state = { online: true, requests: [] as string[], skippedWaiting: false, claimed: false };

  const fetch = async (input: string | { url: string }) => {
    const url = new URL(typeof input === "string" ? input : input.url, ORIGIN);
    state.requests.push(url.pathname);
    if (!state.online) throw new TypeError("Failed to fetch");
    const body = files[url.pathname];
    return body === undefined ? new Response("Not found", { status: 404 }) : new Response(body, { status: 200 });
  };

  const self = {
    location: new URL(`${ORIGIN}/sw.js?v=${version}`),
    addEventListener: (type: string, listener: (event: never) => void) => listeners.set(type, listener),
    skipWaiting: async () => void (state.skippedWaiting = true),
    clients: { claim: async () => void (state.claimed = true) },
  };

  new Function("self", "caches", "fetch", SOURCE)(self, caches, fetch);

  /** Fires `install` or `activate` and waits for the worker to finish. */
  const lifecycle = async (type: "install" | "activate") => {
    const work: Promise<unknown>[] = [];
    listeners.get(type)!({ waitUntil: (p: Promise<unknown>) => work.push(p) } as never);
    await Promise.all(work);
  };

  /** Sends a request through the worker. Null means the worker left it to the browser. */
  const request = async (url: string, options: { mode?: string; method?: string; headers?: HeadersInit } = {}) => {
    let answer: Promise<Response> | null = null;
    const background: Promise<unknown>[] = [];
    const event: FetchEventLike = {
      request: {
        url: new URL(url, ORIGIN).href,
        method: options.method ?? "GET",
        mode: options.mode ?? "cors",
        headers: new Headers(options.headers),
      },
      respondWith: (response) => void (answer = response),
      waitUntil: (work) => void background.push(work),
    };
    listeners.get("fetch")!(event as never);
    if (!answer) return null;
    const response = await (answer as Promise<Response>);
    await Promise.all(background);
    return response;
  };

  const text = async (url: string, options?: Parameters<typeof request>[1]) => (await request(url, options))?.text();

  return { files, caches, state, lifecycle, request, text };
}

async function installed(version = "one") {
  const b = browser(version);
  await b.lifecycle("install");
  await b.lifecycle("activate");
  return b;
}

describe("service worker", () => {
  it("stores every route, the deck, and the scripts, styles and fonts the pages name", async () => {
    const b = await installed();
    const shell = b.caches.stores.get("learn-spanish-shell-one")!;
    for (const href of Object.values(ROUTES)) expect(shell.has(href), href).toBe(true);
    for (const file of ["/deck/deck.json", "/manifest.webmanifest", CHUNK, LAZY_CHUNK, CSS, FONT]) {
      expect(shell.has(file), file).toBe(true);
    }
    expect(b.state.skippedWaiting).toBe(true);
    expect(b.state.claimed).toBe(true);
  });

  it("opens every page and loads the deck with no connection after one visit", async () => {
    const b = await installed();
    b.state.online = false;

    expect(await b.text("/", { mode: "navigate" })).toContain("menu");
    expect(await b.text("/learn", { mode: "navigate" })).toContain("learn");
    expect(await b.text("/practice?mode=shuffle&reverse=1", { mode: "navigate" })).toContain("practice");
    expect(await b.text("/settings", { mode: "navigate" })).toContain("settings");
    expect(await b.text("/deck/deck.json")).toBe(b.files["/deck/deck.json"]);
    expect(await b.text(CHUNK)).toBe("main()");
    expect(await b.text(`${CSS}?dpl=1`)).toContain("@font-face");
    expect(await b.text(FONT)).toBe("font");
  });

  it("does not finish installing when a page or the deck cannot be fetched", async () => {
    const missingDeck = browser();
    delete missingDeck.files["/deck/deck.json"];
    await expect(missingDeck.lifecycle("install")).rejects.toThrow("/deck/deck.json");
    expect(missingDeck.state.skippedWaiting).toBe(false);

    const offline = browser();
    offline.state.online = false;
    await expect(offline.lifecycle("install")).rejects.toThrow();
  });

  it("skips a build file that is missing", async () => {
    const b = browser();
    delete b.files[LAZY_CHUNK];
    await b.lifecycle("install");
    const shell = b.caches.stores.get("learn-spanish-shell-one")!;
    expect(shell.has(LAZY_CHUNK)).toBe(false);
    expect(shell.has(CHUNK)).toBe(true);
  });

  it("serves the network's copy of a page and the deck when online, and keeps it for later", async () => {
    const b = await installed();
    b.files["/"] = page("menu, second build");
    b.files["/deck/deck.json"] = '{"version":2,"cards":[]}';

    expect(await b.text("/", { mode: "navigate" })).toContain("second build");
    expect(await b.text("/deck/deck.json")).toContain('"version":2');

    b.state.online = false;
    expect(await b.text("/", { mode: "navigate" })).toContain("second build");
    expect(await b.text("/deck/deck.json")).toContain('"version":2');
  });

  it("keeps the stored page when the server answers with an error", async () => {
    const b = await installed();
    delete b.files["/learn"];
    expect(await b.text("/learn", { mode: "navigate" })).toContain("learn");
  });

  it("serves build files from the store without asking the network, and stores new ones", async () => {
    const b = await installed();
    b.state.requests.length = 0;
    await b.text(CHUNK);
    expect(b.state.requests).toEqual([]);

    b.files["/_next/static/chunks/new-1.js"] = "fresh()";
    expect(await b.text("/_next/static/chunks/new-1.js")).toBe("fresh()");
    b.state.online = false;
    expect(await b.text("/_next/static/chunks/new-1.js")).toBe("fresh()");
  });

  it("leaves in-app navigation data, writes and other sites to the browser", async () => {
    const b = await installed();
    expect(await b.request("/learn?_rsc=abc", { headers: { RSC: "1" } })).toBeNull();
    expect(await b.request("/learn", { headers: { rsc: "1" } })).toBeNull();
    expect(await b.request("/api/anything", { method: "POST" })).toBeNull();
    expect(await b.request("https://elsewhere.test/rest/v1/reviews")).toBeNull();
    expect(await b.request("/sw.js?v=one")).toBeNull();
  });

  it("reads art and audio from any cache but does not store them", async () => {
    const b = await installed();
    expect(await b.text("/deck/img/casa.svg")).toBe("<svg/>");
    b.state.online = false;
    await expect(b.request("/deck/img/casa.svg")).rejects.toThrow();

    const media = await b.caches.open("learn-spanish-media");
    await media.put("/deck/img/casa.svg", new Response("stored art"));
    expect(await b.text("/deck/img/casa.svg")).toBe("stored art");
  });

  it("answers a request for part of a stored clip with that part", async () => {
    const b = await installed();
    const media = await b.caches.open("learn-spanish-media");
    await media.put("/deck/audio/casa.word.wav", new Response("0123456789", { headers: { "Content-Type": "audio/wav" } }));
    b.state.online = false;
    const ask = (range: string) => b.request("/deck/audio/casa.word.wav", { headers: { Range: range } });

    const first = (await ask("bytes=0-1"))!;
    expect(first.status).toBe(206);
    expect(first.headers.get("Content-Range")).toBe("bytes 0-1/10");
    expect(first.headers.get("Content-Length")).toBe("2");
    expect(first.headers.get("Content-Type")).toBe("audio/wav");
    expect(await first.text()).toBe("01");

    const rest = (await ask("bytes=4-"))!;
    expect(rest.headers.get("Content-Range")).toBe("bytes 4-9/10");
    expect(await rest.text()).toBe("456789");

    const tail = (await ask("bytes=-3"))!;
    expect(tail.headers.get("Content-Range")).toBe("bytes 7-9/10");
    expect(await tail.text()).toBe("789");

    // An end past the file is cut to the file; a start past it cannot be answered.
    expect(await (await ask("bytes=8-99"))!.text()).toBe("89");
    const beyond = (await ask("bytes=10-20"))!;
    expect(beyond.status).toBe(416);
    expect(beyond.headers.get("Content-Range")).toBe("bytes */10");

    // No range, or one this worker does not read: the whole file.
    const whole = (await b.request("/deck/audio/casa.word.wav"))!;
    expect(whole.status).toBe(200);
    expect(await whole.text()).toBe("0123456789");
    expect((await ask("bytes=0-1, 4-5"))!.status).toBe(200);
  });

  it("removes the previous build's cache on activation and leaves other caches alone", async () => {
    const b = await installed("one");
    const media = await b.caches.open("learn-spanish-media");
    await media.put("/deck/img/casa.svg", new Response("stored art"));

    // The next build's worker, in the same browser.
    const next = browser("two");
    next.caches.stores = b.caches.stores;
    await next.lifecycle("install");
    expect(await next.caches.keys()).toContain("learn-spanish-shell-one");
    await next.lifecycle("activate");
    expect((await next.caches.keys()).sort()).toEqual(["learn-spanish-media", "learn-spanish-shell-two"]);
  });
});
