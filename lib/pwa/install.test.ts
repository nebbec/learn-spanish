import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import { installPath, isIos, serviceWorkerUrl } from "./install";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const IPAD_AS_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36";

describe("install path", () => {
  it("knows an iPhone, and an iPad that calls itself a Mac", () => {
    expect(isIos({ userAgent: IPHONE, maxTouchPoints: 5 })).toBe(true);
    expect(isIos({ userAgent: IPAD_AS_MAC, maxTouchPoints: 5 })).toBe(true);
    expect(isIos({ userAgent: IPAD_AS_MAC, maxTouchPoints: 0 })).toBe(false);
    expect(isIos({ userAgent: ANDROID, maxTouchPoints: 5 })).toBe(false);
  });

  it("shows the Share-menu steps on an iPhone, waits for the browser elsewhere, and asks nothing once installed", () => {
    expect(installPath({ userAgent: IPHONE, maxTouchPoints: 5, standalone: false })).toBe("ios");
    expect(installPath({ userAgent: ANDROID, maxTouchPoints: 5, standalone: false })).toBe("browser");
    expect(installPath({ userAgent: IPHONE, maxTouchPoints: 5, standalone: true })).toBe("installed");
    expect(installPath({ userAgent: ANDROID, maxTouchPoints: 5, standalone: true })).toBe("installed");
  });

  it("gives each build its own service worker address", () => {
    expect(serviceWorkerUrl("abc123")).toBe("/sw.js?v=abc123");
    expect(serviceWorkerUrl(undefined)).toBe("/sw.js?v=dev");
  });
});

describe("manifest", () => {
  const publicDir = path.join(__dirname, "..", "..", "public");

  it("opens on the menu as a standalone app", () => {
    const m = manifest();
    expect(m.start_url).toBe("/");
    expect(m.display).toBe("standalone");
    expect(m.name).toBe("Learn Spanish");
  });

  it("has 192 and 512 pixel icons and a maskable one, each a real file of that size", () => {
    const icons = manifest().icons ?? [];
    expect(icons.map((icon) => icon.sizes)).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    expect(icons.some((icon) => icon.purpose === "maskable")).toBe(true);
    for (const icon of icons) {
      const file = path.join(publicDir, icon.src.split("?")[0]);
      expect(existsSync(file), file).toBe(true);
      // A PNG holds its width and height at bytes 16 and 20.
      const data = readFileSync(file);
      expect(`${data.readUInt32BE(16)}x${data.readUInt32BE(20)}`).toBe(icon.sizes);
    }
    expect(existsSync(path.join(publicDir, "apple-touch-icon.png"))).toBe(true);
  });

  it("lists every icon among the files the service worker stores", () => {
    const sw = readFileSync(path.join(publicDir, "sw.js"), "utf8");
    for (const icon of manifest().icons ?? []) expect(sw).toContain(`"${icon.src.split("?")[0]}"`);
    expect(sw).toContain('"/manifest.webmanifest"');
  });
});
