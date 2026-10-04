import { describe, expect, it } from "vitest";
import { PAPER, backgroundGains, checkTakes, gainFilter, loopSeconds, probe } from "./mascot.mjs";

/** A square frame of one colour with a different square in the middle. */
function frame(size: number, edge: number[], middle: number[]) {
  const pixels = Buffer.alloc(size * size * 3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inside = x > size / 4 && x < (3 * size) / 4 && y > size / 4 && y < (3 * size) / 4;
      pixels.set(inside ? middle : edge, (y * size + x) * 3);
    }
  }
  return pixels;
}

describe("mascot clips", () => {
  it("scales each channel so the background along the edge becomes the paper colour", () => {
    const gains = backgroundGains(frame(40, [0xf3, 0xee, 0xe4], [0xff, 0x90, 0xa0]), 40);
    gains.forEach((gain, c) => expect(Math.round(gain * [0xf3, 0xee, 0xe4][c])).toBe(PAPER[c]));
    expect(gainFilter(gains)).toMatch(/^colorchannelmixer=rr=1\.0\d+:gg=1\.0\d+:bb=1\.0\d+$/);
  });

  it("never brightens by more than a quarter, whatever the frame", () => {
    expect(backgroundGains(frame(20, [10, 10, 10], [0, 0, 0]), 20)).toEqual([1.25, 1.25, 1.25]);
  });

  it("drops the last frame, which repeats the first, and reads the clip's banner", () => {
    const { duration, fps } = probe("  Duration: 00:00:04.04, start: 0.000000\n  Stream #0:0: Video: h264, 640x640, 24 fps, 24 tbr");
    expect(duration).toBeCloseTo(4.04);
    expect(fps).toBe(24);
    expect(loopSeconds(duration, fps)).toBeCloseTo(4.04 - 1 / 24);
    expect(() => probe("nothing")).toThrow();
  });

  it("checks that the takes in use exist and are of their kind", () => {
    const takes = [
      { name: "idle-t1", url: "u1" },
      { name: "celebrate-t1", url: "u2" },
    ];
    expect(() => checkTakes({ takes, use: { idle: "idle-t1", celebrate: "celebrate-t1" } })).not.toThrow();
    expect(() => checkTakes({ takes, use: { idle: "idle-t9", celebrate: "celebrate-t1" } })).toThrow(/idle-t9/);
    expect(() => checkTakes({ takes, use: { idle: "celebrate-t1", celebrate: "celebrate-t1" } })).toThrow(/does not start with "idle-"/);
    expect(() => checkTakes({ takes: [...takes, takes[0]], use: { idle: "idle-t1", celebrate: "celebrate-t1" } })).toThrow(/twice/);
  });
});
