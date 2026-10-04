// Logic for the hero mascot loops (F3, made transparent in U2). The run is in
// make-mascot.mjs; the rules are in docs/design.md under "Art", "Decided in F3" and "Decided in U2".

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

/** Duration in seconds, frame rate and frame size from ffmpeg's banner (`ffmpeg -i file`). */
export function probe(banner) {
  const d = /Duration: (\d+):(\d+):([\d.]+)/.exec(banner);
  const f = /, ([\d.]+) fps/.exec(banner);
  if (!d || !f) throw new Error("Could not read the clip's duration and frame rate");
  const s = /Video: .*?, (\d+)x(\d+)/.exec(banner);
  return {
    duration: Number(d[1]) * 3600 + Number(d[2]) * 60 + Number(d[3]),
    fps: Number(f[1]),
    width: s ? Number(s[1]) : 0,
    height: s ? Number(s[2]) : 0,
  };
}

/** The background colour of a raw RGB frame, read from a ring along its edge. */
function edgeColour(pixels, width, height, ring) {
  const channels = [[], [], []];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x >= ring && x < width - ring && y >= ring && y < height - ring) continue;
      const at = (y * width + x) * 3;
      for (let c = 0; c < 3; c++) channels[c].push(pixels[at + c]);
    }
  }
  return channels.map(median);
}

/**
 * One transparent frame from two copies of it (U2): `cream`, the take as rendered
 * on the cream background, and `black`, Higgsfield's cut-out of it on black.
 * A pixel's cream shows through by (1 - alpha), so alpha = 1 - (cream - black) / B,
 * B being the cream read from the frame's edge, and the colour is black / alpha.
 * Dark parts of the character (the eyes) are the same in both, so they stay solid;
 * a pixel black in the cut-out but light on cream is background (the cream darkens
 * towards the corners, which the formula alone would read as a little opaque).
 * Near-solid and near-empty alphas are snapped, to drop compression noise.
 *
 * `cream` and `black` are raw RGB of the same size; returns raw RGBA.
 */
export function matteFrame(cream, black, width, height) {
  const bg = edgeColour(cream, width, height, Math.max(2, Math.round(width * 0.012)));
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0, j = 0; i < cream.length; i += 3, j += 4) {
    let shown = 0;
    for (let c = 0; c < 3; c++) shown += bg[c] > 0 ? (cream[i + c] - black[i + c]) / bg[c] : 0;
    let alpha = 1 - Math.min(1, Math.max(0, shown / 3));
    // Black in the cut-out but light on cream is background, even where the
    // cream darkens towards the corners; dark parts of her are dark on cream too.
    const cutoutBlack = Math.max(black[i], black[i + 1], black[i + 2]) < 24;
    const lightOnCream = cream[i] + cream[i + 1] + cream[i + 2] > 0.6 * (bg[0] + bg[1] + bg[2]);
    if ((cutoutBlack && lightOnCream) || alpha < 0.08) alpha = 0;
    else if (alpha > 0.92) alpha = 1;
    for (let c = 0; c < 3; c++) out[j + c] = alpha > 0 ? Math.min(255, Math.round(black[i + c] / alpha)) : 0;
    out[j + 3] = Math.round(alpha * 255);
  }
  return out;
}

/** The box around a raw RGBA frame's visible pixels, or null when there are none. */
export function visibleBox(rgba, width, height) {
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3] < 13) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  return right < 0 ? null : { left, top, right, bottom };
}

/**
 * The square crop that holds a box with a margin (a share of the box's longer
 * side) on every side, kept inside the frame where it fits. Even numbers, for the encoders.
 */
export function squareAround(box, width, height, margin = 0.04) {
  const even = (n) => 2 * Math.round(n / 2);
  const long = Math.max(box.right - box.left, box.bottom - box.top) + 1;
  const side = even(Math.min(width, height, long * (1 + 2 * margin)));
  const clamp = (start, limit) => Math.min(Math.max(0, start), limit - side);
  return {
    side,
    x: even(clamp((box.left + box.right + 1) / 2 - side / 2, width)),
    y: even(clamp((box.top + box.bottom + 1) / 2 - side / 2, height)),
  };
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
    const take = record.takes.find((t) => t.name === name);
    if (!take.cutout?.url) throw new Error(`Take ${name} is in use but has no cutout (Higgsfield's cut-out on black, U2)`);
  }
}
