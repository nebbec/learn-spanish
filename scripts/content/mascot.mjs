// Logic for the hero mascot loops (F3). The run is in make-mascot.mjs; the
// rules are in docs/design.md under "Art", "Decided in F3".

/** The paper colour the clips are shown on, as in app/globals.css. */
export const PAPER = [0xff, 0xf8, 0xec];

/** The square size the loops are encoded at: three times the largest slot (160 px). */
export const CLIP_SIZE = 480;

/** The still for the empty screens: the size and quality of the card stills (F2). */
export const STILL_SIZE = 512;

/** The median of a list of numbers. */
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Per-channel gains that turn a frame's background into the paper colour.
 * The video models drift the cream (#fff8ec in, about #f3eee4 out), so the
 * background is read from a ring along the frame's edge, where the character
 * never is, and each channel is scaled to match.
 *
 * `pixels` is raw RGB (3 bytes a pixel), `size` the frame's width and height.
 */
export function backgroundGains(pixels, size, ring = Math.max(2, Math.round(size * 0.03))) {
  const channels = [[], [], []];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (x >= ring && x < size - ring && y >= ring && y < size - ring) continue;
      const at = (y * size + x) * 3;
      for (let c = 0; c < 3; c++) channels[c].push(pixels[at + c]);
    }
  }
  return channels.map((values, c) => {
    const found = median(values);
    return found > 0 ? Math.min(1.25, PAPER[c] / found) : 1;
  });
}

/**
 * The ffmpeg filter that applies the gains: a plain per-channel scale.
 * @param {number[]} gains red, green and blue
 */
export function gainFilter(gains) {
  const [r, g, b] = gains;
  return `colorchannelmixer=rr=${r.toFixed(4)}:gg=${g.toFixed(4)}:bb=${b.toFixed(4)}`;
}

/**
 * How long to keep of a clip so it loops without a stutter. The models are
 * asked for the same first and last frame, so the last frame is dropped: kept,
 * it would show twice in a row at the seam.
 */
export function loopSeconds(duration, fps) {
  return Math.max(0, duration - 1 / fps);
}

/** Duration in seconds and frame rate from ffmpeg's banner (`ffmpeg -i file`). */
export function probe(banner) {
  const d = /Duration: (\d+):(\d+):([\d.]+)/.exec(banner);
  const f = /, ([\d.]+) fps/.exec(banner);
  if (!d || !f) throw new Error("Could not read the clip's duration and frame rate");
  return { duration: Number(d[1]) * 3600 + Number(d[2]) * 60 + Number(d[3]), fps: Number(f[1]) };
}

/** Checks takes.json: every take named once, and the two in use exist and are of their kind. */
export function checkTakes(record) {
  const names = new Set();
  for (const take of record.takes) {
    if (names.has(take.name)) throw new Error(`Take ${take.name} is listed twice`);
    if (!take.url) throw new Error(`Take ${take.name} has no url`);
    names.add(take.name);
  }
  for (const kind of ["idle", "celebrate"]) {
    const name = record.use?.[kind];
    if (!names.has(name)) throw new Error(`use.${kind} names ${name}, which is not a take`);
    if (!name.startsWith(`${kind}-`)) throw new Error(`use.${kind} names ${name}, which does not start with "${kind}-"`);
  }
}
