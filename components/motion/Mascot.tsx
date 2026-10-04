"use client";

/* eslint-disable @next/next/no-img-element -- static files from public/mascot, stored by the service worker */

import { useSyncExternalStore } from "react";
import { useMotion } from "./motion";

/** What the hero mascot does: the menu's idle loop, the celebration loop, or the still for the empty screens. */
export type MascotPose = "idle" | "celebrate" | "still";

/** The two transparent video formats: no one format with transparency plays everywhere. */
export type MascotFormat = "webm" | "hevc";

/**
 * The mascot's files, made by `npm run mascot` (docs/design.md, "Art", "Decided in F3" and "Decided in U2").
 * Each loop is transparent, in two formats, and its poster is its first frame,
 * which also stands in for it with reduced motion on. The service worker stores
 * them all on install, so they play offline.
 */
export const MASCOT_FILES = {
  idle: { webm: "/mascot/idle.webm", hevc: "/mascot/idle.mov", poster: "/mascot/idle.webp" },
  celebrate: { webm: "/mascot/celebrate.webm", hevc: "/mascot/celebrate.mov", poster: "/mascot/celebrate.webp" },
  still: "/mascot/concha.webp",
} as const;

/**
 * Which format this browser shows with its transparency: HEVC with alpha in
 * Safari and in every iPhone and iPad browser (all WebKit), VP9 with alpha in
 * WebM everywhere else. Asking `canPlayType` is not enough: Safari says it plays
 * WebM but draws its transparency black, and Chrome on a Mac plays HEVC without it.
 */
export function mascotFormat(userAgent: string, maxTouchPoints = 0): MascotFormat {
  const ios = /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
  const safari = /Safari/.test(userAgent) && !/Chrome|Chromium|Edg|OPR|Firefox|Android/.test(userAgent);
  return ios || safari ? "hevc" : "webm";
}

const noSubscribe = () => () => {};
const browserFormat = () => mascotFormat(navigator.userAgent, navigator.maxTouchPoints);
/** Unknown on the server, so the page is drawn with the poster until the browser is known. */
const serverFormat = () => null;

/** Muted is set as a property too: React leaves the attribute off, and iOS only autoplays muted video. */
function keepMuted(video: HTMLVideoElement | null) {
  if (video) video.muted = true;
}

/**
 * The concha, transparent, filling whatever box it is put in (the `mascot-slot`
 * of the menu, the batch end and the marker screens). With reduced motion on,
 * a loop shows its poster instead. Decorative: the slot is `aria-hidden`.
 */
export function Mascot({ pose }: { pose: MascotPose }) {
  const motion = useMotion();
  const format = useSyncExternalStore(noSubscribe, browserFormat, serverFormat);

  if (pose === "still") {
    return <img data-testid="mascot" data-pose="still" src={MASCOT_FILES.still} alt="" className="size-full object-contain" />;
  }

  const files = MASCOT_FILES[pose];
  if (!motion || !format) {
    return <img data-testid="mascot" data-pose={pose} src={files.poster} alt="" className="size-full object-contain" />;
  }
  return (
    <video
      key={format}
      data-testid="mascot"
      data-pose={pose}
      ref={keepMuted}
      src={files[format]}
      poster={files.poster}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      disablePictureInPicture
      className="size-full object-contain"
    />
  );
}
