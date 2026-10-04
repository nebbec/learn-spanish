"use client";

/* eslint-disable @next/next/no-img-element -- static files from public/mascot, stored by the service worker */

import { useMotion } from "./motion";

/** What the hero mascot does: the menu's idle loop, the celebration loop, or the still for the empty screens. */
export type MascotPose = "idle" | "celebrate" | "still";

/**
 * The mascot's files, made by `npm run mascot` (docs/design.md, "Art", "Decided in F3").
 * Each loop's poster is its first frame, which also stands in for it with reduced motion on.
 * The service worker stores them all on install, so they play offline.
 */
export const MASCOT_FILES = {
  idle: { clip: "/mascot/idle.mp4", poster: "/mascot/idle.webp" },
  celebrate: { clip: "/mascot/celebrate.mp4", poster: "/mascot/celebrate.webp" },
  still: "/mascot/concha.webp",
} as const;

/** Muted is set as a property too: React leaves the attribute off, and iOS only autoplays muted video. */
function keepMuted(video: HTMLVideoElement | null) {
  if (video) video.muted = true;
}

/**
 * The concha, filling whatever box it is put in (the `mascot-slot` of the menu,
 * the batch end and the marker screens). The loops are clips on the paper
 * colour, faded to the edge in a soft disc (`.mascot-disc` in app/globals.css)
 * so they sit on the paper and on a white card alike. With reduced motion on,
 * a loop shows its poster instead. Decorative: the slot is `aria-hidden`.
 */
export function Mascot({ pose }: { pose: MascotPose }) {
  const motion = useMotion();

  if (pose === "still") {
    return <img data-testid="mascot" data-pose="still" src={MASCOT_FILES.still} alt="" className="size-full object-contain" />;
  }

  const { clip, poster } = MASCOT_FILES[pose];
  if (!motion) {
    return <img data-testid="mascot" data-pose={pose} src={poster} alt="" className="mascot-disc size-full object-cover" />;
  }
  return (
    <video
      data-testid="mascot"
      data-pose={pose}
      ref={keepMuted}
      src={clip}
      poster={poster}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      disablePictureInPicture
      className="mascot-disc size-full object-cover"
    />
  );
}
