import { afterEach, describe, expect, it, vi } from "vitest";
import { LANGS } from "@/lang/index";
import { candidatesFor, GERMAN_CANDIDATES, ITEMS, ITEMS_DE, outDir } from "./voice-test.mjs";

// The voice test (G1, DE11): Spanish's set and page as before; German's set spoken by
// OpenAI voices with lang/de.ts's model and instruction, so only the voice differs.

afterEach(() => vi.unstubAllGlobals());

describe("voice test", () => {
  it("keeps G1's Spanish set and folder", () => {
    expect(ITEMS).toHaveLength(24);
    expect(ITEMS[0]).toEqual({ n: 1, text: "el perro", tests: "trilled rr" });
    expect(outDir("es")).toMatch(/content\/\.cache\/voice-test$/);
    expect(Object.keys(candidatesFor("es"))).toEqual(["azure", "google", "elevenlabs", "openai"]);
  });

  it("has a German set of 20 words and 4 sentences covering the sounds the PRD names", () => {
    expect(ITEMS_DE).toHaveLength(24);
    const words = ITEMS_DE.slice(0, 20).map((item) => item.text);
    const sentences = ITEMS_DE.slice(20).map((item) => item.text);
    expect(words.every((w) => !/[.?!]$/.test(w))).toBe(true);
    expect(sentences.every((s) => /[.?!]$/.test(s))).toBe(true);
    const all = ITEMS_DE.map((item) => item.text).join(" ");
    for (const sound of ["ich", "ach", "ü", "ö", "ei", "ie", "sp", "St", "der ", "die ", "das "]) expect(all).toContain(sound);
    expect(words).toContain("der Tag");
    expect(words).toContain("anrufen");
    expect(new Set(ITEMS_DE.map((item) => item.n)).size).toBe(24);
    expect(outDir("de")).toMatch(/content\/\.cache\/voice-test-de$/);
  });

  it("offers three or four OpenAI voices for German, the config's own among them", () => {
    expect(GERMAN_CANDIDATES.length).toBeGreaterThanOrEqual(3);
    expect(GERMAN_CANDIDATES.length).toBeLessThanOrEqual(4);
    expect(GERMAN_CANDIDATES).toContain(LANGS.de.voice.voice);
    const candidates = candidatesFor("de", ["marin", "cedar"]);
    expect(Object.keys(candidates)).toEqual(["marin", "cedar"]);
    expect(candidates.marin.keys).toEqual(["OPENAI_API_KEY"]);
    expect(candidates.marin.label).toBe(`${LANGS.de.voice.model} marin`);
  });

  it("speaks German with lang/de.ts's model and instruction, changing only the voice", async () => {
    const fetch = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));
    vi.stubGlobal("fetch", fetch);
    const clip = await candidatesFor("de").sage.speak("ich", "sage");
    expect([...clip]).toEqual([1, 2, 3]);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/audio/speech");
    expect(JSON.parse(init.body as string)).toEqual({
      model: LANGS.de.voice.model,
      voice: "sage",
      input: "ich",
      instructions: LANGS.de.voice.instructions,
      response_format: "mp3",
    });
  });
});
