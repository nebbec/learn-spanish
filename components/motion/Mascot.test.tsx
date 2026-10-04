// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Mascot, MASCOT_FILES, type MascotPose } from "@/components/motion";

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

describe("the hero mascot", () => {
  it("plays each loop muted, inline and on repeat, with its first frame as the poster", () => {
    setReducedMotion(false);
    for (const pose of ["idle", "celebrate"] as const) {
      const video = draw(pose) as HTMLVideoElement;
      expect(video.tagName).toBe("VIDEO");
      expect(video.dataset.pose).toBe(pose);
      expect(video.getAttribute("src")).toBe(MASCOT_FILES[pose].clip);
      expect(video.getAttribute("poster")).toBe(MASCOT_FILES[pose].poster);
      expect(video.muted).toBe(true);
      expect(video.loop).toBe(true);
      expect(video.autoplay).toBe(true);
      expect(video.hasAttribute("playsinline")).toBe(true);
      expect(video.classList.contains("mascot-disc")).toBe(true);
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
