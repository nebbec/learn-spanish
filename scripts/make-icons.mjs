// Writes the app icons: a small progress wheel on the brand purple.
// Placeholders until the mascot exists (F1). Run: node scripts/make-icons.mjs
//
// No image library: each pixel is worked out from the shape and the PNG is
// encoded by hand. The drawing stays inside the middle 80%, so the same file
// works as a maskable icon.

import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");

const BRAND = [0x7c, 0x4d, 0xff];
const TINT = [0xe9, 0xe0, 0xff];
const SUN = [0xff, 0xc9, 0x3c];

// How far each slice is filled, as a share of the wheel's radius.
const SLICES = [1, 0.78, 0.5, 0.9, 0.38, 0.66];
const WHEEL_RADIUS = 0.36;
const GAP = 0.012;

/** The colour at a point, with x and y from 0 to 1. */
function colourAt(x, y) {
  const dx = x - 0.5;
  const dy = y - 0.5;
  const r = Math.hypot(dx, dy);
  if (r > WHEEL_RADIUS) return BRAND;
  // Clockwise from the top, as the wheel in the app is drawn.
  const turn = (Math.atan2(dx, -dy) / (2 * Math.PI) + 1) % 1;
  const position = turn * SLICES.length;
  const slice = Math.floor(position);
  const fromEdge = Math.min(position - slice, slice + 1 - position) / SLICES.length;
  if (fromEdge * 2 * Math.PI * r < GAP / 2) return BRAND;
  return r <= WHEEL_RADIUS * SLICES[slice] ? SUN : TINT;
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(size) {
  const SAMPLES = 4;
  const rows = Buffer.alloc(size * (1 + size * 3));
  let at = 0;
  for (let py = 0; py < size; py++) {
    rows[at++] = 0; // no row filter
    for (let px = 0; px < size; px++) {
      const sum = [0, 0, 0];
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const colour = colourAt((px + (sx + 0.5) / SAMPLES) / size, (py + (sy + 0.5) / SAMPLES) / size);
          for (let c = 0; c < 3; c++) sum[c] += colour[c];
        }
      }
      for (let c = 0; c < 3; c++) rows[at++] = Math.round(sum[c] / (SAMPLES * SAMPLES));
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bits per channel
  header[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(rows, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const files = { "icon-192.png": 192, "icon-512.png": 512, "apple-touch-icon.png": 180 };
for (const [name, size] of Object.entries(files)) {
  const data = png(size);
  writeFileSync(path.join(PUBLIC, name), data);
  console.log(`${name}: ${size}x${size}, ${data.length} bytes`);
}
