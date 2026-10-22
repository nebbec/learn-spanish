import { afterEach, describe, expect, it, vi } from "vitest";
import { VOICE } from "@/scripts/content/audio.mjs";
import { LANG, LANGS, langConfig, storageNames } from "./index";

// What the app keeps on the device, by language. The Spanish names are written
// out here as they were before DE1, so a change to the config that would lose
// a Spanish learner's progress fails this test (docs/german.md, "Decided in DE1").
const SPANISH = {
  database: "learn-spanish",
  muted: "learn-spanish.muted",
  deviceId: "learn-spanish.device-id",
  installDismissed: "learn-spanish.install-dismissed",
  lastSync: "learn-spanish.last-sync",
  auth: "learn-spanish.auth",
  syncedEvent: "learn-spanish:synced",
  shellPrefix: "learn-spanish-shell-",
  mediaCache: "learn-spanish-media",
};
const GERMAN = {
  database: "learn-german",
  muted: "learn-german.muted",
  deviceId: "learn-german.device-id",
  installDismissed: "learn-german.install-dismissed",
  lastSync: "learn-german.last-sync",
  auth: "learn-german.auth",
  syncedEvent: "learn-german:synced",
  shellPrefix: "learn-german-shell-",
  mediaCache: "learn-german-media",
};
const SPANISH_MASCOT = {
  idle: { webm: "/mascot/idle.webm", hevc: "/mascot/idle.mov", poster: "/mascot/idle.webp" },
  celebrate: { webm: "/mascot/celebrate.webm", hevc: "/mascot/celebrate.mov", poster: "/mascot/celebrate.webp" },
  still: "/mascot/concha.webp",
};

describe("language config", () => {
  it("is Spanish when NEXT_PUBLIC_LANG is unset or empty, and refuses an unknown code", () => {
    expect(LANG.code).toBe("es");
    expect(langConfig(undefined)).toBe(LANGS.es);
    expect(langConfig("")).toBe(LANGS.es);
    expect(langConfig("de")).toBe(LANGS.de);
    expect(() => langConfig("fr")).toThrow('Unknown NEXT_PUBLIC_LANG "fr"');
  });

  it("keeps every Spanish name on the device as it was", () => {
    expect(storageNames(LANGS.es)).toEqual(SPANISH);
  });

  it("gives German its own names, none shared with Spanish", () => {
    expect(storageNames(LANGS.de)).toEqual(GERMAN);
    const spanish = new Set(Object.values(SPANISH));
    for (const name of Object.values(GERMAN)) expect(spanish.has(name), name).toBe(false);
  });

  it("names each language's app, tag and deck", () => {
    expect(LANGS.es).toMatchObject({ tag: "es", appName: "Learn Spanish", shortName: "Spanish", deckPath: "/deck/" });
    expect(LANGS.de).toMatchObject({ tag: "de", appName: "Learn German", shortName: "German", deckPath: "/deck-de/" });
    expect(LANGS.es.contentDir).toBe("content");
    expect(LANGS.de.contentDir).toBe("content/de");
  });

  it("holds the Spanish voice the audio script reads, so no clip path changes", () => {
    expect(LANGS.es.voice).toEqual(VOICE);
  });
});

/** The modules that name a storage key or path, loaded fresh for one language. */
async function loadUnder(lang: string) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_LANG", lang);
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  });
  const [db, audio, auth, pwa, runner, media, deck, mascot, greeting] = await Promise.all([
    import("@/lib/store/db"),
    import("@/components/audio/audio"),
    import("@/lib/auth/auth"),
    import("@/lib/pwa/install"),
    import("@/lib/sync/runner"),
    import("@/lib/media/media"),
    import("@/lib/deck/load"),
    import("@/components/motion/Mascot"),
    import("@/lib/progress/greeting"),
  ]);
  db.getDeviceId();
  return {
    names: {
      database: db.DB_NAME,
      muted: audio.MUTED_KEY,
      deviceId: [...store.keys()].join(","),
      installDismissed: pwa.INSTALL_DISMISSED_KEY,
      lastSync: runner.LAST_SYNC_KEY,
      auth: auth.AUTH_STORAGE_KEY,
      syncedEvent: runner.SYNCED_EVENT,
      mediaCache: media.MEDIA_CACHE,
    },
    deckUrl: deck.DECK_URL,
    mascot: mascot.MASCOT_FILES,
    greetings: greeting.GREETING_TEXT,
    serviceWorker: pwa.serviceWorkerUrl("b1"),
  };
}

/** The names the page itself uses: the shell cache is the service worker's, checked in lib/pwa/sw.test.ts. */
const pageNames = (names: Record<string, string>) =>
  Object.fromEntries(Object.entries(names).filter(([key]) => key !== "shellPrefix"));

describe("what the app stores, by build", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("Spanish build (NEXT_PUBLIC_LANG unset): the same database, keys, caches, deck and mascot as before", async () => {
    const built = await loadUnder("");
    expect(built.names).toEqual(pageNames(SPANISH));
    expect(built.deckUrl).toBe("/deck/deck.json");
    expect(built.mascot).toEqual(SPANISH_MASCOT);
    expect(built.greetings).toEqual({ hola: "¡Hola!", vamos: "¡Vamos!", "muy-bien": "¡Muy bien!" });
    expect(built.serviceWorker).toBe("/sw.js?v=b1&lang=es");
  });

  it("German build (NEXT_PUBLIC_LANG=de): the German names and deck", async () => {
    const built = await loadUnder("de");
    expect(built.names).toEqual(pageNames(GERMAN));
    expect(built.deckUrl).toBe("/deck-de/deck.json");
    expect(built.greetings).toEqual(LANGS.de.greetings);
    expect(built.serviceWorker).toBe("/sw.js?v=b1&lang=de");
  });
});
