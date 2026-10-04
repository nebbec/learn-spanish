// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Mascot, MASCOT_FILES, mascotFormat, type MascotPose } from "@/components/motion";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

function setReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-reduced-motion: reduce") ? reduce : false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

function draw(pose: MascotPose) {
  act(() => root.render(<Mascot pose={pose} />));
  return host.querySelector<HTMLElement>('[data-testid="mascot"]')!;
}

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const UA = {
  chromeMac:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  safariMac:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  chromeIphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.0.0 Mobile/15E148 Safari/604.1",
  edgeWindows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
  firefox: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.0; rv:131.0) Gecko/20100101 Firefox/131.0",
  android:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
};

describe("the hero mascot", () => {
  it("picks the format each browser draws transparent: HEVC in Safari and on iPhone and iPad, WebM elsewhere", () => {
    expect(mascotFormat(UA.safariMac)).toBe("hevc");
    expect(mascotFormat(UA.chromeIphone)).toBe("hevc");
    // An iPad asking for the desktop site says Macintosh, but has a touch screen.
    expect(mascotFormat(UA.safariMac, 5)).toBe("hevc");
    expect(mascotFormat(UA.chromeMac)).toBe("webm");
    expect(mascotFormat(UA.edgeWindows)).toBe("webm");
    expect(mascotFormat(UA.firefox)).toBe("webm");
    expect(mascotFormat(UA.android)).toBe("webm");
  });

  it("plays each transparent loop muted, inline and on repeat, with its first frame as the poster", () => {
    setReducedMotion(false);
    const format = mascotFormat(navigator.userAgent, navigator.maxTouchPoints);
    for (const pose of ["idle", "celebrate"] as const) {
      const video = draw(pose) as HTMLVideoElement;
      expect(video.tagName).toBe("VIDEO");
      expect(video.dataset.pose).toBe(pose);
      expect(video.getAttribute("src")).toBe(MASCOT_FILES[pose][format]);
      expect(video.getAttribute("poster")).toBe(MASCOT_FILES[pose].poster);
      expect(video.muted).toBe(true);
      expect(video.loop).toBe(true);
      expect(video.autoplay).toBe(true);
      expect(video.hasAttribute("playsinline")).toBe(true);
      expect(video.className).not.toMatch(/disc/);
    }
  });

  it("shows a still from the loop instead when the reader asked for reduced motion", () => {
    setReducedMotion(true);
    for (const pose of ["idle", "celebrate"] as const) {
      const still = draw(pose);
      expect(still.tagName).toBe("IMG");
      expect(still.getAttribute("src")).toBe(MASCOT_FILES[pose].poster);
    }
    expect(host.querySelector("video")).toBeNull();
  });

  it("shows the still pose on the empty screens, moving or not", () => {
    for (const reduce of [false, true]) {
      setReducedMotion(reduce);
      const still = draw("still");
      expect(still.tagName).toBe("IMG");
      expect(still.getAttribute("src")).toBe(MASCOT_FILES.still);
      expect(still.getAttribute("alt")).toBe("");
    }
  });
});
