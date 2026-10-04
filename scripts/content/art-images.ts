// Image work for the art pass (F2), with sharp: cutting a transparent sheet of
// six into its panels, fitting a still to the card size as WebP, and laying out
// the contact sheets Courtney reviews. The rules are in docs/design.md under
// "Art", "Decided in F2".

import sharp, { type OverlayOptions } from "sharp";
import { COLS, ROWS } from "./art";

/** The card size: a still is a square WebP this wide, quality below. */
export const STILL_SIZE = 512;
export const STILL_QUALITY = 82;
/** Space around the character inside the square, as a share of the side. */
export const STILL_MARGIN = 0.04;
/** Alpha at or below this counts as background when finding gutters and trimming. */
const ALPHA_FLOOR = 24;

interface Alpha {
  data: Buffer;
  width: number;
  height: number;
}

async function alphaOf(png: Buffer): Promise<Alpha> {
  const { data, info } = await sharp(png).ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** The line with the least character on it within `window` of `at`: where a gutter runs. */
function quietest(sums: number[], at: number, window: number): number {
  let best = at;
  for (let i = Math.max(0, at - window); i <= Math.min(sums.length - 1, at + window); i++) {
    if (sums[i] < sums[best] || (sums[i] === sums[best] && Math.abs(i - at) < Math.abs(best - at))) best = i;
  }
  return best;
}

/** The two column gutters and the row gutter of a 3 by 2 sheet, found from its alpha. */
export function findGutters({ data, width, height }: Alpha): { xs: number[]; ys: number[] } {
  const cols = new Array<number>(width).fill(0);
  const rows = new Array<number>(height).fill(0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[y * width + x];
      if (a > ALPHA_FLOOR) {
        cols[x] += a;
        rows[y] += a;
      }
    }
  }
  const xs = Array.from({ length: COLS - 1 }, (_, i) => quietest(cols, Math.round(((i + 1) * width) / COLS), Math.round(width / 10)));
  const ys = Array.from({ length: ROWS - 1 }, (_, i) => quietest(rows, Math.round(((i + 1) * height) / ROWS), Math.round(height / 8)));
  return { xs, ys };
}

/** The box around everything opaque in a region, or null when it is empty. */
function opaqueBox(a: Alpha, left: number, top: number, right: number, bottom: number) {
  let x0 = right, y0 = bottom, x1 = left - 1, y1 = top - 1;
  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      if (a.data[y * a.width + x] > ALPHA_FLOOR) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < x0 ? null : { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

/**
 * Cuts a transparent sheet into its six panels in reading order, each trimmed to
 * what is opaque in it. A panel with nothing in it comes back as null.
 */
export async function cutSheet(png: Buffer): Promise<(Buffer | null)[]> {
  const a = await alphaOf(png);
  const { xs, ys } = findGutters(a);
  const xEdges = [0, ...xs, a.width];
  const yEdges = [0, ...ys, a.height];
  const out: (Buffer | null)[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const box = opaqueBox(a, xEdges[c], yEdges[r], xEdges[c + 1], yEdges[r + 1]);
      out.push(box ? await sharp(png).extract(box).png().toBuffer() : null);
    }
  }
  return out;
}

/** Fits a cut panel into the square card still, transparent, as WebP. */
export async function toStill(panel: Buffer, size = STILL_SIZE, quality = STILL_QUALITY): Promise<Buffer> {
  const inner = Math.round(size * (1 - 2 * STILL_MARGIN));
  const fitted = await sharp(panel)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: fitted, gravity: "center" }])
    .webp({ quality, alphaQuality: 90, effort: 6 })
    .toBuffer();
}

export interface Tile {
  image: Buffer;
  label: string;
}

const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * A contact sheet: the stills in a grid, each on the card's white with its label
 * under it, and a strip of the menu's cream on the right of each tile, so a halo
 * left by the background removal shows against both.
 */
export async function contactSheet(tiles: Tile[], { cols = 4, tile = 300, title = "" } = {}): Promise<Buffer> {
  const label = 34;
  const gap = 12;
  const head = title ? 44 : 0;
  const rows = Math.ceil(tiles.length / cols);
  const width = cols * tile + (cols + 1) * gap;
  const height = head + rows * (tile + label) + (rows + 1) * gap;
  const parts: OverlayOptions[] = [];
  if (title) {
    const svg = `<svg width="${width}" height="${head}"><text x="${gap}" y="30" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="bold" fill="#2b2140">${escapeXml(title)}</text></svg>`;
    parts.push({ input: Buffer.from(svg), left: 0, top: 0 });
  }
  for (let i = 0; i < tiles.length; i++) {
    const left = gap + (i % cols) * (tile + gap);
    const top = head + gap + Math.floor(i / cols) * (tile + label + gap);
    const cream = Math.round(tile * 0.18);
    const bg = `<svg width="${tile}" height="${tile}"><rect width="${tile}" height="${tile}" fill="#ffffff" stroke="#e4ddd0"/><rect x="${tile - cream}" width="${cream}" height="${tile}" fill="#fff8ec"/></svg>`;
    parts.push({ input: Buffer.from(bg), left, top });
    const still = await sharp(tiles[i].image).resize(tile - 8, tile - 8, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    parts.push({ input: still, left: left + 4, top: top + 4 });
    const text = `<svg width="${tile}" height="${label}"><text x="2" y="23" font-family="Helvetica, Arial, sans-serif" font-size="17" fill="#2b2140">${escapeXml(tiles[i].label)}</text></svg>`;
    parts.push({ input: Buffer.from(text), left, top: top + tile });
  }
  return sharp({ create: { width, height, channels: 3, background: "#f3efe8" } })
    .composite(parts)
    .jpeg({ quality: 85 })
    .toBuffer();
}
