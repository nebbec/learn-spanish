import { describe, expect, it } from "vitest";
import { PAPER, backgroundGains, checkTakes, gainFilter, loopSeconds, matteFrame, probe, squareAround, visibleBox } from "./mascot.mjs";

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
    const { duration, fps, width, height } = probe(
      "  Duration: 00:00:04.04, start: 0.000000\n  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(progressive), 640x480, 449 kb/s, 24 fps, 24 tbr",
    );
    expect(duration).toBeCloseTo(4.04);
    expect(fps).toBe(24);
    expect([width, height]).toEqual([640, 480]);
    expect(loopSeconds(duration, fps)).toBeCloseTo(4.04 - 1 / 24);
    expect(() => probe("nothing")).toThrow();
  });

  it("checks that the takes in use exist and are of their kind", () => {
    const takes = [
      { name: "idle-t1", url: "u1", cutout: { url: "c1" } },
      { name: "celebrate-t1", url: "u2", cutout: { url: "c2" } },
    ];
    expect(() => checkTakes({ takes, use: { idle: "idle-t1", celebrate: "celebrate-t1" } })).not.toThrow();
    expect(() => checkTakes({ takes, use: { idle: "idle-t9", celebrate: "celebrate-t1" } })).toThrow(/idle-t9/);
    expect(() => checkTakes({ takes, use: { idle: "celebrate-t1", celebrate: "celebrate-t1" } })).toThrow(/does not start with "idle-"/);
    expect(() => checkTakes({ takes: [...takes, takes[0]], use: { idle: "idle-t1", celebrate: "celebrate-t1" } })).toThrow(/twice/);
    const uncut = [{ name: "idle-t1", url: "u1" }, takes[1]];
    expect(() => checkTakes({ takes: uncut, use: { idle: "idle-t1", celebrate: "celebrate-t1" } })).toThrow(/no cutout/);
  });

  it("mattes a frame from its copy on cream and its cut-out on black", () => {
    const cream = [0xf3, 0xee, 0xe4];
    // A 10 by 10 frame of cream with three pixels of interest in the middle row.
    const on = (colours: Record<number, number[]>, edge: number[]) => {
      const pixels = Buffer.alloc(10 * 10 * 3);
      for (let i = 0; i < 100; i++) pixels.set(colours[i] ?? edge, i * 3);
      return pixels;
    };
    const solid = [200, 120, 140]; // her pink: the same in both
    const eye = [8, 8, 8]; // her eye: dark, but the same in both, so solid
    const half = solid.map((c, k) => Math.round(c / 2 + cream[k] / 2)); // an edge pixel, half see-through
    const corner = cream.map((c) => Math.round(c * 0.8)); // the cream, darker in a corner
    const rgba = matteFrame(
      on({ 0: corner, 54: solid, 55: eye, 56: half }, cream),
      on({ 54: solid, 55: eye, 56: solid.map((c) => Math.round(c / 2)) }, [0, 0, 0]),
      10,
      10,
    );
    const at = (i: number) => [...rgba.subarray(i * 4, i * 4 + 4)];
    expect(at(0)[3]).toBe(0);
    expect(at(1)[3]).toBe(0);
    expect(at(54)).toEqual([...solid, 255]);
    expect(at(55)[3]).toBe(255);
    expect(at(56)[3]).toBeGreaterThan(120);
    expect(at(56)[3]).toBeLessThan(135);
    at(56).slice(0, 3).forEach((c, k) => expect(Math.abs(c - solid[k])).toBeLessThan(4));
  });

  it("crops a square around what is visible, with a margin, inside the frame", () => {
    const rgba = Buffer.alloc(100 * 80 * 4);
    for (let y = 30; y <= 49; y++) for (let x = 60; x <= 89; x++) rgba[(y * 100 + x) * 4 + 3] = 255;
    const box = visibleBox(rgba, 100, 80)!;
    expect(box).toEqual({ left: 60, top: 30, right: 89, bottom: 49 });
    const crop = squareAround(box, 100, 80, 0.1);
    expect(crop.side).toBe(36);
    expect(crop.x + crop.side).toBeLessThanOrEqual(100);
    expect(crop.y).toBeGreaterThanOrEqual(0);
    expect(crop.x).toBeLessThanOrEqual(60);
    expect(crop.y).toBeLessThanOrEqual(30);
    expect(crop.x + crop.side).toBeGreaterThanOrEqual(90);
    expect(visibleBox(Buffer.alloc(16), 2, 2)).toBeNull();
  });
});
