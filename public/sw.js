// Service worker: keeps the app shell and the deck on the device, so the app
// opens with no connection after one online visit. Hand-written, no library
// (see docs/design.md, "Installable app"). lib/pwa/sw.test.ts runs this file.
//
// The page registers it as /sw.js?v=<build id>. A new build registers a new
// URL, which installs a fresh worker with its own cache and removes the old one.

const VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
const SHELL_PREFIX = "learn-spanish-shell-";
const SHELL = SHELL_PREFIX + VERSION;

// Every route is a static page, so its HTML can be stored as it is.
const PAGES = ["/", "/learn", "/practice", "/settings", "/tips"];
const FILES = ["/deck/deck.json", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"];

// The hero mascot (F3): its two loops, their posters and the still. Stored with
// the pages, so the menu and the batch end play them offline. Safari asks for
// video in byte ranges, so they are answered like art and audio.
const MASCOT_PATH = "/mascot/";
const MASCOT = ["idle.mp4", "idle.webp", "celebrate.mp4", "celebrate.webp", "concha.webp"].map((file) => MASCOT_PATH + file);

// Art and audio are not stored here. The page fills a cache of its own
// (lib/media), which this worker reads but never writes or deletes.
const MEDIA_PATHS = ["/deck/img/", "/deck/audio/"];
const STATIC_PATH = "/_next/static/";

// How long a request may wait for the network before the stored copy is used.
const NETWORK_TIMEOUT_MS = 3000;

/** The scripts, styles and fonts a page's HTML names, as paths without a query. */
function staticAssets(html) {
  const found = new Set();
  for (const match of html.matchAll(/\/_next\/static\/[A-Za-z0-9_\-.~%@()[\]/]+/g)) {
    found.add(match[0]);
  }
  return found;
}

/** The files a stylesheet loads (fonts), resolved against the stylesheet's own path. */
function stylesheetAssets(css, cssPath) {
  const found = new Set();
  for (const match of css.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/g)) {
    if (match[1].startsWith("data:")) continue;
    const url = new URL(match[1], new URL(cssPath, self.location.origin));
    if (url.origin === self.location.origin && url.pathname.startsWith(STATIC_PATH)) found.add(url.pathname);
  }
  return found;
}

const storable = (response) => response.status === 200;

async function precache() {
  const cache = await caches.open(SHELL);
  const assets = new Set();

  // The pages, the deck and the mascot must all arrive, or the install fails and the browser tries again on the next visit.
  await Promise.all(
    [...PAGES, ...FILES, ...MASCOT].map(async (path) => {
      const response = await fetch(path, { cache: "reload" });
      if (!storable(response)) throw new Error(`Could not store ${path}: ${response.status}`);
      if (PAGES.includes(path)) {
        for (const asset of staticAssets(await response.clone().text())) assets.add(asset);
      }
      await cache.put(path, response);
    }),
  );

  // A path the pattern cut short gives a 404, which is skipped. A dropped connection still fails the install.
  const store = async (path) => {
    const response = await fetch(path);
    if (!storable(response)) return [];
    const inside = path.endsWith(".css") ? [...stylesheetAssets(await response.clone().text(), path)] : [];
    await cache.put(path, response);
    return inside;
  };
  const fonts = new Set((await Promise.all([...assets].map(store))).flat());
  await Promise.all([...fonts].filter((path) => !assets.has(path)).map(store));
}

/** Build files have a hash in their name and never change: the stored copy is always right. */
async function cacheFirst(request, key) {
  const cached = await caches.match(key);
  if (cached) return cached;
  const response = await fetch(request);
  if (storable(response)) {
    const cache = await caches.open(SHELL);
    await cache.put(key, response.clone());
  }
  return response;
}

/** Pages and the deck: the network's copy when it answers in time, otherwise the stored one. */
async function networkFirst(event, key) {
  const cache = await caches.open(SHELL);
  const network = fetch(event.request).then(async (response) => {
    if (storable(response)) await cache.put(key, response.clone());
    return response;
  });
  // A slow answer still refreshes the stored copy after the page has been served.
  event.waitUntil(network.catch(() => undefined));

  const cached = await cache.match(key);
  if (!cached) return network;
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), NETWORK_TIMEOUT_MS));
  const fresh = await Promise.race([network.catch(() => null), timeout]);
  return fresh && fresh.ok ? fresh : cached;
}

/**
 * The part of a stored file a request asks for. Safari asks for audio in byte
 * ranges and will not play a clip answered with the whole file.
 */
async function ranged(request, response) {
  const range = /^bytes=(\d*)-(\d*)$/.exec((request.headers.get("range") || "").trim());
  if (!range || (range[1] === "" && range[2] === "")) return response;

  const body = await response.arrayBuffer();
  const size = body.byteLength;
  // "bytes=-500" is the last 500 bytes; "bytes=500-" is everything from byte 500.
  const start = range[1] === "" ? Math.max(0, size - Number(range[2])) : Number(range[1]);
  const end = range[1] === "" || range[2] === "" ? size - 1 : Math.min(Number(range[2]), size - 1);
  if (start > end) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  }

  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Content-Range": `bytes ${start}-${end}/${size}`,
    "Content-Length": String(end - start + 1),
  });
  const type = response.headers.get("Content-Type");
  if (type) headers.set("Content-Type", type);
  return new Response(body.slice(start, end + 1), { status: 206, statusText: "Partial Content", headers });
}

/** Art, audio and the mascot: whatever is stored, otherwise the network. */
async function storedOrNetwork(request, key) {
  const cached = await caches.match(key);
  return cached ? ranged(request, cached) : fetch(request);
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => name.startsWith(SHELL_PREFIX) && name !== SHELL).map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === "/sw.js") return;

  // Everything is stored under its path alone. Pages are static, so /practice?mode=shuffle is the same file as /practice.
  const key = url.pathname;

  if (url.pathname.startsWith(STATIC_PATH)) {
    event.respondWith(cacheFirst(request, key));
  } else if (request.mode === "navigate") {
    event.respondWith(networkFirst(event, key));
  } else if (request.headers.has("RSC") || url.searchParams.has("_rsc")) {
    // Next's in-app navigation data. Left to the network: when it fails, Next
    // loads the page in full instead, and that request is served above.
    return;
  } else if (url.pathname.startsWith(MASCOT_PATH) || MEDIA_PATHS.some((path) => url.pathname.startsWith(path))) {
    event.respondWith(storedOrNetwork(request, key));
  } else {
    event.respondWith(networkFirst(event, key));
  }
});
